
import React, { useState, useEffect, useMemo } from 'react';
import { Expense, UserProfile } from '../types';
import { formatCurrency, convertToJPY } from '../utils/currency';
import { CATEGORIES, PARTICIPANTS } from '../constants';

interface Props {
  expenses: Expense[];
  onDelete: (id: string) => void;
  onEdit: (expense: Expense) => void;
  onResetAll: () => void;
  userProfiles: UserProfile[];
}

const ExpenseList: React.FC<Props> = ({ expenses, onDelete, onEdit, onResetAll, userProfiles }) => {
  const [resetStage, setResetStage] = useState<'idle' | 'confirm'>('idle');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedPayer, setSelectedPayer] = useState<string>('All');

  useEffect(() => {
    if (resetStage === 'confirm') {
      const timer = setTimeout(() => setResetStage('idle'), 3000);
      return () => clearTimeout(timer);
    }
  }, [resetStage]);

  const getProfile = (id: string) => {
    return userProfiles.find(p => p.id === id) || { id, displayName: id, avatarUrl: '' };
  };

  const getBackgroundColor = (id: string) => {
    const colors = ['bg-indigo-400', 'bg-rose-400', 'bg-emerald-400', 'bg-amber-400', 'bg-sky-400'];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const matchesSearch = exp.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || exp.category === selectedCategory;
      const matchesPayer = selectedPayer === 'All' || exp.paidBy === selectedPayer;
      return matchesSearch && matchesCategory && matchesPayer;
    });
  }, [expenses, searchQuery, selectedCategory, selectedPayer]);

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-ink-light">
        <p className="font-medium text-lg">まだ記録がありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2 pb-20">
      <div className="flex justify-between items-center px-2">
        <h3 className="text-xl font-sans font-bold text-ink tracking-wide">履歴</h3>
        <span className="text-[10px] font-bold bg-primary-light text-primary px-2 py-0.5 rounded-full">{expenses.length} 件</span>
      </div>

      {/* 検索・フィルター */}
      <div className="space-y-3 sticky top-0 z-30 bg-surface-gray/95 backdrop-blur-md py-2 -mx-4 px-4 border-b border-surface-gray-mid">
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="タイトルで検索..."
            className="w-full bg-white border border-surface-gray-mid rounded-xl pl-10 pr-4 py-2.5 text-sm text-ink placeholder-ink-light outline-none focus:border-primary transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${selectedCategory === 'All' ? 'bg-primary border-primary text-white' : 'bg-white border-surface-gray-mid text-ink-sub'}`}
          >
            ALL
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${selectedCategory === cat ? 'bg-primary border-primary text-white' : 'bg-white border-surface-gray-mid text-ink-sub'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filteredExpenses.length === 0 ? (
        <div className="text-center py-10 text-ink-light text-sm">条件に一致する履歴はありません</div>
      ) : (
        filteredExpenses.map((exp) => {
          const profile = getProfile(exp.paidBy);
          return (
            <div key={exp.id} className={`bg-white rounded-[24px] overflow-hidden transition-all shadow-sm border ${exp.hasConflict ? 'border-red-400/50' : 'border-surface-gray-mid'}`}>
              <div className="p-5">
                {exp.hasConflict && (
                  <div className="mb-3 bg-red-500/10 p-2 rounded-lg border border-red-500/20 text-[10px] text-red-500 font-bold">
                    ⚠️ Sync Conflict Detected
                  </div>
                )}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block px-2.5 py-0.5 rounded-md text-[9px] font-bold bg-primary-light text-primary border border-primary/10">
                        {exp.category}
                      </span>
                      {exp.isLocalOnly && (
                        <span className="text-[9px] text-amber-500 font-bold animate-pulse">● 同期中</span>
                      )}
                    </div>
                    <h4 className="font-bold text-ink text-lg leading-snug">{exp.title}</h4>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-sans font-bold text-xl text-ink">
                      {exp.currency === 'JPY' ? '¥' : exp.currency === 'USD' ? '$' : exp.currency === 'EUR' ? '€' : exp.currency === 'AUD' ? 'A$' : exp.currency}
                      {exp.amount.toLocaleString()}
                    </p>
                    {exp.currency !== 'JPY' && (
                      <p className="text-[10px] text-primary font-bold mt-0.5">
                        ≈ {formatCurrency(convertToJPY(exp.amount, exp.currency, exp.exchangeRate), 'JPY')}
                      </p>
                    )}
                  </div>
                </div>

                {/* 支払い者・割り勘情報 */}
                <div className="flex items-center gap-3 text-sm text-ink-sub bg-surface-gray p-3 rounded-xl border border-surface-gray-mid">
                  <div className="flex items-center gap-2 font-bold text-ink">
                    <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center bg-primary-light">
                      {profile.avatarUrl ? (
                        <img src={profile.avatarUrl} alt={profile.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full ${getBackgroundColor(exp.paidBy)} flex items-center justify-center`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {profile.displayName}
                  </div>
                  <span className="text-surface-gray-mid">|</span>
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-xs">{exp.splitWith.length} 人で割り勘</span>
                  </div>
                  <div className="ml-auto text-[10px] text-ink-light font-bold">
                    {exp.date.split('-').slice(1).join('/')}
                  </div>
                </div>
              </div>

              {/* アクションボタン */}
              <div className="flex border-t border-surface-gray-mid bg-surface-gray relative z-20">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onEdit(exp); }}
                  className="flex-1 py-4 flex items-center justify-center text-[10px] uppercase tracking-widest text-primary font-bold border-r border-surface-gray-mid hover:bg-primary-light active:bg-primary/10 transition-colors cursor-pointer"
                >
                  編集
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); if (window.confirm('本当に削除しますか？')) onDelete(exp.id); }}
                  className="flex-1 py-4 flex items-center justify-center text-[10px] uppercase tracking-widest text-rose-500 font-bold hover:bg-rose-50 active:bg-rose-100 transition-colors cursor-pointer"
                >
                  削除
                </button>
              </div>
            </div>
          );
        })
      )}

      {/* 管理メニュー */}
      <div className="mt-12 pt-8 border-t border-surface-gray-mid">
        <p className="text-center text-[10px] text-ink-light mb-4 font-bold tracking-widest uppercase">管理メニュー</p>
        {resetStage === 'idle' ? (
          <button onClick={() => setResetStage('confirm')} className="w-full py-3 text-ink-light border border-dashed border-surface-gray-mid font-bold text-xs rounded-xl hover:bg-surface-gray transition-all">
            データをリセット
          </button>
        ) : (
          <button onClick={() => { onResetAll(); setResetStage('idle'); }} className="w-full py-3 bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-500/20">
            本当にリセットしますか？
          </button>
        )}
      </div>
    </div>
  );
};

export default ExpenseList;
