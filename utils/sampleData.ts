
import { Expense, ItineraryItem, UserProfile, Ticket, PackingItem } from '../types';
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
    { id: 'Sarah', displayName: 'Sarah', color: MEMBER_COLORS[4], updatedAt: new Date().toISOString() },
];

export const SAMPLE_ITINERARY: ItineraryItem[] = [
    // 1日目: 到着とオペラハウス
    {
        id: 'au-1',
        date: d(0),
        time: '08:00',
        endTime: '09:30',
        title: 'シドニー国際空港 到着',
        location: 'Sydney Airport',
        type: 'move',
        memo: 'オパールカード（交通系IC）を購入すること。空港の駅で買えます。',
        mapUrl: 'https://maps.app.goo.gl/jS5E2LpS8J1V6vK67',
        links: [{ label: '空港案内', url: 'https://www.sydneyairport.com.au/' }]
    },
    {
        id: 'au-2',
        date: d(0),
        time: '12:00',
        endTime: '13:30',
        title: 'ランチ：Pancakes On The Rocks',
        location: 'The Rocks, Sydney',
        type: 'meal',
        memo: '有名なパンケーキ店。リブも美味しい！',
        imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb23b32062aa?q=80&w=600&auto=format&fit=crop',
        mapUrl: 'https://maps.app.goo.gl/hGzB9x9XzXzXzXzXz',
        links: [{ label: 'メニュー', url: 'https://pancakesontherocks.com.au/' }]
    },
    {
        id: 'au-3',
        date: d(0),
        time: '15:30',
        endTime: '17:00',
        title: 'オペラハウス ガイドツアー',
        location: 'Sydney Opera House',
        type: 'sightseeing',
        memo: '予約時間の15分前にエントランス集合。',
        imageUrl: 'https://images.unsplash.com/photo-1523413651479-797eb2c384d6?q=80&w=800&auto=format&fit=crop',
        mapUrl: 'https://maps.app.goo.gl/uX3K3K3K3K3K3K3K3',
        links: [{ label: '予約確認', url: 'https://www.sydneyoperahouse.com/' }]
    },
    {
        id: 'au-next',
        date: d(0),
        time: '19:00',
        endTime: '21:00',
        title: 'ディナー：Circular Quay',
        location: 'Circular Quay, Sydney',
        type: 'meal',
        memo: 'ハーバーブリッジの夜景が見えるレストランを散策。',
        imageUrl: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?q=80&w=800&auto=format&fit=crop',
        mapUrl: 'https://maps.app.goo.gl/wW5K5K5K5K5K5K5K5'
    },

    // 2日目: 動物園とクルーズ
    {
        id: 'au-4',
        date: d(1),
        time: '10:00',
        endTime: '13:00',
        title: 'タロンガ動物園',
        location: 'Taronga Zoo, Sydney',
        type: 'sightseeing',
        memo: 'サーキュラーキーからフェリーで移動。コアラと一緒に写真が撮れる！',
        imageUrl: 'https://images.unsplash.com/photo-1542151759-5776d63914bd?q=80&w=600&auto=format&fit=crop',
        mapUrl: 'https://maps.app.goo.gl/zY4K4K4K4K4K4K4K4'
    },
    {
        id: 'au-5',
        date: d(1),
        time: '18:30',
        endTime: '21:00',
        title: 'ディナークルーズ',
        location: 'Circular Quay, Sydney',
        type: 'meal',
        memo: '夜景を見ながらの豪華フルコース。スマートカジュアル推奨。',
        mapUrl: 'https://maps.app.goo.gl/wW5K5K5K5K5K5K5K5',
        links: [{ label: '運行状況', url: 'https://www.captaincook.com.au/' }]
    },

    // 3日目: ブルーマウンテンズ
    {
        id: 'au-6',
        date: d(2),
        time: '08:30',
        endTime: '17:30',
        title: 'ブルーマウンテンズ国立公園',
        location: 'Katoomba, NSW',
        type: 'sightseeing',
        memo: 'シーニックワールドの乗り物チケットを忘れずに。',
        imageUrl: 'https://images.unsplash.com/photo-1527672829631-02607ae7198a?q=80&w=600&auto=format&fit=crop',
        mapUrl: 'https://maps.app.goo.gl/vV6K6K6K6K6K6K6K6'
    }
];

