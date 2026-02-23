
export type Participant = string;

export interface UserProfile {
  id: string;        // 内部識別子（初期のPARTICIPANTSの値、不変）
  displayName: string; // ユーザーが設定可能な表示名
  avatarUrl?: string; // Base64 string or URL
  color: string;      // メンバーカラー (HEX)
  updatedAt?: string; // For sync
}

export interface Expense {
  id: string;
  date: string;
  title: string;
  amount: number;
  currency: string; // constants.tsxのCURRENCIESと合わせて動的に対応（JPY/AUD/USD/EUR/KRW/TWD/THB/VND/SGD/GBP/CNYなど）
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

export interface ItineraryLink {
  label: string;
  url: string;
}

export interface ItineraryItem {
  id: string;
  date: string;
  time: string;
  endTime?: string;  // 終了時刻
  title: string;
  location?: string;
  memo?: string;
  link?: string; // 互換性維持のための既存リンク
  links?: ItineraryLink[]; // 複数リンク対応
  participantId?: string; // 特定メンバーの予定。undefinedの場合は「全体」
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
  participantId?: string; // 特定メンバーのチケット。undefinedの場合は「全員」
  updatedAt?: string; // For sync
}

export interface PackingItem {
  id: string;
  category: string; // '衣服', '洗面用具', '電子機器', '重要書類' など
  title: string;
  isPacked: boolean;
  participantId?: string; // 担当者、undefinedの場合は「全員共通」
  updatedAt?: string;
}
