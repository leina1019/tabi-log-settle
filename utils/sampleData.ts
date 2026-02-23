
import { Expense, ItineraryItem, UserProfile, Ticket } from '../types';
import { MEMBER_COLORS, EXCHANGE_RATE_AUD_TO_JPY } from '../constants';

// 今日の日付をベースに6日間の旅行データを生成
const today = new Date();
const d = (days: number) => {
    const next = new Date(today.getTime() + days * 86400000);
    return next.toISOString().split('T')[0];
};

export const SAMPLE_PROFILES: UserProfile[] = [
    { id: 'Reina', displayName: 'Reina', color: MEMBER_COLORS[0], updatedAt: new Date().toISOString() },
    { id: 'Ken', displayName: 'Ken', color: MEMBER_COLORS[1], updatedAt: new Date().toISOString() },
    { id: 'Sarah', displayName: 'Sarah', color: MEMBER_COLORS[4], updatedAt: new Date().toISOString() }, // Sarah adds an international feel
];

export const SAMPLE_ITINERARY: ItineraryItem[] = [
    // Day 1: Arrival & Opera House
    {
        id: 'au-1',
        date: d(0),
        time: '08:00',
        endTime: '09:30',
        title: 'シドニー国際空港 到着',
        location: 'SYD Airport',
        type: 'move',
        memo: 'オパールカード（交通系IC）を購入すること',
        links: [{ label: '空港案内', url: 'https://www.sydneyairport.com.au/' }]
    },
    {
        id: 'au-2',
        date: d(0),
        time: '12:00',
        endTime: '13:30',
        title: 'ランチ：シドニーの人気カフェ',
        location: 'The Rocks',
        type: 'meal',
        memo: 'パンケーキが絶品',
        imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb23b32062aa?q=80&w=600&auto=format&fit=crop',
        links: [{ label: 'カフェ情報', url: 'https://www.therocks.com/' }]
    },
    {
        id: 'au-3',
        date: d(0),
        time: '15:00',
        endTime: '17:00',
        title: 'オペラハウス見学',
        location: 'Sydney Opera House',
        type: 'sightseeing',
        memo: '世界遺産の内部を見学！予約必須。',
        imageUrl: 'https://images.unsplash.com/photo-1523413651479-797eb2c384d6?q=80&w=800&auto=format&fit=crop',
        links: [{ label: '公式サイト', url: 'https://www.sydneyoperahouse.com/' }]
    },

    // Day 2: Wildlife & Cruise
    {
        id: 'au-4',
        date: d(1),
        time: '10:00',
        endTime: '13:00',
        title: 'タロンガ動物園',
        location: 'Taronga Zoo',
        type: 'sightseeing',
        memo: 'コアラとカンガルーに会える！フェリーで向かいます。',
        imageUrl: 'https://images.unsplash.com/photo-1542151759-5776d63914bd?q=80&w=600&auto=format&fit=crop',
    },
    {
        id: 'au-5',
        date: d(1),
        time: '18:00',
        endTime: '20:30',
        title: 'ディナークルーズ',
        location: 'Darling Harbour',
        type: 'meal',
        participantId: 'Reina',
        memo: 'シドニーの夜景を船上から楽しむ豪華ディナー',
        links: [{ label: '予約確認', url: 'https://www.captaincook.com.au/' }]
    },

    // Day 3: Blue Mountains
    {
        id: 'au-6',
        date: d(2),
        time: '08:30',
        endTime: '17:00',
        title: 'ブルーマウンテンズ 1日ツアー',
        location: 'Blue Mountains',
        type: 'sightseeing',
        memo: 'スリーシスターズを背景に写真を撮る',
        imageUrl: 'https://images.unsplash.com/photo-1527672829631-02607ae7198a?q=80&w=600&auto=format&fit=crop',
    },

    // Day 4: Beach Day
    {
        id: 'au-7',
        date: d(3),
        time: '10:00',
        endTime: '15:00',
        title: 'ボンダイビーチで乗馬＆散策',
        location: 'Bondi Beach',
        type: 'sightseeing',
        memo: '有名なビーチ沿いの遊歩道を歩く',
        imageUrl: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?q=80&w=600&auto=format&fit=crop',
    },
    {
        id: 'au-8',
        date: d(3),
        time: '19:00',
        endTime: '21:00',
        title: 'オージービーフでステーキディナー',
        location: 'Hurricane\'s Grill',
        type: 'meal',
        memo: 'ボリューミーなステーキをみんなでシェア',
    },

    // Day 5: Shopping & Museum
    {
        id: 'au-9',
        date: d(4),
        time: '11:00',
        endTime: '14:00',
        title: 'クイーンビクトリアビルディング (QVB)',
        location: 'QVB Sydney',
        type: 'shopping',
        memo: '世界で最も美しいショッピングセンターで買い物',
        imageUrl: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?q=80&w=600&auto=format&fit=crop',
    },
    {
        id: 'au-10',
        date: d(4),
        time: '15:00',
        endTime: '17:30',
        title: '【個別】Kenは現代美術館へ',
        location: 'MCA Sydney',
        type: 'sightseeing',
        participantId: 'Ken',
        memo: 'オーストラリアの現代アートをチェック',
    },

    // Day 6: Souvenirs & Departure
    {
        id: 'au-11',
        date: d(5),
        time: '10:00',
        endTime: '13:00',
        title: 'パディスマーケットでお土産探し',
        location: 'Paddy\'s Markets',
        type: 'shopping',
        memo: '最後のお土産まとめ買いタイム',
    }
];

