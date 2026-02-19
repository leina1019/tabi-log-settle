
import React, { useState, useMemo, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Expense, Settlement, Participant, UserProfile } from '../types';
import { formatCurrency, convertToJPY } from '../utils/currency';
import { PARTICIPANTS } from '../constants';
import { evaluateBudget } from '../services/geminiService';

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
  onTripCoverImageChange
}) => {
  const [selectedMemberId, setSelectedMemberId] = useState<Participant | 'ALL' | null>(null);
  const [evaluation, setEvaluation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState(budget.toString());
  const [isEditingTrip, setIsEditingTrip] = useState(false);
  const [tempTripName, setTempTripName] = useState(tripName);
  const [tempStart, setTempStart] = useState(tripStartDate);
  const [tempEnd, setTempEnd] = useState(tripEndDate);
  const [tempCoverImage, setTempCoverImage] = useState(tripCoverImage);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalJPY = expenses.reduce((sum, e) => sum + convertToJPY(e.amount, e.currency, e.exchangeRate), 0);
  const budgetPercentage = Math.min((totalJPY / budget) * 100, 100);

  // --- Calculations ---
  const memberStats = useMemo(() => {
    return PARTICIPANTS.map(pId => {
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
  }, [expenses]);

  const getProfile = (id: string) => {
    return userProfiles.find(p => p.id === id) || { id, displayName: id, avatarUrl: '' };
  };

  const detailData = useMemo(() => {
    if (!selectedMemberId) return null;

    if (selectedMemberId === 'ALL') {
      // 全員の合計データ
      const categoryMap: Record<string, number> = {};
      expenses.forEach(e => {
        const jpy = convertToJPY(e.amount, e.currency, e.exchangeRate);
        categoryMap[e.category] = (categoryMap[e.category] || 0) + jpy;
      });
      const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

      return {
        isAll: true,
        stats: {
          id: 'ALL',
          paid: totalJPY,
          cost: totalJPY,
          balance: 0
        },
        categoryData,
        // 全体の場合は「誰がいくら払ったか」を表示
        memberPayments: memberStats.map(s => ({ id: s.id, value: s.paid })).sort((a, b) => b.value - a.value),
        iPaidForOthers: [],
        othersPaidForMe: []
      };
    }

    const stats = memberStats.find(s => s.id === selectedMemberId);
    if (!stats) return null; // Should not happen

    const myPaidExpenses = expenses.filter(e => e.paidBy === selectedMemberId);
    const categoryMap: Record<string, number> = {};
    myPaidExpenses.forEach(e => {
      const jpy = convertToJPY(e.amount, e.currency, e.exchangeRate);
      categoryMap[e.category] = (categoryMap[e.category] || 0) + jpy;
    });
    const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
    const iPaidForOthers: Record<string, number> = {};
    myPaidExpenses.forEach(e => {
      const jpy = convertToJPY(e.amount, e.currency, e.exchangeRate);
      const perPerson = jpy / (e.splitWith.length || 1);
      e.splitWith.forEach(participant => {
        if (participant !== selectedMemberId) {
          iPaidForOthers[participant] = (iPaidForOthers[participant] || 0) + perPerson;
        }
      });
    });
    const othersPaidForMe: Record<string, number> = {};
    expenses.forEach(e => {
      if (e.paidBy !== selectedMemberId && e.splitWith.includes(selectedMemberId)) {
        const jpy = convertToJPY(e.amount, e.currency, e.exchangeRate);
        const myShare = jpy / (e.splitWith.length || 1);
        othersPaidForMe[e.paidBy] = (othersPaidForMe[e.paidBy] || 0) + myShare;
      }
    });

    return {
      isAll: false,
      stats,
      categoryData,
      memberPayments: [],
      iPaidForOthers: PARTICIPANTS.filter(p => p !== selectedMemberId).map(p => ({ id: p, value: iPaidForOthers[p] || 0 })),
      othersPaidForMe: PARTICIPANTS.filter(p => p !== selectedMemberId).map(p => ({ id: p, value: othersPaidForMe[p] || 0 }))
    };
  }, [selectedMemberId, expenses, memberStats, totalJPY]);

  const COLORS = ['#00A1DE', '#CFA86E', '#FFFFFF', '#003780', '#555555', '#AAAAAA'];

  const handleEvaluateBudget = async () => {
    setIsLoading(true);
    try {
      const catSummary = (detailData?.categoryData || []).map(c => `${c.name}: ${formatCurrency(c.value, 'JPY')}`).join('\n');
      const memberName = selectedMemberId === 'ALL' ? '全員' : (selectedMemberId ? getProfile(selectedMemberId as string).displayName : 'みなさん');
      const result = await evaluateBudget(totalJPY, budget, catSummary, memberName);
      setEvaluation(result);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  const saveBudget = () => {
    const val = parseInt(tempBudget, 10);
    if (!isNaN(val) && val > 0) { onBudgetChange(val); setIsEditingBudget(false); }
  };

  const saveTripSettings = () => {
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
        const maxSize = 1200; // Larger for cover
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        setTempCoverImage(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const resetCoverImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTempCoverImage('https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?q=80&w=800&auto=format&fit=crop');
  };

  // --- Countdown Logic ---
  const tripStatus = useMemo(() => {
    if (!tripStartDate) return { text: "Date not set", sub: "Plan your trip" };

    const now = new Date();
    // Reset time part for accurate day calculation
    now.setHours(0, 0, 0, 0);
    const start = new Date(tripStartDate);
    start.setHours(0, 0, 0, 0);
    const end = tripEndDate ? new Date(tripEndDate) : null;
    if (end) end.setHours(0, 0, 0, 0);

    const diffTime = start.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      return { text: `${diffDays} Days to Go`, sub: "Countdown" };
    } else if (end && now > end) {
      return { text: "Trip Ended", sub: "Memories" };
    } else {
      // Currently on trip
      const daysIntoTrip = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return { text: `Day ${daysIntoTrip}`, sub: "Enjoy your trip!" };
    }
  }, [tripStartDate, tripEndDate]);

  const formattedDateRange = useMemo(() => {
    if (!tripStartDate) return "Set Dates";
    const start = new Date(tripStartDate);
    const end = tripEndDate ? new Date(tripEndDate) : null;
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!end) return startStr;
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${startStr} - ${endStr}`;
  }, [tripStartDate, tripEndDate]);

  return (
    <div className="space-y-6 pt-6 pb-24">
      {/* Hero Trip Card */}
      <button
        onClick={() => {
          setTempTripName(tripName);
          setTempStart(tripStartDate);
          setTempEnd(tripEndDate);
          setTempCoverImage(tripCoverImage);
          setIsEditingTrip(true);
        }}
        className="relative w-full h-48 rounded-[32px] overflow-hidden shadow-2xl group text-left transition-transform active:scale-[0.99]"
      >
        <img
          src={tripCoverImage}
          alt="Trip Cover"
          className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ocean-dark/90 via-ocean-dark/20 to-transparent"></div>
        <div className="absolute top-4 right-4 bg-black/20 backdrop-blur-md p-2 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
        </div>
        <div className="absolute bottom-5 left-6 right-6 text-white">
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-premium-gold mb-1">{tripStatus.sub}</p>
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-sans font-bold tracking-wide mb-1 leading-tight">{tripName}</h2>
              <p className="text-2xl font-bold text-white/90">{tripStatus.text}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex gap-2 text-[10px] font-medium opacity-80">
                <span className="px-2 py-0.5 border border-white/30 rounded-full bg-black/20 backdrop-blur-sm">{formattedDateRange}</span>
              </div>
              <span className="text-[10px] font-medium opacity-60">{PARTICIPANTS.length} Travelers</span>
            </div>
          </div>
        </div>
      </button>

      {/* Trip Settings Modal */}
      {isEditingTrip && (
        <div className="fixed inset-0 z-[100] bg-primary/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setIsEditingTrip(false)}>
          <div className="bg-white w-full max-w-sm rounded-[24px] p-5 border border-surface-gray-mid shadow-xl max-h-[80vh] overflow-y-auto pb-10" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-sans font-bold mb-3 text-ink">旅行設定</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">カバー画像</label>
                <div
                  className="relative h-24 w-full rounded-xl overflow-hidden mb-2 cursor-pointer group border border-white/10"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <img src={tempCoverImage} className="w-full h-full object-cover" alt="Cover Preview" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white font-bold text-xs border border-white px-3 py-1 rounded-full">画像を変更</span>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button onClick={resetCoverImage} className="text-[9px] text-ink-light hover:text-ink uppercase tracking-wider font-bold">デフォルトに戻す</button>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">旅行先</label>
                <input type="text" className="w-full bg-surface-gray border border-surface-gray-mid rounded-xl p-2.5 text-sm text-ink outline-none focus:border-primary" value={tempTripName} onChange={e => setTempTripName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">開始日</label>
                  <input type="date" className="w-full bg-surface-gray border border-surface-gray-mid rounded-xl p-2.5 text-sm text-ink outline-none" value={tempStart} onChange={e => setTempStart(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">終了日</label>
                  <input type="date" className="w-full bg-surface-gray border border-surface-gray-mid rounded-xl p-2.5 text-sm text-ink outline-none" value={tempEnd} onChange={e => setTempEnd(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setIsEditingTrip(false)} className="flex-1 py-3 rounded-xl text-xs font-bold text-ink-sub hover:bg-surface-gray">キャンセル</button>
                <button onClick={saveTripSettings} className="flex-1 py-3 rounded-xl bg-premium-gold text-ocean-dark text-xs font-bold shadow-lg">保存</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Budget Progress (Glass) */}
      <div className="glass p-6 rounded-3xl">
        <div className="flex justify-between items-start mb-4">
          <button onClick={() => setSelectedMemberId('ALL')} className="text-left group">
            <h3 className="text-ink-sub text-[10px] font-bold uppercase tracking-[0.2em] mb-1 group-hover:text-accent transition-colors">総支出 &gt;</h3>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-sans font-bold text-ink group-hover:scale-105 transition-transform origin-left">{formatCurrency(totalJPY, 'JPY')}</p>
            </div>
          </button>
          <div className="text-right">
            <button onClick={() => { setTempBudget(budget.toString()); setIsEditingBudget(true); }} className="text-[10px] text-accent font-bold uppercase tracking-widest hover:text-primary transition-colors">
              目標予算 &gt;
            </button>
            {isEditingBudget ? (
              <div className="flex items-center justify-end gap-2 mt-1">
                <input type="number" value={tempBudget} onChange={e => setTempBudget(e.target.value)} className="w-20 bg-transparent border-b border-premium-gold text-right text-sm font-bold outline-none" autoFocus />
                <button onClick={saveBudget} className="text-xs text-premium-gold">OK</button>
              </div>
            ) : (
              <p className="text-sm font-bold text-ink/80">{formatCurrency(budget, 'JPY')}</p>
            )}
          </div>
        </div>
        <div className="w-full bg-surface-gray-mid h-1.5 rounded-full overflow-hidden mb-2">
          <div className={`h-full transition-all duration-1000 ${totalJPY > budget ? 'bg-red-400' : 'bg-ocean-light'}`} style={{ width: `${budgetPercentage}%` }} />
        </div>
        <div className="flex justify-between text-[10px] font-bold text-ink-light">
          <span>0%</span>
          <span>{budgetPercentage.toFixed(0)}% 使用済み</span>
          <span>100%</span>
        </div>
      </div>

      {/* Member Cards */}
      <div className="space-y-4">
        <div className="flex justify-between items-end px-2">
          <h3 className="text-[10px] font-bold text-ink-sub uppercase tracking-[0.2em]">メンバー</h3>
          <button onClick={onOpenSettle} className="text-[10px] font-bold text-primary uppercase tracking-widest hover:text-primary-dark transition-colors">
            清算を確認 &gt;
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {memberStats.map(m => {
            const profile = getProfile(m.id);
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMemberId(m.id)}
                className="w-full text-left glass p-5 rounded-2xl flex items-center justify-between active:scale-[0.98] transition-all hover:shadow-md group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary-light border border-primary/20 group-hover:border-accent/50 transition-colors overflow-hidden">
                    {profile.avatarUrl ? (
                      <img src={profile.avatarUrl} alt={profile.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-ink-light" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-ink text-sm tracking-wide">{profile.displayName}</h4>
                    <p className="text-[9px] font-bold text-ink-light uppercase tracking-tighter">支払総額</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-sans font-bold text-ink leading-none">
                    {Math.round(m.paid).toLocaleString()}
                    <span className="text-[10px] ml-1 font-sans font-normal opacity-60">JPY</span>
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* AI Assistant (Glass Dark) */}
      <div className="glass-dark p-6 rounded-3xl relative overflow-hidden">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-2 h-2 rounded-full bg-ocean-light animate-pulse"></div>
          <h3 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">AIコンシェルジュ</h3>
        </div>
        {evaluation ? (
          <div>
            <p className="text-xs leading-relaxed text-ink-sub font-medium italic mb-3">"{evaluation}"</p>
            <button onClick={() => setEvaluation(null)} className="text-[10px] text-ink-light hover:text-ink">閉じる</button>
          </div>
        ) : (
          <button
            onClick={handleEvaluateBudget}
            disabled={isLoading}
            className="w-full py-3 rounded-xl border border-primary/20 bg-primary-light hover:bg-primary/10 text-xs font-bold tracking-widest text-primary transition-all"
          >
            {isLoading ? "分析中..." : "支出を分析する"}
          </button>
        )}
      </div>

      {/* Modal (Full Screen Glass) */}
      {selectedMemberId && detailData && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-primary/80 backdrop-blur-md" onClick={() => setSelectedMemberId(null)}>
          <div className="bg-white w-full max-w-md h-[85vh] sm:h-auto sm:rounded-[32px] rounded-t-[32px] p-8 shadow-2xl overflow-y-auto border-t border-surface-gray-mid" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-2xl font-sans font-bold text-ink">
                  {selectedMemberId === 'ALL' ? '全員の支出概要' : getProfile(selectedMemberId).displayName}
                </h3>
                {selectedMemberId !== 'ALL' && (
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[10px] font-bold text-ink-light uppercase tracking-widest">収支バランス</p>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${detailData.stats!.balance >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {detailData.stats!.balance >= 0 ? '+' : ''}{Math.round(detailData.stats!.balance).toLocaleString()} JPY
                    </span>
                  </div>
                )}
              </div>
              <button onClick={() => setSelectedMemberId(null)} className="p-2 text-ink-light hover:text-ink rounded-full bg-surface-gray">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="space-y-8">
              {/* Logic Explanation */}
              {selectedMemberId === 'ALL' ? (
                <div className="p-4 rounded-2xl bg-surface-gray border border-surface-gray-mid">
                  <div className="flex justify-between text-xs text-ink-sub mb-2">
                    <span>総支出</span>
                    <span className="text-ink text-lg font-bold">{Math.round(detailData.stats!.paid).toLocaleString()} JPY</span>
                  </div>
                  <div className="w-full bg-surface-gray-mid h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-1000 ${totalJPY > budget ? 'bg-red-400' : 'bg-ocean-light'}`} style={{ width: `${budgetPercentage}%` }} />
                  </div>
                  <p className="text-[10px] text-right mt-1 text-ink-light">予算 {budget.toLocaleString()} JPY に対して {budgetPercentage.toFixed(0)}%</p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-surface-gray border border-surface-gray-mid">
                  <div className="flex justify-between text-xs text-ink-sub mb-1">
                    <span>実際に支払った額</span>
                    <span className="text-ink">{Math.round(detailData.stats!.paid).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs text-ink-sub mb-2">
                    <span>本来負担すべき額</span>
                    <span className="text-ink">- {Math.round(detailData.stats!.cost).toLocaleString()}</span>
                  </div>
                  <div className="border-t border-surface-gray-mid pt-2 flex justify-between text-sm font-bold text-accent">
                    <span>差引残高</span>
                    <span>{detailData.stats!.balance >= 0 ? '+' : ''}{Math.round(detailData.stats!.balance).toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Charts & Lists */}
              <section>
                <h4 className="text-[10px] font-bold text-ink-light uppercase tracking-[0.2em] mb-4">カテゴリー別内訳</h4>
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={detailData.categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none">
                        {detailData.categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }} formatter={(v: number) => `${v.toLocaleString()}円`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section>
                {selectedMemberId === 'ALL' ? (
                  <>
                    <h4 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-3">支払いランキング</h4>
                    <div className="space-y-2">
                      {detailData.memberPayments?.map(item => (
                        <div key={item.id} className="flex justify-between items-center p-3 rounded-xl bg-surface-gray border border-surface-gray-mid">
                          <span className="text-xs font-bold text-ink-sub">{getProfile(item.id).displayName}</span>
                          <span className="text-xs font-bold text-ink">{Math.round(item.value).toLocaleString()} JPY</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <h4 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-3">建て替えた分</h4>
                    <div className="space-y-2">
                      {detailData.iPaidForOthers.map(item => (
                        <div key={item.id} className="flex justify-between items-center p-3 rounded-xl bg-surface-gray border border-surface-gray-mid">
                          <span className="text-xs font-bold text-ink-sub">{getProfile(item.id).displayName} さんの分</span>
                          <span className="text-xs font-bold text-ink">{Math.round(item.value).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
