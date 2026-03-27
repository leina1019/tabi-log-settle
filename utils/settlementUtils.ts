
import { Expense, Settlement, UserProfile } from '../types';
import { convertToJPY } from './currency';

/**
 * 各メンバーの収支（支払額 - 負担額）を計算する
 */
export const calculateBalances = (expenses: Expense[], userProfiles: UserProfile[]): Record<string, number> => {
    const balances: Record<string, number> = {};
    userProfiles.forEach(p => balances[p.id] = 0);

    expenses.forEach(exp => {
        const totalJPY = convertToJPY(exp.amount, exp.currency, exp.exchangeRate);
        const share = totalJPY / (exp.splitWith.length || 1);

        // 支払った人にプラス
        if (balances[exp.paidBy] !== undefined) {
            balances[exp.paidBy] += totalJPY;
        }

        // 負担した人にマイナス
        exp.splitWith.forEach(pId => {
            if (balances[pId] !== undefined) {
                balances[pId] -= share;
            }
        });
    });

    return balances;
};

/**
 * 収支バランスから具体的な送金プラン（誰が誰にいくら）を計算する
 */
export const calculateSettlements = (balances: Record<string, number>): Settlement[] => {
    const sortedBalances = Object.entries(balances)
        .map(([id, amount]) => ({ id, amount }))
        .filter(b => Math.abs(b.amount) > 1); // 1円未満は無視

    const debtors = sortedBalances.filter(b => b.amount < 0).sort((a, b) => a.amount - b.amount);
    const creditors = sortedBalances.filter(b => b.amount > 0).sort((a, b) => b.amount - a.amount);

    const results: Settlement[] = [];
    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < debtors.length && cIdx < creditors.length) {
        const debtor = debtors[dIdx];
        const creditor = creditors[cIdx];

        const amount = Math.min(Math.abs(debtor.amount), creditor.amount);
        results.push({
            from: debtor.id,
            to: creditor.id,
            amount: Math.round(amount)
        });

        debtor.amount += amount;
        creditor.amount -= amount;

        if (Math.abs(debtor.amount) < 1) dIdx++;
        if (Math.abs(creditor.amount) < 1) cIdx++;
    }

    return results;
};

/**
 * 立て替えた人に直接支払う（ただし2者間でのみ相殺する）個別精算プランを計算する
 */
export const calculateIndividualSettlements = (expenses: Expense[], userProfiles: UserProfile[]): Settlement[] => {
    // debts[debtor][creditor] = amount
    const debts: Record<string, Record<string, number>> = {};
    const memberIds = userProfiles.map(p => p.id);
    
    // 初期化
    memberIds.forEach(id => {
        debts[id] = {};
        memberIds.forEach(otherId => {
            debts[id][otherId] = 0;
        });
    });

    // 1. 各経費ごとに貸し借りを記録
    expenses.forEach(exp => {
        const totalJPY = convertToJPY(exp.amount, exp.currency, exp.exchangeRate);
        const share = totalJPY / (exp.splitWith.length || 1);
        const creditor = exp.paidBy;

        exp.splitWith.forEach(debtor => {
            if (debtor !== creditor && debts[debtor] && debts[debtor][creditor] !== undefined) {
                debts[debtor][creditor] += share;
            }
        });
    });

    // 2. 2者間（ペア）でのみ相殺（Netting）を行う
    const results: Settlement[] = [];
    const processedPairs = new Set<string>();

    memberIds.forEach(idA => {
        memberIds.forEach(idB => {
            if (idA === idB) return;
            const pairKey = [idA, idB].sort().join('-');
            if (processedPairs.has(pairKey)) return;
            processedPairs.add(pairKey);

            const aOwesB = debts[idA][idB] || 0;
            const bOwesA = debts[idB][idA] || 0;

            const netDiff = aOwesB - bOwesA;
            
            // 1円未満の端数は無視
            if (netDiff > 1) {
                // AがBにより多く払うべき
                results.push({ from: idA, to: idB, amount: Math.round(netDiff) });
            } else if (netDiff < -1) {
                // BがAにより多く払うべき
                results.push({ from: idB, to: idA, amount: Math.round(Math.abs(netDiff)) });
            }
        });
    });

    return results;
};
