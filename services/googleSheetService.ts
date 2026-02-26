
import { Expense, ItineraryItem, Ticket, UserProfile, PackingItem } from '../types';
import { convertToJPY } from '../utils/currency';
import { MEMBER_COLORS } from '../constants';

// GAS WebApp の URL（1本のURLで全tripIdを管理）
const GAS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxMLrlCb3WphIRPzcnnoqKA615GJT0bylB-rMuUMZtEf85GK9yybzdlxhauUhypFAr1XQ/exec';

// マスタースプレッドシートID（ここに設定することでURLを生成できる）
export const MASTER_SPREADSHEET_ID = ''; // TODO: 実際のSpreadsheet IDを入れる
export const getMasterSheetUrl = () =>
  MASTER_SPREADSHEET_ID
    ? `https://docs.google.com/spreadsheets/d/${MASTER_SPREADSHEET_ID}/view`
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
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      // payloadにtripIdを付加してGASに送信
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
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return true;
  } catch (error) {
    console.error('[GSheet] Bulk sync failed:', error);
    return false;
  }
}

/**
 * 一括エクスポート (白紙化 → 全データ書き込み)
 * - 毎回マスターシートを白紙にしてから全データを書き込む
 * - 他のグループへの情報漏洩を防ぐ
 * - packingListもエクスポート対象に含む
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
}): Promise<boolean> {
  const { tripId, profiles, expenses, itinerary, tickets, packingList, tripSettings } = params;

  if (!tripId) {
    console.error('[GSheet] tripIdが未設定');
    return false;
  }

  try {
    // Step1: マスターシートを白紙化
    await resetSheetData(tripId);

    // Step2: 全データをBULK_SAVEで送信
    const rows: any[] = [
      // 旅行設定
      {
        id: 'TRIP_SETTINGS',
        date: '2024-01-01',
        title: tripSettings.tripName || '無題',
        category: CAT_TRIP_SETTINGS,
        paidBy: 'SYSTEM',
        amount: 0,
        currency: 'JPY',
        exchangeRate: 1,
        amountJPY: 0,
        splitWith: '',
        sourceUrl: JSON.stringify(tripSettings),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      // メンバー
      ...profiles.map(p => ({
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
      // 支出
      ...expenses.map(e => ({
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
      // スケジュール
      ...itinerary.map(item => ({
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
      // チケット
      ...tickets.map(item => ({
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
          referenceNumber: item.referenceNumber, notes: item.notes, link: item.link,
          passengerIds: item.passengerIds
        }),
        createdAt: new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString()
      })),
      // 荷物リスト
      ...packingList.map(item => ({
        id: `PACKING_${item.id}`,
        date: '2024-01-01',
        title: item.title,
        category: CAT_PACKING,
        paidBy: 'SYSTEM',
        amount: 0,
        currency: 'JPY',
        exchangeRate: 1,
        amountJPY: 0,
        splitWith: '',
        sourceUrl: JSON.stringify({
          category: item.category,
          isPacked: item.isPacked,
          assignees: item.assignees || [],
          packedBy: item.packedBy || []
        }),
        createdAt: new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString()
      }))
    ];

    await fetch(GAS_WEBAPP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'BULK_SAVE', tripId, data: rows })
    });

    return true;
  } catch (error) {
    console.error('[GSheet] exportToMasterSheet failed:', error);
    return false;
  }
}
