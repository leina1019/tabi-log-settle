
import { Expense, ItineraryItem, UserProfile, Ticket, PackingItem, TripData } from '../types';
import { MEMBER_COLORS } from '../constants';

/**
 * 究極のデモデータ生成 (MECE思考) 
 * 最新版：パリ・ロンドン 7日間
 * HanaはDay 2から現地集合
 */

const baseDate = new Date();
const d = (days: number) => {
    const next = new Date(baseDate.getTime() + days * 86400000);
    return next.toISOString().split('T')[0];
};

export const ULTIMATE_PROFILES: UserProfile[] = [
    { id: 'Reina', displayName: 'Reina', color: MEMBER_COLORS[0], avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200', updatedAt: new Date().toISOString() },
    { id: 'Ken', displayName: 'Ken', color: MEMBER_COLORS[1], avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200', updatedAt: new Date().toISOString() },
    { id: 'Hana', displayName: 'Hana', color: MEMBER_COLORS[2], avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200', updatedAt: new Date().toISOString() },
];

export const ULTIMATE_ITINERARY: ItineraryItem[] = [
    // Day 1 (Reina & Ken only)
    { id: 'd1-1', date: d(0), time: '07:30', title: '羽田空港 集合', location: 'Haneda Airport Terminal 3', type: 'move', mapUrl: 'https://maps.app.goo.gl/haneda', participantIds: ['Reina', 'Ken'] },
    { id: 'd1-2', date: d(0), time: '09:45', title: 'AF293便 搭乗', location: 'Gate 142', type: 'move', memo: 'パリに向けて出発！', links: [{ label: 'FlightAware', url: 'https://ja.flightaware.com/live/flight/AFR293' }] },
    { id: 'd1-3', date: d(0), time: '16:30', title: 'シャルル・ド・ゴール空港 到着', location: 'CDG Terminal 2E', type: 'move', mapUrl: 'https://maps.app.goo.gl/cdg-airport' },
    { id: 'd1-4', date: d(0), time: '18:30', title: 'ホテル・ル・ムーリス チェックイン', location: '228 Rue de Rivoli, Paris', type: 'stay', imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1200', mapUrl: 'https://maps.app.goo.gl/meurice' },
    { id: 'd1-5', date: d(0), time: '20:00', title: '夕食：近くのブーランジェリー', location: 'Rue de Rivoli', type: 'meal', memo: 'ReinaとKenのみで軽く。', participantIds: ['Reina', 'Ken'] },

    // Day 2 (Hana Join)
    { id: 'd2-1', date: d(1), time: '08:30', title: '優雅なホテルの朝食', location: 'Le Meurice breakfast room', type: 'meal', memo: 'Hana到着を待つ', participantIds: ['Ken'] },
    { id: 'd2-2', date: d(1), time: '10:30', title: '★Hanaとロビーで合流！', location: 'Hotel Lobby', type: 'activity', memo: 'ついに出発！', imageUrl: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?q=80&w=1200' },
    { id: 'd2-3', date: d(1), time: '13:00', title: 'ランチ：Les Cocottes', location: 'Rue Saint-Dominique', type: 'meal', mapUrl: 'https://maps.app.goo.gl/cocottes' },
    { id: 'd2-4', date: d(1), time: '15:00', title: 'エッフェル塔 観光', location: 'Champ de Mars', type: 'sightseeing', mapUrl: 'https://maps.app.goo.gl/eiffel' },
    { id: 'd2-5', date: d(1), time: '19:30', title: 'セーヌ川ディナークルーズ', location: 'Bateaux-Mouches', type: 'meal', memo: 'Hanaが事前に予約済み', links: [{ label: '予約確認', url: 'https://www.bateaux-mouches.fr/' }] },

    // Day 3 (Museum Day)
    { id: 'd3-1', date: d(2), time: '09:00', title: 'ルーヴル美術館 入場', location: 'Pyramide du Louvre', type: 'sightseeing', mapUrl: 'https://maps.app.goo.gl/louvre', links: [{ label: '公式マップ', url: 'https://www.louvre.fr/en/plan' }] },
    { id: 'd3-2', date: d(2), time: '13:00', title: 'チュイルリー庭園で休憩', location: 'Jardin des Tuileries', type: 'activity', memo: 'マカロンを食べる' },
    { id: 'd3-3', date: d(2), time: '15:00', title: 'オランジュリー美術館', location: 'Jardin Tuileries', type: 'sightseeing', memo: 'モネの睡蓮を鑑賞' },
    { id: 'd3-4', date: d(2), time: '17:30', title: 'サント・シャペル', location: '8 Boulevard du Palais', type: 'sightseeing', mapUrl: 'https://maps.app.goo.gl/sainte-chapelle' },
    { id: 'd3-5', date: d(2), time: '20:30', title: 'ビストロ：Le Comptoir', location: 'Saint-Germain-des-Prés', type: 'meal', memo: '予約必須の人気店' },

    // Day 4 (London Move)
    { id: 'd4-1', date: d(3), time: '08:00', title: 'パリ北駅へ移動', location: 'Gare du Nord', type: 'move' },
    { id: 'd4-2', date: d(3), time: '10:13', title: 'ユーロスター 9013便', location: 'Paris Nord to London St Pancras', type: 'move', memo: '1等席で豪華に！' },
    { id: 'd4-3', date: d(3), time: '12:30', title: 'ロンドン到着・入国審査', location: 'St Pancras International', type: 'move' },
    { id: 'd4-4', date: d(3), time: '15:00', title: 'ロンドン Airbnb チェックイン', location: 'South Kensington', type: 'stay', memo: 'Hanaがホストと連絡済み' },
    { id: 'd4-5', date: d(3), time: '18:00', title: '大英博物館 (夜間開館)', location: 'Great Russell St', type: 'sightseeing', mapUrl: 'https://maps.app.goo.gl/british-museum' },

    // Day 5 (London Sightseeing)
    { id: 'd5-1', date: d(4), time: '10:00', title: 'バッキンガム宮殿 衛兵交代式', location: 'Buckingham Palace', type: 'sightseeing' },
    { id: 'd5-2', date: d(4), time: '13:00', title: 'パブランチ：The Sherlock Holmes', location: 'Charing Cross', type: 'meal', memo: 'フィッシュ＆チップスを堪能' },
    { id: 'd5-3', date: d(4), time: '15:00', title: 'ロンドン・アイ', location: 'South Bank', type: 'activity' },
    { id: 'd5-4', date: d(4), time: '19:30', title: 'ミュージカル鑑賞：オペラ座の怪人', location: 'Her Majesty\'s Theatre', type: 'activity', memo: 'Kenがチケット手配済み' },

    // Day 6 (Harry Potter Day)
    { id: 'd6-1', date: d(5), time: '09:00', title: 'ハリー・ポッター・スタジオツアー', location: 'Leavesden', type: 'sightseeing', imageUrl: 'https://images.unsplash.com/photo-1547756536-cde3673fa2e5?q=80&w=1200' },
    { id: 'd6-2', date: d(5), time: '17:00', title: 'リバティ・ロンドンでお買い物', location: 'Great Marlborough St', type: 'shopping', memo: 'お土産探し' },
    { id: 'd6-3', date: d(5), time: '20:00', title: '最後の晩餐：Duck & Waffle', location: '110 Bishopsgate', type: 'meal', memo: '40階からの絶景' },

    // Day 7 (Return)
    { id: 'd7-1', date: d(6), time: '10:00', title: 'ヒースロー空港へ移動', location: 'Heathrow Express', type: 'move' },
    { id: 'd7-2', date: d(6), time: '13:15', title: 'JL042便 搭乗', location: 'Heathrow Terminal 3', type: 'move', memo: '日本へ帰国' },
];

export const ULTIMATE_EXPENSES: Expense[] = [
    { id: 'uexp-1', date: d(0), title: '航空券 (HND-CDG往復)', amount: 280000, currency: 'JPY', exchangeRate: 1, paidBy: 'Ken', splitWith: ['Reina', 'Ken'], category: 'transport', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'uexp-2', date: d(1), title: 'パリ ホテル 3泊分', amount: 960, currency: 'EUR', exchangeRate: 165, paidBy: 'Reina', splitWith: ['Reina', 'Ken', 'Hana'], category: 'hotel', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'uexp-3', date: d(1), title: 'セーヌ川ディナー', amount: 240, currency: 'EUR', exchangeRate: 165, paidBy: 'Hana', splitWith: ['Reina', 'Ken', 'Hana'], category: 'food', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'uexp-4', date: d(2), title: 'ルーヴル美術館 入場券', amount: 66, currency: 'EUR', exchangeRate: 165, paidBy: 'Ken', splitWith: ['Reina', 'Ken', 'Hana'], category: 'sightseeing', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'uexp-5', date: d(3), title: 'ユーロスター チケット', amount: 540, currency: 'GBP', exchangeRate: 195, paidBy: 'Reina', splitWith: ['Reina', 'Ken', 'Hana'], category: 'transport', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'uexp-6', date: d(4), title: 'ロンドン Airbnb 3泊分', amount: 1200, currency: 'GBP', exchangeRate: 195, paidBy: 'Ken', splitWith: ['Reina', 'Ken', 'Hana'], category: 'hotel', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'uexp-7', date: d(4), title: 'ミュージカルチケット', amount: 300, currency: 'GBP', exchangeRate: 195, paidBy: 'Ken', splitWith: ['Reina', 'Ken', 'Hana'], category: 'other', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'uexp-8', date: d(5), title: 'スタジオツアー参加費', amount: 150, currency: 'GBP', exchangeRate: 195, paidBy: 'Hana', splitWith: ['Reina', 'Ken', 'Hana'], category: 'sightseeing', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'uexp-9', date: d(0), title: '空港までタクシー(日本)', amount: 15000, currency: 'JPY', exchangeRate: 1, paidBy: 'Reina', splitWith: ['Reina', 'Ken'], category: 'transport', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'uexp-10', date: d(2), title: 'ランチ：Les Cocottes', amount: 120, currency: 'EUR', exchangeRate: 165, paidBy: 'Reina', splitWith: ['Reina', 'Ken', 'Hana'], category: 'food', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

export const ULTIMATE_TICKETS: Ticket[] = [
    { id: 'utix-1', type: 'flight', title: '羽田-パリ 往復 (Reina&Ken用)', provider: 'Air France', date: d(0), time: '09:45', passengerIds: ['Reina', 'Ken'], referenceNumber: 'REIKEN-AF', notes: 'Hanaは別ルート', link: 'https://www.airfrance.co.jp/' },
    { id: 'utix-2', type: 'flight', title: 'JL042便 (ロンドン-東京)', provider: 'Japan Airlines', date: d(6), time: '13:15', passengerIds: ['Reina', 'Ken'], referenceNumber: 'REIKEN-JL', notes: 'ターミナル3' },
    { id: 'utix-3', type: 'hotel', title: 'パリ：ル・ムーリス (3泊)', provider: 'Le Meurice', date: d(0), referenceNumber: 'PARIS-STAY-MEU', notes: 'リボリ通り沿いの名門ホテル' },
    { id: 'utix-4', type: 'train', title: 'ユーロスター (パリ->ロンドン)', provider: 'Eurostar', date: d(3), time: '10:13', passengerIds: ['Reina', 'Ken', 'Hana'], referenceNumber: 'ESTAR-JKH', notes: ' Coach 01, Seats 11-13' },
    { id: 'utix-5', type: 'hotel', title: 'ロンドン Airbnb', provider: 'Airbnb Host', date: d(3), referenceNumber: 'AIRBNB-LON', notes: 'サウスケンジントン近く' },
];

export const ULTIMATE_PACKING: PackingItem[] = [
    { id: 'up-1', category: '必需品', title: 'パスポート', isPacked: false, assignees: ['Reina', 'Ken', 'Hana'], updatedAt: new Date().toISOString() },
    { id: 'up-2', category: '必需品', title: 'eSIMの設定', isPacked: true, assignees: ['Reina', 'Ken', 'Hana'], updatedAt: new Date().toISOString() },
    { id: 'up-3', category: '電子機器', title: '変圧器(Cタイプ / BFタイプ)', isPacked: true, assignees: ['Ken'], updatedAt: new Date().toISOString() },
    { id: 'up-4', category: '重要書類', title: 'ユーロスター控え', isPacked: false, assignees: ['Reina'], updatedAt: new Date().toISOString() },
    { id: 'up-5', category: '必需品', title: '常備薬', isPacked: false, assignees: ['Reina', 'Ken', 'Hana'], updatedAt: new Date().toISOString() },
    { id: 'up-6', category: '衣類', title: '朝晩の羽織もの', isPacked: true, assignees: ['Reina', 'Hana'], updatedAt: new Date().toISOString() },
    { id: 'up-7', category: '電子機器', title: 'モバイルバッテリー', isPacked: false, assignees: ['Ken'], updatedAt: new Date().toISOString() },
];

export const GET_ULTIMATE_TRIP = (): TripData => ({
    name: '🇫🇷 パリ・ロンドン 7日間 🇬🇧',
    startDate: d(0),
    endDate: d(6),
    budget: 600000,
    settlementMethod: 'smart',
    userProfiles: ULTIMATE_PROFILES,
    itinerary: ULTIMATE_ITINERARY,
    expenses: ULTIMATE_EXPENSES,
    tickets: ULTIMATE_TICKETS,
    packingList: ULTIMATE_PACKING,
    coverImage: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1200'
});
