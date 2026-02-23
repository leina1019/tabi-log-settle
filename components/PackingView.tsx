
import React, { useState, useMemo } from 'react';
import { PackingItem, UserProfile } from '../types';

interface Props {
    items: PackingItem[];
    userProfiles: UserProfile[];
    onUpdate: (val: PackingItem[] | ((prev: PackingItem[]) => PackingItem[])) => void;
}

const CATEGORIES = ['衣類', '洗面用具', '電子機器', '重要書類', '常備薬', 'その他'] as const;

const PackingView: React.FC<Props> = ({ items, userProfiles, onUpdate }) => {
    const [newItemTitle, setNewItemTitle] = useState('');
    const [newItemCategory, setNewItemCategory] = useState<string>(CATEGORIES[0]);
    const [showAddForm, setShowAddForm] = useState(false);

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
            isPacked: false,
            updatedAt: new Date().toISOString()
        };

        onUpdate(prev => [...prev, newItem]);
        setNewItemTitle('');
        setShowAddForm(false);
    };

    const toggleItem = (id: string) => {
        onUpdate(prev => prev.map(item =>
            item.id === id ? { ...item, isPacked: !item.isPacked, updatedAt: new Date().toISOString() } : item
        ));
    };

    const deleteItem = (id: string) => {
        if (!window.confirm('このアイテムを削除しますか？')) return;
        onUpdate(prev => prev.filter(item => item.id !== id));
    };

    const handleAssign = (id: string, participantId: string | undefined) => {
        onUpdate(prev => prev.map(item =>
            item.id === id ? { ...item, participantId, updatedAt: new Date().toISOString() } : item
        ));
    };

    const getProfile = (id?: string) => userProfiles.find(p => p.id === id);

    return (
        <div className="space-y-6 pt-2 pb-10">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-sans font-bold text-ink">持ち物リスト</h2>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all shadow-lg ${showAddForm ? 'bg-rose-500 rotate-45' : 'bg-primary hover:bg-ocean-dark'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                </button>
            </div>

            {/* プログレスカード */}
            <div className="bg-gradient-to-br from-ocean-dark to-primary p-6 rounded-[32px] text-white shadow-xl shadow-ocean-dark/20 relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 mb-1">Packing Status</p>
                    <div className="flex items-baseline gap-2 mb-4">
                        <h3 className="text-4xl font-sans font-black">{stats.percent}%</h3>
                        <p className="text-xs opacity-80 font-bold">{stats.packed} / {stats.total} items packed</p>
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
                <form onSubmit={handleAddItem} className="glass p-5 rounded-3xl animate-in slide-in-from-top-4 duration-300">
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-ink-sub uppercase tracking-widest mb-1 block">アイテム名</label>
                            <input
                                autoFocus
                                type="text"
                                placeholder="例: パスポート、充電器..."
                                value={newItemTitle}
                                onChange={(e) => setNewItemTitle(e.target.value)}
                                className="w-full bg-white border border-surface-gray-mid rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-all shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-ink-sub uppercase tracking-widest mb-1 block">カテゴリー</label>
                            <div className="flex flex-wrap gap-2">
                                {CATEGORIES.map(cat => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setNewItemCategory(cat)}
                                        className={`px-4 py-2 rounded-full text-[11px] font-bold transition-all border ${newItemCategory === cat ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-ink-sub border-surface-gray-mid hover:bg-surface-gray'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button
                            type="submit"
                            className="w-full py-4 bg-ink text-white rounded-2xl text-[11px] font-bold uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                        >
                            リストに追加
                        </button>
                    </div>
                </form>
            )}

            {/* リスト表示 */}
            <div className="space-y-8">
                {items.length === 0 ? (
                    <div className="text-center py-20 bg-white/50 rounded-[32px] border border-dashed border-surface-gray-mid">
                        <div className="text-4xl mb-3 opacity-30 text-ink">🎒</div>
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
                                            className={`group relative flex items-center justify-between p-4 bg-white rounded-2xl border transition-all ${item.isPacked ? 'border-surface-gray-mid opacity-60' : 'border-surface-gray-mid hover:border-primary/30 shadow-sm'}`}
                                        >
                                            <div className="flex items-center gap-4 flex-1">
                                                <button
                                                    onClick={() => toggleItem(item.id)}
                                                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all border-2 ${item.isPacked ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-surface-gray-mid group-hover:border-primary'}`}
                                                >
                                                    {item.isPacked && (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                    )}
                                                </button>
                                                <div className="flex flex-col">
                                                    <span className={`text-sm font-bold transition-all ${item.isPacked ? 'line-through text-ink-light' : 'text-ink'}`}>
                                                        {item.title}
                                                    </span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {/* 担当者選択 */}
                                                        <select
                                                            className="text-[9px] font-bold text-ink-sub bg-surface-gray px-1.5 py-0.5 rounded border-none outline-none appearance-none cursor-pointer hover:text-primary transition-colors"
                                                            value={item.participantId || ''}
                                                            onChange={(e) => handleAssign(item.id, e.target.value || undefined)}
                                                        >
                                                            <option value="">👤 全員</option>
                                                            {userProfiles.map(p => (
                                                                <option key={p.id} value={p.id}>{p.displayName}</option>
                                                            ))}
                                                        </select>
                                                        {profile && (
                                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: profile.color }}></div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => deleteItem(item.id)}
                                                className="opacity-0 group-hover:opacity-100 p-2 text-ink-light hover:text-rose-500 transition-all active:scale-90"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default PackingView;
