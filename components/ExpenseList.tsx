import React, { useState, useEffect, useMemo } from 'react';
import { Expense, UserProfile } from '../types';
import { formatCurrency, convertToJPY } from '../utils/currency';
import { CATEGORIES } from '../constants';
import { AppIcon } from './AppIcon';
import { useTripDates } from '../hooks/useTripDates';
import { useMemberFilter } from '../hooks/useMemberFilter';

interface Props {
  expenses: Expense[];
  onDelete: (id: string) => void;
  onEdit: (expense: Expense) => void;
  onResetAll: () => void;
  userProfiles: UserProfile[];
  tripStartDate?: string;
  tripEndDate?: string;
}

const ExpenseList: React.FC<Props> = ({ expenses, onDelete, onEdit, onResetAll, userProfiles, tripStartDate, tripEndDate }) => {
  const [resetStage, setResetStage] = useState<'idle' | 'confirm'>('idle');

  // 共通 Hook
  const { selectedDate, setSelectedDate, dateRange, getDayLabel, isTodayDate } = useTripDates(tripStartDate, tripEndDate);
  const { showOverall, setShowOverall, visibleMemberIds, setVisibleMemberIds, toggleMember } = useMemberFilter(userProfiles);

  // 既存の検索・フィルタステート
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // インライン削除確認用
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  // フィルタリング処理（検索語録 ＋ 日付 ＋ メンバー ＋ カテゴリ）
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      // 1. 日付で絞り込み (未設定や範囲外の古いデータも拾えるようフォールバックも考慮する場合は適宜調整、基本は選択日のみ)
      if (selectedDate && exp.date !== selectedDate) return false;

      // 2. 検索語で絞り込み
      if (searchQuery && !exp.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;

      // 3. カテゴリで絞り込み
      if (selectedCategory !== 'All' && exp.category !== selectedCategory) return false;

      // 4. 「全体」と「個人のスケジュール」設定で絞り込み
      if (!showOverall) {
        // メンバー別表示モードのときは、visibleMemberIds に含まれるメンバーが支払った記録のみ表示
        if (!visibleMemberIds.includes(exp.paidBy)) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, selectedDate, searchQuery, selectedCategory, showOverall, visibleMemberIds]);



  // 1件もない場合（完全に空アプリの状態）
  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <span className="text-4xl">🧾</span>
        </div>
        <p className="font-bold text-ink mb-1">支出の記録がまだありません</p>
        <p className="text-xs text-ink-light">右下の「+」ボタンから記録してみましょう</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-surface-gray relative pb-20 pt-1">
      {/* 画面上部：日付ピッカー＆フィルタ トグル */}
      <div className="sticky top-0 z-40 bg-surface-gray pb-2 sm:pt-4">
        <div className="absolute inset-0 bg-surface-gray/95 backdrop-blur-xl border-b border-surface-gray-mid"></div>

        <div className="relative pt-4 sm:pt-0">
          <div className="px-4 flex justify-between items-center mb-4">
            <h2 className="text-[20px] font-sans font-black tracking-widest uppercase text-ink flex items-center gap-2">
              <AppIcon name="history" className="w-5 h-5 text-primary" />
              SPEND
            </h2>
            <span className="text-[10px] font-bold bg-primary-light text-primary px-2 py-0.5 rounded-full">{expenses.length} 件</span>
          </div>

          <div className="px-4">
            {/* 全体 / 個別 トグル - チケットセクション統一デザイン */}
            <div className="flex bg-white/80 p-1 rounded-full mb-4 mx-auto w-full max-w-[320px] shadow-sm border border-surface-gray-mid/50">
              <button
                onClick={() => setShowOverall(true)}
                className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-full transition-all duration-500 flex items-center justify-center gap-2.5 ${showOverall ? 'bg-ink text-white shadow-xl shadow-ink/20 scale-[1.02]' : 'bg-transparent text-ink-sub hover:text-ink'}`}
              >
                <span className="text-sm">🌎</span>
                全員
              </button>
              <button
                onClick={() => setShowOverall(false)}
                className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-full transition-all duration-500 flex items-center justify-center gap-2.5 ${!showOverall ? 'bg-ink text-white shadow-xl shadow-ink/20 scale-[1.02]' : 'bg-transparent text-ink-sub hover:text-ink'}`}
              >
                <span className="text-sm">👤</span>
                個人
              </button>
            </div>

            {/* メンバー選択（個別モードのみ） */}
            {!showOverall && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-4 mb-1 animate-in fade-in slide-in-from-top-2 duration-500 justify-start sm:justify-center">
                {userProfiles.map(p => (
                  <button
                    key={p.id}
                    onClick={() => toggleMember(p.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all border-2 shadow-sm ${visibleMemberIds.includes(p.id) ? 'bg-white border-primary/30 text-ink scale-105' : 'bg-white/40 border-transparent text-ink-light opacity-60 hover:opacity-100'}`}
                  >
                    <div className="w-5 h-5 rounded-full overflow-hidden border border-white" style={{ backgroundColor: p.color }}>
                      {p.avatarUrl ? <img src={p.avatarUrl} className="w-full h-full object-cover" alt="" /> : null}
                    </div>
                    <span className="text-[10px] font-black">{p.displayName}</span>
                  </button>
                ))}
              </div>
            )}

            {/* 検索・カテゴリ フィルターバー */}
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="タイトルで検索..."
                  className="w-full bg-white border border-surface-gray-mid rounded-xl pl-9 pr-3 py-2 text-xs text-ink placeholder-ink-light outline-none focus:border-primary transition-colors h-10 shadow-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="relative flex-shrink-0">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="appearance-none bg-white border border-surface-gray-mid rounded-xl pl-4 pr-8 py-2 text-[10px] font-bold text-ink outline-none focus:border-primary transition-colors h-10 shadow-sm cursor-pointer"
                >
                  <option value="All">すべてのカテゴリ</option>
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-ink-light">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
          </div>

          {/* 日付横スクロールバー */}
          {dateRange.length > 0 && (
            <div className="overflow-x-auto scrollbar-hide mb-2 px-4 pt-4">
              <div className="flex gap-3 pb-2 min-w-min">
                {dateRange.map((d, i) => {
                  const label = getDayLabel(d, i);
                  const isSelected = selectedDate === d;
                  const isToday = isTodayDate(d);

                  return (
                    <div key={d} className="relative pt-4 pb-2">
                      {isToday && (
                        <div className="absolute top-1 left-1/2 -translate-x-1/2 z-20 bg-white px-2 py-0.5 rounded-full shadow-md border border-primary/10">
                          <span className="text-[7px] font-black text-primary tracking-widest whitespace-nowrap">TODAY</span>
                        </div>
                      )}
                      <button
                        onClick={() => setSelectedDate(d)}
                        className={`flex-shrink-0 flex flex-col items-center justify-center w-20 h-24 rounded-[28px] border transition-all active:scale-95 ${isSelected
                          ? 'bg-primary border-primary shadow-xl shadow-primary/20 scale-105 z-10'
                          : 'bg-white border-surface-gray-mid/50 text-ink-light'
                          }`}
                      >
                        <span className={`text-[9px] font-black uppercase tracking-tighter mb-1.5 ${isSelected ? 'text-white/70' : 'text-ink-sub'}`}>
                          {label.day}
                        </span>

                        <span className={`text-2xl font-black leading-none ${isSelected ? 'text-white' : 'text-ink'}`}>
                          {label.date}
                        </span>

                        <div className="flex items-center gap-1 mt-2">
                          <span className={`text-[9px] font-bold ${isSelected ? 'text-white/50' : 'text-ink-sub/40'}`}>
                            {label.week}
                          </span>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 支出リストエリア */}
      <div className="px-4 py-4 space-y-4">
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-20 animate-in fade-in duration-500">
            <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/10">
              <span className="text-4xl filter grayscale opacity-50">🧾</span>
            </div>
            <p className="font-bold text-ink mb-1 text-sm">条件に一致する記録はありません</p>
            <p className="text-[10px] text-ink-light font-bold uppercase tracking-widest">NO EXPENSES</p>
          </div>
        ) : (
          filteredExpenses.map((exp) => {
            const profile = getProfile(exp.paidBy);
            return (
              <div key={exp.id} className={`bg-white rounded-[24px] overflow-hidden transition-all shadow-sm border ${exp.hasConflict ? 'border-red-400/50' : 'border-surface-gray-mid'}`}>
                <div className="p-5">
                  {exp.hasConflict && (
                    <div className="mb-3 bg-red-500/10 p-2 rounded-lg border border-red-500/20 text-[10px] text-red-500 font-bold">
                      ⚠️ 同期の競合が検出されました
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 pr-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md text-[9px] font-bold bg-primary-light text-primary border border-primary/10">
                          {exp.category}
                        </span>
                        {exp.isLocalOnly && (
                          <span className="text-[9px] text-amber-500 font-bold animate-pulse">● 同期中</span>
                        )}
                      </div>
                      <h4 className="font-bold text-ink text-lg leading-snug break-all">{exp.title}</h4>
                    </div>
                    <div className="text-right flex-shrink-0 mt-1">
                      <p className="font-sans font-black text-2xl text-ink leading-none">
                        {exp.currency === 'JPY' ? '¥' : exp.currency === 'USD' ? '$' : exp.currency === 'EUR' ? '€' : exp.currency === 'AUD' ? 'A$' : exp.currency}
                        {exp.amount.toLocaleString()}
                      </p>
                      {exp.currency !== 'JPY' && (
                        <p className="text-[10px] text-primary font-bold mt-1.5">
                          ≈ {formatCurrency(convertToJPY(exp.amount, exp.currency, exp.exchangeRate), 'JPY')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 支払い者・割り勘情報 */}
                  <div className="flex items-center gap-3 text-sm text-ink-sub bg-surface-gray p-3 rounded-xl border border-surface-gray-mid mt-4">
                    <div className="flex items-center gap-2 font-bold text-ink">
                      <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center bg-primary-light border border-white shadow-sm">
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
                      <span className="text-xs">{profile.displayName}</span>
                    </div>
                    <span className="text-surface-gray-mid opacity-50">|</span>
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-xs text-ink-light">{exp.splitWith.length} 人で割り勘</span>
                    </div>
                    <div className="ml-auto text-[10px] text-ink-light font-bold">
                      {exp.date.split('-').slice(1).join('/')}
                    </div>
                  </div>
                </div>

                {/* アクションボタン - インライン削除確認 */}
                <div className="flex border-t border-surface-gray-mid bg-surface-gray/50 relative z-20">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onEdit(exp); }}
                    className="flex-1 py-4 flex items-center justify-center text-[10px] uppercase tracking-widest text-primary font-bold border-r border-surface-gray-mid hover:bg-primary/5 active:bg-primary/10 transition-colors cursor-pointer"
                  >
                    編集
                  </button>
                  {deletingId === exp.id ? (
                    <div className="flex flex-1 animate-in fade-in duration-200">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onDelete(exp.id); setDeletingId(null); }}
                        className="flex-1 py-4 flex items-center justify-center text-[10px] font-black tracking-widest text-white bg-rose-500 hover:bg-rose-600 transition-colors cursor-pointer"
                      >
                        削除する
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setDeletingId(null); }}
                        className="flex-1 py-4 flex items-center justify-center text-[10px] font-bold tracking-widest text-ink-sub hover:bg-surface-gray transition-colors cursor-pointer border-l border-surface-gray-mid"
                      >
                        戻る
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setDeletingId(exp.id); }}
                      className="flex-1 py-4 flex items-center justify-center text-[10px] uppercase tracking-widest text-rose-500 font-bold hover:bg-rose-50 active:bg-rose-100 transition-colors cursor-pointer"
                    >
                      削除
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 管理メニュー */}
      {filteredExpenses.length > 0 && (
        <div className="px-4 mt-8 pt-8 border-t border-surface-gray-mid border-dashed">
          <p className="text-center text-[10px] text-ink-light mb-4 font-bold tracking-[0.2em] uppercase">データ管理</p>
          {resetStage === 'idle' ? (
            <button onClick={() => setResetStage('confirm')} className="w-full py-4 text-ink-light border border-dashed border-surface-gray-mid font-bold text-[10px] uppercase tracking-widest rounded-2xl hover:bg-white transition-all shadow-sm bg-surface-gray">
              すべての支出データをリセット
            </button>
          ) : (
            <button onClick={() => { onResetAll(); setResetStage('idle'); }} className="w-full py-4 bg-rose-500 text-white font-bold text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-rose-500/20 active:scale-95 transition-transform animate-in fade-in zoom-in duration-200">
              本当にリセットしますか？
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ExpenseList;
