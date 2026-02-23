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

export const CURRENCIES = [
  { code: 'JPY', symbol: '¥', name: '日本円', flag: '🇯🇵', defaultRate: 1 },
  { code: 'AUD', symbol: 'A$', name: '豪ドル', flag: '🇦🇺', defaultRate: 100 },
  { code: 'USD', symbol: '$', name: '米ドル', flag: '🇺🇸', defaultRate: 153 },
  { code: 'EUR', symbol: '€', name: 'ユーロ', flag: '🇪🇺', defaultRate: 165 },
  { code: 'KRW', symbol: '₩', name: 'ウォン', flag: '🇰🇷', defaultRate: 0.11 },
  { code: 'TWD', symbol: 'NT$', name: '台湾ドル', flag: '🇹🇼', defaultRate: 4.8 },
  { code: 'THB', symbol: '฿', name: 'バーツ', flag: '🇹🇭', defaultRate: 4.3 },
  { code: 'VND', symbol: '₫', name: 'ドン', flag: '🇻🇳', defaultRate: 0.006 },
  { code: 'SGD', symbol: 'S$', name: 'SGドル', flag: '🇸🇬', defaultRate: 114 },
  { code: 'GBP', symbol: '£', name: 'ポンド', flag: '🇬🇧', defaultRate: 195 },
  { code: 'CNY', symbol: '¥', name: '元', flag: '🇨🇳', defaultRate: 21.5 },
] as const;

// デフォルトレート（AUD）
export const EXCHANGE_RATE_AUD_TO_JPY = 105;

export const DEVICE_CONFIG = {
  'phone': { label: 'iPhone', icon: '📱', width: 'max-w-[390px]', description: '標準的なスマホ' },
  'phone-l': { label: 'iPhone Max', icon: '📱+', width: 'max-w-[430px]', description: '大きめのスマホ' },
  'tablet-s': { label: 'iPad mini', icon: '📗', width: 'max-w-[744px]', description: 'iPad mini (縦)' },
  'tablet-m': { label: 'iPad Air', icon: '📘', width: 'max-w-[820px]', description: 'iPad (縦)' },
  'tablet-l': { label: 'iPad Pro', icon: '💻', width: 'max-w-[1024px]', description: 'iPad Pro / PC' },
} as const;
