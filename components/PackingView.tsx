import React, { useState, useMemo } from 'react';
import { PackingItem, UserProfile } from '../types';
import { AppIcon } from './AppIcon';
import { suggestCategory } from '../utils/packingDictionary';
import { useTranslation } from '../contexts/LanguageContext';

interface Props {
    items: PackingItem[];
    userProfiles: UserProfile[];
    onUpdate: (val: PackingItem[] | ((prev: PackingItem[]) => PackingItem[])) => void;
    isTablet?: boolean;
    autoOpenAdd?: boolean;
}

const CATEGORIES = ['必需品', '衣類', '洗面用具', '電子機器', '日用品', '医薬品', '食品', 'その他'] as const;

const PackingView: React.FC<Props> = ({ items, userProfiles, onUpdate, isTablet = false, autoOpenAdd }) => {
    const { t } = useTranslation();
    const [newItemTitle, setNewItemTitle] = useState('');
    const [newItemCategory, setNewItemCategory] = useState<string>(CATEGORIES[0]);
    const [newItemAssignees, setNewItemAssignees] = useState<string[]>([]); // 空=全員
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingItem, setEditingItem] = useState<PackingItem | null>(null);
    const [filterMemberId, setFilterMemberId] = useState<string | 'ALL'>('ALL');

    // 直接追加フォームを開く処理
    React.useEffect(() => {
        if (autoOpenAdd) {
            setShowAddForm(true);
        }
    }, [autoOpenAdd]);

    // 複数選択トグルのヘルパー
    const toggleAssignee = (list: string[], id: string): string[] =>
        list.includes(id) ? list.filter(x => x !== id) : [...list, id];

    const stats = useMemo(() => {
        const total = items.length;
        const packed = items.filter(i => i.isPacked).length;

        const memberStats = userProfiles.map(p => {
            // assignees配列が空or未設定か、含まれていたら対象アイテム
            const memberItems = items.filter(i => {
                const a = i.assignees || [];
                return a.length === 0 || a.includes(p.id);
            });
            const memberPacked = memberItems.filter(i => {
                // 複数担当の場合は自分がpackedByに含まれているか
                if ((i.assignees || []).length > 0) return i.packedBy?.includes(p.id);
                return i.packedBy?.includes(p.id);
            }).length;
            return { id: p.id, name: p.displayName, color: p.color, packed: memberPacked, total: memberItems.length };
        });

        return { total, packed, percent: total > 0 ? Math.round((packed / total) * 100) : 0, memberStats };
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

        const assigneeIds = newItemAssignees; // 空=全員
        const isShared = assigneeIds.length === 0;

        const newItem: PackingItem = {
            id: crypto.randomUUID(),
            title: newItemTitle,
            category: newItemCategory,
            assignees: assigneeIds,
            participantId: assigneeIds.length === 1 ? assigneeIds[0] : undefined, // 後方互換
            isPacked: false,
            packedBy: isShared ? [] : undefined,
            updatedAt: new Date().toISOString()
        };

        onUpdate(prev => [...prev, newItem]);
        setNewItemTitle('');
        setNewItemCategory(CATEGORIES[0]);
        setNewItemAssignees([]);
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

            // 担当者全員がチェックしたら isPacked を true にする
            const targetProfiles = (item.assignees && item.assignees.length > 0)
                ? userProfiles.filter(p => item.assignees!.includes(p.id))
                : userProfiles;
            const allChecked = targetProfiles.length > 0 && targetProfiles.every(p => newPackedBy.includes(p.id));

            return { ...item, packedBy: newPackedBy, isPacked: allChecked, updatedAt: new Date().toISOString() };
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
        // window.confirm廃止: 編集モーダル内の削除ボタンは直接実行（モーダル自体が確認手順の役割を果たしている）
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

    const translateCategory = (cat: string) => {
        const map: Record<string, string> = {
            '必需品': 'essentials',
            '衣類': 'clothing',
            '洗面用具': 'toiletries',
            '電子機器': 'electronics',
            '日用品': 'daily',
            '医薬品': 'medical',
            '食品': 'food',
            'その他': 'other'
        };
        const key = map[cat] || 'other';
        return t(`packing.cat_${key}`) || cat;
    };

    return (
        <div className="flex flex-col h-full bg-surface-gray relative pb-20 pt-1">
            {/* 画面上部：全員/個人トグル - チケットセクション統一デザイン */}
            <div className="sticky top-0 z-40 bg-surface-gray/95 backdrop-blur-xl border-b border-surface-gray-mid/50 pt-4 pb-2 px-4 shadow-sm">
                <div className="flex bg-white/80 p-1 rounded-full mb-4 mx-auto w-full max-w-[320px] shadow-sm border border-surface-gray-mid/50">
                    <button
                        onClick={() => setFilterMemberId('ALL')}
                        className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-full transition-all duration-500 flex items-center justify-center gap-2.5 ${filterMemberId === 'ALL' ? 'bg-ink text-white shadow-xl shadow-ink/20 scale-[1.02]' : 'bg-transparent text-ink-sub hover:text-ink'}`}
                    >
                        <span className="text-sm">🌎</span>
                        {t('expenseList.all') || '全員'}
                    </button>
                    <button
                        onClick={() => {
                            if (filterMemberId === 'ALL') setFilterMemberId(userProfiles[0]?.id || 'ALL');
                        }}
                        className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-full transition-all duration-500 flex items-center justify-center gap-2.5 ${filterMemberId !== 'ALL' ? 'bg-ink text-white shadow-xl shadow-ink/20 scale-[1.02]' : 'bg-transparent text-ink-sub hover:text-ink'}`}
                    >
                        <span className="text-sm">👤</span>
                        {t('expenseList.individual') || '個人'}
                    </button>
                </div>

                {/* メンバー選択（個別モードのみ） */}
                {filterMemberId !== 'ALL' && (
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-4 mb-1 animate-in fade-in slide-in-from-top-2 duration-500 justify-start sm:justify-center">
                        {userProfiles.map(p => (
                            <button
                                key={p.id}
                                onClick={() => setFilterMemberId(p.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all border-2 shadow-sm ${filterMemberId === p.id ? 'bg-white border-primary/30 text-ink scale-105' : 'bg-white/40 border-transparent text-ink-light opacity-60 hover:opacity-100'}`}
                            >
                                <div className="w-5 h-5 rounded-full overflow-hidden border border-white" style={{ backgroundColor: p.color }}>
                                    {p.avatarUrl ? <img src={p.avatarUrl} className="w-full h-full object-cover" alt="" /> : null}
                                </div>
                                <span className="text-[10px] font-black">{p.displayName}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center mb-4 px-4 mt-4">
                <h2 className="text-xl font-sans font-black text-ink flex items-center gap-2 tracking-tight">
                    <span className="text-2xl">🎒</span> {t('packing.title') || '持ち物リスト'}
                </h2>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className={`h-10 px-5 rounded-full flex items-center justify-center text-white transition-all shadow-lg font-black text-[10px] uppercase tracking-widest gap-2 ${showAddForm ? 'bg-rose-500' : 'bg-primary hover:bg-ocean-dark'}`}
                >
                    {showAddForm ? (t('common.close') || '閉じる') : ('+ ' + (t('common.add') || '追加'))}
                </button>
            </div>

            {/* 進捗セクション：全体とメンバー別 */}
            <div className="space-y-4 mx-1">
                <div className="bg-gradient-to-br from-ocean-dark to-primary p-6 rounded-[32px] text-white shadow-xl shadow-ocean-dark/20 relative overflow-hidden">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 mb-1">{t('packing.overallProgress') || '全体進捗'}</p>
                                <h3 className="text-4xl font-sans font-black">{stats.percent}%<span className="text-lg ml-1 opacity-60">{t('packing.completed') || '完了'}</span></h3>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mb-1">{t('packing.count') || '個数'}</p>
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



            {/* 追加フォーム */}
            {showAddForm && (
                <form onSubmit={handleAddItem} className="glass p-6 rounded-[32px] animate-in slide-in-from-top-4 duration-300 mx-1 border border-primary/10 bg-white/90 shadow-xl">
                    <div className="space-y-5">
                        <div className="flex justify-between items-center">
                            <h4 className="text-sm font-black text-ink">{t('packing.addNewItem') || '新規アイテム追加'}</h4>
                            <span className="text-[10px] font-bold text-ink-light bg-surface-gray px-2 py-1 rounded-md uppercase tracking-wider">{t('packing.new') || '新規'}</span>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-ink-sub uppercase tracking-widest mb-2 block">{t('packing.itemName') || 'アイテム名'}</label>
                            <input
                                autoFocus
                                type="text"
                                placeholder={t('packing.itemNamePlaceholder') || "例: パスポート、モバイルバッテリー..."}
                                value={newItemTitle}
                                onChange={(e) => handleTitleChange(e.target.value)}
                                className="w-full bg-surface-gray/50 border border-surface-gray-mid rounded-2xl px-5 py-3.5 text-sm font-bold focus:border-primary focus:bg-white outline-none transition-all shadow-inner"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-ink-sub uppercase tracking-widest mb-2 block">{t('packing.whoNeedsThis') || 'このアイテムが必要なのは？'}</label>
                            <p className="text-[10px] text-ink-light mb-3">{t('packing.whoNeedsThisDesc') || '複数選択OK。選択なし=全員の共有持ち物になります。'}</p>
                            <div className="flex flex-wrap gap-2">
                                {userProfiles.map(p => {
                                    const selected = newItemAssignees.includes(p.id);
                                    return (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => setNewItemAssignees(prev => toggleAssignee(prev, p.id))}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all active:scale-95 ${selected ? 'text-white border-transparent shadow-md' : 'bg-surface-gray text-ink-sub border-surface-gray-mid/50 hover:bg-white'}`}
                                            style={selected ? { backgroundColor: p.color } : {}}
                                        >
                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selected ? 'bg-white/30 border-white/50' : 'bg-white border-surface-gray-mid'}`}>
                                                {selected && <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" /></svg>}
                                            </div>
                                            {p.displayName}
                                        </button>
                                    );
                                })}
                            </div>
                            {newItemAssignees.length === 0 && (
                                <p className="mt-2 text-[10px] font-bold text-emerald-600">{t('packing.sharedItemInfo') || '✓ 全員の共有持ち物として追加されます'}</p>
                            )}
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-ink-sub uppercase tracking-widest mb-2 block">{t('packing.selectCategory') || 'カテゴリー選択'}</label>
                            <div className="flex flex-wrap gap-2">
                                {CATEGORIES.map(cat => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setNewItemCategory(cat)}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all border ${newItemCategory === cat ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-ink-sub border-surface-gray-mid hover:bg-surface-gray'}`}
                                    >
                                        {translateCategory(cat)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button
                            type="submit"
                            className="w-full py-[18px] bg-gradient-to-r from-ocean-dark to-primary text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/30 active:scale-95 transition-all mt-2"
                        >
                            {t('packing.confirmAdd') || '追加を確定する'}
                        </button>
                    </div>
                </form>
            )}

            {/* リスト表示 */}
            <div className={`px-1 space-y-10`}>
                {items.length === 0 ? (
                    <div className="text-center py-20 bg-white/50 rounded-[40px] border border-dashed border-surface-gray-mid">
                        <div className="mb-4 opacity-20">
                            <span className="text-8xl">🎒</span>
                        </div>
                        <h4 className="text-sm font-black text-ink">{t('packing.noItems') || 'まだアイテムがありません'}</h4>
                        <p className="text-[10px] text-ink-light mt-2 px-10">{t('packing.noItemsDesc1') || '旅行の準備を始めましょう！'}<br />{t('packing.noItemsDesc2') || '上の「持ち物を追加」ボタンから追加できます。'}</p>
                    </div>
                ) : (
                    (Object.entries(categorizedItems) as [string, PackingItem[]][]).map(([category, catItems]) => {
                        // フィルター適用
                        const filteredCatItems = catItems.filter(item => {
                            if (filterMemberId === 'ALL') return true;
                            const a = item.assignees || [];
                            // assignees空=全員 or 選択メンバーが含まれている
                            return a.length === 0 || a.includes(filterMemberId);
                        });

                        if (filteredCatItems.length === 0) return null;

                        return (
                            <div key={category} className="space-y-4">
                                <div className="flex items-center gap-3 px-2">
                                    <h4 className="text-[11px] font-black text-ink uppercase tracking-[0.3em] flex items-center gap-2">
                                        <span className="w-1.5 h-4 bg-premium-gold rounded-full shadow-[0_0_8px_rgba(207,168,110,0.5)]"></span>
                                        {translateCategory(category)}
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
                                                                    {(() => {
                                                                        const a = item.assignees || [];
                                                                        if (a.length === 0) return t('packing.sharedItem') || '全員の共有持ち物';
                                                                        const names = a.map(id => userProfiles.find(p => p.id === id)?.displayName || id);
                                                                        const suffix = t('packing.bringsIt') || 'が持参';
                                                                        return names.join('・') + suffix;
                                                                    })()}
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

                                                    {/* チェック部分：担当メンバー全員のサークルを表示 */}
                                                    <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-surface-gray-mid/30">
                                                        {(() => {
                                                            const a = item.assignees || [];
                                                            const targetProfiles = a.length > 0
                                                                ? userProfiles.filter(p => a.includes(p.id))
                                                                : userProfiles;
                                                            return targetProfiles.map(p => {
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
                                                                            {!isChecked && <div className="absolute inset-0 bg-primary opacity-0 group-hover/check:opacity-10 transition-opacity"></div>}
                                                                        </div>
                                                                        <span className={`text-[8px] font-black uppercase tracking-tighter ${isChecked ? 'text-ink font-black' : 'text-ink-light opacity-50'}`}>{p.displayName}</span>
                                                                    </button>
                                                                );
                                                            });
                                                        })()}
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
                        className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl border border-surface-gray-mid animate-in slide-in-from-bottom-4 duration-300 max-h-[90dvh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-sans font-black text-ink">{t('packing.itemSettings') || 'アイテム設定'}</h3>
                            <button type="button" onClick={() => deleteItem(editingItem.id)} className="w-10 h-10 flex items-center justify-center text-ink-light hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-bold text-ink-sub uppercase tracking-widest mb-2 block">{t('packing.itemName') || 'アイテム名'}</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={editingItem.title}
                                    onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                                    className="w-full bg-surface-gray border border-surface-gray-mid rounded-2xl px-5 py-3.5 text-sm font-bold focus:border-primary outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-ink-sub uppercase tracking-widest mb-2 block">{t('packing.assigneeSet') || '担当者設定（複数可）'}</label>
                                <p className="text-[10px] text-ink-light mb-3">{t('packing.assigneeSetDesc') || '選択なし=全員の共有持ち物'}</p>
                                <div className="flex flex-wrap gap-2">
                                    {userProfiles.map(p => {
                                        const currentAssignees = editingItem.assignees || [];
                                        const selected = currentAssignees.includes(p.id);
                                        return (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => {
                                                    const newAssignees = toggleAssignee(currentAssignees, p.id);
                                                    setEditingItem({
                                                        ...editingItem,
                                                        assignees: newAssignees,
                                                        participantId: newAssignees.length === 1 ? newAssignees[0] : undefined,
                                                        packedBy: newAssignees.length === 0 ? (editingItem.packedBy || []) : editingItem.packedBy
                                                    });
                                                }}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all active:scale-95 ${selected ? 'text-white border-transparent shadow-md' : 'bg-surface-gray text-ink-sub border-surface-gray-mid/50 hover:bg-white'}`}
                                                style={selected ? { backgroundColor: p.color } : {}}
                                            >
                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selected ? 'bg-white/30 border-white/50' : 'bg-white border-surface-gray-mid'}`}>
                                                    {selected && <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" /></svg>}
                                                </div>
                                                {p.displayName}
                                            </button>
                                        );
                                    })}
                                </div>
                                {(editingItem.assignees || []).length === 0 && (
                                    <p className="mt-2 text-[10px] font-bold text-emerald-600">{t('packing.sharedItem') || '✓ 全員の共有持ち物'}</p>
                                )}
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-ink-sub uppercase tracking-widest mb-2 block">{t('packing.category') || 'カテゴリー'}</label>
                                <div className="flex flex-wrap gap-2">
                                    {CATEGORIES.map(cat => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setEditingItem({ ...editingItem, category: cat })}
                                            className={`px-4 py-2.5 rounded-xl text-[10px] font-bold transition-all border ${editingItem.category === cat ? 'bg-primary text-white border-primary shadow-lg' : 'bg-white text-ink-sub border-surface-gray-mid hover:bg-surface-gray'}`}
                                        >
                                            {translateCategory(cat)}
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
                                    {t('common.back') || '戻る'}
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-[18px] bg-ink text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:opacity-90 active:scale-95 transition-all"
                                >
                                    {t('common.save') || '保存する'}
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
