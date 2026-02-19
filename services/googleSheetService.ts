
import { Expense, ItineraryItem, Ticket, UserProfile } from '../types';
import { convertToJPY } from '../utils/currency';

const GAS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxMLrlCb3WphIRPzcnnoqKA615GJT0bylB-rMuUMZtEf85GK9yybzdlxhauUhypFAr1XQ/exec';

// Special Category Constants to distinguish data types in the single sheet
const CAT_ITINERARY = '__ITINERARY__';
const CAT_TICKET = '__TICKET__';
const CAT_PROFILE = '__PROFILE__';
const CAT_TRIP_SETTINGS = '__TRIP_SETTINGS__';

interface CloudData {
  expenses: Expense[];
  itinerary: ItineraryItem[];
  tickets: Ticket[];
  profiles: UserProfile[];
  tripSettings: any | null;
}

// Helper to safely parse JSON from sourceUrl or return empty object
const parseExtraData = (jsonStr: string | undefined) => {
  if (!jsonStr) return {};
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    return {};
  }
};

export async function fetchAllData(): Promise<CloudData> {
  try {
    const response = await fetch(`${GAS_WEBAPP_URL}?t=${Date.now()}`);
    if (!response.ok) throw new Error('Network response was not ok');
    const rawData = await response.json();

    if (!Array.isArray(rawData)) return { expenses: [], itinerary: [], tickets: [], profiles: [], tripSettings: null };

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
          avatarUrl: item.sourceUrl, // Storing avatar URL directly in sourceUrl
          updatedAt
        });
      } else if (category === CAT_TRIP_SETTINGS) {
        result.tripSettings = parseExtraData(item.sourceUrl);
      } else {
        // Standard Expense
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

// Generic Sync Function
async function syncGenericItem(payload: any): Promise<boolean> {
  try {
    await fetch(GAS_WEBAPP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return true;
  } catch (error) {
    console.error("Sync failed", error);
    return false;
  }
}

export async function syncExpenseToSheet(expense: Expense): Promise<boolean> {
  return syncGenericItem({
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

export async function syncItineraryToSheet(item: ItineraryItem): Promise<boolean> {
  const extras = {
    time: item.time,
    location: item.location,
    memo: item.memo,
    link: item.link,
    type: item.type
  };
  return syncGenericItem({
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

export async function syncTicketToSheet(item: Ticket): Promise<boolean> {
  const extras = {
    type: item.type,
    provider: item.provider,
    time: item.time,
    referenceNumber: item.referenceNumber,
    notes: item.notes,
    link: item.link
  };
  return syncGenericItem({
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

export async function syncProfileToSheet(profile: UserProfile): Promise<boolean> {
  // CAUTION: Avatar URL can be large. If too large, GAS/Sheet might truncate or fail.
  // We recommend using URLs instead of Base64 if possible, but we'll attempt sync.
  return syncGenericItem({
    id: `PROFILE_${profile.id}`,
    date: '2024-01-01', // Dummy
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

export async function syncTripSettingsToSheet(settings: any): Promise<boolean> {
  return syncGenericItem({
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
    sourceUrl: JSON.stringify(settings),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

export async function deleteItemFromSheet(id: string): Promise<boolean> {
  try {
    await fetch(GAS_WEBAPP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'DELETE', id }),
    });
    return true;
  } catch (error) {
    return false;
  }
}

export async function resetSheetData(): Promise<boolean> {
  try {
    await fetch(GAS_WEBAPP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'RESET' }),
    });
    return true;
  } catch (error) {
    return false;
  }
}


