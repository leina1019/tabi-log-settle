
import { Expense, ItineraryItem, UserProfile } from '../types';
import { MEMBER_COLORS } from '../constants';

// 今日の日付をベースに3日間の旅行データを生成
const today = new Date();
const d1 = today.toISOString().split('T')[0];
const d2 = new Date(today.getTime() + 86400000).toISOString().split('T')[0];
const d3 = new Date(today.getTime() + 172800000).toISOString().split('T')[0];

export const SAMPLE_PROFILES: UserProfile[] = [
    { id: 'Reina', displayName: 'Reina', color: MEMBER_COLORS[0], updatedAt: new Date().toISOString() },
    { id: 'Ken', displayName: 'Ken', color: MEMBER_COLORS[1], updatedAt: new Date().toISOString() },
    { id: 'Yumi', displayName: 'Yumi', color: MEMBER_COLORS[2], updatedAt: new Date().toISOString() },
];

export const SAMPLE_ITINERARY: ItineraryItem[] = [
    // Day 1
    {
        id: 'sample-1',
        date: d1,
        time: '10:00',
        endTime: '11:30',
        title: '新宿駅 東口集合',
        location: '新宿駅',
        type: 'move',
        memo: 'Suicaのチャージを忘れずに！',
        links: [{ label: '駅構内図', url: 'https://www.jreast.co.jp/estation/map/bin/shinjuku.pdf' }]
    },
    {
        id: 'sample-2',
        date: d1,
        time: '12:00',
        endTime: '13:30',
        title: '絶品！新宿ランチ',
        location: 'つな八 総本店',
        type: 'meal',
        memo: '老舗の天ぷらを堪能',
        imageUrl: 'https://images.unsplash.com/photo-1581184953904-29b2170471b4?q=80&w=600&auto=format&fit=crop',
        links: [{ label: '食べログ', url: 'https://tabelog.com/tokyo/A1304/A130401/13000854/' }]
    },
    {
        id: 'sample-3',
        date: d1,
        time: '15:00',
        endTime: '17:00',
        title: '都庁展望台で景色を楽しむ',
        location: '東京都庁',
        type: 'sightseeing',
        participantId: 'Reina',
        memo: 'Reinaの希望スポット！',
        links: [{ label: '公式サイト', url: 'https://www.yokoso.metro.tokyo.lg.jp/' }]
    },

    // Day 2
    {
        id: 'sample-4',
        date: d2,
        time: '09:00',
        endTime: '12:00',
        title: '浅草寺 仲見世通り',
        location: '浅草',
        type: 'sightseeing',
        memo: 'おみくじを引きましょう',
        imageUrl: 'https://images.unsplash.com/photo-1542931287-023b922fa89b?q=80&w=600&auto=format&fit=crop',
        links: [
            { label: 'Google Maps', url: 'https://goo.gl/maps/xyz' },
            { label: '公式サイト', url: 'http://www.senso-ji.jp/' }
        ]
    },
    {
        id: 'sample-5',
        date: d2,
        time: '13:00',
        endTime: '15:00',
        title: '【個別】Kenは秋葉原へ',
        location: '秋葉原',
        type: 'shopping',
        participantId: 'Ken',
        memo: 'PCパーツの買い物',
    },
    {
        id: 'sample-6',
        date: d2,
        time: '13:00',
        endTime: '15:00',
        title: '【個別】YumiとReinaはカフェ巡り',
        location: '蔵前',
        type: 'meal',
        participantId: 'Yumi',
        memo: 'オシャレなカフェで休憩',
    },

    // Day 3
    {
        id: 'sample-7',
        date: d3,
        time: '10:00',
        endTime: '14:00',
        title: 'お土産購入 ＆ 解散式',
        location: '東京駅',
        type: 'shopping',
        memo: '最後のお買い物タイム',
    }
];

export const SAMPLE_EXPENSES: Expense[] = [
    {
        id: 'exp-1',
        date: d1,
        title: '初日ランチ（天ぷら）',
        amount: 12000,
        currency: 'JPY',
        exchangeRate: 1,
        paidBy: 'Reina',
        splitWith: ['Reina', 'Ken', 'Yumi'],
        category: '食事',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'exp-2',
        date: d2,
        title: '浅草食べ歩き',
        amount: 4500,
        currency: 'JPY',
        exchangeRate: 1,
        paidBy: 'Ken',
        splitWith: ['Reina', 'Ken', 'Yumi'],
        category: '食事',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
];
