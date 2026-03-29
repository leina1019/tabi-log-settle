
import React, { useState, useEffect } from 'react';
import { Participant, Expense, UserProfile } from '../types';
import { CATEGORIES, CURRENCIES, EXCHANGE_RATE_AUD_TO_JPY, getCategoryId } from '../constants';
import { fetchExchangeRate } from '../services/currencyService';
import { convertToJPY } from '../utils/currency';
import { useTranslation } from '../contexts/LanguageContext';

interface Props {
  onAdd: (expense: Omit<import('../types').Expense, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  initialExpense?: Expense | null;
  userProfiles: UserProfile[];
  tripStartDate?: string;
  tripEndDate?: string;
}

// カテゴリーにアイコンを対応付け
const CATEGORY_ICONS: Record<string, string> = {
  '食事': '🍽️',
  '交通': '🚌',
  '宿泊': '🏨',
  '観光': '🗺️',
  'お土産': '🛍️',
  '通信費': '📶',
  '会議費': '💼',
  'その他': '📌',
};

const ExpenseForm: React.FC<Props> = ({ onAdd, onCancel, initialExpense, userProfiles, tripStartDate, tripEndDate }) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState(initialExpense?.title || '');
  const [amount, setAmount] = useState(initialExpense?.amount?.toString() || '');
  const [currency, setCurrency] = useState<string>(initialExpense?.currency || 'AUD');
  const [date, setDate] = useState(initialExpense?.date || new Date().toISOString().split('T')[0]);
  const [rate, setRate] = useState<number>(initialExpense?.exchangeRate || EXCHANGE_RATE_AUD_TO_JPY);
  const [sourceUrl, setSourceUrl] = useState<string>(initialExpense?.sourceUrl || '');
  const [paidBy, setPaidBy] = useState<Participant>(initialExpense?.paidBy || userProfiles[0]?.id || '');
  const [splitWith, setSplitWith] = useState<Participant[]>(initialExpense?.splitWith || userProfiles.map(u => u.id));
  const [category, setCategory] = useState(initialExpense?.category || '食事');
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  // バリデーションエラー表示用
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedCurrency = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];

  // JPYリアルタイム換算 (U2): 金額・レートに連動して表示
  const amountNum = parseFloat(amount) || 0;
  const jpyPreview = currency === 'JPY'
    ? amountNum
    : Math.round(convertToJPY(amountNum, currency as any, rate));

  // B4修正: setIntervalを廃止し、通貨変更時に1回だけAPIを叩く
  useEffect(() => {
    if (currency === 'JPY') {
      setRate(1);
      return;
    }
    // 既存の編集で通貨が変わっていない場合はAPIを叩かない
    if (initialExpense && currency === initialExpense.currency) {
      setRate(initialExpense.exchangeRate);
      return;
    }
    // 通貨変更時に1回だけ取得
    const fetchOnce = async () => {
      setIsFetchingRate(true);
      try {
        const latestRate = await fetchExchangeRate(currency);
        if (latestRate) setRate(latestRate);
        else setRate(selectedCurrency.defaultRate);
      } catch {
        setRate(selectedCurrency.defaultRate);
      } finally {
        setIsFetchingRate(false);
      }
    };
    fetchOnce();
  }, [currency]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFetchLatestRate = async () => {
    if (currency === 'JPY' || isFetchingRate) return;
    setIsFetchingRate(true);
    try {
      const latestRate = await fetchExchangeRate(currency);
      if (latestRate) setRate(latestRate);
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingRate(false);
    }
  };

  // B1・B2・B3 修正: バリデーション強化
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) newErrors.title = t('expenseForm.errTitle');
    if (!amount || amountNum <= 0) newErrors.amount = t('expenseForm.errAmount');
    if (!paidBy) newErrors.paidBy = t('expenseForm.errPaidBy');
    if (splitWith.length === 0) newErrors.splitWith = t('expenseForm.errSplitWith');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onAdd({
      title: title.trim(),
      amount: amountNum,
      currency,
      exchangeRate: rate,
      sourceUrl,
      date,
      paidBy,
      splitWith,
      category
    });
  };

  const handleToggleSplit = (p: Participant) => {
    setSplitWith(prev => prev.includes(p) ? prev.filter(item => item !== p) : [...prev, p]);
  };

  return (
    <div className="bg-white rounded-[32px] border border-surface-gray-mid shadow-sm overflow-hidden">
      {/* ヘッダー */}
      <div className="bg-ocean-dark px-6 py-5 flex justify-between items-center">
        <div>
          <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-0.5">
            {initialExpense ? t('common.editMode') : t('common.newEntry')}
          </p>
          <h2 className="text-xl font-sans font-bold text-white">
            {initialExpense ? t('expenseForm.editTitle') : ('💳 ' + t('expenseForm.addTitle'))}
          </h2>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-7">

        {/* ─── グループ1: 何に使ったか ─── */}
        <div className="space-y-5">
          <p className="text-[9px] font-black text-ink-light uppercase tracking-[0.25em] flex items-center gap-2">
            <span className="flex-1 h-px bg-surface-gray-mid" />
            {t('expenseForm.whatFor')}
            <span className="flex-1 h-px bg-surface-gray-mid" />
          </p>

          {/* タイトル */}
          <div>
            <label className="block text-[10px] font-bold text-ink-sub mb-2 uppercase tracking-widest">
              {t('expenseForm.title')} <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => { setTitle(e.target.value); setErrors(p => ({ ...p, title: '' })); }}
              className={`w-full bg-surface-gray border-2 rounded-2xl px-4 py-4 text-[16px] text-ink outline-none transition-colors ${errors.title ? 'border-rose-400' : 'border-transparent focus:border-primary/40'}`}
              placeholder={t('expenseForm.titlePlaceholder')}
            />
            {errors.title && <p className="text-xs text-rose-500 font-bold mt-1.5 ml-1">{errors.title}</p>}
          </div>

          {/* カテゴリー - U1: アイコン付きボタングリッド */}
          <div>
            <label className="block text-[10px] font-bold text-ink-sub mb-3 uppercase tracking-widest">{t('expenseForm.category')}</label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl border-2 font-bold transition-all active:scale-95 ${category === c
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : 'border-surface-gray-mid bg-surface-gray text-ink-sub hover:border-primary/30'
                    }`}
                >
                  <span className="text-xl leading-none">{CATEGORY_ICONS[c] || '📌'}</span>
                  <span className="text-[9px] font-bold leading-none">{t(`categories.${getCategoryId(c)}`)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ─── グループ2: 金額 ─── */}
        <div className="space-y-5">
          <p className="text-[9px] font-black text-ink-light uppercase tracking-[0.25em] flex items-center gap-2">
            <span className="flex-1 h-px bg-surface-gray-mid" />
            {t('expenseForm.amount')}
            <span className="flex-1 h-px bg-surface-gray-mid" />
          </p>

          {/* 金額・通貨 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-ink-sub mb-2 uppercase tracking-widest">
                {t('expenseForm.amount')} <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={amount}
                onChange={e => { setAmount(e.target.value); setErrors(p => ({ ...p, amount: '' })); }}
                className={`w-full bg-surface-gray border-2 rounded-2xl px-4 py-4 text-[16px] text-ink outline-none transition-colors ${errors.amount ? 'border-rose-400' : 'border-transparent focus:border-primary/40'}`}
                placeholder="0.00"
              />
              {errors.amount && <p className="text-xs text-rose-500 font-bold mt-1.5 ml-1">{errors.amount}</p>}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-ink-sub mb-2 uppercase tracking-widest">{t('expenseForm.currency')}</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full bg-surface-gray border-2 border-transparent focus:border-primary/40 rounded-2xl px-4 py-4 text-[16px] text-ink outline-none appearance-none transition-colors"
              >
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
              </select>
            </div>
          </div>

          {/* U2: JPYリアルタイム換算プレビュー */}
          {amountNum > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-2xl px-5 py-3 flex justify-between items-center animate-in fade-in duration-200">
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{t('expenseForm.jpyConvert')}</span>
              <span className="text-xl font-sans font-black text-primary">
                ≈ ¥{jpyPreview.toLocaleString()}
              </span>
            </div>
          )}

          {/* 為替レート（JPY以外のとき） */}
          {currency !== 'JPY' && (
            <div className="p-4 rounded-2xl border border-surface-gray-mid bg-surface-gray flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-ink-sub uppercase tracking-wider">
                  {t('expenseForm.ratePrefix')} (1 {currency} =)
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={rate}
                    onChange={e => setRate(parseFloat(e.target.value))}
                    className="w-20 bg-transparent text-right font-bold text-lg text-ink outline-none border-b-2 border-primary/30 focus:border-primary transition-colors"
                  />
                  <span className="text-xs font-bold text-ink-sub">{t('common.jpy')}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleFetchLatestRate}
                disabled={isFetchingRate}
                className="self-end text-[10px] font-bold text-primary uppercase tracking-widest hover:opacity-70 disabled:opacity-40 transition-opacity"
              >
                {isFetchingRate ? t('expenseForm.fetchingRate') : t('expenseForm.updateRate')}
              </button>
            </div>
          )}

          {/* 日付 */}
          <div>
            <label className="block text-[10px] font-bold text-ink-sub mb-2 uppercase tracking-widest">{t('expenseForm.date')}</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              min={tripStartDate}
              max={tripEndDate}
              className="w-full bg-surface-gray border-2 border-transparent focus:border-primary/40 rounded-2xl px-4 py-4 text-[16px] text-ink outline-none transition-colors"
            />
          </div>
        </div>

        {/* ─── グループ3: 誰が・誰と ─── */}
        <div className="space-y-5">
          <p className="text-[9px] font-black text-ink-light uppercase tracking-[0.25em] flex items-center gap-2">
            <span className="flex-1 h-px bg-surface-gray-mid" />
            {t('expenseForm.whoAndWith')}
            <span className="flex-1 h-px bg-surface-gray-mid" />
          </p>

          {/* 支払った人 */}
          <div className="space-y-3">
            <label className="block text-[10px] font-bold text-ink-sub uppercase tracking-widest">
              {t('expenseForm.paidBy')} <span className="text-rose-400">*</span>
            </label>
            <div className="flex gap-2 flex-wrap">
              {userProfiles.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setPaidBy(p.id); setErrors(prev => ({ ...prev, paidBy: '' })); }}
                  className={`flex-1 min-w-[60px] py-3.5 rounded-2xl border-2 font-bold transition-all text-sm active:scale-95 ${paidBy === p.id
                      ? 'border-primary bg-primary text-white shadow-md shadow-primary/20'
                      : 'border-surface-gray-mid bg-surface-gray text-ink-sub hover:border-primary/30'
                    }`}
                >
                  {p.displayName}
                </button>
              ))}
            </div>
            {errors.paidBy && <p className="text-xs text-rose-500 font-bold">{errors.paidBy}</p>}
          </div>

          {/* 割り勘する人 */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="block text-[10px] font-bold text-ink-sub uppercase tracking-widest">
                {t('expenseForm.splitWith')} <span className="text-rose-400">*</span>
              </label>
              <span className="text-[9px] font-bold text-ink-light">
                {splitWith.length}{t('common.person')} / {userProfiles.length}{t('common.person')}
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {userProfiles.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { handleToggleSplit(p.id); setErrors(prev => ({ ...prev, splitWith: '' })); }}
                  className={`flex-1 min-w-[60px] py-3.5 rounded-2xl border-2 font-bold transition-all text-sm active:scale-95 ${splitWith.includes(p.id)
                      ? 'border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                      : 'border-surface-gray-mid bg-surface-gray text-ink-sub hover:border-emerald-300'
                    }`}
                >
                  {p.displayName}
                </button>
              ))}
            </div>
            {errors.splitWith && <p className="text-xs text-rose-500 font-bold">{errors.splitWith}</p>}
          </div>
        </div>

        {/* ─── グループ4: メモ（任意） ─── */}
        {/* U3: sourceUrlラベルをわかりやすく変更 */}
        <div>
          <label className="block text-[10px] font-bold text-ink-sub mb-2 uppercase tracking-widest">
            {t('expenseForm.memo')}
          </label>
          <input
            type="text"
            value={sourceUrl}
            onChange={e => setSourceUrl(e.target.value)}
            className="w-full bg-surface-gray border-2 border-transparent focus:border-primary/40 rounded-2xl px-4 py-3.5 text-sm text-ink outline-none transition-colors"
            placeholder={t('expenseForm.memoPlaceholder')}
          />
        </div>

        {/* ボタン */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-4 text-ink-sub font-bold text-sm border-2 border-surface-gray-mid rounded-2xl hover:bg-surface-gray transition-colors active:scale-95"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            className="flex-[2] py-5 bg-primary text-white font-bold text-lg rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-all hover:bg-primary/90"
          >
            {initialExpense ? ('✓ ' + t('common.update')) : ('💾 ' + t('expenseForm.save'))}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExpenseForm;
