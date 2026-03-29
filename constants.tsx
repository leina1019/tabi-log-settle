// PARTICIPANTSは旧バージョンで使用していた固定リスト。現在はオンボーディングで動的に設定されます。
// export const PARTICIPANTS = ['リョウスケさん', '玲奈さん', '岡ちゃん'] as const;

export const MEMBER_COLORS = [
  '#006699', // Ocean Blue
  '#FF6B6B', // Coral Pink
  '#2ECC71', // Emerald Green
  '#E67E22', // Sunset Orange
  '#9B59B6', // Lavender Purple
  '#F1C40F', // Gold Yellow
];

// カテゴリIDリスト（翻訳のキーに使用）
export const CATEGORY_IDS = [
  'food', 'transport', 'hotel', 'sightseeing',
  'souvenir', 'communication', 'meeting', 'other'
] as const;

// 旧カテゴリ（日本語）→ IDのマッピング（既存データとの後方互換性用）
export const CATEGORY_JP_TO_ID: Record<string, string> = {
  '食事': 'food',
  '交通': 'transport',
  '宿泊': 'hotel',
  '観光': 'sightseeing',
  'お土産': 'souvenir',
  '通信費': 'communication',
  '会議費': 'meeting',
  'その他': 'other',
};

// 旧カテゴリ値の配列（保存値として使用される。既存データの互換性維持のためこの値で保存する）
export const CATEGORIES = [
  '食事',
  '交通',
  '宿泊',
  '観光',
  'お土産',
  '通信費',
  '会議費',
  'その他'
];

// カテゴリの保存値（日本語）からIDを取得するユーティリティ
export const getCategoryId = (categoryValue: string): string => {
  return CATEGORY_JP_TO_ID[categoryValue] || 'other';
};

export const CURRENCIES = [
  { code: 'JPY', symbol: '¥', nameKey: 'currencies.JPY', flag: '🇯🇵', defaultRate: 1 },
  { code: 'AUD', symbol: 'A$', nameKey: 'currencies.AUD', flag: '🇦🇺', defaultRate: 100 },
  { code: 'USD', symbol: '$', nameKey: 'currencies.USD', flag: '🇺🇸', defaultRate: 153 },
  { code: 'EUR', symbol: '€', nameKey: 'currencies.EUR', flag: '🇪🇺', defaultRate: 165 },
  { code: 'KRW', symbol: '₩', nameKey: 'currencies.KRW', flag: '🇰🇷', defaultRate: 0.11 },
  { code: 'TWD', symbol: 'NT$', nameKey: 'currencies.TWD', flag: '🇹🇼', defaultRate: 4.8 },
  { code: 'THB', symbol: '฿', nameKey: 'currencies.THB', flag: '🇹🇭', defaultRate: 4.3 },
  { code: 'VND', symbol: '₫', nameKey: 'currencies.VND', flag: '🇻🇳', defaultRate: 0.006 },
  { code: 'SGD', symbol: 'S$', nameKey: 'currencies.SGD', flag: '🇸🇬', defaultRate: 114 },
  { code: 'GBP', symbol: '£', nameKey: 'currencies.GBP', flag: '🇬🇧', defaultRate: 195 },
  { code: 'CNY', symbol: '¥', nameKey: 'currencies.CNY', flag: '🇨🇳', defaultRate: 21.5 },
] as const;

// デフォルトレート（AUD）
export const EXCHANGE_RATE_AUD_TO_JPY = 105;

// デバイスのdescriptionKeyは辞書の翻訳キーに対応
export const DEVICE_CONFIG = {
  'phone': { label: 'iPhone', icon: '📱', width: 'max-w-[390px]', descriptionKey: 'devices.phone' },
  'phone-l': { label: 'iPhone Max', icon: '📱+', width: 'max-w-[430px]', descriptionKey: 'devices.phoneLarge' },
  'tablet-s': { label: 'iPad mini', icon: '📗', width: 'max-w-[744px]', descriptionKey: 'devices.tabletSmall' },
  'tablet-m': { label: 'iPad Air', icon: '📘', width: 'max-w-[820px]', descriptionKey: 'devices.tabletMedium' },
  'tablet-l': { label: 'iPad Pro', icon: '💻', width: 'max-w-[1024px]', descriptionKey: 'devices.tabletLarge' },
} as const;
