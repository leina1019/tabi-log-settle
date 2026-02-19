
// PARTICIPANTSはアプリ全体で使用するメンバーリスト
export const PARTICIPANTS = ['リョウスケさん', '玲奈さん', '岡ちゃん'] as const;

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
