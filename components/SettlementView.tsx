
import React, { useMemo } from 'react';
import { Settlement, Expense, Participant, UserProfile } from '../types';
import { convertToJPY } from '../utils/currency';
import { PARTICIPANTS } from '../constants';

interface Props {
  settlements: Settlement[];
  expenses: Expense[];
  onBack?: () => void;
  userProfiles: UserProfile[];
}

const SettlementView: React.FC<Props> = ({ settlements, expenses, onBack, userProfiles }) => {
  const balances = useMemo(() => {
    const b: Record<string, number> = {};
    PARTICIPANTS.forEach(p => b[p] = 0);
    expenses.forEach(exp => {
      const amountJPY = convertToJPY(exp.amount, exp.currency, exp.exchangeRate);
      const share = amountJPY / (exp.splitWith.length || 1);
      b[exp.paidBy] += amountJPY;
      exp.splitWith.forEach(p => { b[p] -= share; });
    });
    return b;
  }, [expenses]);

  const getDisplayName = (id: string) => {
    return userProfiles.find(p => p.id === id)?.displayName || id;
  };

  return (
    <div className="space-y-6 pt-2 pb-10">
      <div className="flex items-center gap-2 mb-4">
        {onBack && (
          <button type="button" onClick={onBack} className="p-2 -ml-2 text-ink-sub hover:text-ink">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
        )}
        <h2 className="text-xl font-sans font-bold text-ink">清算</h2>
      </div>

      {/* 送金プラン */}
      <div className="glass p-6 rounded-3xl">
        <h3 className="text-lg font-bold text-ink mb-1">送金プラン</h3>
        <p className="text-[10px] text-ink-light mb-6 font-bold uppercase tracking-widest">推奨される送金方法</p>

        {settlements.length === 0 ? (
          <div className="text-center py-10 text-ink-light text-sm">
            <p>清算は完了しています 🎉</p>
          </div>
        ) : (
          <div className="space-y-4">
            {settlements.map((s, idx) => (
              <div key={idx} className="flex items-center gap-4 bg-surface-gray p-5 rounded-2xl border border-surface-gray-mid relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent"></div>
                <div className="flex-1">
                  <p className="text-[8px] font-bold text-rose-500 uppercase tracking-tighter mb-0.5">FROM</p>
                  <p className="text-sm font-bold text-ink">{getDisplayName(s.from)}</p>
                </div>
                <div className="text-ink-light">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
                <div className="flex-1 text-right">
                  <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-tighter mb-0.5">TO</p>
                  <p className="text-sm font-bold text-ink">{getDisplayName(s.to)}</p>
                </div>
                <div className="pl-4 border-l border-surface-gray-mid ml-2">
                  <p className="text-lg font-sans font-bold text-ink">{Math.round(s.amount).toLocaleString()}<span className="text-[10px] ml-0.5 font-sans">円</span></p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 収支バランス */}
      <div className="glass p-6 rounded-3xl">
        <h3 className="text-[10px] font-bold text-ink-sub uppercase tracking-widest mb-5">収支バランス</h3>
        <div className="space-y-4">
          {PARTICIPANTS.map(p => (
            <div key={p} className="flex justify-between items-center text-sm border-b border-surface-gray-mid pb-3 last:border-0 last:pb-0">
              <span className="font-bold text-ink">{getDisplayName(p)}</span>
              <div className="text-right">
                <p className={`font-bold font-sans ${balances[p] >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {balances[p] >= 0 ? '+' : ''}{Math.round(balances[p]).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SettlementView;