export const SAMPLE_EXPENSES: Expense[] = [
    {
        id: 'exp-1',
        date: d(0),
        title: 'シドニー空港シャトルバス',
        amount: 54,
        currency: 'AUD',
        exchangeRate: EXCHANGE_RATE_AUD_TO_JPY,
        paidBy: 'Ken',
        splitWith: ['Reina', 'Ken', 'Sarah'],
        category: '交通費',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'exp-2',
        date: d(0),
        title: 'ザ・ロックスでのパンケーキランチ',
        amount: 85.5,
        currency: 'AUD',
        exchangeRate: EXCHANGE_RATE_AUD_TO_JPY,
        paidBy: 'Reina',
        splitWith: ['Reina', 'Ken', 'Sarah'],
        category: '食事',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'exp-3',
        date: d(0),
        title: 'お土産のオーガニック石鹸',
        amount: 45,
        currency: 'AUD',
        exchangeRate: EXCHANGE_RATE_AUD_TO_JPY,
        paidBy: 'Sarah',
        splitWith: ['Sarah'],
        category: '買い物',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'exp-4',
        date: d(1),
        title: 'タロンガ動物園 入場料',
        amount: 156.6,
        currency: 'AUD',
        exchangeRate: EXCHANGE_RATE_AUD_TO_JPY,
        paidBy: 'Reina',
        splitWith: ['Reina', 'Ken', 'Sarah'],
        category: '観光',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'exp-5',
        date: d(1),
        title: 'フェリー往復運賃',
        amount: 30.6,
        currency: 'AUD',
        exchangeRate: EXCHANGE_RATE_AUD_TO_JPY,
        paidBy: 'Ken',
        splitWith: ['Reina', 'Ken', 'Sarah'],
        category: '交通費',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
];

export const SAMPLE_TICKETS: Ticket[] = [
    {
        id: 'tix-1',
        type: 'flight',
        title: '成田 → シドニー (JL771)',
        provider: '日本航空 (JAL)',
        date: d(0),
        time: '19:20',
        referenceNumber: 'ABC123D',
        notes: '第2ターミナル。搭乗時刻の2時間前に到着すること。',
        link: 'https://www.jal.co.jp/',
        mapUrl: 'https://maps.app.goo.gl/narita-airport'
    },
    {
        id: 'tix-2',
        type: 'hotel',
        title: 'ハイアット リージェンシー シドニー',
        provider: 'Hyatt Regency Sydney',
        date: d(0),
        referenceNumber: 'CONF-J8K9L',
        notes: 'チェックイン 15:00〜。デポジット用にカードが必要。',
        link: 'https://www.hyatt.com/',
        mapUrl: 'https://maps.app.goo.gl/hyatt-sydney'
    },
    {
        id: 'tix-3',
        type: 'flight',
        title: 'シドニー → 成田 (JL772)',
        provider: '日本航空 (JAL)',
        date: d(5),
        time: '08:15',
        referenceNumber: 'XYZ987P',
        notes: '朝が早いので前日にパッキングを済ませる。',
        link: 'https://www.jal.co.jp/'
    }
];

export const SAMPLE_PACKING: PackingItem[] = [
    { id: 'p-1', category: '重要書類', title: 'パスポート', isPacked: true, updatedAt: new Date().toISOString() },
    { id: 'p-2', category: '重要書類', title: '航空券Eチケット', isPacked: true, updatedAt: new Date().toISOString() },
    { id: 'p-3', category: '電子機器', title: '変換プラグ (タイプO)', isPacked: false, updatedAt: new Date().toISOString() },
    { id: 'p-4', category: '洗面用具', title: '日焼け止め', isPacked: false, updatedAt: new Date().toISOString() },
    { id: 'p-5', category: '衣服', title: '薄手の羽織もの', isPacked: true, participantId: 'Reina', updatedAt: new Date().toISOString() },
    { id: 'p-6', category: '電子機器', title: 'モバイルバッテリー', isPacked: false, updatedAt: new Date().toISOString() },
    { id: 'p-7', category: '重要書類', title: '海外旅行保険証', isPacked: false, updatedAt: new Date().toISOString() },
];
