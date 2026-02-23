import React, { useState, useMemo, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Expense, Settlement, Participant, UserProfile } from '../types';
import { formatCurrency, convertToJPY } from '../utils/currency';

interface Props {
  expenses: Expense[];
  settlements: Settlement[];
  budget: number;
  onBudgetChange: (val: number) => void;
  onOpenSettle: () => void;
  tripStartDate: string;
  tripEndDate: string;
  onTripDatesChange: (start: string, end: string) => void;
  tripName: string;
  onTripNameChange: (val: string) => void;
  userProfiles: UserProfile[];
  tripCoverImage: string;
  onTripCoverImageChange: (url: string) => void;
  isTablet?: boolean;
}

const Dashboard: React.FC<Props> = ({
  expenses,
  settlements,
  budget,
  onBudgetChange,
  onOpenSettle,
  tripStartDate,
  tripEndDate,
  onTripDatesChange,
  tripName,
  onTripNameChange,
  userProfiles,
  tripCoverImage,
  onTripCoverImageChange,
  isTablet = false
}) => {
  const [selectedMemberId, setSelectedMemberId] = useState<Participant | 'ALL' | null>(null);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState(budget.toString());
  const [isEditingTrip, setIsEditingTrip] = useState(false);
  const [tempTripName, setTempTripName] = useState(tripName);
  const [tempStart, setTempStart] = useState(tripStartDate);
  const [tempEnd, setTempEnd] = useState(tripEndDate);
  const [tempCoverImage, setTempCoverImage] = useState(tripCoverImage);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalJPY = expenses.reduce((sum, e) => sum + convertToJPY(e.amount, e.currency, e.exchangeRate), 0);
  const budgetPercentage = Math.min((totalJPY / budget) * 100, 100);

  // --- Calculations ---
  const memberStats = useMemo(() => {
    return userProfiles.map(p => {
      const pId = p.id;
      const paidTotal = expenses
        .filter(e => e.paidBy === pId)
        .reduce((sum, e) => sum + convertToJPY(e.amount, e.currency, e.exchangeRate), 0);
      const costTotal = expenses.reduce((sum, e) => {
        if (e.splitWith.includes(pId)) {
          return sum + (convertToJPY(e.amount, e.currency, e.exchangeRate) / (e.splitWith.length || 1));
        }
        return sum;
      }, 0);
      return { id: pId, paid: paidTotal, cost: costTotal, balance: paidTotal - costTotal };
    });
  }, [expenses, userProfiles]);

  // 新機能: 支出サマリー用の集計データ
  const summaryData = useMemo(() => {
    const foreignCurrencyMap: Record<string, number> = {};
    expenses.forEach(e => {
      if (e.currency !== 'JPY') {
        foreignCurrencyMap[e.currency] = (foreignCurrencyMap[e.currency] || 0) + e.amount;
      }
    });

    const dailyMap: Record<string, Record<string, number>> = {};

    // 旅行の全日程を初期化
    if (tripStartDate && tripEndDate) {
      const start = new Date(tripStartDate);
      const end = new Date(tripEndDate);
      // 安全のため最大31日分に制限
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        dailyMap[dateStr] = {};
        if (Object.keys(dailyMap).length > 31) break;
      }
    }

    expenses.forEach(e => {
      const date = e.date || '未設定';
      // 旅行期間外のデータも一応保持するが、マップがない場合は作成
      if (!dailyMap[date]) dailyMap[date] = {};
      const jpy = convertToJPY(e.amount, e.currency, e.exchangeRate);
      dailyMap[date][e.paidBy] = (dailyMap[date][e.paidBy] || 0) + jpy;
    });

    const dailyChartData = Object.entries(dailyMap)
      .map(([date, memberPaid]) => ({
        date,
        ...memberPaid
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalCount: expenses.length,
      averagePerPerson: userProfiles.length > 0 ? totalJPY / userProfiles.length : 0,
      foreignCurrencies: Object.entries(foreignCurrencyMap).map(([currency, amount]) => ({ currency, amount })),
      dailyChartData
    };
  }, [expenses, totalJPY, userProfiles, tripStartDate, tripEndDate]);

  const getProfile = (id: string) => {
    return userProfiles.find(p => p.id === id) || { id, displayName: id, avatarUrl: '' };
  };

  const detailData = useMemo(() => {
    if (!selectedMemberId) return null;

    if (selectedMemberId === 'ALL') {
      const categoryMap: Record<string, number> = {};
      expenses.forEach(e => {
        const jpy = convertToJPY(e.amount, e.currency, e.exchangeRate);
        categoryMap[e.category] = (categoryMap[e.category] || 0) + jpy;
      });
      const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

      return {
        isAll: true,
        stats: { id: 'ALL', paid: totalJPY, cost: totalJPY, balance: 0 },
        categoryData,
        memberPayments: memberStats.map(s => ({ id: s.id, value: s.paid })).sort((a, b) => b.value - a.value),
        iPaidForOthers: [],
        othersPaidForMe: []
      };
    }

    const stats = memberStats.find(s => s.id === selectedMemberId);
    if (!stats) return null;

    const myPaidExpenses = expenses.filter(e => e.paidBy === selectedMemberId);
    const categoryMap: Record<string, number> = {};
    myPaidExpenses.forEach(e => {
      const jpy = convertToJPY(e.amount, e.currency, e.exchangeRate);
      categoryMap[e.category] = (categoryMap[e.category] || 0) + jpy;
    });
    const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

    const iPaidOthers: Record<string, number> = {};
    myPaidExpenses.forEach(e => {
      const jpy = convertToJPY(e.amount, e.currency, e.exchangeRate);
      const perPerson = jpy / (e.splitWith.length || 1);
      e.splitWith.forEach(p => { if (p !== selectedMemberId) iPaidOthers[p] = (iPaidOthers[p] || 0) + perPerson; });
    });

    const othersPaidMe: Record<string, number> = {};
    expenses.forEach(e => {
      if (e.paidBy !== selectedMemberId && e.splitWith.includes(selectedMemberId)) {
        const jpy = convertToJPY(e.amount, e.currency, e.exchangeRate);
        othersPaidMe[e.paidBy] = (othersPaidMe[e.paidBy] || 0) + (jpy / (e.splitWith.length || 1));
      }
    });

    return {
      isAll: false,
      stats,
      categoryData,
      memberPayments: [],
      iPaidForOthers: userProfiles.filter(p => p.id !== selectedMemberId).map(p => ({ id: p.id, value: iPaidOthers[p.id] || 0 })).filter(i => i.value > 0.1),
      othersPaidForMe: userProfiles.filter(p => p.id !== selectedMemberId).map(p => ({ id: p.id, value: othersPaidMe[p.id] || 0 })).filter(i => i.value > 0.1)
    };
  }, [selectedMemberId, expenses, memberStats, totalJPY, userProfiles]);

  const COLORS = ['#00A1DE', '#CFA86E', '#003780', '#555555', '#AAAAAA', '#E5CCA0'];

  const saveBudget = () => {
    const val = parseInt(tempBudget, 10);
    if (!isNaN(val) && val > 0) { onBudgetChange(val); setIsEditingBudget(false); }
  };

  const handleSaveTripSettings = () => {
    if (!tempTripName.trim()) { setError('旅行先を入力してください'); return; }
    onTripNameChange(tempTripName);
    onTripDatesChange(tempStart, tempEnd);
    onTripCoverImageChange(tempCoverImage);
    setIsEditingTrip(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const maxSize = 1200;
        let w = img.width, h = img.height;
        if (w > h) { if (w > maxSize) { h *= maxSize / w; w = maxSize; } }
        else { if (h > maxSize) { w *= maxSize / h; h = maxSize; } }
        canvas.width = w; canvas.height = h;
        ctx?.drawImage(img, 0, 0, w, h);
        setTempCoverImage(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const tripStatus = useMemo(() => {
    if (!tripStartDate) return { text: "Date not set", sub: "Plan your trip" };
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const start = new Date(tripStartDate); start.setHours(0, 0, 0, 0);
    const end = tripEndDate ? new Date(tripEndDate) : null; if (end) end.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 0) return { text: `${diffDays} Days to Go`, sub: "Countdown" };
    if (end && now > end) return { text: "Trip Ended", sub: "Memories" };
    const day = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return { text: `Day ${day}`, sub: "Enjoy your trip!" };
  }, [tripStartDate, tripEndDate]);

  const formattedDateRange = useMemo(() => {
    if (!tripStartDate) return "Set Dates";
    const s = new Date(tripStartDate), e = tripEndDate ? new Date(tripEndDate) : null;
    const sS = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return e ? `${sS} - ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : sS;
  }, [tripStartDate, tripEndDate]);

  return (
    <div className="space-y-6 pt-2 pb-24">
      {/* Hero Card */}
      <button
        onClick={() => { setTempTripName(tripName); setTempStart(tripStartDate); setTempEnd(tripEndDate); setTempCoverImage(tripCoverImage); setIsEditingTrip(true); }}
        className="relative w-full aspect-[21/9] sm:h-48 rounded-[32px] overflow-hidden shadow-2xl group text-left transition-transform active:scale-[0.99]"
      >
        <img src={tripCoverImage} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-ocean-dark/90 via-ocean-dark/20 to-transparent"></div>
        <div className="absolute bottom-4 left-6 right-6 text-white">
          <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-premium-gold mb-1">{tripStatus.sub}</p>
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-xl sm:text-2xl font-sans font-bold tracking-wide mb-0.5 leading-tight">{tripName}</h2>
              <p className="text-lg sm:text-2xl font-bold text-white/90">{tripStatus.text}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="px-2 py-0.5 border border-white/30 rounded-full bg-black/20 backdrop-blur-sm text-[8px] sm:text-[10px]">{formattedDateRange}</span>
              <span className="text-[8px] sm:text-[10px] font-medium opacity-60">{userProfiles.length} Travelers</span>
            </div>
          </div>
        </div>
      </button>

      {/* Member Cards */}
      <div className="space-y-4">
        <div className="flex justify-between items-end px-2">
          <h3 className="text-[10px] font-bold text-ink-sub uppercase tracking-[0.2em]">メンバー</h3>
          <button onClick={onOpenSettle} className="text-[10px] font-bold text-primary uppercase tracking-widest hover:text-primary-dark transition-colors">合計と清算を確認 &gt;</button>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {memberStats.map(m => {
            const profile = getProfile(m.id);
            return (
              <button key={m.id} onClick={() => setSelectedMemberId(m.id)} className="w-full text-left glass p-5 rounded-2xl flex items-center justify-between active:scale-[0.98] transition-all hover:shadow-md group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center border transition-colors overflow-hidden" style={{ backgroundColor: profile.color, borderColor: `${profile.color}40` }}>
                    {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" /> : <svg className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>}
                  </div>
                  <div>
                    <h4 className="font-bold text-ink text-sm tracking-wide">{profile.displayName}</h4>
                    <p className="text-[9px] font-bold text-ink-light uppercase tracking-tighter">支払総額</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-sans font-bold text-ink leading-none">{Math.round(m.paid).toLocaleString()}<span className="text-[10px] ml-1 font-sans font-normal opacity-60">JPY</span></p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 📊 Spending Summary Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <span className="text-lg">📊</span>
          <h3 className="text-[10px] font-bold text-ink-sub uppercase tracking-[0.2em]">支出サマリー</h3>
        </div>
        <div className={`grid ${isTablet ? 'grid-cols-4' : 'grid-cols-2'} gap-3`}>
          <div className="glass p-4 rounded-2xl border-white/40">
            <p className="text-[8px] font-bold text-ink-light uppercase tracking-widest mb-1">合計支出額</p>
            <p className="text-lg font-sans font-bold text-ink leading-tight">{Math.round(totalJPY).toLocaleString()}<span className="text-[9px] ml-1 opacity-50">JPY</span></p>
          </div>
          <div className="glass p-4 rounded-2xl border-white/40">
            <p className="text-[8px] font-bold text-ink-light uppercase tracking-widest mb-1">決済件数</p>
            <p className="text-lg font-sans font-bold text-ink leading-tight">{summaryData.totalCount}<span className="text-[9px] ml-1 opacity-50">回</span></p>
          </div>
          <div className="glass p-4 rounded-2xl border-white/40">
            <p className="text-[8px] font-bold text-ink-light uppercase tracking-widest mb-1">1人あたりの負担</p>
            <p className="text-lg font-sans font-bold text-ink leading-tight">{Math.round(summaryData.averagePerPerson).toLocaleString()}<span className="text-[9px] ml-1 opacity-50">JPY</span></p>
          </div>
          <div className="glass p-4 rounded-2xl border-white/40 bg-gradient-to-br from-white/40 to-premium-gold/5">
            <p className="text-[8px] font-bold text-ink-light uppercase tracking-widest mb-1">外貨での支出</p>
            <div className="flex flex-col gap-0.5">
              {summaryData.foreignCurrencies.length > 0 ? summaryData.foreignCurrencies.map(fc => (
                <p key={fc.currency} className="text-xs font-sans font-bold text-ink">{fc.currency} {fc.amount.toLocaleString()}</p>
              )) : <p className="text-xs font-bold text-ink-light">外貨の支出なし</p>}
            </div>
          </div>
        </div>

        <div className="glass p-5 rounded-[32px] space-y-8">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-[9px] font-bold text-ink uppercase tracking-wider flex items-center gap-1.5"><span className="w-1.5 h-3 bg-ocean-light rounded-full"></span>日別・ユーザー別の支出</h4>
              <p className="text-[8px] text-ink-light font-bold">日別積上グラフ</p>
            </div>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summaryData.dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#5A7184', fontWeight: 'bold' }} tickFormatter={(v) => v.split('-').slice(1).join('/')} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#5A7184' }} />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,161,222,0.05)' }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const total = payload.reduce((sum, entry) => sum + Number(entry.value || 0), 0);
                        return (
                          <div className="bg-white/95 backdrop-blur-sm p-3 rounded-2xl shadow-xl border border-surface-gray-mid animate-in fade-in zoom-in duration-200">
                            <p className="text-[9px] font-bold text-ink-sub mb-2 tracking-wider">{label}</p>
                            <div className="space-y-1.5 mb-2">
                              {payload.map((entry: any, index: number) => (
                                <div key={index} className="flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.fill }}></div>
                                    <span className="text-[10px] font-bold text-ink-sub">{entry.name}:</span>
                                  </div>
                                  <span className="text-[10px] font-sans font-black text-ink">
                                    {Math.round(Number(entry.value)).toLocaleString()}円
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className="pt-2 border-t border-dashed border-surface-gray-mid flex justify-between items-center gap-4">
                              <span className="text-[9px] font-black text-primary uppercase tracking-widest">合計</span>
                              <span className="text-xs font-sans font-black text-primary">
                                {Math.round(total).toLocaleString()}円
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {userProfiles.map((p, idx) => <Bar key={p.id} dataKey={p.id} stackId="a" name={p.displayName} fill={COLORS[idx % COLORS.length]} />)}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="border-t border-surface-gray-mid/50 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-[9px] font-bold text-ink uppercase tracking-wider flex items-center gap-1.5"><span className="w-1.5 h-3 bg-premium-gold rounded-full"></span>支払い者別の負担比率</h4>
              <p className="text-[8px] text-ink-light font-bold">メンバー別の支出金額</p>
            </div>
            <div className="h-[140px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={memberStats} layout="vertical" margin={{ left: -10, right: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="id" type="category" axisLine={false} tickLine={false} tickFormatter={(id) => getProfile(id).displayName} tick={{ fontSize: 9, fill: '#5A7184', fontWeight: '800' }} width={70} />
                  <Tooltip cursor={{ fill: 'rgba(207,168,110,0.05)' }} contentStyle={{ background: 'rgba(255,255,255,0.95)', border: 'none', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '10px' }} formatter={(v: number) => [`${Math.round(v).toLocaleString()}円`, '支払額']} />
                  <Bar dataKey="paid" barSize={12}>
                    {memberStats.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.8} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <button onClick={() => setSelectedMemberId('ALL')} className="w-full py-4 rounded-2xl bg-surface-gray border border-surface-gray-mid text-[10px] font-bold text-ink uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2 group shadow-sm active:scale-[0.98]">
            <svg className="w-4 h-4 text-primary group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            すべての支出履歴を詳しく見る &gt;
          </button>
        </div>
      </section>

      {/* Modal - Budget Edit */}
      {isEditingBudget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-primary/20 backdrop-blur-sm" onClick={() => setIsEditingBudget(false)}>
          <div className="bg-white w-full max-w-xs rounded-3xl p-6 shadow-2xl border border-surface-gray-mid" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-ink mb-4">予算を編集</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">目標予算 (JPY)</label>
                <input
                  type="number"
                  className="w-full bg-surface-gray border border-surface-gray-mid rounded-xl p-3 text-sm text-ink outline-none focus:border-primary"
                  value={tempBudget}
                  onChange={e => setTempBudget(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setIsEditingBudget(false)} className="flex-1 py-3 rounded-xl text-xs font-bold text-ink-sub hover:bg-surface-gray transition-colors">キャンセル</button>
                <button onClick={saveBudget} className="flex-1 py-3 rounded-xl bg-primary text-white text-xs font-bold shadow-lg hover:bg-primary/90 active:scale-95 transition-all">保存</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Trip Settings Edit (Restore) */}
      {isEditingTrip && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-ocean-dark/40 backdrop-blur-md" onClick={() => { setIsEditingTrip(false); setError(null); }}>
          <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl border border-surface-gray-mid overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-sans font-bold text-ink">旅行の設定</h3>
              <button onClick={() => { setIsEditingTrip(false); setError(null); }} className="p-2 text-ink-light hover:text-ink hover:bg-surface-gray rounded-full">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="space-y-5">
              {/* Cover Image Preview & Edit */}
              <div className="relative aspect-[21/9] rounded-2xl overflow-hidden shadow-md group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <img src={tempCoverImage || tripCoverImage} className="w-full h-full object-cover" alt="" />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="bg-white/20 backdrop-blur-md border border-white/40 text-white px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest">画像を編集 📷</span>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">旅行先 / タイトル</label>
                <input
                  type="text"
                  placeholder="例: オーストラリア 2026"
                  className="w-full bg-surface-gray border border-surface-gray-mid rounded-xl p-3 text-sm text-ink outline-none focus:border-primary"
                  value={tempTripName}
                  onChange={e => { setTempTripName(e.target.value); setError(null); }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">出発日</label>
                  <input
                    type="date"
                    className="w-full bg-surface-gray border border-surface-gray-mid rounded-xl p-3 text-sm text-ink outline-none"
                    value={tempStart}
                    onChange={e => setTempStart(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">最終日</label>
                  <input
                    type="date"
                    className="w-full bg-surface-gray border border-surface-gray-mid rounded-xl p-3 text-sm text-ink outline-none"
                    value={tempEnd}
                    onChange={e => setTempEnd(e.target.value)}
                  />
                </div>
              </div>

              {error && <p className="text-xs text-rose-500 font-bold">{error}</p>}

              <div className="pt-2">
                <button onClick={handleSaveTripSettings} className="w-full py-4 rounded-2xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/30 hover:bg-primary/90 active:scale-95 transition-all">
                  設定を保存する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Member Detail */}
      {selectedMemberId && detailData && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-primary/40 backdrop-blur-md overflow-hidden" onClick={() => setSelectedMemberId(null)}>
          <div className="bg-white w-full max-w-md h-[92vh] sm:h-auto sm:max-h-[85vh] sm:rounded-[40px] rounded-t-[40px] shadow-2xl overflow-y-auto border-t border-surface-gray-mid flex flex-col relative" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md px-6 py-5 border-b border-surface-gray-mid flex justify-between items-start">
              <div className="flex items-center gap-4">
                {selectedMemberId !== 'ALL' && (
                  <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-white shadow-inner overflow-hidden" style={{ backgroundColor: getProfile(selectedMemberId).color }}>
                    {getProfile(selectedMemberId).avatarUrl ? <img src={getProfile(selectedMemberId).avatarUrl} className="w-full h-full object-cover" alt="" /> : <span className="text-white font-bold">{getProfile(selectedMemberId).displayName[0]}</span>}
                  </div>
                )}
                <div>
                  <h3 className="text-xl sm:text-2xl font-sans font-black text-ink leading-tight">{selectedMemberId === 'ALL' ? '全員の支出概要' : getProfile(selectedMemberId).displayName}</h3>
                  <p className="text-[8px] font-bold text-ink-light uppercase tracking-[0.2em] mt-0.5">Analytics & Settlement</p>
                </div>
              </div>
              <button onClick={() => setSelectedMemberId(null)} className="p-2 text-ink-light hover:text-ink hover:bg-surface-gray rounded-full"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <div className="p-6 space-y-8">
              <div className="relative p-5 rounded-2xl bg-white border border-surface-gray-mid shadow-sm space-y-4">
                {selectedMemberId === 'ALL' ? (
                  <>
                    <div className="flex justify-between items-end">
                      <div><p className="text-[9px] font-bold text-ink-sub uppercase tracking-widest mb-1">Total Spending</p><h4 className="text-2xl font-sans font-black text-ink">{Math.round(totalJPY).toLocaleString()}<span className="text-xs font-bold ml-1 opacity-50">JPY</span></h4></div>
                      <div className="text-right"><p className="text-[9px] font-bold text-ink-sub uppercase tracking-widest mb-1">Budget Use</p><span className={`text-xs font-black ${budgetPercentage > 100 ? 'text-rose-500' : 'text-ocean-dark'}`}>{budgetPercentage.toFixed(1)}%</span></div>
                    </div>
                    <div className="w-full bg-surface-gray-mid h-2 rounded-full overflow-hidden"><div className={`h-full transition-all duration-1000 ${totalJPY > budget ? 'bg-rose-500' : 'bg-ocean-light'}`} style={{ width: `${budgetPercentage}%` }} /></div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-0.5"><p className="text-[8px] font-bold text-ink-sub uppercase tracking-widest">実際に支払った合計</p><p className="text-lg font-sans font-black text-ink">{Math.round(detailData.stats!.paid).toLocaleString()}</p></div>
                      <div className="space-y-0.5 text-right"><p className="text-[8px] font-bold text-ink-sub uppercase tracking-widest">本来負担すべき額</p><p className="text-lg font-sans font-bold text-ink-sub">- {Math.round(detailData.stats!.cost).toLocaleString()}</p></div>
                    </div>
                    <div className="pt-3 border-t border-surface-gray-mid flex justify-between items-center text-xs font-bold uppercase tracking-widest">差引残高<span className={`text-xl font-black ${detailData.stats!.balance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{detailData.stats!.balance >= 0 ? '+' : ''}{Math.round(detailData.stats!.balance).toLocaleString()}</span></div>
                  </div>
                )}
              </div>
              <div className="space-y-10">
                <section>
                  <div className="flex items-center gap-2 mb-4"><span className="w-1.5 h-4 bg-premium-gold rounded-full"></span><h4 className="text-[10px] font-bold text-ink uppercase tracking-[0.3em]">支出カテゴリー分布</h4></div>
                  <div className="h-[180px] w-full"><ResponsiveContainer><PieChart><Pie data={detailData.categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none">{detailData.categoryData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip contentStyle={{ background: 'rgba(255,255,255,0.95)', border: 'none', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '10px' }} formatter={(v: number) => [`${Math.round(v).toLocaleString()}円`, '支出額']} /></PieChart></ResponsiveContainer></div>
                </section>
                <section className="space-y-4">
                  {selectedMemberId === 'ALL' ? (
                    detailData.memberPayments.map(m => (
                      <div key={m.id} className="flex justify-between items-center p-3.5 rounded-xl bg-surface-gray">
                        <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full" style={{ backgroundColor: getProfile(m.id).color }} /><span className="text-xs font-bold">{getProfile(m.id).displayName}</span></div>
                        <span className="text-xs font-black">{Math.round(m.value).toLocaleString()} JPY</span>
                      </div>
                    ))
                  ) : (
                    <>
                      {detailData.iPaidForOthers.map(i => (
                        <div key={i.id} className="flex justify-between items-center p-3.5 rounded-xl bg-emerald-50 border border-emerald-100"><span className="text-xs font-bold">{getProfile(i.id).displayName} さんの分</span><span className="text-xs font-black text-emerald-600">+{Math.round(i.value).toLocaleString()}</span></div>
                      ))}
                      {detailData.othersPaidForMe.map(o => (
                        <div key={o.id} className="flex justify-between items-center p-3.5 rounded-xl bg-rose-50 border border-rose-100"><span className="text-xs font-bold">{getProfile(o.id).displayName} さんが支出</span><span className="text-xs font-black text-rose-500">-{Math.round(o.value).toLocaleString()}</span></div>
                      ))}
                    </>
                  )}
                </section>
              </div>
            </div>
            <div className="h-8 flex-shrink-0" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
