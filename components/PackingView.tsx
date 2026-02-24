import React, { useState, useMemo } from 'react';
import { PackingItem, UserProfile } from '../types';
import { AppIcon } from './AppIcon';
import { suggestCategory } from '../utils/packingDictionary';

interface Props {
    items: PackingItem[];
    userProfiles: UserProfile[];
    onUpdate: (val: PackingItem[] | ((prev: PackingItem[]) => PackingItem[])) => void;
    isTablet?: boolean;
}

const CATEGORIES = ['必需品', '衣類', '洗面用具', '電子機器', '日用品', '医薬品', '食品', 'その他'] as const;

const PackingView: React.FC<Props> = ({ items, userProfiles, onUpdate, isTablet = false }) => {
    const [newItemTitle, setNewItemTitle] = useState('');
    const [newItemCategory, setNewItemCategory] = useState<string>(CATEGORIES[0]);
    const [newItemParticipantId, setNewItemParticipantId] = useState<string | undefined>(undefined);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingItem, setEditingItem] = useState<PackingItem | null>(null);

    const stats = useMemo(() => {
        const total = items.length;
        const packed = items.filter(i => i.isPacked).length;
        return {
            total,
            packed,
            percent: total > 0 ? Math.round((packed / total) * 100) : 0
        };
    }, [items]);

    const categorizedItems = useMemo(() => {
        const groups: Record<string, PackingItem[]> = {};
        items.forEach(item => {
            if (!groups[item.category]) groups[item.category] = [];
            groups[item.category].push(item);
        });
        return groups;
    }, [items]);

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemTitle.trim()) return;

        const newItem: PackingItem = {
            id: crypto.randomUUID(),
            title: newItemTitle,
            category: newItemCategory,
            participantId: newItemParticipantId,
            isPacked: false,
            updatedAt: new Date().toISOString()
        };

        onUpdate(prev => [...prev, newItem]);
        setNewItemTitle('');
        setNewItemCategory(CATEGORIES[0]); // Reset to default
        setNewItemParticipantId(undefined);
        setShowAddForm(false);
    };

    const toggleItem = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onUpdate(prev => prev.map(item =>
            item.id === id ? { ...item, isPacked: !item.isPacked, updatedAt: new Date().toISOString() } : item
        ));
    };

    const handleUpdateItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem || !editingItem.title.trim()) return;

        onUpdate(prev => prev.map(item =>
            item.id === editingItem.id ? { ...editingItem, updatedAt: new Date().toISOString() } : item
        ));
        setEditingItem(null);
    };

    const deleteItem = (id: string) => {
        if (!window.confirm('このアイテムを削除しますか？')) return;
        onUpdate(prev => prev.filter(item => item.id !== id));
        setEditingItem(null);
    };

    const getProfile = (id?: string) => userProfiles.find(p => p.id === id);

    // アイテム名入力時のカテゴリ自動判定
    const handleTitleChange = (val: string) => {
        setNewItemTitle(val);
        const suggestion = suggestCategory(val);
        if (suggestion && CATEGORIES.includes(suggestion as any)) {
            setNewItemCategory(suggestion);
        }
    };

    return (
        <div className="space-y-6 pt-2 pb-10">
            <div className="flex justify-between items-center mb-4 px-1">
                <h2 className="text-xl font-sans font-bold text-ink">持ち物リスト</h2>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all shadow-lg ${showAddForm ? 'bg-rose-500 rotate-45' : 'bg-primary hover:bg-ocean-dark'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                </button>
            </div>

            {/* プログレスカード */}
            <div className="bg-gradient-to-br from-ocean-dark to-primary p-6 rounded-[32px] text-white shadow-xl shadow-ocean-dark/20 relative overflow-hidden mx-1">
                <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                <div className="relative z-10 text-center sm:text-left">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 mb-1">パッキング状況</p>
                    <div className="flex items-baseline justify-center sm:justify-start gap-2 mb-4">
                        <h3 className="text-4xl font-sans font-black">{stats.percent}%</h3>
                        <p className="text-xs opacity-80 font-bold">{stats.packed} / {stats.total} 個完了</p>
                    </div>
                    <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-accent transition-all duration-700 ease-out shadow-[0_0_10px_rgba(255,215,0,0.5)]"
                            style={{ width: `${stats.percent}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* 追加フォーム */}
            {showAddForm && (
                <form onSubmit={handleAddItem} className="glass p-5 rounded-3xl animate-in slide-in-from-top-4 duration-300 mx-1 border border-primary/20 bg-white/80">
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-ink-sub uppercase tracking-widest mb-1.5 block">アイテム名</label>
                            <input
                                autoFocus
                                type="text"
                                placeholder="例: パスポート、充電器..."
                                value={newItemTitle}
                                onChange={(e) => handleTitleChange(e.target.value)}
                                className="w-full bg-white border border-surface-gray-mid rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-all shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-ink-sub uppercase tracking-widest mb-1.5 block">担当メンバー</label>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => setNewItemParticipantId(undefined)}
                                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${!newItemParticipantId ? 'bg-ink text-white border-ink shadow-sm' : 'bg-surface-gray text-ink-sub border-surface-gray-mid hover:bg-white'}`}
                                >
                                    全員
                                </button>
                                {userProfiles.map(p => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => setNewItemParticipantId(p.id)}
                                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all flex items-center gap-1.5 ${newItemParticipantId === p.id ? 'text-white border-transparent shadow-sm' : 'bg-surface-gray text-ink-sub border-surface-gray-mid hover:bg-white'}`}
                                        style={newItemParticipantId === p.id ? { backgroundColor: p.color } : {}}
                                    >
                                        <div className="w-3 h-3 rounded-full overflow-hidden bg-white/20">
                                            {p.avatarUrl ? <img src={p.avatarUrl} className="w-full h-full object-cover" /> : <span>👤</span>}
                                        </div>
                                        {p.displayName}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-ink-sub uppercase tracking-widest mb-1.5 block">カテゴリー</label>
                            <div className="flex flex-wrap gap-2">
                                {CATEGORIES.map(cat => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setNewItemCategory(cat)}
                                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${newItemCategory === cat ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-ink-sub border-surface-gray-mid hover:bg-surface-gray'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button
                            type="submit"
                            className="w-full py-4 bg-ink text-white rounded-2xl text-[11px] font-bold uppercase tracking-widest shadow-lg active:scale-95 transition-all mt-2"
                        >
                            リストに追加
                        </button>
                    </div>
                </form>
            )}

            {/* リスト表示 */}
            <div className={`px-1 ${isTablet ? 'grid grid-cols-2 gap-x-6 gap-y-0 items-start' : 'space-y-8'}`}>
                {items.length === 0 ? (
                    <div className="text-center py-20 bg-white/50 rounded-[32px] border border-dashed border-surface-gray-mid">
                        <div className="mb-3 opacity-30 text-ink">
                            <AppIcon name="packing" className="w-12 h-12" />
                        </div>
                        <p className="text-sm font-bold text-ink-sub">準備を始めましょう！</p>
                        <p className="text-[10px] text-ink-light mt-1">追加ボタンから持ち物を入力してください</p>
                    </div>
                ) : (
                    (Object.entries(categorizedItems) as [string, PackingItem[]][]).map(([category, catItems]) => (
                        <div key={category} className="space-y-3">
                            <div className="flex items-center gap-3 px-1">
                                <span className="w-1 h-4 bg-primary rounded-full"></span>
                                <h4 className="text-[11px] font-black text-ink uppercase tracking-[0.2em]">{category}</h4>
                                <span className="flex-1 border-t border-surface-gray-mid"></span>
                            </div>
                            <div className="space-y-2">
                                {catItems.map(item => {
                                    const profile = getProfile(item.participantId);
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => setEditingItem({ ...item })}
                                            className={`group relative flex items-center justify-between p-4 bg-white rounded-2xl border transition-all cursor-pointer ${item.isPacked ? 'border-surface-gray-mid opacity-60' : 'border-surface-gray-mid hover:border-primary/30 shadow-sm'}`}
                                        >
                                            <div className="flex items-center gap-4 flex-1 mr-2">
                                                <button
                                                    onClick={(e) => toggleItem(item.id, e)}
                                                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all border-2 flex-shrink-0 ${item.isPacked ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' : 'bg-white border-surface-gray-mid hover:border-primary'}`}
                                                >
                                                    {item.isPacked && (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                    )}
                                                </button>
                                                <div className="min-w-0">
                                                    <span className={`text-sm font-bold block transition-all truncate ${item.isPacked ? 'line-through text-ink-light' : 'text-ink'}`}>
                                                        {item.title}
                                                    </span>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider flex items-center gap-1.5 ${profile ? 'text-white' : 'bg-surface-gray text-ink-light border border-surface-gray-mid'}`} style={profile ? { backgroundColor: profile.color } : {}}>
                                                            {profile ? (
                                                                <>
                                                                    <div className="w-2.5 h-2.5 rounded-full overflow-hidden bg-white/20">
                                                                        {profile.avatarUrl ? <img src={profile.avatarUrl} className="w-full h-full object-cover" /> : <AppIcon name="user" className="w-3 h-3 text-ink-light" />}
                                                                    </div>
                                                                    {profile.displayName}
                                                                </>
                                                            ) : '全員'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-2 text-ink-light hover:text-primary transition-colors">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* 編集モーダル */}
            {editingItem && (
                <div className="fixed inset-0 z-[100] bg-ocean-dark/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setEditingItem(null)}>
                    <form
                        onSubmit={handleUpdateItem}
                        className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl border border-surface-gray-mid animate-in slide-in-from-bottom-4 duration-300"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-sans font-bold text-ink">持ち物の編集</h3>
                            <button type="button" onClick={() => deleteItem(editingItem.id)} className="p-2 text-ink-light hover:text-rose-500 rounded-full transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="text-[10px] font-bold text-ink-sub uppercase tracking-widest mb-1.5 block">アイテム名</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={editingItem.title}
                                    onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                                    className="w-full bg-surface-gray border border-surface-gray-mid rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-ink-sub uppercase tracking-widest mb-1.5 block">担当メンバー</label>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setEditingItem({ ...editingItem, participantId: undefined })}
                                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${!editingItem.participantId ? 'bg-ink text-white border-ink shadow-sm' : 'bg-surface-gray text-ink-sub border-surface-gray-mid hover:bg-white'}`}
                                    >
                                        全員
                                    </button>
                                    {userProfiles.map(p => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => setEditingItem({ ...editingItem, participantId: p.id })}
                                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all flex items-center gap-1.5 ${editingItem.participantId === p.id ? 'text-white border-transparent shadow-sm' : 'bg-surface-gray text-ink-sub border-surface-gray-mid hover:bg-white'}`}
                                            style={editingItem.participantId === p.id ? { backgroundColor: p.color } : {}}
                                        >
                                            <div className="w-3 h-3 rounded-full overflow-hidden bg-white/20">
                                                {p.avatarUrl ? <img src={p.avatarUrl} className="w-full h-full object-cover" /> : <AppIcon name="user" className="w-4 h-4 text-ink-light" />}
                                            </div>
                                            {p.displayName}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-ink-sub uppercase tracking-widest mb-1.5 block">カテゴリー</label>
                                <div className="flex flex-wrap gap-2">
                                    {CATEGORIES.map(cat => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setEditingItem({ ...editingItem, category: cat })}
                                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${editingItem.category === cat ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-ink-sub border-surface-gray-mid hover:bg-surface-gray'}`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingItem(null)}
                                    className="flex-1 py-4 text-[11px] font-bold text-ink-sub uppercase tracking-widest bg-surface-gray rounded-2xl hover:bg-surface-gray-mid transition-colors"
                                >
                                    キャンセル
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-4 bg-primary text-white rounded-2xl text-[11px] font-bold uppercase tracking-widest shadow-lg shadow-primary/30 hover:bg-primary/90 active:scale-95 transition-all"
                                >
                                    変更を保存
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default PackingView;
