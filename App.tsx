import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Expense, Participant, Settlement, ItineraryItem, Ticket, UserProfile, PackingItem, ViewModeSize, TripData } from './types';
import { AppIcon } from './components/AppIcon';
import { MEMBER_COLORS, DEVICE_CONFIG } from './constants';
import { convertToJPY } from './utils/currency';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import Dashboard from './components/Dashboard';
import SettlementView from './components/SettlementView';
import ItineraryView from './components/ItineraryView';
import TicketView from './components/TicketView';
import SettingsView from './components/SettingsView';
import PackingView from './components/PackingView';
import { createNewTrip, subscribeToTrip, updateTripData } from './services/firebaseService';
import { fetchAllData, syncAllDataToSheet } from './services/googleSheetService';
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
  const [viewModeSize, setViewModeSize] = useState<ViewModeSize>(() => {
    const saved = localStorage.getItem('tabilog-view-mode-size');
    if (saved && Object.keys(DEVICE_CONFIG).includes(saved)) return saved as ViewModeSize;
    return 'phone';
  });
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [tripId, setTripId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  // 削除済みIDを一時的に保持して、同期時のゾンビ復活を防ぐ
  const deletedIdsRef = useRef<Set<string>>(new Set());

  // --- Initialize & Subscribe (Firebase) ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('trip');
    if (id) {
      setTripId(id);

      // Load from LocalStorage only if tripId exists (editing existing trip)
      const prefix = `tabilog-${id}-`;
      const sBudget = localStorage.getItem(prefix + 'budget');
      if (sBudget) setBudget(parseInt(sBudget, 10));

      const sProfiles = localStorage.getItem(prefix + 'profiles');
      if (sProfiles) {
        try {
          setUserProfiles(JSON.parse(sProfiles));
        } catch (e) {
          console.error("Failed to parse profiles from localStorage", e);
        }
      }

      const sStart = localStorage.getItem(prefix + 'trip-start');
      if (sStart) setTripStartDate(sStart);

      const sEnd = localStorage.getItem(prefix + 'trip-end');
      if (sEnd) setTripEndDate(sEnd);

      const sName = localStorage.getItem(prefix + 'trip-name');
      if (sName) setTripName(sName);

      const sCover = localStorage.getItem(prefix + 'trip-cover');
      if (sCover) setTripCoverImage(sCover);

      const sExpenses = localStorage.getItem(prefix + 'expenses');
      if (sExpenses) {
        try {
          setExpenses(JSON.parse(sExpenses));
        } catch (e) {
          console.error("Failed to parse expenses from localStorage", e);
        }
      }

      const sItinerary = localStorage.getItem(prefix + 'itinerary');
      if (sItinerary) {
        try {
          setItinerary(JSON.parse(sItinerary));
        } catch (e) {
          console.error("Failed to parse itinerary from localStorage", e);
        }
      }

      const sTickets = localStorage.getItem(prefix + 'tickets');
      if (sTickets) {
        try {
          setTickets(JSON.parse(sTickets));
        } catch (e) {
          console.error("Failed to parse tickets from localStorage", e);
        }
      }

      const sPacking = localStorage.getItem(prefix + 'packing');
      if (sPacking) {
        try {
          setPackingList(JSON.parse(sPacking));
        } catch (e) {
          console.error("Failed to parse packing list from localStorage", e);
        }
      }
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

  // --- Consolidated Persistence (Local Storage) ---
  useEffect(() => {
    if (!tripId) return;
    const prefix = `tabilog-${tripId}-`;
    const saveData = {
      budget,
      profiles: userProfiles,
      'trip-start': tripStartDate,
      'trip-end': tripEndDate,
      'trip-name': tripName,
      'trip-cover': tripCoverImage,
      expenses,
      itinerary,
      tickets,
      packing: packingList
    };

    // 各キーを個別に保存（Firebaseのキャッシュとして機能）
    Object.entries(saveData).forEach(([key, value]) => {
      try {
        localStorage.setItem(prefix + key, typeof value === 'string' ? value : JSON.stringify(value));
      } catch (e) {
        console.warn('localStorage save failed for key:', key, e);
      }
    });

    localStorage.setItem('tabilog-view-mode-size', viewModeSize);
  }, [tripId, budget, userProfiles, tripStartDate, tripEndDate, tripName, tripCoverImage, expenses, itinerary, tickets, packingList, viewModeSize]);

  // --- Automatic Google Sheet Sync (Debounced 1.5s) ---
  useEffect(() => {
    if (!tripId) return;

    // 自動同期：tripId必須
    const timer = setTimeout(() => {
      if (!tripId) return;
      syncAllDataToSheet({
        profiles: userProfiles,
        expenses,
        itinerary,
        tickets,
        tripSettings: {
          tripName,
          tripStartDate,
          tripEndDate,
          coverImage: tripCoverImage,
          budget
        }
      }, tripId).then(success => {
        if (success) console.log('[GSheet] Debounced sync successful for tripId:', tripId);
      }).catch(err => console.error('[GSheet] Debounced sync error', err));
    }, 1500);

    return () => clearTimeout(timer);
  }, [tripId, budget, userProfiles, tripStartDate, tripEndDate, tripName, tripCoverImage, expenses, itinerary, tickets]);

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
    const backupKey = `tabilog-backup-${new Date().getTime()}`;
    const currentData = { expenses, itinerary, tickets, packingList, userProfiles, budget, tripName, tripStartDate, tripEndDate, tripCoverImage };
    localStorage.setItem(backupKey, JSON.stringify(currentData));
    localStorage.setItem('tabilog-last-backup-key', backupKey); // 最新のバックアップキーを保存
    console.log(`Backup saved to ${backupKey} `);

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
    setTripCoverImage('https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?q=80&w=1200&auto=format&fit=crop');

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
        coverImage: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?q=80&w=1200&auto=format&fit=crop'
      });
    }

    alert('TabiLogのサンプルデータを読み込みました！設定画面から元のデータに戻すことも可能です。');
    setView('home');
  };

  const handleRestoreData = async () => {
    const lastBackupKey = localStorage.getItem('tabilog-last-backup-key');
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
      localStorage.removeItem('tabilog-last-backup-key'); // 復元後はキーを削除（連続復元防止）
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
    // await deleteItemFromSheet(`ITINERARY_${ id } `); // For Google Sheet sync
  };

  // --- Handlers for Tickets ---
  const handleUpdateTicket = async (ticket: Ticket) => {
    updateTickets(prev => {
      const exists = prev.find(t => t.id === ticket.id);
      return exists ? prev.map(t => t.id === ticket.id ? ticket : t) : [...prev, ticket];
    });
  };

  const handleDeleteTicket = async (id: string) => {
    deletedIdsRef.current.add(id); // For Google Sheet sync
    updateTickets(prev => prev.filter(t => t.id !== id));
    setTimeout(() => { if (deletedIdsRef.current.has(id)) deletedIdsRef.current.delete(id); }, 60000);
  };

  // --- Handlers for Profiles ---
  const updateProfile = async (id: Participant, updates: Partial<UserProfile>) => {
    const now = new Date().toISOString();
    updateUserProfiles(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, ...updates, updatedAt: now };
      }
      return p;
    }));
  };

  const handleImportFullData = (data: any) => {
    if (!data) return;
    const trip = data.tripDetails || {};
    setTripName(trip.tripName || tripName);
    setTripStartDate(trip.tripStartDate || tripStartDate);
    setTripEndDate(trip.tripEndDate || tripEndDate);
    setTripCoverImage(trip.coverImage || tripCoverImage);
    setBudget(trip.budget || budget);

    if (data.userProfiles) setUserProfiles(data.userProfiles);
    if (data.expenses) setExpenses(data.expenses);
    if (data.itinerary) setItinerary(data.itinerary);
    if (data.tickets) setTickets(data.tickets);
    if (data.packingList) setPackingList(data.packingList);

    if (tripId) {
      pushUpdate({
        name: trip.tripName || tripName,
        startDate: trip.tripStartDate || tripStartDate,
        endDate: trip.tripEndDate || tripEndDate,
        coverImage: trip.coverImage || tripCoverImage,
        budget: trip.budget || budget,
        userProfiles: data.userProfiles,
        expenses: data.expenses,
        itinerary: data.itinerary,
        tickets: data.tickets,
        packingList: data.packingList
      });
    }
  };

  const handleSyncToSheet = async () => {
    setIsSyncing(true);
    try {
      // tripIdが未設定の場合は同期不可
      if (!tripId) {
        alert('旅行IDが設定されていません。URLから旅行リンクを開いてください。');
        return;
      }
      const success = await syncAllDataToSheet({
        profiles: userProfiles,
        expenses,
        itinerary,
        tickets,
        tripSettings: {
          tripName,
          tripStartDate,
          tripEndDate,
          coverImage: tripCoverImage,
          budget
        }
      }, tripId);
      if (success) alert('Googleスプレッドシートへの同期が完了しました！\n（tripId: ' + tripId + '）');
      else alert('同期に失敗しました。');
    } catch (e) {
      console.error(e);
      alert('エラーが発生しました。');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFetchFromSheet = async (isLongPress = false) => {
    if (isLongPress && !window.confirm('スプレッドシートから全データを強制的に再取得し、現在の内容を上書きします。よろしいですか？')) return;

    setIsSyncing(true);
    try {
      // tripIdが未設定の場合はフェッチ不可
      if (!tripId) {
        alert('旅行IDが未設定です。');
        return;
      }
      const cloudData = await fetchAllData(tripId);
      if (cloudData) {
        handleImportFullData({
          tripDetails: cloudData.tripSettings,
          userProfiles: cloudData.profiles,
          expenses: cloudData.expenses,
          itinerary: cloudData.itinerary,
          tickets: cloudData.tickets
        });
        alert(isLongPress ? '全データを強制再取得しました。' : '最新データを取得しました。');
      }
    } catch (e) {
      console.error(e);
      alert('データ取得に失敗しました。');
    } finally {
      setIsSyncing(false);
    }
  };

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
      <div className={`${DEVICE_CONFIG[viewModeSize]?.width || 'max-w-md'} w-full mx-auto min-h-screen h-screen bg-surface-gray flex flex-col text-ink relative overflow-hidden sm:border-x sm:border-surface-gray-mid transition-all duration-300 shadow-2xl shadow-ocean-dark/20`}>

        {/* Header - ANAブルー帯 */}
        <header className="bg-ocean-dark px-5 pt-2 pb-2 flex justify-between items-center z-20 safe-pt shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-inner bg-white/20 p-1 flex items-center justify-center">
              <img src="/logo_light.png" alt="Logo" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; if (e.currentTarget.nextSibling) (e.currentTarget.nextSibling as HTMLElement).classList.remove('hidden'); }} />
              <div className="hidden text-xl">✈️</div>
            </div>
            <h1 className="text-xl font-sans font-black tracking-tighter text-white">TabiLog</h1>
          </div>
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
                      await navigator.share({ title: 'たびログくん', text: '旅行の計画を立てよう！', url });
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
                        await navigator.share({ title: 'たびログくん', text: '旅行の計画を立てよう！', url });
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
              <span className="flex items-center gap-1">
                <AppIcon name={tripId ? "copy" : "share"} className="w-4 h-4" />
                {tripId ? 'コピー' : '共有'}
              </span>
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
              tripCoverImage={tripCoverImage}
              onTripCoverImageChange={updateTripCoverImage}
              itinerary={itinerary}
              isTablet={viewModeSize.startsWith('tablet')}
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
              isTablet={viewModeSize.startsWith('tablet')}
            />
          )}

          {view === 'packing' && (
            <PackingView
              items={packingList}
              userProfiles={userProfiles}
              onUpdate={updatePackingList}
              isTablet={viewModeSize.startsWith('tablet')}
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
              expenses={expenses}
              itinerary={itinerary}
              tickets={tickets}
              budget={budget}
              tripName={tripName}
              tripStartDate={tripStartDate}
              tripEndDate={tripEndDate}
              coverImage={tripCoverImage}
              onImportFullData={handleImportFullData}
              onSyncToSheet={handleSyncToSheet}
              onFetchFromSheet={handleFetchFromSheet}
              isSyncing={isSyncing}
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
                <AppIcon name="home" className="w-6 h-6" />
                <span className="text-[9px] font-bold tracking-widest uppercase">HOME</span>
              </button>

              <button onClick={() => { setView('schedule'); setIsAddMenuOpen(false); }} className={`flex flex-col items-center gap-1 transition-all ${view === 'schedule' ? 'text-primary -translate-y-1' : 'text-ink-light'}`}>
                <AppIcon name="itinerary" className="w-6 h-6" />
                <span className="text-[9px] font-bold tracking-widest uppercase">PLAN</span>
              </button>

              <div className="relative">
                {/* スピードダイヤルメニュー */}
                {isAddMenuOpen && (
                  <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col gap-3 items-center animate-in slide-in-from-bottom-4 fade-in duration-300">
                    <button
                      onClick={() => { setView('schedule'); setIsAddMenuOpen(false); }}
                      className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl shadow-xl border border-surface-gray-mid whitespace-nowrap active:scale-95 transition-transform"
                    >
                      <AppIcon name="itinerary" className="w-6 h-6 text-lg" />
                      <span className="text-xs font-bold text-ink">予定の追加</span>
                    </button>
                    <button
                      onClick={() => { setEditingExpense(null); setView('add_expense'); setIsAddMenuOpen(false); }}
                      className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl shadow-xl border border-surface-gray-mid whitespace-nowrap active:scale-95 transition-transform"
                    >
                      <AppIcon name="expense" className="w-6 h-6 text-lg" />
                      <span className="text-xs font-bold text-ink">支出の登録</span>
                    </button>
                    <button
                      onClick={() => { setView('packing'); setIsAddMenuOpen(false); }}
                      className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl shadow-xl border border-surface-gray-mid whitespace-nowrap active:scale-95 transition-transform"
                    >
                      <AppIcon name="packing" className="w-6 h-6 text-lg" />
                      <span className="text-xs font-bold text-ink">持ち物の追加</span>
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
                <AppIcon name="ticket" className="w-6 h-6" />
                <span className="text-[9px] font-bold tracking-widest uppercase">TICKETS</span>
              </button>

              <button onClick={() => { setView('packing'); setIsAddMenuOpen(false); }} className={`flex flex-col items-center gap-1 transition-all ${view === 'packing' ? 'text-primary -translate-y-1' : 'text-ink-light'}`}>
                <AppIcon name="packing" className="w-6 h-6" />
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
