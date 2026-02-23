
import React, { useState, useMemo, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Expense, Settlement, Participant, UserProfile } from '../types';
import { formatCurrency, convertToJPY } from '../utils/currency';
// PARTICIPANTS is removed to support dynamic members

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
      // 0円の項目を除外するフィルタリングを追加
      iPaidForOthers: userProfiles
        .filter(p => p.id !== selectedMemberId)
        .map(p => ({ id: p.id, value: iPaidForOthers[p.id] || 0 }))
        .filter(item => item.value > 0.1), // 誤差考慮
      othersPaidForMe: userProfiles
        .filter(p => p.id !== selectedMemberId)
        .map(p => ({ id: p.id, value: othersPaidForMe[p.id] || 0 }))
        .filter(item => item.value > 0.1) // 誤差考慮
    };
  }, [selectedMemberId, expenses, memberStats, totalJPY, userProfiles]);

  const COLORS = ['#00A1DE', '#CFA86E', '#003780', '#555555', '#AAAAAA', '#E5CCA0'];



  const saveBudget = () => {
    const val = parseInt(tempBudget, 10);
    if (!isNaN(val) && val > 0) { onBudgetChange(val); setIsEditingBudget(false); }
  };

  const handleSaveTripSettings = () => {
    setError(null);
    if (!tempTripName.trim()) {
      setError('旅行先を入力してください');
      return;
    }

    try {
      onTripNameChange(tempTripName);
      onTripDatesChange(tempStart, tempEnd);
      onTripCoverImageChange(tempCoverImage);
      setIsEditingTrip(false);
    } catch (err) {
      console.error(err);
      alert('保存中にエラーが発生しました');
    }
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
    <div className="space-y-6 pt-2 pb-24">
      {/* Hero Trip Card */}
      <button
        onClick={() => {
          setTempTripName(tripName);
          setTempStart(tripStartDate);
          setTempEnd(tripEndDate);
          setTempCoverImage(tripCoverImage);
          setIsEditingTrip(true);
        }}
        className="relative w-full aspect-[21/9] sm:h-48 rounded-[32px] overflow-hidden shadow-2xl group text-left transition-transform active:scale-[0.99]"
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
        <div className="absolute bottom-4 left-6 right-6 text-white">
          <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-premium-gold mb-1">{tripStatus.sub}</p>
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-xl sm:text-2xl font-sans font-bold tracking-wide mb-0.5 leading-tight">{tripName}</h2>
              <p className="text-lg sm:text-2xl font-bold text-white/90">{tripStatus.text}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex gap-2 text-[8px] sm:text-[10px] font-medium opacity-80">
                <span className="px-2 py-0.5 border border-white/30 rounded-full bg-black/20 backdrop-blur-sm whitespace-nowrap">{formattedDateRange}</span>
              </div>
              <span className="text-[8px] sm:text-[10px] font-medium opacity-60 whitespace-nowrap">{userProfiles.length} Travelers</span>
            </div>
          </div>
        </div>
      </button>

      {/* Trip Settings Modal */}
      {isEditingTrip && (
        <div className="fixed inset-0 z-[100] bg-primary/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setIsEditingTrip(false)}>
          <div className="bg-white w-full max-w-sm rounded-[24px] p-5 border border-surface-gray-mid shadow-xl max-h-[80vh] overflow-y-auto pb-10" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-sans font-bold mb-3 text-ink">旅行設定</h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-500 text-xs font-bold rounded-xl border border-red-100 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

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
                  <button type="button" onClick={resetCoverImage} className="text-[9px] text-ink-light hover:text-ink uppercase tracking-wider font-bold">デフォルトに戻す</button>
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
                <button type="button" onClick={() => setIsEditingTrip(false)} className="flex-1 py-3 rounded-xl text-xs font-bold text-ink-sub hover:bg-surface-gray border border-surface-gray-mid">キャンセル</button>
                <button type="button" onClick={(e) => { e.stopPropagation(); handleSaveTripSettings(); }} className="flex-1 py-3 rounded-xl bg-premium-gold text-ocean-dark text-xs font-bold shadow-lg hover:opacity-90 active:scale-95 transition-all">保存</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Budget Progress (Glass) */}
      <div className="glass p-6 rounded-3xl">
        <div className="flex justify-between items-start mb-4">
          <button type="button" onClick={() => setSelectedMemberId('ALL')} className="text-left group">
            <h3 className="text-ink-sub text-[10px] font-bold uppercase tracking-[0.2em] mb-1 group-hover:text-accent transition-colors">総支出 &gt;</h3>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-sans font-bold text-ink group-hover:scale-105 transition-transform origin-left">{formatCurrency(totalJPY, 'JPY')}</p>
            </div>
          </button>
          <div className="text-right">
            <button type="button" onClick={() => { setTempBudget(budget.toString()); setIsEditingBudget(true); }} className="text-[10px] text-accent font-bold uppercase tracking-widest hover:text-primary transition-colors">
              目標予算 &gt;
            </button>
            {isEditingBudget ? (
              <div className="flex items-center justify-end gap-2 mt-1">
                <input type="number" value={tempBudget} onChange={e => setTempBudget(e.target.value)} className="w-20 bg-transparent border-b border-premium-gold text-right text-sm font-bold outline-none" autoFocus />
                <button type="button" onClick={saveBudget} className="text-xs text-premium-gold font-bold">OK</button>
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
          <button type="button" onClick={onOpenSettle} className="text-[10px] font-bold text-primary uppercase tracking-widest hover:text-primary-dark transition-colors">
            清算を確認 &gt;
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {memberStats.map(m => {
            const profile = getProfile(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMemberId(m.id)}
                className="w-full text-left glass p-5 rounded-2xl flex items-center justify-between active:scale-[0.98] transition-all hover:shadow-md group"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center border transition-colors overflow-hidden"
                    style={{ backgroundColor: profile.color, borderColor: `${profile.color}40` }}
                  >
                    {profile.avatarUrl ? (
                      <img src={profile.avatarUrl} alt={profile.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
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


      {/* Modal (Full Screen Glass with Premium Ocean Design) */}
      {selectedMemberId && detailData && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-primary/40 backdrop-blur-md overflow-hidden" onClick={() => setSelectedMemberId(null)}>
          <div
            className="bg-white w-full max-w-md h-[92vh] sm:h-auto sm:max-h-[85vh] sm:rounded-[40px] rounded-t-[40px] shadow-2xl overflow-y-auto border-t border-surface-gray-mid flex flex-col relative"
            onClick={e => e.stopPropagation()}
          >
            {/* Header Sticky Area */}
            <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md px-6 py-5 border-b border-surface-gray-mid flex justify-between items-start">
              <div className="flex items-center gap-4">
                {selectedMemberId !== 'ALL' && (
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-white shadow-inner overflow-hidden"
                    style={{ backgroundColor: getProfile(selectedMemberId).color }}
                  >
                    {getProfile(selectedMemberId).avatarUrl ? (
                      <img src={getProfile(selectedMemberId).avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-bold">{getProfile(selectedMemberId).displayName[0]}</span>
                    )}
                  </div>
                )}
                <div>
                  <h3 className="text-xl sm:text-2xl font-sans font-black text-ink leading-tight">
                    {selectedMemberId === 'ALL' ? '全員の支出概要' : getProfile(selectedMemberId).displayName}
                  </h3>
                  <p className="text-[8px] font-bold text-ink-light uppercase tracking-[0.2em] mt-0.5">Analytics & Settlement</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMemberId(null)}
                className="p-2 text-ink-light hover:text-ink hover:bg-surface-gray rounded-full transition-all active:scale-90"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* Summary Balance Card */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-ocean-light/20 to-premium-gold/20 rounded-3xl blur opacity-75"></div>
                <div className="relative p-5 rounded-2xl bg-white border border-surface-gray-mid shadow-sm space-y-4">
                  {selectedMemberId === 'ALL' ? (
                    <>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[9px] font-bold text-ink-sub uppercase tracking-widest mb-1">Total Spending</p>
                          <h4 className="text-2xl font-sans font-black text-ink">{Math.round(detailData.stats!.paid).toLocaleString()}<span className="text-xs font-bold ml-1 opacity-50">JPY</span></h4>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-bold text-ink-sub uppercase tracking-widest mb-1">Budget Use</p>
                          <span className={`text-xs font-black ${budgetPercentage > 100 ? 'text-rose-500' : 'text-ocean-dark'}`}>{budgetPercentage.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-surface-gray-mid h-2 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-1000 ${totalJPY > budget ? 'bg-gradient-to-r from-rose-400 to-rose-600' : 'bg-gradient-to-r from-ocean-light to-ocean-dark'}`} style={{ width: `${budgetPercentage}%` }} />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-0.5">
                          <p className="text-[8px] font-bold text-ink-sub uppercase tracking-widest">実際に支払った合計</p>
                          <p className="text-lg font-sans font-black text-ink">{Math.round(detailData.stats!.paid).toLocaleString()}</p>
                        </div>
                        <div className="space-y-0.5 text-right">
                          <p className="text-[8px] font-bold text-ink-sub uppercase tracking-widest">本来負担すべき額</p>
                          <p className="text-lg font-sans font-bold text-ink-sub">- {Math.round(detailData.stats!.cost).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-surface-gray-mid flex justify-between items-center">
                        <span className="text-[10px] font-bold text-ink-sub uppercase tracking-[0.2em]">差引残高</span>
                        <div className="text-right">
                          <span className={`text-xl font-sans font-black ${detailData.stats!.balance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {detailData.stats!.balance >= 0 ? '+' : ''}{Math.round(detailData.stats!.balance).toLocaleString()}
                          </span>
                          <p className="text-[8px] font-bold text-ink-light mt-0.5">
                            {detailData.stats!.balance >= 0 ? '清算時に返金されます' : '清算時に支払いが必要です'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Data Visualization */}
              <div className="space-y-10">
                {/* Category Pie Chart */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-1.5 h-4 bg-premium-gold rounded-full"></span>
                    <h4 className="text-[10px] font-bold text-ink uppercase tracking-[0.3em]">支出カテゴリー分布</h4>
                  </div>
                  <div className="h-[200px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={detailData.categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={6}
                          dataKey="value"
                          stroke="none"
                          animationDuration={1500}
                        >
                          {detailData.categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 shadow-xl border border-surface-gray-mid rounded-xl">
                                  <p className="text-[8px] font-bold text-ink-sub uppercase tracking-wider">{payload[0].name}</p>
                                  <p className="text-xs font-black text-ink">{payload[0].value?.toLocaleString()}円</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                {/* Vertical Bar Chart */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-1.5 h-4 bg-ocean-light rounded-full"></span>
                    <h4 className="text-[10px] font-bold text-ink uppercase tracking-[0.3em]">ボリューム分析</h4>
                  </div>
                  <div className="h-[180px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={detailData.categoryData} layout="vertical" margin={{ left: -15, right: 30 }}>
                        <XAxis type="number" hide />
                        <YAxis
                          dataKey="name"
                          type="category"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 9, fill: '#5A7184', fontWeight: '800' }}
                          width={75}
                        />
                        <Tooltip
                          cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                          contentStyle={{ background: 'rgba(255,255,255,0.95)', border: 'none', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '10px' }}
                          formatter={(v: number) => [`${v.toLocaleString()}円`, '合計']}
                        />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={14}>
                          {detailData.categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                {/* Individual Settlement Breakdown */}
                <section className="space-y-6">
                  {selectedMemberId === 'ALL' ? (
                    <div>
                      <h4 className="text-[9px] font-bold text-ocean-dark uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                        支払いランキング
                      </h4>
                      <div className="grid gap-2">
                        {detailData.memberPayments?.map(item => (
                          <div key={item.id} className="flex justify-between items-center p-3.5 rounded-2xl bg-surface-gray border border-white hover:border-premium-gold/30 transition-all shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black text-white shadow-sm" style={{ backgroundColor: getProfile(item.id).color }}>
                                {getProfile(item.id).displayName[0]}
                              </div>
                              <span className="text-xs font-bold text-ink">{getProfile(item.id).displayName}</span>
                            </div>
                            <span className="text-xs font-black text-ink">{Math.round(item.value).toLocaleString()} <span className="text-[8px] opacity-40">JPY</span></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      {detailData.iPaidForOthers.length > 0 && (
                        <div>
                          <h4 className="text-[9px] font-bold text-emerald-600 uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
                            あなたが建て替えた分（返金対象）
                          </h4>
                          <div className="grid gap-2">
                            {detailData.iPaidForOthers.map(item => (
                              <div key={item.id} className="flex justify-between items-center p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100/50">
                                <span className="text-xs font-bold text-ink-sub">{getProfile(item.id).displayName} さんの分</span>
                                <span className="text-xs font-black text-emerald-600">+{Math.round(item.value).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {detailData.othersPaidForMe.length > 0 && (
                        <div>
                          <h4 className="text-[9px] font-bold text-rose-500 uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 12H4"></path></svg>
                            他人に建て替えてもらった分（未精算）
                          </h4>
                          <div className="grid gap-2">
                            {detailData.othersPaidForMe.map(item => (
                              <div key={item.id} className="flex justify-between items-center p-3.5 rounded-xl bg-rose-50/50 border border-rose-100/50">
                                <span className="text-xs font-bold text-ink-sub">{getProfile(item.id).displayName} さんが支出</span>
                                <span className="text-xs font-black text-rose-500">-{Math.round(item.value).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {detailData.iPaidForOthers.length === 0 && detailData.othersPaidForMe.length === 0 && (
                        <div className="p-8 text-center bg-surface-gray rounded-3xl border-2 border-dashed border-surface-gray-mid">
                          <p className="text-[9px] font-bold text-ink-light uppercase tracking-widest">個別精算の必要はありません</p>
                        </div>
                      )}
                    </>
                  )}
                </section>
              </div>
            </div>

            {/* Bottom Safe Area Spacer */}
            <div className="h-8 flex-shrink-0"></div>
          </div>
        </div>
      )
      }
    </div >
  );
};

export default Dashboard;
