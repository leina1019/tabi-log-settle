
import { Expense, ItineraryItem, Ticket, UserProfile, PackingItem } from '../types';
import { convertToJPY } from '../utils/currency';
import { MEMBER_COLORS } from '../constants';

// GAS WebApp の URL（1本のURLで全tripIdを管理）
const GAS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbyvB_2VRNzgoqRdfTM_bpoUv6K-ak8oRQcs5ZTWyGNkqNu8G4ZLMYW8gUiMVPVg0TtL/exec';

// マスタースプレッドシートID（ここに設定することでURLを生成できる）
export const MASTER_SPREADSHEET_ID = '1nLjmh3UX9PmoX88B5oU5qNRvpgT5p6g01rqQs7yEPaE'; // TODO: 実際のSpreadsheet IDを入れる
export const getMasterSheetUrl = () =>
  MASTER_SPREADSHEET_ID
    ? `https://docs.google.com/spreadsheets/d/${MASTER_SPREADSHEET_ID}/edit`
    : null;

// シート内でデータ種別を区別するための特殊カテゴリ定数
const CAT_ITINERARY = '__ITINERARY__';
const CAT_TICKET = '__TICKET__';
const CAT_PROFILE = '__PROFILE__';
const CAT_TRIP_SETTINGS = '__TRIP_SETTINGS__';
const CAT_PACKING = '__PACKING__'; // 荷物リスト

interface CloudData {
  expenses: Expense[];
  itinerary: ItineraryItem[];
  tickets: Ticket[];
  profiles: UserProfile[];
  tripSettings: any | null;
}

// sourceUrlに格納されたJSON文字列を安全にパースするヘルパー
const parseExtraData = (jsonStr: string | undefined) => {
  if (!jsonStr) return {};
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    return {};
  }
};

/**
 * データ取得 - tripIdに対応するスプレッドシートからデータを取得する
 */
export async function fetchAllData(tripId: string): Promise<CloudData> {
  if (!tripId) throw new Error('tripId is required');

  try {
    // GETリクエストにtripIdを付与して対象シートのデータを取得
    const response = await fetch(`${GAS_WEBAPP_URL}?tripId=${encodeURIComponent(tripId)}&t=${Date.now()}`);
    if (!response.ok) throw new Error('Network response was not ok');
    const rawData = await response.json();

    if (!Array.isArray(rawData)) {
      return { expenses: [], itinerary: [], tickets: [], profiles: [], tripSettings: null };
    }

    const result: CloudData = {
      expenses: [],
      itinerary: [],
      tickets: [],
      profiles: [],
      tripSettings: null
    };

    rawData.forEach((item: any) => {
      const category = String(item.category);
      const updatedAt = item.updatedAt || item.createdAt || new Date().toISOString();

      if (category === CAT_ITINERARY) {
        const extras = parseExtraData(item.sourceUrl);
        result.itinerary.push({
          id: String(item.id).replace('ITINERARY_', ''),
          date: String(item.date),
          title: String(item.title),
          time: extras.time || '00:00',
          location: extras.location,
          memo: extras.memo,
          link: extras.link,
          type: extras.type || 'activity',
          updatedAt
        });
      } else if (category === CAT_TICKET) {
        const extras = parseExtraData(item.sourceUrl);
        result.tickets.push({
          id: String(item.id).replace('TICKET_', ''),
          date: String(item.date),
          title: String(item.title),
          type: extras.type || 'other',
          provider: extras.provider || '',
          time: extras.time,
          referenceNumber: extras.referenceNumber,
          notes: extras.notes,
          link: extras.link,
          updatedAt
        });
      } else if (category === CAT_PROFILE) {
        const id = String(item.id).replace('PROFILE_', '');
        result.profiles.push({
          id,
          displayName: String(item.title),
          avatarUrl: item.sourceUrl,
          color: MEMBER_COLORS[result.profiles.length % MEMBER_COLORS.length],
          updatedAt
        });
      } else if (category === CAT_TRIP_SETTINGS) {
        result.tripSettings = parseExtraData(item.sourceUrl);
      } else {
        // 通常の支出データ
        result.expenses.push({
          id: String(item.id),
          date: String(item.date),
          title: String(item.title),
          category: String(item.category),
          paidBy: item.paidBy,
          amount: Number(item.amount),
          currency: item.currency as Expense['currency'],
          exchangeRate: Number(item.exchangeRate),
          splitWith: typeof item.splitWith === 'string' ? item.splitWith.split(', ') : item.splitWith,
          sourceUrl: item.sourceUrl,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt || item.createdAt,
          isLocalOnly: false,
          hasConflict: false
        });
      }
    });

    return result;
  } catch (error) {
    console.error('Fetch failed:', error);
    throw error;
  }
}