export const SAMPLE_EXPENSES: Expense[] = [
    {
        id: 'au-exp-1',
        date: d(0),
        title: '空港から街への移動 (UBER)',
        amount: 85,
        currency: 'AUD',
        exchangeRate: EXCHANGE_RATE_AUD_TO_JPY,
        paidBy: 'Ken',
        splitWith: ['Reina', 'Ken', 'Sarah'],
        category: '交通費',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'au-exp-2',
        date: d(0),
        title: '初日ランチ（カフェ）',
        amount: 120,
        currency: 'AUD',
        exchangeRate: EXCHANGE_RATE_AUD_TO_JPY,
        paidBy: 'Reina',
        splitWith: ['Reina', 'Ken', 'Sarah'],
        category: '食事',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'au-exp-3',
        date: d(1),
        title: 'ディナークルーズ代金',
        amount: 450,
        currency: 'AUD',
        exchangeRate: EXCHANGE_RATE_AUD_TO_JPY,
        paidBy: 'Reina',
        splitWith: ['Reina', 'Ken', 'Sarah'],
        category: '食事',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'au-exp-4',
        date: d(2),
        title: 'ブルーマウンテンズ 飲み物＆軽食',
        amount: 45,
        currency: 'AUD',
        exchangeRate: EXCHANGE_RATE_AUD_TO_JPY,
        paidBy: 'Sarah',
        splitWith: ['Reina', 'Ken', 'Sarah'],
        category: '食事',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'au-exp-5',
        date: d(3),
        title: 'ボンダイビーチ 貸切タクシー',
        amount: 150,
        currency: 'AUD',
        exchangeRate: EXCHANGE_RATE_AUD_TO_JPY,
        paidBy: 'Ken',
        splitWith: ['Reina', 'Ken', 'Sarah'],
        category: '交通費',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'au-exp-6',
        date: d(4),
        title: 'お土産のTシャツ (Reina)',
        amount: 60,
        currency: 'AUD',
        exchangeRate: EXCHANGE_RATE_AUD_TO_JPY,
        paidBy: 'Reina',
        splitWith: ['Reina'],
        category: '買い物',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'au-exp-7',
        date: d(5),
        title: '最終日ランチ 飲茶',
        amount: 95,
        currency: 'AUD',
        exchangeRate: EXCHANGE_RATE_AUD_TO_JPY,
        paidBy: 'Sarah',
        splitWith: ['Reina', 'Ken', 'Sarah'],
        category: '食事',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'au-exp-8',
        date: d(1),
        title: '動物園の入場料',
        amount: 156.6,
        currency: 'AUD',
        exchangeRate: EXCHANGE_RATE_AUD_TO_JPY,
        paidBy: 'Sarah',
        splitWith: ['Reina', 'Ken', 'Sarah'],
        category: 'その他',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
];

export const SAMPLE_TICKETS: Ticket[] = [
    {
        id: 'au-tix-1',
        type: 'flight',
        title: '羽田-シドニー 国際線便',
        provider: 'Qantas Airways',
        date: d(0),
        time: '23:00',
        referenceNumber: 'QF124-SYD',
        notes: '機内持ち込み手荷物10kgまで',
        link: 'https://www.qantas.com/'
    },
    {
        id: 'au-tix-2',
        type: 'hotel',
        title: 'ハイアット リージェンシー シドニー',
        provider: 'Hyatt Regency',
        date: d(0),
        referenceNumber: 'CONF-55667788',
        notes: 'オーシャンビュー 2部屋',
        link: 'https://www.hyatt.com/'
    },
    {
        id: 'au-tix-3',
        type: 'event',
        title: 'オペラハウス ガイド付きツアー',
        provider: 'Sydney Opera House',
        date: d(0),
        time: '15:30',
        referenceNumber: 'TKT-10293847',
        notes: '受付に15分前集合',
    }
];
