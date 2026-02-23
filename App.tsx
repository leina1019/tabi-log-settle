
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Expense, Participant, Settlement, ItineraryItem, Ticket, UserProfile, PackingItem } from './types';
import { MEMBER_COLORS } from './constants';
import { convertToJPY } from './utils/currency';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import Dashboard from './components/Dashboard';
import SettlementView from './components/SettlementView';
import ItineraryView from './components/ItineraryView';
import TicketView from './components/TicketView';
import SettingsView from './components/SettingsView';
import PackingView from './components/PackingView';
import { createNewTrip, subscribeToTrip, updateTripData, TripData } from './services/firebaseService';
// import { fetchAllData, syncExpenseToSheet, ... } from './services/googleSheetService';
import { SAMPLE_PROFILES, SAMPLE_ITINERARY, SAMPLE_EXPENSES, SAMPLE_TICKETS, SAMPLE_PACKING } from './utils/sampleData';
import WelcomeView from './components/WelcomeView';

type ViewState = 'onboarding' | 'home' | 'schedule' | 'tickets' | 'packing' | 'history' | 'add_expense' | 'settle' | 'settings';

const App: React.FC = () => {
  // --- State Management ---
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budget, setBudget] = useState<number>(0);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [tripStartDate, setTripStartDate] = useState<string>('');
  const [tripEndDate, setTripEndDate] = useState<string>('');
  const [tripName, setTripName] = useState<string>('');
  const [tripCoverImage, setTripCoverImage] = useState<string>('');
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [packingList, setPackingList] = useState<PackingItem[]>([]);

  const [view, setView] = useState<ViewState>('home');
  const [viewModeSize, setViewModeSize] = useState<'mobile' | 'tablet'>(() => {
    return (localStorage.getItem('oz-wari-view-mode-size') as 'mobile' | 'tablet') || 'mobile';
  });
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [tripId, setTripId] = useState<string | null>(null);
  // 削除済みIDを一時的に保持して、同期時のゾンビ復活を防ぐ
  const deletedIdsRef = useRef<Set<string>>(new Set());

  // --- Initialize & Subscribe (Firebase) ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('trip');
    if (id) {
      setTripId(id);

      // Load from LocalStorage only if tripId exists (editing existing trip)
      const prefix = `oz-wari-${id}-`;
      const sBudget = localStorage.getItem(prefix + 'budget');
      if (sBudget) setBudget(parseInt(sBudget, 10));

      const sProfiles = localStorage.getItem(prefix + 'profiles');
      if (sProfiles) setUserProfiles(JSON.parse(sProfiles));

      const sStart = localStorage.getItem(prefix + 'trip-start');
      if (sStart) setTripStartDate(sStart);

      const sEnd = localStorage.getItem(prefix + 'trip-end');
      if (sEnd) setTripEndDate(sEnd);

      const sName = localStorage.getItem(prefix + 'trip-name');
      if (sName) setTripName(sName);

      const sCover = localStorage.getItem(prefix + 'trip-cover');
      if (sCover) setTripCoverImage(sCover);

      const sExpenses = localStorage.getItem(prefix + 'expenses');
      if (sExpenses) setExpenses(JSON.parse(sExpenses));

      const sItinerary = localStorage.getItem(prefix + 'itinerary');
      if (sItinerary) setItinerary(JSON.parse(sItinerary));

      const sTickets = localStorage.getItem(prefix + 'tickets');
      if (sTickets) setTickets(JSON.parse(sTickets));

      const sPacking = localStorage.getItem(prefix + 'packing');
      if (sPacking) setPackingList(JSON.parse(sPacking));
    } else {
      // BASE URL: No tripId. Check if we have any data to show, otherwise show onboarding.
      // If we want to support a "default" local-only trip without ID, we can do it here,
      // but Reina wants a "Start Trip" flow.
      setView('onboarding');
    }
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
      if (data.packingList) setPackingList(data.packingList);
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
    if (!tripId) return;
    const prefix = `oz-wari-${tripId}-`;
    localStorage.setItem(prefix + 'budget', budget.toString());
  }, [budget, tripId]);

  useEffect(() => {
    if (!tripId) return;
    const prefix = `oz-wari-${tripId}-`;
    localStorage.setItem(prefix + 'profiles', JSON.stringify(userProfiles));
  }, [userProfiles, tripId]);

  useEffect(() => {
    localStorage.setItem('oz-wari-view-mode-size', viewModeSize);
  }, [viewModeSize]);

  useEffect(() => {
    if (!tripId) return;
    const prefix = `oz-wari-${tripId}-`;
    localStorage.setItem(prefix + 'trip-start', tripStartDate);
  }, [tripStartDate, tripId]);

  useEffect(() => {
    if (!tripId) return;
    const prefix = `oz-wari-${tripId}-`;
    localStorage.setItem(prefix + 'trip-end', tripEndDate);
  }, [tripEndDate, tripId]);

  useEffect(() => {
    if (!tripId) return;
    const prefix = `oz-wari-${tripId}-`;
    localStorage.setItem(prefix + 'trip-name', tripName);
  }, [tripName, tripId]);

  useEffect(() => {
    if (!tripId) return;
    const prefix = `oz-wari-${tripId}-`;
    localStorage.setItem(prefix + 'trip-cover', tripCoverImage);
  }, [tripCoverImage, tripId]);

  useEffect(() => {
    if (!tripId) return;
    const prefix = `oz-wari-${tripId}-`;
    try {
      localStorage.setItem(prefix + 'itinerary', JSON.stringify(itinerary));
    } catch (e) {
      console.error('Failed to save itinerary to localStorage', e);
    }
  }, [itinerary, tripId]);

  useEffect(() => {
    if (!tripId) return;
    const prefix = `oz-wari-${tripId}-`;
    try {
      localStorage.setItem(prefix + 'tickets', JSON.stringify(tickets));
    } catch (e) {
      console.error('Failed to save tickets to localStorage', e);
    }
  }, [tickets, tripId]);

  useEffect(() => {
    if (!tripId) return;
    const prefix = `oz-wari-${tripId}-`;
    localStorage.setItem(prefix + 'expenses', JSON.stringify(expenses));
  }, [expenses, tripId]);

  useEffect(() => {
    if (!tripId) return;
    const prefix = `oz-wari-${tripId}-`;
    try {
      localStorage.setItem(prefix + 'packing', JSON.stringify(packingList));
    } catch (e) {
      console.error('Failed to save packing list to localStorage', e);
    }
  }, [packingList, tripId]);

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

  const updatePackingList = (val: PackingItem[] | ((prev: PackingItem[]) => PackingItem[])) => {
    setPackingList(prev => {
      const newVal = typeof val === 'function' ? val(prev) : val;
      pushUpdate({ packingList: newVal });
      return newVal;
    });
  };

  const handleLoadSampleData = async () => {
    if (!window.confirm('サンプルデータを読み込みますか？現在のデータは一時的にバックアップされ、後で戻すことができます。')) return;

    // 現在のデータをバックアップ
    const backupKey = `oz-wari-backup-${new Date().getTime()}`;
    const currentData = { expenses, itinerary, tickets, packingList, userProfiles, budget, tripName, tripStartDate, tripEndDate, tripCoverImage };
    localStorage.setItem(backupKey, JSON.stringify(currentData));
    localStorage.setItem('oz-wari-last-backup-key', backupKey); // 最新のバックアップキーを保存
    console.log(`Backup saved to ${backupKey}`);

    // サンプルデータをセット
    setExpenses(SAMPLE_EXPENSES);
    setItinerary(SAMPLE_ITINERARY);
    setTickets(SAMPLE_TICKETS);
    setPackingList(SAMPLE_PACKING || []);
    setUserProfiles(SAMPLE_PROFILES);
    setTripName('オーストラリア 6Days Demo');
    const startDate = new Date().toISOString().split('T')[0];
    setTripStartDate(startDate);
    // 6日間（5泊）
    const endDate = new Date(new Date().getTime() + 5 * 86400000).toISOString().split('T')[0];
    setTripEndDate(endDate);
    setTripCoverImage('https://images.unsplash.com/photo-1523413651479-797eb2c384d6?q=80&w=1200&auto=format&fit=crop');

    // Firebaseへ同期
    if (tripId) {
      pushUpdate({
        expenses: SAMPLE_EXPENSES,
        itinerary: SAMPLE_ITINERARY,
        tickets: SAMPLE_TICKETS,
        packingList: SAMPLE_PACKING || [],
        userProfiles: SAMPLE_PROFILES,
        name: 'オーストラリア 6Days Demo',
        startDate: startDate,
        endDate: endDate,
        coverImage: 'https://images.unsplash.com/photo-1523413651479-797eb2c384d6?q=80&w=1200&auto=format&fit=crop'
      });
    }

    alert('オーストラリアのサンプルデータを読み込みました！設定画面から元のデータに戻すことも可能です。');
    setView('home');
  };

  const handleRestoreData = async () => {
    const lastBackupKey = localStorage.getItem('oz-wari-last-backup-key');
    if (!lastBackupKey) {
      alert('復元可能なバックアップが見つかりません。');
      return;
    }

    const backupDataStr = localStorage.getItem(lastBackupKey);
    if (!backupDataStr) {
      alert('バックアップデータが破損しているか、削除されています。');
      return;
    }

    if (!window.confirm('サンプルデータを読み込む前の状態に戻しますか？')) return;

    try {
      const data = JSON.parse(backupDataStr);
      setExpenses(data.expenses || []);
      setItinerary(data.itinerary || []);
      setTickets(data.tickets || []);
      setPackingList(data.packingList || []);
      setUserProfiles(data.userProfiles || []);
      setBudget(data.budget || 0);
      setTripName(data.tripName || '無題の旅行');
      setTripStartDate(data.tripStartDate || new Date().toISOString().split('T')[0]);
      setTripEndDate(data.tripEndDate || new Date().toISOString().split('T')[0]);
      setTripCoverImage(data.tripCoverImage || '');

      // Firebaseへ同期
      if (tripId) {
        pushUpdate({
          expenses: data.expenses,
          itinerary: data.itinerary,
          tickets: data.tickets,
          packingList: data.packingList,
          userProfiles: data.userProfiles,
          budget: data.budget,
          name: data.tripName,
          startDate: data.tripStartDate,
          endDate: data.tripEndDate,
          coverImage: data.tripCoverImage
        });
      }

      alert('データを復元しました！');
      localStorage.removeItem('oz-wari-last-backup-key'); // 復元後はキーを削除（連続復元防止）
      setView('home');
    } catch (e) {
      console.error('Restore failed', e);
      alert('復元に失敗しました。');
    }
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
    const balances: Record<string, number> = {};
    const memberIds = userProfiles.map(u => u.id);
    if (memberIds.length === 0) return [];

    memberIds.forEach(id => { balances[id] = 0; });
    expenses.forEach(exp => {
      const amountJPY = convertToJPY(exp.amount, exp.currency, exp.exchangeRate);
      const share = amountJPY / (exp.splitWith.length || 1);
      balances[exp.paidBy] += amountJPY;
      exp.splitWith.forEach(id => {
        if (balances[id] !== undefined) balances[id] -= share;
      });
    });
    const result: Settlement[] = [];
    let payers = memberIds.map(id => ({ name: id, balance: balances[id] })).filter(p => p.balance < -1).sort((a, b) => a.balance - b.balance);
    let receivers = memberIds.map(id => ({ name: id, balance: balances[id] })).filter(p => p.balance > 1).sort((a, b) => b.balance - a.balance);
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
  }, [expenses, userProfiles]);

  return (
    <div className={`min-h-screen bg-ocean-light flex flex-col items-center antialiased font-sans select-none`}>
      {/* Main Container */}
      <div className={`${viewModeSize === 'tablet' ? 'max-w-2xl' : 'max-w-md'} w-full mx-auto min-h-screen h-screen bg-surface-gray flex flex-col text-ink relative overflow-hidden sm:border-x sm:border-surface-gray-mid transition-all duration-300 shadow-2xl shadow-ocean-dark/20`}>

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
                  // window.location.href ではなく、確実にIDを含めたURLを再構築する
                  const url = `${window.location.origin}${window.location.pathname}?trip=${tripId}`;
                  if (navigator.share) {
                    try {
                      await navigator.share({ title: 'たびログ精算', text: '旅行の精算をしよう！', url });
                    } catch (e) {
                      console.log('Share canceled', e);
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
                      packingList: [],
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

        {/* Welcome / Onboarding View */}
        {view === 'onboarding' && (
          <WelcomeView
            onDemoStart={handleLoadSampleData}
            onStart={async (data) => {
              setTripName(data.name);
              setTripStartDate(data.startDate);
              setTripEndDate(data.endDate);
              setUserProfiles(data.userProfiles);
              setTripCoverImage(data.coverImage);

              setSyncStatus('syncing');
              try {
                const newId = await createNewTrip({
                  name: data.name,
                  startDate: data.startDate,
                  endDate: data.endDate,
                  coverImage: data.coverImage,
                  userProfiles: data.userProfiles,
                  expenses: [],
                  itinerary: [],
                  tickets: [],
                  packingList: [],
                  budget: 1000000 // Default 1M
                });
                setTripId(newId);
                const url = `${window.location.origin}${window.location.pathname}?trip=${newId}`;
                window.history.pushState({}, '', url);
                setView('home');
                setSyncStatus('success');
              } catch (e) {
                console.error(e);
                alert("作成に失敗しました。オフラインモードで開始します。");
                setView('home');
              } finally {
                setTimeout(() => setSyncStatus('idle'), 2000);
              }
            }}
          />
        )}

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
              onTripCoverImageChange={updateTripCoverImage}
              isTablet={viewModeSize === 'tablet'}
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
              userProfiles={userProfiles}
              onSave={handleUpdateItinerary}
              onDelete={handleDeleteItinerary}
              tripStartDate={tripStartDate}
              tripEndDate={tripEndDate}
            />
          )}

          {view === 'tickets' && (
            <TicketView
              tickets={tickets}
              userProfiles={userProfiles}
              onSave={handleUpdateTicket}
              onDelete={handleDeleteTicket}
              tripStartDate={tripStartDate}
              tripEndDate={tripEndDate}
              isTablet={viewModeSize === 'tablet'}
            />
          )}

          {view === 'packing' && (
            <PackingView
              items={packingList}
              userProfiles={userProfiles}
              onUpdate={updatePackingList}
              isTablet={viewModeSize === 'tablet'}
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
              onLoadSampleData={handleLoadSampleData}
              onRestoreData={handleRestoreData}
              onBack={() => setView('home')}
              viewModeSize={viewModeSize}
              onUpdateViewModeSize={setViewModeSize}
            />
          )}
        </main>

        {/* Bottom Navigation - ホワイトカード */}
        {view !== 'onboarding' && view !== 'add_expense' && view !== 'settle' && view !== 'settings' && (
          <>
            {/* 追加メニュー表示時のオーバーレイ */}
            {isAddMenuOpen && (
              <div
                className="fixed inset-0 bg-ocean-dark/40 backdrop-blur-[2px] z-[35] animate-in fade-in duration-200"
                onClick={() => setIsAddMenuOpen(false)}
              />
            )}

            <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-[400px] h-16 bg-white rounded-full flex justify-between items-center px-6 shadow-lg border border-surface-gray-mid z-[40] safe-pb">
              <button onClick={() => { setView('home'); setIsAddMenuOpen(false); }} className={`flex flex-col items-center gap-1 transition-all ${view === 'home' ? 'text-primary -translate-y-1' : 'text-ink-light'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                <span className="text-[9px] font-bold tracking-widest uppercase">HOME</span>
              </button>

              <button onClick={() => { setView('schedule'); setIsAddMenuOpen(false); }} className={`flex flex-col items-center gap-1 transition-all ${view === 'schedule' ? 'text-primary -translate-y-1' : 'text-ink-light'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="text-[9px] font-bold tracking-widest uppercase">PLAN</span>
              </button>

              <div className="relative">
                {/* スピードダイヤルメニュー */}
                {isAddMenuOpen && (
                  <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col gap-3 items-center animate-in slide-in-from-bottom-4 fade-in duration-300">
                    <button
                      onClick={() => { setView('packing'); setIsAddMenuOpen(false); }}
                      className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl shadow-xl border border-surface-gray-mid whitespace-nowrap active:scale-95 transition-transform"
                    >
                      <span className="text-lg">📦</span>
                      <span className="text-xs font-bold text-ink">持ち物の追加</span>
                    </button>
                    <button
                      onClick={() => { setView('schedule'); setIsAddMenuOpen(false); }}
                      className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl shadow-xl border border-surface-gray-mid whitespace-nowrap active:scale-95 transition-transform"
                    >
                      <span className="text-lg">🗓️</span>
                      <span className="text-xs font-bold text-ink">予定の追加</span>
                    </button>
                    <button
                      onClick={() => { setEditingExpense(null); setView('add_expense'); setIsAddMenuOpen(false); }}
                      className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl shadow-xl border border-surface-gray-mid whitespace-nowrap active:scale-95 transition-transform"
                    >
                      <span className="text-lg">💰</span>
                      <span className="text-xs font-bold text-ink">支出の登録</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                  className={`w-14 h-14 bg-primary rounded-full flex items-center justify-center text-white shadow-lg -translate-y-6 transition-all z-50 ${isAddMenuOpen ? 'rotate-45 scale-90 bg-ocean-dark' : 'active:scale-95'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                </button>
              </div>

              <button onClick={() => { setView('tickets'); setIsAddMenuOpen(false); }} className={`flex flex-col items-center gap-1 transition-all ${view === 'tickets' ? 'text-primary -translate-y-1' : 'text-ink-light'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                <span className="text-[9px] font-bold tracking-widest uppercase">TICKETS</span>
              </button>

              <button onClick={() => { setView('packing'); setIsAddMenuOpen(false); }} className={`flex flex-col items-center gap-1 transition-all ${view === 'packing' ? 'text-primary -translate-y-1' : 'text-ink-light'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                <span className="text-[9px] font-bold tracking-widest uppercase">PACKING</span>
              </button>
            </nav>
          </>
        )}
      </div>
    </div>
  );
};

export default App;