/**
 * 汎用POST送信ヘルパー（tripIdを必ず含める）
 */
async function syncGenericItem(tripId: string, payload: any): Promise<boolean> {
  try {
    await fetch(GAS_WEBAPP_URL, {
      method: 'POST',
      // payloadにtripIdを付加してGASに送信
      // headersを指定しない（かつtext/plain相当）ことで、
      // プリフライト(OPTIONS)を回避し、GASのdoPostへ確実にデータを届けます
      body: JSON.stringify({ ...payload, tripId }),
    });
    return true;
  } catch (error) {
    console.error('Sync failed', error);
    return false;
  }
}

// --- 個別データの同期関数 ---

export async function syncExpenseToSheet(tripId: string, expense: Expense): Promise<boolean> {
  return syncGenericItem(tripId, {
    id: expense.id,
    date: expense.date,
    title: expense.title,
    category: expense.category,
    paidBy: expense.paidBy,
    amount: expense.amount,
    currency: expense.currency,
    exchangeRate: expense.exchangeRate,
    amountJPY: convertToJPY(expense.amount, expense.currency, expense.exchangeRate),
    splitWith: expense.splitWith.join(', '),
    sourceUrl: expense.sourceUrl || '',
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt
  });
}

export async function syncItineraryToSheet(tripId: string, item: ItineraryItem): Promise<boolean> {
  const extras = { time: item.time, location: item.location, memo: item.memo, link: item.link, type: item.type };
  return syncGenericItem(tripId, {
    id: `ITINERARY_${item.id}`,
    date: item.date,
    title: item.title,
    category: CAT_ITINERARY,
    paidBy: 'SYSTEM',
    amount: 0,
    currency: 'JPY',
    exchangeRate: 1,
    amountJPY: 0,
    splitWith: '',
    sourceUrl: JSON.stringify(extras),
    createdAt: new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString()
  });
}

export async function syncTicketToSheet(tripId: string, item: Ticket): Promise<boolean> {
  const extras = {
    type: item.type, provider: item.provider, time: item.time,
    referenceNumber: item.referenceNumber, notes: item.notes, link: item.link
  };
  return syncGenericItem(tripId, {
    id: `TICKET_${item.id}`,
    date: item.date,
    title: item.title,
    category: CAT_TICKET,
    paidBy: 'SYSTEM',
    amount: 0,
    currency: 'JPY',
    exchangeRate: 1,
    amountJPY: 0,
    splitWith: '',
    sourceUrl: JSON.stringify(extras),
    createdAt: new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString()
  });
}

export async function syncProfileToSheet(tripId: string, profile: UserProfile): Promise<boolean> {
  return syncGenericItem(tripId, {
    id: `PROFILE_${profile.id}`,
    date: '2024-01-01',
    title: profile.displayName,
    category: CAT_PROFILE,
    paidBy: profile.id,
    amount: 0,
    currency: 'JPY',
    exchangeRate: 1,
    amountJPY: 0,
    splitWith: '',
    sourceUrl: profile.avatarUrl || '',
    createdAt: new Date().toISOString(),
    updatedAt: profile.updatedAt || new Date().toISOString()
  });
}

export async function deleteItemFromSheet(tripId: string, id: string): Promise<boolean> {
  return syncGenericItem(tripId, { action: 'DELETE', id });
}

