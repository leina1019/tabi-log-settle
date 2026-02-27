import React, { useState, useEffect, useMemo } from 'react';
import { Expense, UserProfile } from '../types';
import { formatCurrency, convertToJPY } from '../utils/currency';
import { CATEGORIES } from '../constants';
import { AppIcon } from './AppIcon';

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

  // 新UI用のステート
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showOverall, setShowOverall] = useState<boolean>(true); // 全体(true) vs メンバー別(false)
  const [visibleMemberIds, setVisibleMemberIds] = useState<string[]>(() => userProfiles.map(u => u.id));

  // 既存の検索・フィルタステート
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // インライン削除確認用
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 旅行期間の日付配列を生成
  const dateRange = useMemo(() => {
    if (!tripStartDate) return [];
    const dates: string[] = [];
    const start = new Date(tripStartDate);
    const end = tripEndDate ? new Date(tripEndDate) : new Date(tripStartDate);
    let current = new Date(start);
    let count = 0;
    while (current <= end && count < 30) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
      count++;
    }
    return dates;
  }, [tripStartDate, tripEndDate]);

  // 選択日初期化
  useEffect(() => {
    if (dateRange.length > 0 && !selectedDate) {
      setSelectedDate(dateRange[0]);
    } else if (dateRange.length === 0 && !selectedDate) {
      setSelectedDate(new Date().toISOString().split('T')[0]);
    }
  }, [dateRange, selectedDate]);

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

  // メンバー選択トグル
  const toggleMember = (id: string) => {
    setVisibleMemberIds(prev =>
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    );
  };

  const isTodayDate = (dateStr: string) => {
    if (!dateStr) return false;
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

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
    <div className="flex flex-col h-full bg-surface-gray relative pb-28 pt-2">
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
            {/* 全体 / 個別 トグル */}
            <div className="flex bg-white shadow-sm p-1 rounded-full mb-3 max-w-[280px] border border-surface-gray-mid/50">
              <button
                onClick={() => setShowOverall(true)}
                className={`flex-1 py-1.5 text-[10px] uppercase tracking-widest font-bold rounded-full transition-all duration-300 ${showOverall ? 'bg-primary text-white shadow-sm' : 'text-ink-sub hover:text-ink'}`}
              >
                全員の支出
              </button>
              <button
                onClick={() => setShowOverall(false)}
                className={`flex-1 py-1.5 text-[10px] uppercase tracking-widest font-bold rounded-full transition-all duration-300 ${!showOverall ? 'bg-primary text-white shadow-sm' : 'text-ink-sub hover:text-ink'}`}
              >
                個人の記録
              </button>
            </div>

            {/* メンバー選択（個別モードのみ） */}
            {!showOverall && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3 mb-1 animate-in fade-in slide-in-from-top-2 duration-300">
                {userProfiles.map(p => (
                  <button
                    key={p.id}
                    onClick={() => toggleMember(p.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap transition-all border shadow-sm ${visibleMemberIds.includes(p.id) ? 'bg-white border-primary/20 text-ink' : 'bg-surface-gray border-transparent text-ink-light grayscale opacity-50 hover:opacity-80'}`}
                  >
                    <div className="w-4 h-4 rounded-full overflow-hidden" style={{ backgroundColor: p.color }}>
                      {p.avatarUrl ? <img src={p.avatarUrl} className="w-full h-full object-cover" alt="" /> : null}
                    </div>
                    <span className="text-[10px] font-bold">{p.displayName}</span>
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
            <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x pt-1 pb-4 px-4 bg-gradient-to-r from-surface-gray via-transparent to-surface-gray mask-edges">
              {dateRange.map((dateStr, index) => {
                const isSelected = dateStr === selectedDate;
                const isToday = isTodayDate(dateStr);
                const day = dateStr.split('-')[2];

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`relative flex-shrink-0 flex flex-col items-center justify-center w-14 h-16 rounded-[20px] transition-all snap-start ${isSelected
                      ? 'bg-primary text-white shadow-lg shadow-primary/30 -translate-y-1'
                      : 'bg-white/80 text-ink-sub hover:bg-white hover:-translate-y-0.5 shadow-sm border border-surface-gray-mid'
                      }`}
                  >
                    <span className={`text-[9px] font-black uppercase tracking-widest ${isSelected ? 'text-white/80' : 'text-ink-light'}`}>
                      Day {index + 1}
                    </span>
                    <span className={`text-lg font-sans font-black mt-0.5 ${isSelected ? 'text-white' : 'text-ink'}`}>
                      {day}
                    </span>

                    {/* TODAYバッジ */}
                    {isToday && (
                      <div className={`absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full text-[8px] font-black tracking-wider shadow-sm transform rotate-6 border ${isSelected ? 'bg-white text-primary border-transparent' : 'bg-accent text-white border-white'
                        }`}>
                        TODAY
                      </div>
                    )}
                  </button>
                );
              })}
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
