
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
  { code: 'AUD', symbol: 'A$', name: '豪ドル', flag: '🇦🇺', defaultRate: 105 },
  { code: 'JPY', symbol: '¥', name: '日本円', flag: '🇯🇵', defaultRate: 1 },
  { code: 'USD', symbol: '$', name: '米ドル', flag: '🇺🇸', defaultRate: 150 },
  { code: 'EUR', symbol: '€', name: 'ユーロ', flag: '🇪🇺', defaultRate: 165 },
  { code: 'KRW', symbol: '₩', name: 'ウォン', flag: '🇰🇷', defaultRate: 0.11 },
  { code: 'TWD', symbol: 'NT$', name: '台湾ドル', flag: '🇹🇼', defaultRate: 4.8 },
] as const;

// デフォルトレート（AUD）
export const EXCHANGE_RATE_AUD_TO_JPY = 105;