export async function resetSheetData(tripId: string): Promise<boolean> {
  return syncGenericItem(tripId, { action: 'RESET' });
}

/**
 * 全データを一括同期 - tripIdに対応するスプレッドシートへ全件書き込む
 */
export async function syncAllDataToSheet(data: CloudData, tripId: string): Promise<boolean> {
  if (!tripId) {
    console.error('[GSheet] tripIdが未設定のため同期をスキップします');
    return false;
  }

  try {
    // 1. 対象スプレッドシートをリセット
    await resetSheetData(tripId);

    // 2. 全データをまとめてBULK_SAVEで送信
    const payload: { action: string; tripId: string; data: any[] } = {
      action: 'BULK_SAVE',
      tripId, // ← tripIdをペイロードに含める
      data: [
        // メンバープロフィール
        ...data.profiles.map(p => ({
          id: `PROFILE_${p.id}`,
          date: '2024-01-01',
          title: p.displayName,
          category: CAT_PROFILE,
          paidBy: p.id,
          amount: 0,
          currency: 'JPY',
          exchangeRate: 1,
          amountJPY: 0,
          splitWith: '',
          sourceUrl: p.avatarUrl || '',
          createdAt: new Date().toISOString(),
          updatedAt: p.updatedAt || new Date().toISOString()
        })),
        // 支出データ
        ...data.expenses.map(e => ({
          id: e.id,
          date: e.date,
          title: e.title,
          category: e.category,
          paidBy: e.paidBy,
          amount: e.amount,
          currency: e.currency,
          exchangeRate: e.exchangeRate,
          amountJPY: convertToJPY(e.amount, e.currency, e.exchangeRate),
          splitWith: e.splitWith.join(', '),
          sourceUrl: e.sourceUrl || '',
          createdAt: e.createdAt,
          updatedAt: e.updatedAt
        })),
        // スケジュールデータ
        ...data.itinerary.map(item => ({
          id: `ITINERARY_${item.id}`,
          date: item.date,
          title: item.title,
          category: CAT_ITINERARY,
          paidBy: 'SYSTEM',
          amount: 0,
          currency: 'JPY',
          exchangeRate: 1,
          amountJPY: 0,
          splitWith: '',
          sourceUrl: JSON.stringify({
            time: item.time, location: item.location,
            memo: item.memo, link: item.link, type: item.type
          }),
          createdAt: new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString()
        })),
        // チケットデータ
        ...data.tickets.map(item => ({
          id: `TICKET_${item.id}`,
          date: item.date,
          title: item.title,
          category: CAT_TICKET,
          paidBy: 'SYSTEM',
          amount: 0,
          currency: 'JPY',
          exchangeRate: 1,
          amountJPY: 0,
          splitWith: '',
          sourceUrl: JSON.stringify({
            type: item.type, provider: item.provider, time: item.time,
            referenceNumber: item.referenceNumber, notes: item.notes, link: item.link
          }),
          createdAt: new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString()
        }))
      ]
    };

    // 旅行設定データがあれば追加
    if (data.tripSettings) {
      payload.data.push({
        id: 'TRIP_SETTINGS',
        date: '2024-01-01',
        title: 'Trip Settings',
        category: CAT_TRIP_SETTINGS,
        paidBy: 'SYSTEM',
        amount: 0,
        currency: 'JPY',
        exchangeRate: 1,
        amountJPY: 0,
        splitWith: '',
        sourceUrl: JSON.stringify(data.tripSettings),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    // GASへPOST送信
    await fetch(GAS_WEBAPP_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return true;
  } catch (error) {
    console.error('[GSheet] Bulk sync failed:', error);
    return false;
  }
}

import { calculateBalances, calculateSettlements } from '../utils/settlementUtils';

/**
 * 一括エクスポート (マルチタブ形式)
 * - 清算用・振り返り用の人間が読みやすい形式で出力
 */
export async function exportToMasterSheet(params: {
  tripId: string;
  profiles: UserProfile[];
  expenses: Expense[];
  itinerary: ItineraryItem[];
  tickets: Ticket[];
  packingList: PackingItem[];
  tripSettings: {
    tripName: string;
    tripStartDate: string;
    tripEndDate: string;
    coverImage: string;
    budget: number;
  };
}): Promise<string | null> {
  const { tripId, profiles, expenses, itinerary, tickets, packingList, tripSettings } = params;

  if (!tripId) return null;

  try {
    // 1. 各種計算
    const balances = calculateBalances(expenses, profiles);
    const settlements = calculateSettlements(balances);
    const totalJPY = expenses.reduce((sum, e) => sum + convertToJPY(e.amount, e.currency, e.exchangeRate), 0);
    const getDisplayName = (id: string) => profiles.find(p => p.id === id)?.displayName || id;

    // 2. シートデータの構築
    const sheets: Record<string, { headers: string[], data: any[] }> = {
      "概要": {
        headers: ["項目", "値", "備考"],
        data: [
          { "項目": "旅行名", "値": tripSettings.tripName },
          { "項目": "期間", "値": `${tripSettings.tripStartDate} 〜 ${tripSettings.tripEndDate}` },
          { "項目": "予算", "値": `${tripSettings.budget.toLocaleString()}円` },
          { "項目": "合計支出", "値": `${Math.round(totalJPY).toLocaleString()}円` },
          { "項目": "-------------------", "値": "-------------------", "備考": "-------------------" },
          { "項目": "【精算指示】", "値": "送金する人", "備考": "受け取る人" },
          ...settlements.map(s => ({
            "項目": `${Math.round(s.amount).toLocaleString()}円`,
            "値": getDisplayName(s.from),
            "備考": `→ ${getDisplayName(s.to)}`
          })),
          { "項目": "-------------------", "値": "-------------------", "備考": "-------------------" },
          { "項目": "【個人別収支】", "値": "名前", "備考": "収支(＋が受取/－が支払)" },
          ...profiles.map(p => ({
            "項目": p.displayName,
            "値": `${Math.round(balances[p.id] || 0).toLocaleString()}円`,
            "備考": balances[p.id] >= 0 ? "受取待ち" : "支払いが必要"
          }))
        ]
      },
      "支出精算": {
        headers: ["日付", "内容", "カテゴリ", "支払者", "金額", "通貨", "レート", "日本円相当", "精算対象", "ID"],
        data: expenses.map(e => ({
          "日付": e.date,
          "内容": e.title,
          "カテゴリ": e.category,
          "支払者": getDisplayName(e.paidBy),
          "金額": e.amount,
          "通貨": e.currency,
          "レート": e.exchangeRate,
          "日本円相当": convertToJPY(e.amount, e.currency, e.exchangeRate),
          "精算対象": e.splitWith.map(id => getDisplayName(id)).join(", "),
          "ID": e.id
        }))
      },
      "スケジュール": {
        headers: ["日付", "時刻", "内容", "場所", "メモ", "リンク", "参加者"],
        data: itinerary.map(item => ({
          "日付": item.date,
          "時刻": item.time,
          "内容": item.title,
          "場所": item.location || "",
          "メモ": item.memo || "",
          "リンク": item.link || "",
          "参加者": item.participantIds ? item.participantIds.map(id => getDisplayName(id)).join(", ") : "全員"
        }))
      },
      "チケット": {
        headers: ["種類", "タイトル", "提供元/会社", "日付", "時刻", "予約番号", "メモ", "リンク", "利用者"],
        data: tickets.map(item => ({
          "種類": item.type,
          "タイトル": item.title,
          "提供元/会社": item.provider || "",
          "日付": item.date,
          "時刻": item.time || "",
          "予約番号": item.referenceNumber || "",
          "メモ": item.notes || "",
          "リンク": item.link || "",
          "利用者": item.passengerIds ? item.passengerIds.map(id => getDisplayName(id)).join(", ") : "全員"
        }))
      },
      "持ち物": {
        headers: ["カテゴリ", "アイテム", "準備完了", "担当", "完了者"],
        data: packingList.map(item => ({
          "カテゴリ": item.category,
          "アイテム": item.title,
          "準備完了": item.isPacked ? "○" : "×",
          "担当": item.assignees ? item.assignees.map(id => getDisplayName(id)).join(", ") : "全員",
          "完了者": item.packedBy ? item.packedBy.map(id => getDisplayName(id)).join(", ") : ""
        }))
      },
      "[HIDDEN]data": {
        headers: ["id", "date", "title", "category", "paidBy", "amount", "currency", "exchangeRate", "amountJPY", "splitWith", "sourceUrl", "createdAt", "updatedAt"],
        data: [
          ...expenses.map(e => ({
            id: e.id, date: e.date, title: e.title, category: e.category, paidBy: e.paidBy,
            amount: e.amount, currency: e.currency, exchangeRate: e.exchangeRate,
            amountJPY: convertToJPY(e.amount, e.currency, e.exchangeRate),
            splitWith: e.splitWith.join(", "), sourceUrl: e.sourceUrl || '',
            createdAt: e.createdAt, updatedAt: e.updatedAt
          })),
          ...itinerary.map(item => ({
            id: `ITINERARY_${item.id}`, date: item.date, title: item.title, category: '__ITINERARY__', paidBy: 'SYSTEM',
            amount: 0, currency: 'JPY', exchangeRate: 1, amountJPY: 0, splitWith: '',
            sourceUrl: JSON.stringify({ time: item.time, location: item.location, memo: item.memo, link: item.link, type: item.type }),
            createdAt: new Date().toISOString(), updatedAt: item.updatedAt || new Date().toISOString()
          })),
          ...tickets.map(item => ({
            id: `TICKET_${item.id}`, date: item.date, title: item.title, category: '__TICKET__', paidBy: 'SYSTEM',
            amount: 0, currency: 'JPY', exchangeRate: 1, amountJPY: 0, splitWith: '',
            sourceUrl: JSON.stringify({ type: item.type, provider: item.provider, time: item.time, referenceNumber: item.referenceNumber, notes: item.notes, link: item.link, passengerIds: item.passengerIds }),
            createdAt: new Date().toISOString(), updatedAt: item.updatedAt || new Date().toISOString()
          })),
          ...packingList.map(item => ({
            id: `PACKING_${item.id}`, date: '2024-01-01', title: item.title, category: '__PACKING__', paidBy: 'SYSTEM',
            amount: 0, currency: 'JPY', exchangeRate: 1, amountJPY: 0, splitWith: '',
            sourceUrl: JSON.stringify({ category: item.category, isPacked: item.isPacked, assignees: item.assignees || [], packedBy: item.packedBy || [] }),
            createdAt: new Date().toISOString(), updatedAt: item.updatedAt || new Date().toISOString()
          })),
          ...profiles.map(p => ({
            id: `PROFILE_${p.id}`, date: '2024-01-01', title: p.displayName, category: '__PROFILE__', paidBy: p.id,
            amount: 0, currency: 'JPY', exchangeRate: 1, amountJPY: 0, splitWith: '', sourceUrl: p.avatarUrl || '',
            createdAt: new Date().toISOString(), updatedAt: p.updatedAt || new Date().toISOString()
          })),
          {
            id: 'TRIP_SETTINGS', date: '2024-01-01', title: tripSettings.tripName, category: '__TRIP_SETTINGS__', paidBy: 'SYSTEM',
            amount: 0, currency: 'JPY', exchangeRate: 1, amountJPY: 0, splitWith: '', sourceUrl: JSON.stringify(tripSettings),
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
          }
        ]
      }
    };

    // 3. GASへ送信
    const response = await fetch(GAS_WEBAPP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'EXPORT_MULTITAB', tripId, sheets })
    });

    if (!response.ok) return null;
    const result = await response.json();
    return result.spreadsheetId || MASTER_SPREADSHEET_ID;
  } catch (error) {
    console.error('[GSheet] exportToMasterSheet failed:', error);
    return null;
  }
}
