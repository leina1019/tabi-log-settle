
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Expense, Participant, Settlement, ItineraryItem, Ticket, UserProfile } from './types';
import { PARTICIPANTS } from './constants';
import { convertToJPY } from './utils/currency';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import Dashboard from './components/Dashboard';
import SettlementView from './components/SettlementView';
import ItineraryView from './components/ItineraryView';
import TicketView from './components/TicketView';
import SettingsView from './components/SettingsView';
import { createNewTrip, subscribeToTrip, updateTripData, TripData } from './services/firebaseService';
// NOTE: GoogleSheetService は Firebase 移行後は使用しない。
// 将来的に完全削除予定。現在はコメントアウトで残す。
// import { fetchAllData, syncExpenseToSheet, ... } from './services/googleSheetService';

type ViewState = 'home' | 'schedule' | 'tickets' | 'history' | 'add_expense' | 'settle' | 'settings';

const App: React.FC = () => {
  // --- State Management ---
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('oz-wari-expenses');
    return saved ? JSON.parse(saved) : [];
  });

  const [budget, setBudget] = useState<number>(() => {
    const saved = localStorage.getItem('oz-wari-budget');
    return saved ? parseInt(saved, 10) : 1000000;
  });

  // User Profiles (Icons & Display Names)
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem('oz-wari-profiles');
    let profiles: any[] = saved ? JSON.parse(saved) : [];

    // Migration: Ensure all PARTICIPANTS have a profile entry with new structure
    const initializedProfiles = PARTICIPANTS.map(pId => {
      const existing = profiles.find(p => p.id === pId || p.name === pId);
      if (existing) {
        return {
          id: pId,
          displayName: existing.displayName || existing.name || pId,
          avatarUrl: existing.avatarUrl || '',
          updatedAt: existing.updatedAt || new Date().toISOString()
        };
      }
      return { id: pId, displayName: pId, avatarUrl: '', updatedAt: new Date().toISOString() };
    });

    return initializedProfiles;
  });

  // Trip Dates & Info
  const [tripStartDate, setTripStartDate] = useState<string>(() => {
    return localStorage.getItem('oz-wari-trip-start') || '';
  });

  const [tripEndDate, setTripEndDate] = useState<string>(() => {
    return localStorage.getItem('oz-wari-trip-end') || '';
  });

  const [tripName, setTripName] = useState<string>(() => {
    return localStorage.getItem('oz-wari-trip-name') || 'Australia';
  });

  const [tripCoverImage, setTripCoverImage] = useState<string>(() => {
    return localStorage.getItem('oz-wari-trip-cover') || 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?q=80&w=800&auto=format&fit=crop';
  });

  const [itinerary, setItinerary] = useState<ItineraryItem[]>(() => {
    const saved = localStorage.getItem('oz-wari-itinerary');
    return saved ? JSON.parse(saved) : [];
  });

  const [tickets, setTickets] = useState<Ticket[]>(() => {
    const saved = localStorage.getItem('oz-wari-tickets');
    return saved ? JSON.parse(saved) : [];
  });

  const [view, setView] = useState<ViewState>('home');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [tripId, setTripId] = useState<string | null>(null);

  // 削除済みIDを一時的に保持して、同期時のゾンビ復活を防ぐ
  const deletedIdsRef = useRef<Set<string>>(new Set());

  // --- Initialize & Subscribe (Firebase) ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('trip');
    if (id) setTripId(id);
  }, []);

  useEffect(() => {
    if (!tripId) return;
    const unsubscribe = subscribeToTrip(tripId, (data) => {
      // Receive updates from Firestore
      // Note: This might overwrite local unsaved changes if concurrent editing happens.
      // For a simple app, Last-Write-Wins is acceptable.
      if (data.expenses) setExpenses(data.expenses);
      if (data.itinerary) setItinerary(data.itinerary);
      if (data.tickets) setTickets(data.tickets);
      if (data.userProfiles) setUserProfiles(data.userProfiles);
      if (data.budget) setBudget(data.budget);
      if (data.name) setTripName(data.name);
      if (data.startDate) setTripStartDate(data.startDate);
      if (data.endDate) setTripEndDate(data.endDate);
      if (data.coverImage) setTripCoverImage(data.coverImage);
    });
    return () => unsubscribe();
  }, [tripId]);

  // Helper to push updates
  const pushUpdate = useCallback(async (data: Partial<TripData>) => {
    if (!tripId) return;
    // Don't set syncing true here to avoid UI flicker on every keypress
    try {
      await updateTripData(tripId, data);
    } catch (e) {
      console.error("Firebase update failed", e);
    }
  }, [tripId]);

  // --- Effects (Local Storage) ---
  useEffect(() => {
    localStorage.setItem('oz-wari-budget', budget.toString());
  }, [budget]);

  useEffect(() => {
    localStorage.setItem('oz-wari-profiles', JSON.stringify(userProfiles));
  }, [userProfiles]);

  useEffect(() => {
    localStorage.setItem('oz-wari-trip-start', tripStartDate);
  }, [tripStartDate]);

  useEffect(() => {
    localStorage.setItem('oz-wari-trip-end', tripEndDate);
  }, [tripEndDate]);

  useEffect(() => {
    localStorage.setItem('oz-wari-trip-name', tripName);
  }, [tripName]);

  useEffect(() => {
    localStorage.setItem('oz-wari-trip-cover', tripCoverImage);
  }, [tripCoverImage]);

  useEffect(() => {
    localStorage.setItem('oz-wari-itinerary', JSON.stringify(itinerary));
  }, [itinerary]);

  useEffect(() => {
    localStorage.setItem('oz-wari-tickets', JSON.stringify(tickets));
  }, [tickets]);

  // NOTE: syncWithCloud (Google Sheets) は Firebase 移行後は不要のため削除。
  // Firebase の onSnapshot リスナーがリアルタイム同期を担当する。

  // NOTE: syncWithCloud (Google Sheets) は Firebase 移行後は不要。
  // 競合を防ぐため、定期実行を無効化。
  // useEffect(() => {
  //   syncWithCloud(true);
  //   const interval = setInterval(() => syncWithCloud(false), 15000);
  //   return () => clearInterval(interval);
  // }, [syncWithCloud]);

  // --- Sync Wrappers ---
  const updateExpenses = (val: Expense[] | ((prev: Expense[]) => Expense[])) => {
    setExpenses(prev => {
      const newVal = typeof val === 'function' ? val(prev) : val;
      pushUpdate({ expenses: newVal });
      return newVal;
    });
  };

  const updateBudget = (val: number | ((prev: number) => number)) => {
    setBudget(prev => {
      const newVal = typeof val === 'function' ? val(prev) : val;
      pushUpdate({ budget: newVal });
      return newVal;
    });
  };

  const updateTripName = (val: string) => { // String usually direct set
    setTripName(val);
    pushUpdate({ name: val });
  };

  const updateTripDates = (start: string, end: string) => {
    setTripStartDate(start);
    setTripEndDate(end);
    pushUpdate({ startDate: start, endDate: end });
  };

  const updateTripCoverImage = (val: string) => {
    setTripCoverImage(val);
    pushUpdate({ coverImage: val });
  };

  const updateItinerary = (val: ItineraryItem[] | ((prev: ItineraryItem[]) => ItineraryItem[])) => {
    setItinerary(prev => {
      const newVal = typeof val === 'function' ? val(prev) : val;
      pushUpdate({ itinerary: newVal });
      return newVal;
    });
  };

  const updateTickets = (val: Ticket[] | ((prev: Ticket[]) => Ticket[])) => {
    setTickets(prev => {
      const newVal = typeof val === 'function' ? val(prev) : val;
      pushUpdate({ tickets: newVal });
      return newVal;
    });
  };

  const updateUserProfiles = (val: UserProfile[] | ((prev: UserProfile[]) => UserProfile[])) => {
    setUserProfiles(prev => {
      const newVal = typeof val === 'function' ? val(prev) : val;
      pushUpdate({ userProfiles: newVal });
      return newVal;
    });
  };

  // --- Adapters for Child Components ---
  // (Removed duplicate handlers: handleUpdateItineraryItem, handleUpdateTicket, handleUpdateProfile)

  // --- Handlers ---
  const handleAddOrUpdateExpense = async (expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const targetId = editingExpense?.id || crypto.randomUUID();
    const newExpense: Expense = {
      ...expenseData,
      id: targetId,
      createdAt: editingExpense?.createdAt || now,
      updatedAt: now,
      isLocalOnly: false, // With Firebase, we assume it's synced or will be
      hasConflict: false,
    };

    if (editingExpense) {
      // Update existing
      const updatedExpenses = expenses.map(e =>
        e.id === editingExpense.id
          ? { ...e, ...expenseData, updatedAt: new Date().toISOString() }
          : e
      );
      updateExpenses(updatedExpenses);
    } else {
      // Add new
      const newExpenses = [newExpense, ...expenses];
      updateExpenses(newExpenses);
    }
    setView('history');
    setEditingExpense(null);
    // Google Sheet sync is now handled by Firebase subscription
    // const success = await syncExpenseToSheet(newExpense);
    // if (success) await syncWithCloud(false);
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('この経費を削除してもよろしいですか？')) return;

    // 削除フラグを立てる代わりに、単純にリストから削除して同期する
    // deletedIdsRef.current.add(id); // これはGoogle Sheet用なのでFirebaseでは不要かもだが一旦維持

    const newExpenses = expenses.filter(e => e.id !== id);
    updateExpenses(newExpenses);

    // Google Sheetsからも削除する場合
    // deleteItemFromSheet(id, 'expense').catch(console.error);
  };

  // --- Handlers for Itinerary ---
  const handleUpdateItinerary = async (item: ItineraryItem) => {
    updateItinerary(prev => {
      const exists = prev.find(i => i.id === item.id);
      return exists ? prev.map(i => i.id === item.id ? item : i) : [...prev, item];
    });
    // await syncItineraryToSheet(item); // Handled by Firebase
  };

  const handleDeleteItinerary = async (id: string) => {
    deletedIdsRef.current.add(id); // For Google Sheet sync
    updateItinerary(prev => prev.filter(i => i.id !== id));
    setTimeout(() => { if (deletedIdsRef.current.has(id)) deletedIdsRef.current.delete(id); }, 60000);
    // await deleteItemFromSheet(`ITINERARY_${id}`); // For Google Sheet sync
  };

  // --- Handlers for Tickets ---
  const handleUpdateTicket = async (ticket: Ticket) => {
    updateTickets(prev => {
      const exists = prev.find(t => t.id === ticket.id);
      return exists ? prev.map(t => t.id === ticket.id ? ticket : t) : [...prev, ticket];
    });
    // await syncTicketToSheet(ticket); // Handled by Firebase
  };

  const handleDeleteTicket = async (id: string) => {
    deletedIdsRef.current.add(id); // For Google Sheet sync
    updateTickets(prev => prev.filter(t => t.id !== id));
    setTimeout(() => { if (deletedIdsRef.current.has(id)) deletedIdsRef.current.delete(id); }, 60000);
    // await deleteItemFromSheet(`TICKET_${id}`); // For Google Sheet sync
  };

  // --- Handlers for Profiles ---
  const updateProfile = async (id: Participant, updates: Partial<UserProfile>) => {
    const now = new Date().toISOString();
    let updatedProfile: UserProfile | null = null;

    updateUserProfiles(prev => prev.map(p => {
      if (p.id === id) {
        updatedProfile = { ...p, ...updates, updatedAt: now };
        return updatedProfile;
      }
      return p;
    }));

    // if (updatedProfile) {
    //   await syncProfileToSheet(updatedProfile); // Handled by Firebase
    // }
  };

  // NOTE: handleUpdateTripSettings は Firebase 移行後は直接ラッパー関数を使うため未使用。
  // 将来的に削除予定。
  // const handleUpdateTripSettings = async (...) => { ... };

  const handleResetAll = async () => {
    if (!window.confirm('全てのデータを削除しますか？この操作は取り消せません。')) return;

    const emptyExpenses: Expense[] = [];
    const emptyItinerary: ItineraryItem[] = [];
    const emptyTickets: Ticket[] = [];

    updateExpenses(emptyExpenses);
    updateItinerary(emptyItinerary);
    updateTickets(emptyTickets);

    // resetSheetData().catch(console.error); // For Google Sheet sync
    alert('データをリセットしました。');
    // localStorage.removeItem('oz-wari-expenses'); // Firebase handles state, local storage will update via effect
    // localStorage.removeItem('oz-wari-itinerary');
    // localStorage.removeItem('oz-wari-tickets');
    setView('home');
  };

  const settlements = useMemo(() => {
    // PARTICIPANTSを使って動的に残高を初期化（ハードコード排除）
    const balances: Record<string, number> = {};
    PARTICIPANTS.forEach(p => { balances[p] = 0; });
    expenses.forEach(exp => {
      const amountJPY = convertToJPY(exp.amount, exp.currency, exp.exchangeRate);
      const share = amountJPY / (exp.splitWith.length || 1);
      balances[exp.paidBy] += amountJPY;
      exp.splitWith.forEach(p => { balances[p] -= share; });
    });
    const result: Settlement[] = [];
    let payers = PARTICIPANTS.map(p => ({ name: p, balance: balances[p] })).filter(p => p.balance < -1).sort((a, b) => a.balance - b.balance);
    let receivers = PARTICIPANTS.map(p => ({ name: p, balance: balances[p] })).filter(p => p.balance > 1).sort((a, b) => b.balance - a.balance);
    payers.forEach(p => {
      while (Math.abs(p.balance) > 1 && receivers.length > 0) {
        const r = receivers[0];
        const amount = Math.min(Math.abs(p.balance), r.balance);
        result.push({ from: p.name as Participant, to: r.name as Participant, amount: Math.round(amount) });
        p.balance += amount; r.balance -= amount;
        if (r.balance < 1) receivers.shift();
      }
    });
    return result;
  }, [expenses]);

  return (
    <div className="max-w-md mx-auto h-screen bg-surface-gray flex flex-col text-ink relative overflow-hidden sm:border-x sm:border-surface-gray-mid">

      {/* Header - ANAブルー帯 */}
      <header className="bg-ocean-dark px-5 pt-2 pb-2 flex justify-between items-center z-20 safe-pt shadow-sm">
        <h1 className="font-sans text-lg font-bold tracking-wide text-white flex items-center gap-2">
          <span className="text-accent text-2xl">✈</span> たびログ精算
        </h1>
        <div className="flex items-center gap-2">
          {syncStatus === 'syncing' && <span className="text-[10px] text-accent animate-pulse">SYNCING...</span>}
          {tripId && <span className="text-xs text-white font-bold bg-white/20 px-2 py-1 rounded-full border border-white/30">● 同期中</span>}
          <button
            onClick={async () => {
              if (tripId) {
                const url = window.location.href;
                if (navigator.share) {
                  try {
                    await navigator.share({ title: 'たびログ精算', text: '旅行の精算をしよう！', url });
                  } catch (e) {
                    console.log('Share canceled', e);
                    // シェアキャンセルの場合は何もしないが、エラー時はクリップボードへ
                  }
                } else {
                  navigator.clipboard.writeText(url).then(() => {
                    alert("共有リンクをコピーしました！\nLINEなどで送ってください。\n\n" + url);
                  }).catch(() => {
                    prompt("リンクをコピーしてください", url);
                  });
                }
              } else {
                if (!window.confirm('新しい共有リンクを発行しますか？')) return;
                setSyncStatus('syncing');
                try {
                  const newId = await createNewTrip({
                    name: tripName,
                    startDate: tripStartDate,
                    endDate: tripEndDate,
                    coverImage: tripCoverImage,
                    expenses,
                    itinerary,
                    tickets,
                    userProfiles,
                    budget
                  });
                  setTripId(newId);
                  const url = `${window.location.origin}${window.location.pathname}?trip=${newId}`;
                  window.history.pushState({}, '', url);

                  if (navigator.share) {
                    try {
                      await navigator.share({ title: 'たびログ精算', text: '旅行の精算をしよう！', url });
                    } catch (e) { console.log('Share canceled', e); }
                  } else {
                    navigator.clipboard.writeText(url).then(() => {
                      alert("共有リンクを作成・コピーしました！\n\n" + url);
                    }).catch(() => {
                      prompt("リンクをコピーしてください", url);
                    });
                  }
                  setSyncStatus('success');
                } catch (e) {
                  console.error(e);
                  alert("作成に失敗しました");
                  setSyncStatus('error');
                } finally {
                  setTimeout(() => setSyncStatus('idle'), 2000);
                }
              }
            }}
            className="bg-white/20 border border-white/30 text-white px-3 py-1.5 rounded-full text-xs font-bold hover:bg-white/30 transition"
          >
            {tripId ? '🔗 コピー' : '🔗 共有'}
          </button>
          <button
            onClick={() => setView('settings')}
            className="w-8 h-8 rounded-full border border-white/30 bg-white/20 flex items-center justify-center active:scale-95 transition-transform"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-4 pb-28 scrollbar-hide">
        {view === 'history' && (
          <ExpenseList
            expenses={expenses}
            onDelete={handleDeleteExpense}
            onEdit={(expense) => {
              setEditingExpense(expense);
              setView('add_expense');
            }}
            onResetAll={handleResetAll}
            userProfiles={userProfiles}
          />
        )}

        {view === 'home' && (
          <Dashboard
            expenses={expenses}
            settlements={settlements}
            budget={budget}
            onBudgetChange={updateBudget}
            onOpenSettle={() => setView('settle')}
            tripStartDate={tripStartDate}
            tripEndDate={tripEndDate}
            onTripDatesChange={updateTripDates}
            tripName={tripName}
            onTripNameChange={updateTripName}
            userProfiles={userProfiles}
            tripCoverImage={tripCoverImage}
            onTripCoverImageChange={updateTripCoverImage}
          />
        )}

        {view === 'settle' && (
          <SettlementView
            settlements={settlements}
            expenses={expenses}
            userProfiles={userProfiles}
            onBack={() => setView('home')}
          />
        )}

        {view === 'schedule' && (
          <ItineraryView
            items={itinerary}
            onSave={handleUpdateItinerary}
            onDelete={handleDeleteItinerary}
            tripStartDate={tripStartDate}
            tripEndDate={tripEndDate}
          />
        )}

        {view === 'tickets' && (
          <TicketView
            tickets={tickets}
            onSave={handleUpdateTicket}
            onDelete={handleDeleteTicket}
          />
        )}
        {view === 'add_expense' && (
          <ExpenseForm
            onAdd={handleAddOrUpdateExpense}
            onCancel={() => setView('history')}
            initialExpense={editingExpense}
            userProfiles={userProfiles}
          />
        )}
        {view === 'settings' && (
          <SettingsView
            userProfiles={userProfiles}
            onUpdateProfile={updateProfile}
            onBack={() => setView('home')}
          />
        )}
      </main>

      {/* Bottom Navigation - ホワイトカード */}
      {view !== 'add_expense' && view !== 'settle' && view !== 'settings' && (
        <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-[400px] h-16 bg-white rounded-full flex justify-between items-center px-6 shadow-lg border border-surface-gray-mid z-[40] safe-pb">
          <button onClick={() => setView('home')} className={`flex flex-col items-center gap-1 transition-all ${view === 'home' ? 'text-primary -translate-y-1' : 'text-ink-light'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            <span className="text-[9px] font-bold tracking-widest uppercase">Home</span>
          </button>

          <button onClick={() => setView('schedule')} className={`flex flex-col items-center gap-1 transition-all ${view === 'schedule' ? 'text-primary -translate-y-1' : 'text-ink-light'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-[9px] font-bold tracking-widest uppercase">Plan</span>
          </button>

          <button
            onClick={() => { setEditingExpense(null); setView('add_expense'); }}
            className="w-14 h-14 bg-primary rounded-full flex items-center justify-center text-white shadow-lg -translate-y-6 active:scale-95 transition-transform"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          </button>

          <button onClick={() => setView('tickets')} className={`flex flex-col items-center gap-1 transition-all ${view === 'tickets' ? 'text-primary -translate-y-1' : 'text-ink-light'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
            <span className="text-[9px] font-bold tracking-widest uppercase">Ticket</span>
          </button>

          <button onClick={() => setView('history')} className={`flex flex-col items-center gap-1 transition-all ${view === 'history' ? 'text-primary -translate-y-1' : 'text-ink-light'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            <span className="text-[9px] font-bold tracking-widest uppercase">List</span>
          </button>
        </nav>
      )}
    </div>
  );
};

export default App;
