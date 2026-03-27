
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
  mapUrl?: string; // 📍 Google Maps専用リンク
  links?: ItineraryLink[]; // 複数リンク対応
  participantId?: string; // 後方互換: 特定メンバーの予定。undefinedの場合は「全体」
  participantIds?: string[]; // 複数メンバーの予定。未設定の場合は「全体」
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
  mapUrl?: string; // 📍 関連マップリンク
  imageUrl?: string; // アップロードされた画像 or PDFの1ページ目 (Base64)
  fileType?: 'image' | 'pdf'; // ファイル形式
  participantId?: string; // 後方互換: 単数指定（非推奨）
  passengerIds?: string[]; // 乗車・利用メンバー（複数選択可、未設定=全員）
  updatedAt?: string; // For sync
}

export interface PackingItem {
  id: string;
  category: string; // '衣服', '洗面用具', '電子機器', '重要書類' など
  title: string;
  isPacked: boolean; // 従来通り：個人用ならそのまま、全員用なら「全員完了」を意味
  packedBy?: string[]; // 全員用アイテムにおいて、誰が完了したかをIDの配列で保持
  participantId?: string; // 後方互換: 単数指定（非推奨）
  assignees?: string[]; // 担当メンバー（複数選択可、未設定=全員共通）
  updatedAt?: string;
}

export type ViewModeSize = 'phone' | 'phone-l' | 'tablet-s' | 'tablet-m' | 'tablet-l';

export interface TripData {
  id?: string;
  name?: string;
  startDate?: string;
  endDate?: string;
  coverImage?: string;
  budget?: number;
  settlementMethod?: 'smart' | 'individual';
  expenses?: Expense[];
  itinerary?: ItineraryItem[];
  tickets?: Ticket[];
  packingList?: PackingItem[];
  userProfiles?: UserProfile[];
  createdAt?: any;
  updatedAt?: any;
}
