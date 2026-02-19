
import React, { useState, useEffect } from 'react';
import { Participant, Expense, UserProfile } from '../types';
import { PARTICIPANTS, CATEGORIES, CURRENCIES, EXCHANGE_RATE_AUD_TO_JPY } from '../constants';
import { fetchExchangeRate } from '../services/currencyService';

interface Props {
  onAdd: (expense: Omit<import('../types').Expense, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  initialExpense?: Expense | null;
  userProfiles: UserProfile[];
}

const ExpenseForm: React.FC<Props> = ({ onAdd, onCancel, initialExpense, userProfiles }) => {
  const [title, setTitle] = useState(initialExpense?.title || '');
  const [amount, setAmount] = useState(initialExpense?.amount?.toString() || '');
  const [currency, setCurrency] = useState<string>(initialExpense?.currency || 'AUD');
  const [date, setDate] = useState(initialExpense?.date || new Date().toISOString().split('T')[0]);
  const [rate, setRate] = useState<number>(initialExpense?.exchangeRate || EXCHANGE_RATE_AUD_TO_JPY);
  const [sourceUrl, setSourceUrl] = useState<string>(initialExpense?.sourceUrl || '');
  const [paidBy, setPaidBy] = useState<Participant>(initialExpense?.paidBy || PARTICIPANTS[0]);
  const [splitWith, setSplitWith] = useState<Participant[]>(initialExpense?.splitWith || [...PARTICIPANTS]);
  const [category, setCategory] = useState(initialExpense?.category || '食事');
  const [isFetchingRate, setIsFetchingRate] = useState(false);

  const selectedCurrency = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];

  useEffect(() => {
    if (!initialExpense || currency !== initialExpense.currency) {
      setRate(selectedCurrency.defaultRate);
    }
  }, [currency]);

  // リアルタイムレート取得（15秒ごとに更新）
  useEffect(() => {
    if (currency === 'JPY') return;

    const updateRate = async () => {
      const latestRate = await fetchExchangeRate(currency);
      if (latestRate) {
        setRate(latestRate);
      }
    };

    // 初回実行
    updateRate();

    // 定期実行 (15秒)
    const intervalId = setInterval(updateRate, 15000);
    return () => clearInterval(intervalId);
  }, [currency]);

  const handleFetchLatestRate = async () => {
    if (currency === 'JPY' || isFetchingRate) return;
    setIsFetchingRate(true);
    try {
      const latestRate = await fetchExchangeRate(currency);
      if (latestRate) {
        setRate(latestRate);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingRate(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) return;
    onAdd({ title, amount: parseFloat(amount), currency, exchangeRate: rate, sourceUrl, date, paidBy, splitWith, category });
  };

  const handleToggleSplit = (p: Participant) => {
    setSplitWith(prev => prev.includes(p) ? prev.filter(item => item !== p) : [...prev, p]);
  };

  const getDisplayName = (id: string) => {
    return userProfiles.find(p => p.id === id)?.displayName || id;
  };

  return (
    <div className="bg-white p-6 rounded-[32px] space-y-6 border border-surface-gray-mid shadow-sm">
      <div className="flex justify-between items-center border-b border-surface-gray-mid pb-5">
        <h2 className="text-xl font-sans font-bold text-ink">{initialExpense ? '支出を編集' : '新しい支出'}</h2>
        <div className="bg-primary-light px-3 py-1 rounded-full">
          <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">入力</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* タイトル */}
        <div>
          <label className="block text-[10px] font-bold text-ink-sub mb-2 uppercase tracking-widest">タイトル</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-surface-gray border border-surface-gray-mid rounded-2xl px-4 py-4 text-[16px] text-ink focus:border-primary outline-none transition-colors"
            placeholder="例: 夕食, タクシー代..."
            required
          />
        </div>

        {/* 金額・通貨 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-ink-sub mb-2 uppercase tracking-widest">金額</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full bg-surface-gray border border-surface-gray-mid rounded-2xl px-4 py-4 text-[16px] text-ink outline-none"
              placeholder="0.00"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-ink-sub mb-2 uppercase tracking-widest">通貨</label>
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="w-full bg-surface-gray border border-surface-gray-mid rounded-2xl px-4 py-4 text-[16px] text-ink outline-none appearance-none"
            >
              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
            </select>
          </div>
        </div>

        {/* 為替レート */}
        {currency !== 'JPY' && (
          <div className="p-4 rounded-2xl border border-primary/20 bg-primary-light flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">レート (1 {currency} = ?)</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={rate}
                  onChange={e => setRate(parseFloat(e.target.value))}
                  className="w-20 bg-transparent text-right font-bold text-lg text-ink outline-none border-b border-primary/30 focus:border-primary"
                />
                <span className="text-xs font-bold text-ink-sub">円</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleFetchLatestRate}
              disabled={isFetchingRate}
              className="self-end text-[10px] font-bold text-accent uppercase tracking-widest hover:text-primary disabled:opacity-40 transition-opacity"
            >
              {isFetchingRate ? `レート更新中...` : `最新レートを取得 (15秒毎に自動更新)`}
            </button>
          </div>
        )}

        {/* 支払った人 */}
        <div className="space-y-3">
          <label className="block text-[10px] font-bold text-ink-sub uppercase tracking-widest">支払った人</label>
          <div className="flex gap-2">
            {PARTICIPANTS.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPaidBy(p)}
                className={`flex-1 py-3 rounded-xl border font-bold transition-all text-xs ${paidBy === p ? 'border-primary bg-primary text-white' : 'border-surface-gray-mid bg-surface-gray text-ink-sub'}`}
              >
                {getDisplayName(p)}
              </button>
            ))}
          </div>
        </div>

        {/* 割り勘する人 */}
        <div className="space-y-3">
          <label className="block text-[10px] font-bold text-ink-sub uppercase tracking-widest">割り勘する人</label>
          <div className="flex gap-2">
            {PARTICIPANTS.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => handleToggleSplit(p)}
                className={`flex-1 py-3 rounded-xl border font-bold transition-all text-xs ${splitWith.includes(p) ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-surface-gray-mid bg-surface-gray text-ink-sub'}`}
              >
                {getDisplayName(p)}
              </button>
            ))}
          </div>
        </div>

        {/* 日付・カテゴリー */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-ink-sub mb-2 uppercase tracking-widest">日付</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-surface-gray border border-surface-gray-mid rounded-2xl px-4 py-4 text-[16px] text-ink outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-ink-sub mb-2 uppercase tracking-widest">カテゴリー</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-surface-gray border border-surface-gray-mid rounded-2xl px-4 py-4 text-[16px] text-ink outline-none appearance-none"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* ボタン */}
        <div className="pt-4 flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 py-4 text-ink-sub font-bold text-sm hover:text-ink">
            キャンセル
          </button>
          <button
            type="submit"
            className="flex-[2] py-5 bg-primary text-white font-bold text-lg rounded-[24px] shadow-lg shadow-primary/20 active:scale-95 transition-all"
          >
            {initialExpense ? '更新する' : '保存する'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExpenseForm;
