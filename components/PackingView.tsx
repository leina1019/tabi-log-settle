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
    const [filterMemberId, setFilterMemberId] = useState<string | 'ALL'>('ALL');

    const stats = useMemo(() => {
        const total = items.length;
        // 進捗計算のロジックを調整：
        // 全員用アイテムの場合、全員のチェック合計数で計算するか、1つの完了として計算するか
        // ここでは単純なアイテム単位の完了数（全員用なら全員完了で1カウント）を維持しつつ表示を豪華にする
        const packed = items.filter(i => i.isPacked).length;

        // メンバーごとの進捗も計算
        const memberStats = userProfiles.map(p => {
            const memberItems = items.filter(i => !i.participantId || i.participantId === p.id);
            const memberPacked = memberItems.filter(i => {
                if (i.participantId === p.id) return i.isPacked;
                return i.packedBy?.includes(p.id);
            }).length;
            return {
                id: p.id,
                name: p.displayName,
                color: p.color,
                packed: memberPacked,
                total: memberItems.length
            };
        });

        return {
            total,
            packed,
            percent: total > 0 ? Math.round((packed / total) * 100) : 0,
            memberStats
        };
    }, [items, userProfiles]);

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
            packedBy: newItemParticipantId ? undefined : [], // 全員用なら空配列で初期化
            updatedAt: new Date().toISOString()
        };

        onUpdate(prev => [...prev, newItem]);
        setNewItemTitle('');
        setNewItemCategory(CATEGORIES[0]);
        setNewItemParticipantId(undefined);
        setShowAddForm(false);
    };

    const toggleItemMember = (itemId: string, memberId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onUpdate(prev => prev.map(item => {
            if (item.id !== itemId) return item;

            let newPackedBy = item.packedBy ? [...item.packedBy] : [];
            if (newPackedBy.includes(memberId)) {
                newPackedBy = newPackedBy.filter(id => id !== memberId);
            } else {
                newPackedBy.push(memberId);
            }

            // 全員がチェックしたら isPacked を true にする
            const allChecked = userProfiles.every(p => newPackedBy.includes(p.id));

            return {
                ...item,
                packedBy: newPackedBy,
                isPacked: allChecked,
                updatedAt: new Date().toISOString()
            };
        }));
    };

    const toggleItemPersonal = (id: string, e: React.MouseEvent) => {
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
                <h2 className="text-xl font-sans font-bold text-ink flex items-center gap-2">
                    <span className="text-2xl">🎒</span> 持ち物リスト
                </h2>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className={`h-11 px-5 rounded-full flex items-center justify-center text-white transition-all shadow-lg font-bold text-sm gap-2 ${showAddForm ? 'bg-rose-500' : 'bg-primary hover:bg-ocean-dark'}`}
                >
                    {showAddForm ? (
                        <>閉じる</>
                    ) : (
                        <><span className="text-lg">+</span> 持ち物を追加</>
                    )}
                </button>
            </div>

            {/* 進捗セクション：全体とメンバー別 */}
            <div className="space-y-4 mx-1">
                <div className="bg-gradient-to-br from-ocean-dark to-primary p-6 rounded-[32px] text-white shadow-xl shadow-ocean-dark/20 relative overflow-hidden">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 mb-1">Total Progress</p>
                                <h3 className="text-4xl font-sans font-black">{stats.percent}%<span className="text-lg ml-1 opacity-60">Complete</span></h3>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mb-1">Items</p>
                                <p className="text-sm font-bold">{stats.packed} / {stats.total}</p>
                            </div>
                        </div>
                        <div className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden shadow-inner">
                            <div
                                className="h-full bg-accent transition-all duration-700 ease-out shadow-[0_0_10px_rgba(255,215,0,0.5)]"
                                style={{ width: `${stats.percent}%` }}
                            ></div>
                        </div>

                        {/* メンバー別小バー */}
                        <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-white/10">
                            {stats.memberStats.map(ms => (
                                <div key={ms.id} className="flex-1 min-w-[80px]">
                                    <div className="flex justify-between items-center mb-1.5 px-0.5">
                                        <span className="text-[9px] font-black uppercase tracking-wider">{ms.name}</span>
                                        <span className="text-[9px] font-bold opacity-70">{ms.packed}/{ms.total}</span>
                                    </div>
                                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full transition-all duration-700"
                                            style={{ width: `${(ms.packed / ms.total) * 100}%`, backgroundColor: ms.color }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* フィルター・タブ */}
            <div className="px-1 overflow-x-auto scrollbar-hide">
                <div className="flex gap-2 min-w-max pb-2">
                    <button
                        onClick={() => setFilterMemberId('ALL')}
                        className={`px-4 py-2.5 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all border ${filterMemberId === 'ALL' ? 'bg-ink text-white border-ink shadow-md' : 'bg-white text-ink-sub border-surface-gray-mid hover:bg-surface-gray'}`}
                    >
                        全員
                    </button>
                    {userProfiles.map(p => (
                        <button
                            key={p.id}
                            onClick={() => setFilterMemberId(p.id)}
                            className={`px-4 py-2.5 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all border flex items-center gap-2 ${filterMemberId === p.id ? 'text-white border-transparent shadow-md' : 'bg-white text-ink-sub border-surface-gray-mid hover:bg-surface-gray'}`}
                            style={filterMemberId === p.id ? { backgroundColor: p.color } : {}}
                        >
                            <div className="w-4 h-4 rounded-full overflow-hidden border border-white/20">
                                {p.avatarUrl ? <img src={p.avatarUrl} className="w-full h-full object-cover" /> : <span>👤</span>}
                            </div>
                            {p.displayName}
                        </button>
                    ))}
                </div>
            </div>

            {/* 追加フォーム */}
            {showAddForm && (
                <form onSubmit={handleAddItem} className="glass p-6 rounded-[32px] animate-in slide-in-from-top-4 duration-300 mx-1 border border-primary/10 bg-white/90 shadow-xl">
                    <div className="space-y-5">
                        <div className="flex justify-between items-center">
                            <h4 className="text-sm font-black text-ink">新規アイテム追加</h4>
                            <span className="text-[10px] font-bold text-ink-light bg-surface-gray px-2 py-1 rounded-md uppercase tracking-wider">New Item</span>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-ink-sub uppercase tracking-widest mb-2 block">アイテム名</label>
                            <input
                                autoFocus
                                type="text"
                                placeholder="例: パスポート、モバイルバッテリー..."
                                value={newItemTitle}
                                onChange={(e) => handleTitleChange(e.target.value)}
                                className="w-full bg-surface-gray/50 border border-surface-gray-mid rounded-2xl px-5 py-3.5 text-sm font-bold focus:border-primary focus:bg-white outline-none transition-all shadow-inner"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-ink-sub uppercase tracking-widest mb-2 block">このアイテムが必要なのは？</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setNewItemParticipantId(undefined)}
                                    className={`py-3 rounded-xl text-[10px] font-bold border transition-all ${!newItemParticipantId ? 'bg-ink text-white border-ink shadow-md' : 'bg-surface-gray text-ink-sub border-surface-gray-mid hover:bg-white'}`}
                                >
                                    メンバー全員
                                </button>
                                {userProfiles.map(p => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => setNewItemParticipantId(p.id)}
                                        className={`py-3 rounded-xl text-[10px] font-bold border transition-all flex flex-col items-center gap-1.5 justify-center ${newItemParticipantId === p.id ? 'text-white border-transparent shadow-md' : 'bg-surface-gray text-ink-sub border-surface-gray-mid hover:bg-white'}`}
                                        style={newItemParticipantId === p.id ? { backgroundColor: p.color } : {}}
                                    >
                                        <div className="w-4 h-4 rounded-full overflow-hidden border border-white/20">
                                            {p.avatarUrl ? <img src={p.avatarUrl} className="w-full h-full object-cover" /> : <span>👤</span>}
                                        </div>
                                        {p.displayName}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-ink-sub uppercase tracking-widest mb-2 block">カテゴリー選択</label>
                            <div className="flex flex-wrap gap-2">
                                {CATEGORIES.map(cat => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setNewItemCategory(cat)}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all border ${newItemCategory === cat ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-ink-sub border-surface-gray-mid hover:bg-surface-gray'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button
                            type="submit"
                            className="w-full py-[18px] bg-gradient-to-r from-ocean-dark to-primary text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/30 active:scale-95 transition-all mt-2"
                        >
                            追加を確定する
                        </button>
                    </div>
                </form>
            )}

            {/* リスト表示 */}
            <div className={`px-1 space-y-10`}>
                {items.length === 0 ? (
                    <div className="text-center py-20 bg-white/50 rounded-[40px] border border-dashed border-surface-gray-mid">
                        <div className="mb-4 opacity-10 grayscale scale-150 transform rotate-12">
                            <span className="text-8xl">🎒</span>
                        </div>
                        <h4 className="text-sm font-black text-ink uppercase tracking-widest">No Items Yet</h4>
                        <p className="text-[10px] text-ink-light mt-2 px-10">旅行の準備を始めましょう！<br />上のボタンから持ち物を追加してください。</p>
                    </div>
                ) : (
                    (Object.entries(categorizedItems) as [string, PackingItem[]][]).map(([category, catItems]) => {
                        // フィルター適用
                        const filteredCatItems = catItems.filter(item => {
                            if (filterMemberId === 'ALL') return true;
                            return !item.participantId || item.participantId === filterMemberId;
                        });

                        if (filteredCatItems.length === 0) return null;

                        return (
                            <div key={category} className="space-y-4">
                                <div className="flex items-center gap-3 px-2">
                                    <h4 className="text-[11px] font-black text-ink uppercase tracking-[0.3em] flex items-center gap-2">
                                        <span className="w-1.5 h-4 bg-premium-gold rounded-full shadow-[0_0_8px_rgba(207,168,110,0.5)]"></span>
                                        {category}
                                    </h4>
                                    <span className="flex-1 h-[1px] bg-gradient-to-r from-surface-gray-mid to-transparent opacity-50"></span>
                                    <span className="text-[10px] font-bold text-ink-light">{filteredCatItems.length}</span>
                                </div>
                                <div className={`grid ${isTablet ? 'grid-cols-2 gap-4' : 'grid-cols-1 gap-3'}`}>
                                    {filteredCatItems.map(item => {
                                        const profile = getProfile(item.participantId);
                                        const isCommunal = !item.participantId;

                                        return (
                                            <div
                                                key={item.id}
                                                className={`group relative bg-white rounded-2xl border transition-all p-5 shadow-sm hover:shadow-md hover:border-primary/20 ${item.isPacked ? 'bg-surface-gray/30 opacity-70' : ''}`}
                                            >
                                                <div className="flex flex-col gap-4">
                                                    <div className="flex justify-between items-start gap-4">
                                                        <div className="min-w-0 flex-1">
                                                            <h5 className={`font-bold text-sm leading-tight transition-all truncate ${item.isPacked ? 'line-through text-ink-sub' : 'text-ink'}`}>
                                                                {item.title}
                                                            </h5>
                                                            <div className="mt-1 flex items-center gap-2">
                                                                <span className="text-[9px] font-bold text-ink-light uppercase tracking-tighter opacity-60">
                                                                    {isCommunal ? '全員の共有持ち物' : `${profile?.displayName}の専用品`}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => setEditingItem({ ...item })}
                                                            className="p-1.5 text-ink-light hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                        </button>
                                                    </div>

                                                    {/* チェック部分の出し分け */}
                                                    <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-surface-gray-mid/30">
                                                        {isCommunal ? (
                                                            // 共有アイテム：全員分のサークルを表示
                                                            userProfiles.map(p => {
                                                                const isChecked = item.packedBy?.includes(p.id);
                                                                return (
                                                                    <button
                                                                        key={p.id}
                                                                        onClick={(e) => toggleItemMember(item.id, p.id, e)}
                                                                        className={`relative group/check flex flex-col items-center gap-1.5 active:scale-90 transition-all`}
                                                                    >
                                                                        <div
                                                                            className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all relative overflow-hidden ${isChecked ? 'shadow-lg' : 'bg-surface-gray/50 border-surface-gray-mid'}`}
                                                                            style={isChecked ? { backgroundColor: p.color, borderColor: p.color } : {}}
                                                                        >
                                                                            {isChecked ? (
                                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white animate-in zoom-in duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" /></svg>
                                                                            ) : (
                                                                                <span className="text-[10px] font-black opacity-30 uppercase">{p.displayName[0]}</span>
                                                                            )}
                                                                            {/* ホバー時のオーバーレイ */}
                                                                            {!isChecked && <div className="absolute inset-0 bg-primary opacity-0 group-hover/check:opacity-10 transition-opacity"></div>}
                                                                        </div>
                                                                        <span className={`text-[8px] font-black uppercase tracking-tighter ${isChecked ? 'text-ink font-black' : 'text-ink-light opacity-50'}`}>{p.displayName}</span>
                                                                    </button>
                                                                );
                                                            })
                                                        ) : (
                                                            // 個人アイテム：大きな1つのチェックボタンを表示
                                                            <button
                                                                onClick={(e) => toggleItemPersonal(item.id, e)}
                                                                className={`flex items-center gap-3 px-4 py-2 rounded-xl border-2 transition-all active:scale-95 ${item.isPacked ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-surface-gray/50 border-surface-gray-mid text-ink-sub hover:border-primary/50'}`}
                                                            >
                                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${item.isPacked ? 'bg-emerald-500 border-emerald-500 shadow-sm' : 'bg-white border-surface-gray-mid'}`}>
                                                                    {item.isPacked && <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" /></svg>}
                                                                </div>
                                                                <span className="text-[10px] font-black uppercase tracking-widest">{item.isPacked ? 'PREPARED' : 'UNCHECKED'}</span>
                                                                <div className="w-5 h-5 rounded-full overflow-hidden border border-white" style={{ backgroundColor: profile?.color }}>
                                                                    {profile?.avatarUrl ? <img src={profile.avatarUrl} className="w-full h-full object-cover" /> : <span className="text-[8px] text-white font-bold ml-1.5">{profile?.displayName[0]}</span>}
                                                                </div>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* 編集モーダル */}
            {editingItem && (
                <div className="fixed inset-0 z-[100] bg-ocean-dark/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4 overflow-y-auto" onClick={() => setEditingItem(null)}>
                    <form
                        onSubmit={handleUpdateItem}
                        className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl border border-surface-gray-mid animate-in slide-in-from-bottom-4 duration-300 max-h-[90vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-sans font-black text-ink">アイテム設定</h3>
                            <button type="button" onClick={() => deleteItem(editingItem.id)} className="w-10 h-10 flex items-center justify-center text-ink-light hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-bold text-ink-sub uppercase tracking-widest mb-2 block">アイテム名</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={editingItem.title}
                                    onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                                    className="w-full bg-surface-gray border border-surface-gray-mid rounded-2xl px-5 py-3.5 text-sm font-bold focus:border-primary outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-ink-sub uppercase tracking-widest mb-2 block">担当設定</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setEditingItem({ ...editingItem, participantId: undefined, packedBy: [] })}
                                        className={`py-3.5 rounded-xl text-[10px] font-bold border transition-all ${!editingItem.participantId ? 'bg-ink text-white border-ink shadow-lg' : 'bg-surface-gray text-ink-sub border-surface-gray-mid hover:bg-white'}`}
                                    >
                                        全員で分担 / 共有
                                    </button>
                                    {userProfiles.map(p => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => setEditingItem({ ...editingItem, participantId: p.id, packedBy: undefined })}
                                            className={`py-3.5 rounded-xl text-[10px] font-bold border transition-all flex flex-col items-center gap-1 px-2 ${editingItem.participantId === p.id ? 'text-white border-transparent shadow-lg' : 'bg-surface-gray text-ink-sub border-surface-gray-mid hover:bg-white'}`}
                                            style={editingItem.participantId === p.id ? { backgroundColor: p.color } : {}}
                                        >
                                            <div className="w-4 h-4 rounded-full overflow-hidden bg-white/20">
                                                {p.avatarUrl ? <img src={p.avatarUrl} className="w-full h-full object-cover" /> : <span>👤</span>}
                                            </div>
                                            {p.displayName} の専用
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-ink-sub uppercase tracking-widest mb-2 block">カテゴリー</label>
                                <div className="flex flex-wrap gap-2">
                                    {CATEGORIES.map(cat => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setEditingItem({ ...editingItem, category: cat })}
                                            className={`px-4 py-2.5 rounded-xl text-[10px] font-bold transition-all border ${editingItem.category === cat ? 'bg-primary text-white border-primary shadow-lg' : 'bg-white text-ink-sub border-surface-gray-mid hover:bg-surface-gray'}`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setEditingItem(null)}
                                    className="flex-1 py-[18px] text-[11px] font-black text-ink-sub uppercase tracking-[0.2em] bg-surface-gray rounded-2xl hover:bg-white border border-surface-gray-mid transition-all"
                                >
                                    戻る
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-[18px] bg-ink text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:opacity-90 active:scale-95 transition-all"
                                >
                                    保存する
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
