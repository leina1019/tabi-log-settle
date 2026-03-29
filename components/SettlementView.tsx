
import React, { useMemo, useState } from 'react';
import { Settlement, Expense, Participant, UserProfile } from '../types';
import { convertToJPY, formatCurrency } from '../utils/currency';
import { AppIcon } from './AppIcon';
import { calculateBalances } from '../utils/settlementUtils';
import { useTranslation } from '../contexts/LanguageContext';

interface Props {
  settlements: Settlement[];
  expenses: Expense[];
  onBack?: () => void;
  userProfiles: UserProfile[];
  settlementMethod?: 'smart' | 'individual';
}

const SettlementView: React.FC<Props> = ({ settlements, expenses, onBack, userProfiles, settlementMethod = 'smart' }) => {
  const { t } = useTranslation();
  const [selectedPId, setSelectedPId] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const balances = useMemo(() => calculateBalances(expenses, userProfiles), [expenses, userProfiles]);

  const participantDetails = useMemo(() => {
    if (!selectedPId) return null;

    // 支払った経費
    const paidList = expenses.filter(e => e.paidBy === selectedPId).map(e => ({
      title: e.title,
      amount: convertToJPY(e.amount, e.currency, e.exchangeRate)
    }));

    // 参加（負担）した経費
    const burdenList = expenses.filter(e => e.splitWith.includes(selectedPId as Participant)).map(e => {
      const totalJPY = convertToJPY(e.amount, e.currency, e.exchangeRate);
      return {
        title: e.title,
        fullAmount: totalJPY,
        count: e.splitWith.length,
        share: totalJPY / e.splitWith.length
      };
    });

    const totalPaid = paidList.reduce((sum, item) => sum + item.amount, 0);
    const totalBurden = burdenList.reduce((sum, item) => sum + item.share, 0);

    return {
      paidList,
      burdenList,
      totalPaid,
      totalBurden,
      balance: totalPaid - totalBurden
    };
  }, [expenses, selectedPId, userProfiles]);

  const getDisplayName = (id: string) => {
    return userProfiles.find(p => p.id === id)?.displayName || id;
  };

  const getAvatar = (id: string) => {
    return userProfiles.find(p => p.id === id)?.avatarUrl || '';
  };

  // F1: 送金プランのコピー処理（getDisplayName定義後に配置）
  const handleCopySettlement = (s: Settlement) => {
    const from = getDisplayName(s.from);
    const to = getDisplayName(s.to);
    const amount = Math.round(s.amount).toLocaleString();
    navigator.clipboard.writeText(`${from} → ${to}  ¥${amount}`);
    setCopyFeedback(s.from + s.to);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  return (
    <div className="space-y-6 pt-2 pb-10">
      <div className="flex items-center gap-2 mb-4">
        {onBack && (
          <button type="button" onClick={onBack} className="p-2 -ml-2 text-ink-sub hover:text-ink">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
        )}
        <h2 className="text-xl font-sans font-bold text-ink">{t('settlement.title')}</h2>
      </div>

      {/* 送金プラン */}
      <div className="glass p-6 rounded-3xl">
        <h3 className="text-lg font-bold text-ink mb-1">{t('settlement.plan')}</h3>
        <p className="text-[10px] text-ink-light mb-6 font-bold uppercase tracking-widest">
          {settlementMethod === 'individual' ? t('settlement.methodIndividual') : t('settlement.methodSmart')}
        </p>

        {settlements.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🎉</span>
            </div>
            <p className="text-base font-bold text-emerald-600 mb-1">{t('settlement.completed')}</p>
            <p className="text-xs text-ink-light">{t('settlement.completedDesc')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {settlements.map((s, idx) => {
              const key = s.from + s.to;
              const isCopied = copyFeedback === key;
              return (
                <div key={idx} className="flex items-center gap-3 bg-surface-gray p-4 rounded-2xl border border-surface-gray-mid relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent"></div>
                  <div className="flex-1 pl-1">
                    <p className="text-[8px] font-bold text-rose-500 uppercase tracking-tighter mb-0.5">{t('settlement.send')}</p>
                    <p className="text-sm font-bold text-ink">{getDisplayName(s.from)}</p>
                  </div>
                  <div className="text-ink-light">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                  <div className="flex-1 text-right">
                    <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-tighter mb-0.5">{t('settlement.receive')}</p>
                    <p className="text-sm font-bold text-ink">{getDisplayName(s.to)}</p>
                  </div>
                  <div className="pl-3 border-l border-surface-gray-mid ml-1">
                    <p className="text-lg font-sans font-bold text-ink">{Math.round(s.amount).toLocaleString()}<span className="text-[10px] ml-0.5 font-sans">{t('common.jpy')}</span></p>
                  </div>
                  {/* F1: 送金プランのコピーボタン */}
                  <button
                    type="button"
                    onClick={() => handleCopySettlement(s)}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all text-sm ${isCopied ? 'bg-emerald-500 text-white' : 'bg-white hover:bg-primary/10 text-ink-light hover:text-primary border border-surface-gray-mid'}`}
                    title={t('settlement.copyBtn')}
                  >
                    {isCopied ? '✓' : '📋'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 収支バランス */}
      <div className="glass p-6 rounded-3xl">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-[10px] font-bold text-ink-sub uppercase tracking-widest">{t('settlement.balance')}</h3>
          <span className="text-[9px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-bold">{t('settlement.tapDetails')}</span>
        </div>
        <div className="space-y-4">
          {userProfiles.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPId(p.id)}
              className="w-full flex justify-between items-center text-sm border-b border-surface-gray-mid pb-3 last:border-0 last:pb-0 hover:bg-surface-gray/50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-surface-gray-mid overflow-hidden border border-white" style={{ backgroundColor: p.color }}>
                  {p.avatarUrl ? (
                    <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-white font-bold">
                      {p.displayName.charAt(0)}
                    </div>
                  )}
                </div>
                <span className="font-bold text-ink">{p.displayName}</span>
              </div>
              <div className="text-right flex items-center gap-2">
                <p className={`font-bold font-sans ${balances[p.id] >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {balances[p.id] >= 0 ? '+' : ''}{Math.round(balances[p.id]).toLocaleString()}
                  <span className="text-[10px] ml-0.5">{t('common.jpy')}</span>
                </p>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-ink-light" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 詳細計算式モーダル */}
      {selectedPId && participantDetails && (
        <div className="fixed inset-0 z-[100] bg-ocean-dark/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4" onClick={() => setSelectedPId(null)}>
          <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300" onClick={e => e.stopPropagation()}>
            <div className="bg-primary p-6 text-white relative">
              <button
                type="button"
                onClick={() => setSelectedPId(null)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                ×
              </button>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 mb-1">{t('settlement.calcDetail')}</p>
              <h3 className="text-xl font-bold">{getDisplayName(selectedPId)} {t('settlement.basis')}</h3>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60dvh] space-y-6">
              {/* 支払い済みリスト */}
              <section>
                <div className="flex justify-between items-end mb-3">
                  <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                    <AppIcon name="expense" className="w-3 h-3" /> {t('settlement.totalPaid')}
                  </h4>
                  <p className="text-lg font-bold text-emerald-600">{formatCurrency(participantDetails.totalPaid, 'JPY')}</p>
                </div>
                <div className="space-y-2">
                  {participantDetails.paidList.length > 0 ? (
                    participantDetails.paidList.map((item, i) => (
                      <div key={i} className="flex justify-between text-[11px] bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                        <span className="text-ink/80 truncate pr-2">{item.title}</span>
                        <span className="font-bold text-emerald-700">+{item.amount.toLocaleString()}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-ink-light italic">{t('settlement.noPaidRecord')}</p>
                  )}
                </div>
              </section>

              {/* 負担分リスト */}
              <section>
                <div className="flex justify-between items-end mb-3">
                  <h4 className="text-xs font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1">
                    <AppIcon name="meal" className="w-3 h-3" /> {t('settlement.totalBurden')}
                  </h4>
                  <p className="text-lg font-bold text-rose-500">{formatCurrency(participantDetails.totalBurden, 'JPY')}</p>
                </div>
                <div className="space-y-2">
                  {participantDetails.burdenList.map((item, i) => (
                    <div key={i} className="bg-rose-50 p-2 rounded-lg border border-rose-100">
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="text-ink/80 truncate pr-2">{item.title}</span>
                        <span className="font-bold text-rose-700">-{Math.round(item.share).toLocaleString()}</span>
                      </div>
                      <p className="text-[8px] text-rose-400">{t('settlement.calcFormulaFront')} {item.fullAmount.toLocaleString()}{t('common.jpy')} ÷ {item.count}{t('common.person')}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* 最終計算 */}
              <div className="pt-4 border-t-2 border-dashed border-surface-gray-mid">
                <div className="bg-surface-gray p-4 rounded-2xl">
                  <p className="text-[10px] font-bold text-ink-sub mb-2 uppercase tracking-widest text-center">{t('settlement.summaryResult')}</p>
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-emerald-600 font-bold">{participantDetails.totalPaid.toLocaleString()}</span>
                      <span className="text-ink-light">−</span>
                      <span className="text-rose-500 font-bold">{Math.round(participantDetails.totalBurden).toLocaleString()}</span>
                    </div>
                    <div className="w-20 h-0.5 bg-ink/10 my-1"></div>
                    <p className={`text-2xl font-bold font-sans ${participantDetails.balance >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {participantDetails.balance >= 0 ? '+' : ''}{Math.round(participantDetails.balance).toLocaleString()}
                      <span className="text-xs ml-1">{t('common.jpy')}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedPId(null)}
              className="w-full py-5 bg-surface-gray hover:bg-surface-gray-mid text-ink font-bold text-sm tracking-widest transition-colors rounded-b-[32px]"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettlementView;
