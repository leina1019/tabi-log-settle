
export type Participant = string;

export interface UserProfile {
  id: string;        // 内部識別子（初期のPARTICIPANTSの値、不変）
  displayName: string; // ユーザーが設定可能な表示名
  avatarUrl?: string; // Base64 string or URL
  updatedAt?: string; // For sync
}

export interface Expense {
  id: string;
  date: string;
  title: string;
  amount: number;
  currency: 'AUD' | 'JPY' | 'USD' | 'EUR' | 'KRW' | 'TWD'; // 多通貨対応
  exchangeRate: number;
  sourceUrl?: string;
  paidBy: Participant;
  splitWith: Participant[];
  category: string;
  createdAt: string;
  updatedAt: string;
  isLocalOnly?: boolean;
  hasConflict?: boolean;
}

export interface Settlement {
  from: Participant;
  to: Participant;
  amount: number;
}

export interface ItineraryItem {
  id: string;
  date: string;
  time: string;
  title: string;
  location?: string;
  memo?: string;
  link?: string; // URL for maps or restaurant info
  imageUrl?: string; // アップロード画像 or OGP取得画像
  type: 'move' | 'activity' | 'meal' | 'stay' | 'shopping' | 'sightseeing' | 'other';
  updatedAt?: string; // For sync
}

export interface Ticket {
  id: string;
  type: 'flight' | 'train' | 'hotel' | 'event' | 'other';
  title: string;
  provider: string; // 航空会社やホテル名
  date: string;
  time?: string;
  referenceNumber?: string; // 予約番号など
  notes?: string;
  link?: string; // Drive link or e-ticket URL
  updatedAt?: string; // For sync
}
