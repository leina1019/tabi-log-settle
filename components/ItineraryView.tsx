
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ItineraryItem, UserProfile, Participant } from '../types';
import { fetchOgpData } from '../services/ogpService';
import { MEMBER_COLORS, PARTICIPANTS } from '../constants';

// 予定種類の定義（ラベル + アイコン）
const ITEM_TYPES: { value: ItineraryItem['type']; label: string; icon: string }[] = [
  { value: 'activity', label: 'アクティビティ', icon: '🎯' },
  { value: 'sightseeing', label: '観光・スポット', icon: '📸' },
  { value: 'meal', label: '食事・カフェ', icon: '🍽️' },
  { value: 'shopping', label: 'ショッピング', icon: '🛍️' },
  { value: 'move', label: '移動・交通', icon: '✈️' },
  { value: 'stay', label: '宿泊', icon: '🏨' },
  { value: 'other', label: 'その他', icon: '✨' },
];

const getTypeInfo = (type: string) => {
  return ITEM_TYPES.find(t => t.value === type) ?? ITEM_TYPES[0];
};

interface Props {
  items: ItineraryItem[];
  userProfiles: UserProfile[];
  onSave: (item: ItineraryItem) => void;
  onDelete: (id: string) => void;
  tripStartDate: string;
  tripEndDate: string;
}

const ItineraryView: React.FC<Props> = ({ items, userProfiles, onSave, onDelete, tripStartDate, tripEndDate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [viewMode, setViewMode] = useState<'overall' | 'individual'>('overall');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [visibleMemberIds, setVisibleMemberIds] = useState<string[]>(() => userProfiles.map(u => u.id));
  const [formData, setFormData] = useState<Partial<ItineraryItem>>({ type: 'activity', links: [] });
  const [isFetchingOgp, setIsFetchingOgp] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [showMemoId, setShowMemoId] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // 旅行期間の日付配列を生成
  const dateRange = useMemo(() => {
    if (!tripStartDate) return [];
    const dates: string[] = [];
    const start = new Date(tripStartDate);
    const end = tripEndDate ? new Date(tripEndDate) : new Date(tripStartDate);
    let current = new Date(start);
    let count = 0;
    while (current <= end && count < 30) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
      count++;
    }
    return dates;
  }, [tripStartDate, tripEndDate]);

  // 選択日初期化
  useEffect(() => {
    if (dateRange.length > 0 && !selectedDate) {
      setSelectedDate(dateRange[0]);
    } else if (dateRange.length === 0 && !selectedDate) {
      setSelectedDate(new Date().toISOString().split('T')[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  // 選択日の予定を時刻順に並べる
  const filteredItems = useMemo(() => {
    if (!selectedDate) return [];
    let list = items.filter(i => i.date === selectedDate);

    if (viewMode === 'individual' && selectedMemberId) {
      // 個人表示：全体(participantId undefined) + 自分専用
      list = list.filter(i => !i.participantId || i.participantId === selectedMemberId);
    } else if (viewMode === 'overall') {
      // 全体表示：全体(participantId undefined) + 表示設定された個人予定
      list = list.filter(i => !i.participantId || visibleMemberIds.includes(i.participantId));
    }

    return list.sort((a, b) => a.time.localeCompare(b.time));
  }, [items, selectedDate, viewMode, selectedMemberId]);

  // 空き時間計算
  const gaps = useMemo(() => {
    const res: Record<string, string> = {};
    for (let i = 0; i < filteredItems.length - 1; i++) {
      const cur = filteredItems[i];
      const next = filteredItems[i + 1];

      const curEnd = cur.endTime || cur.time;
      const [h1, m1] = curEnd.split(':').map(Number);
      const [h2, m2] = next.time.split(':').map(Number);

      const diffMin = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (diffMin > 0) {
        const h = Math.floor(diffMin / 60);
        const m = diffMin % 60;
        res[cur.id] = h > 0 ? `${h}時間${m}分` : `${m}分`;
      }
    }
    return res;
  }, [filteredItems]);

  const handleOpenAdd = () => {
    // 現在時刻をデフォルト（HH:MM形式）
    const now = new Date();
    const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setFormData({ type: 'activity', date: selectedDate, time: defaultTime });
    setValidationError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ItineraryItem) => {
    setFormData({ ...item });
    setValidationError('');
    setIsModalOpen(true);
  };

  // フォーム保存：バリデーションを弱めにして保存しやすく
  // フォーム保存：バリデーションを弱めにして保存しやすく
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault(); // formタグがなくても念のため

    if (!formData.title?.trim()) {
      setValidationError('タイトルを入力してください');
      return;
    }

    try {
      // time が空なら現在時刻をセット
      const time = formData.time || (() => {
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      })();

      const now = new Date().toISOString();
      const itemToSave: ItineraryItem = {
        ...formData,
        id: formData.id || crypto.randomUUID(),
        title: (formData.title || '').trim(),
        date: formData.date || selectedDate,
        time,
        type: formData.type || 'activity',
        links: formData.links || [],
        updatedAt: now,
      } as ItineraryItem;

      onSave(itemToSave);
      setIsModalOpen(false);
      setFormData({ type: 'activity', date: selectedDate, links: [] });
      setValidationError('');
    } catch (err) {
      console.error(err);
      alert('保存中にエラーが発生しました');
    }
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('この予定を削除しますか？')) {
      onDelete(id);
    }
  };

  // 写真ファイルをCanvasでリサイズ・圧縮してformDataにセット
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const maxSize = 800; // 長辺を800pxに制限
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        // JPEG 75% 圧縮で品質と容量のバランスをとる
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        setFormData(prev => ({ ...prev, imageUrl: dataUrl }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // URL入力後にOGPを自動取得（0.8秒のデバウンス）
  useEffect(() => {
    const url = formData.link;
    if (!url || !url.startsWith('http') || formData.imageUrl) return; // 既に画像あれば取得しない

    const timer = setTimeout(async () => {
      setIsFetchingOgp(true);
      try {
        const ogp = await fetchOgpData(url);
        if (ogp.image) {
          setFormData(prev => ({ ...prev, imageUrl: ogp.image }));
        }
      } finally {
        setIsFetchingOgp(false);
      }
    }, 800);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.link]);

  // 日付タブのラベル生成
  const getDayLabel = (dateStr: string, index: number) => {
    const d = new Date(dateStr);
    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
    return {
      day: `DAY ${index + 1}`,
      date: `${d.getDate()}`,
      week: weekDays[d.getDay()],
    };
  };

  if (!tripStartDate) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
        <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mb-4 text-3xl">🗓️</div>
        <h3 className="text-xl font-bold text-ink mb-2">旅行の計画を始めましょう</h3>
        <p className="text-ink-sub text-sm mb-6">Homeタブで旅行の日程を設定してください。</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pt-2">
      <div className="flex justify-between items-center px-4 mb-4">
        <h2 className="text-xl font-sans font-bold tracking-wide text-ink">スケジュール</h2>
        <button
          onClick={handleOpenAdd}
          className="text-[10px] font-bold text-primary uppercase tracking-widest border border-primary/40 px-3 py-1.5 rounded-full hover:bg-primary hover:text-white transition-colors"
        >
          + 予定を追加
        </button>
      </div>

      {/* メンバー選択（階層ナビゲーション） */}
      <div className="px-4 mb-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 min-w-min">
          <button
            onClick={() => { setViewMode('overall'); setSelectedMemberId(null); }}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all border ${viewMode === 'overall' ? 'bg-ink text-white border-ink' : 'bg-white text-ink-light border-surface-gray-mid'}`}
          >
            🌎 全体
          </button>
          {userProfiles.map(profile => {
            const isVisible = viewMode === 'overall' ? visibleMemberIds.includes(profile.id) : selectedMemberId === profile.id;
            return (
              <button
                key={profile.id}
                onClick={() => {
                  if (viewMode === 'overall') {
                    setVisibleMemberIds(prev =>
                      prev.includes(profile.id) ? prev.filter(id => id !== profile.id) : [...prev, profile.id]
                    );
                  } else {
                    setSelectedMemberId(profile.id);
                  }
                }}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 ${isVisible ? 'text-white border-transparent' : 'bg-white text-ink-light border-surface-gray-mid'}`}
                style={isVisible ? { backgroundColor: profile.color } : {}}
              >
                <div className="w-4 h-4 rounded-full overflow-hidden bg-white/20 flex items-center justify-center">
                  {profile.avatarUrl ? <img src={profile.avatarUrl} className="w-full h-full object-cover" /> : <span>👤</span>}
                </div>
                {profile.displayName}
                {viewMode === 'overall' && (
                  <div className={`ml-1 w-3 h-3 rounded-sm border border-white/30 flex items-center justify-center ${isVisible ? 'bg-white/20' : 'bg-transparent'}`}>
                    {isVisible && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 日付タブ */}
      <div className="overflow-x-auto scrollbar-hide mb-2 px-4">
        <div className="flex gap-3 pb-2 min-w-min">
          {dateRange.map((d, i) => {
            const label = getDayLabel(d, i);
            const isSelected = selectedDate === d;
            return (
              <button
                key={d}
                onClick={() => setSelectedDate(d)}
                className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-2xl border transition-all ${isSelected
                  ? 'bg-primary border-primary shadow-md transform scale-105'
                  : 'bg-surface-gray border-surface-gray-mid text-ink-light'
                  }`}
              >
                <span className={`text-[9px] font-bold uppercase tracking-wider mb-1 ${isSelected ? 'text-white' : 'text-ink-light'}`}>{label.day}</span>
                <span className={`text-lg font-bold leading-none ${isSelected ? 'text-white' : 'text-ink'}`}>{label.date}</span>
                <span className={`text-[10px] font-bold ${isSelected ? 'text-white/80' : 'text-ink-light'}`}>{label.week}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* タイムライン表示 */}
      <div className="flex-1 overflow-y-auto px-4 pb-20 relative">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-40">
            <p className="text-sm">予定はありません</p>
          </div>
        ) : (
          <div className="relative">
            {/* タイムライン縦線 */}
            <div className="absolute left-[54px] top-4 bottom-0 w-[2px] bg-surface-gray-mid"></div>

            {filteredItems.map((item) => {
              const typeInfo = getTypeInfo(item.type);
              return (
                <div key={item.id} className="flex gap-4 mb-6 relative group">
                  {/* 時刻 */}
                  <div className="w-12 text-right pt-1 flex-shrink-0">
                    <span className="text-sm font-bold text-ink block">{item.time}</span>
                    {item.endTime && <span className="text-[10px] text-ink-light block whitespace-nowrap">～{item.endTime}</span>}
                  </div>

                  {/* ドット */}
                  <div className="relative z-10 pt-2 flex-shrink-0 flex flex-col items-center">
                    <div className="w-3 h-3 bg-accent rounded-full ring-4 ring-white min-h-[12px]"></div>
                    {gaps[item.id] && (
                      <div className="absolute top-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-0">
                        <div className="w-[1px] h-10 border-l border-dashed border-ink-light/30"></div>
                        <div className="bg-white border border-surface-gray-mid rounded-full px-2 py-0.5 text-[8px] font-bold text-ink-light whitespace-nowrap shadow-sm">
                          ⏳ {gaps[item.id]}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* カード */}
                  <div className="flex-1 min-w-0">
                    <div
                      onClick={() => handleOpenEdit(item)}
                      className="bg-white rounded-xl border border-surface-gray-mid hover:border-primary/30 hover:shadow-sm transition-all relative cursor-pointer active:scale-[0.98] overflow-hidden"
                    >
                      {/* 個人カラーインジケーター */}
                      {item.participantId && (
                        <div
                          className="absolute left-0 top-0 bottom-0 w-1 z-30"
                          style={{ backgroundColor: userProfiles.find(u => u.id === item.participantId)?.color }}
                        />
                      )}

                      {/* OGP/アップロード画像サムネイル */}
                      {item.imageUrl && (
                        <div className="w-full h-28 overflow-hidden bg-surface-gray">
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        </div>
                      )}

                      <div className="p-4">
                        {/* 削除ボタン */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(item.id);
                          }}
                          className="absolute top-1 right-1 w-10 h-10 flex items-center justify-center text-ink-light hover:text-rose-500 rounded-full hover:bg-surface-gray transition-colors z-40"
                        >
                          <span className="text-lg leading-none">×</span>
                        </button>

                        <div className="flex items-start gap-2 mb-2 pr-8">
                          <span className="text-xl">{typeInfo.icon}</span>
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-primary uppercase tracking-wider block mb-0.5">{typeInfo.label}</span>
                            <h3 className="text-base font-bold text-ink leading-tight truncate">{item.title}</h3>
                          </div>
                        </div>

                        {item.location && (
                          <div className="flex items-center gap-1.5 mb-2 text-ink-sub">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-xs truncate">{item.location}</span>
                          </div>
                        )}

                        {item.memo && (
                          <div
                            onClick={(e) => { e.stopPropagation(); setShowMemoId(showMemoId === item.id ? null : item.id); }}
                            className="text-xs text-ink-sub bg-surface-gray p-2 rounded-lg mb-2 relative group-item"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold text-ink-light">MEMO</span>
                              <span className="text-[10px]">{showMemoId === item.id ? '🔼' : '🔽'}</span>
                            </div>
                            {showMemoId === item.id ? (
                              <p className="whitespace-pre-wrap">{item.memo}</p>
                            ) : (
                              <p className="truncate italic">タップして内容を表示...</p>
                            )}
                          </div>
                        )}

                        {(item.link || (item.links && item.links.length > 0)) && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {item.link && (
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2 bg-primary-light hover:bg-primary/20 rounded-lg text-xs font-bold text-primary transition-colors relative z-20"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span>🔗 Link</span>
                              </a>
                            )}
                            {item.links?.map((lnk, idx) => (
                              <a
                                key={idx}
                                href={lnk.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2 bg-ocean-light hover:bg-ocean-dark/20 rounded-lg text-xs font-bold text-ocean-dark transition-colors relative z-20"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span>🔗 {lnk.label || 'Link'}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 予定追加/編集モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-primary/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div
            className="bg-white w-full max-w-sm rounded-[24px] p-5 border border-surface-gray-mid shadow-xl overflow-y-auto max-h-[88vh] pb-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-sans font-bold mb-4 text-ink">
              {formData.id ? '予定を編集' : '予定を追加'}
            </h3>

            <div className="space-y-4">
              {/* タイトル */}
              <div>
                <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">タイトル *</label>
                <input
                  type="text"
                  placeholder="例: 浅草寺を観光"
                  className="w-full bg-surface-gray border border-surface-gray-mid rounded-xl p-3 text-sm text-ink outline-none focus:border-primary"
                  value={formData.title || ''}
                  onChange={e => { setFormData({ ...formData, title: e.target.value }); setValidationError(''); }}
                />
                {validationError && (
                  <p className="text-xs text-rose-500 mt-1">{validationError}</p>
                )}
              </div>

              {/* 誰の予定か */}
              <div>
                <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">担当メンバー</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, participantId: undefined })}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${!formData.participantId ? 'bg-ink text-white border-ink' : 'bg-surface-gray text-ink-light border-surface-gray-mid'}`}
                  >
                    🌎 全員
                  </button>
                  {userProfiles.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, participantId: p.id })}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${formData.participantId === p.id ? 'text-white border-transparent' : 'bg-surface-gray text-ink-light border-surface-gray-mid'}`}
                      style={formData.participantId === p.id ? { backgroundColor: p.color } : {}}
                    >
                      {p.displayName}
                    </button>
                  ))}
                </div>
              </div>

              {/* 日付 + 時間 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">日付</label>
                  <input
                    type="date"
                    className="w-full bg-surface-gray border border-surface-gray-mid rounded-xl p-2.5 text-sm text-ink outline-none"
                    value={formData.date || ''}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">開始時間</label>
                  <input
                    type="time"
                    className="w-full bg-surface-gray border border-surface-gray-mid rounded-xl p-2.5 text-sm text-ink outline-none"
                    value={formData.time || ''}
                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">終了時間</label>
                  <input
                    type="time"
                    className="w-full bg-surface-gray border border-surface-gray-mid rounded-xl p-2.5 text-sm text-ink outline-none"
                    value={formData.endTime || ''}
                    onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                  />
                </div>
              </div>

              {/* 種類 - selectに変更 */}
              <div>
                <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">種類</label>
                <select
                  className="w-full bg-surface-gray border border-surface-gray-mid rounded-xl p-3 text-sm text-ink outline-none appearance-none"
                  value={formData.type || 'activity'}
                  onChange={e => setFormData({ ...formData, type: e.target.value as ItineraryItem['type'] })}
                >
                  {ITEM_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                  ))}
                </select>
              </div>

              {/* 場所名 */}
              <div>
                <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">場所名</label>
                <input
                  type="text"
                  placeholder="例: 浅草寺、新宿駅"
                  className="w-full bg-surface-gray border border-surface-gray-mid rounded-xl p-3 text-sm text-ink outline-none"
                  value={formData.location || ''}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              {/* Links (複数対応) */}
              <div>
                <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">
                  関連リンク
                </label>
                <div className="space-y-2">
                  {formData.links?.map((lnk, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="ラベル (例: Web)"
                        className="w-20 bg-surface-gray border border-surface-gray-mid rounded-lg p-2 text-xs text-ink outline-none"
                        value={lnk.label}
                        onChange={e => {
                          const newLinks = [...(formData.links || [])];
                          newLinks[i].label = e.target.value;
                          setFormData({ ...formData, links: newLinks });
                        }}
                      />
                      <input
                        type="url"
                        placeholder="https://..."
                        className="flex-1 bg-surface-gray border border-surface-gray-mid rounded-lg p-2 text-xs text-ink outline-none"
                        value={lnk.url}
                        onChange={e => {
                          const newLinks = [...(formData.links || [])];
                          newLinks[i].url = e.target.value;
                          setFormData({ ...formData, links: newLinks });
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, links: formData.links?.filter((_, idx) => idx !== i) });
                        }}
                        className="text-rose-500 font-bold px-2"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, links: [...(formData.links || []), { label: '', url: '' }] })}
                    className="w-full py-2 border-2 border-dashed border-surface-gray-mid rounded-xl text-[10px] font-bold text-ink-light hover:border-primary/40 hover:text-primary transition-all"
                  >
                    + リンクを追加
                  </button>
                </div>
              </div>

              {/* 画像アップロード／OGP取得プレビュー */}
              <div>
                <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">写真</label>
                {formData.imageUrl ? (
                  <div className="relative w-full h-32 rounded-xl overflow-hidden bg-surface-gray border border-surface-gray-mid">
                    <img
                      src={formData.imageUrl}
                      alt="プレビュー"
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, imageUrl: undefined })}
                      className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold hover:bg-black/70"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="w-full h-20 border-2 border-dashed border-surface-gray-mid rounded-xl flex flex-col items-center justify-center gap-1 text-ink-light hover:border-primary/40 hover:text-primary transition-colors"
                  >
                    <span className="text-2xl">📷</span>
                    <span className="text-xs">タップして写真を追加</span>
                  </button>
                )}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>

              {/* メモ */}
              <div>
                <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">メモ</label>
                <textarea
                  rows={2}
                  placeholder="自由にメモ..."
                  className="w-full bg-surface-gray border border-surface-gray-mid rounded-xl p-3 text-sm text-ink outline-none resize-none"
                  value={formData.memo || ''}
                  onChange={e => setFormData({ ...formData, memo: e.target.value })}
                />
              </div>

              {/* ボタン */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setValidationError(''); }}
                  className="flex-1 py-3 rounded-xl text-xs font-bold text-ink-sub hover:bg-surface-gray border border-surface-gray-mid transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleSubmit(); }}
                  className="flex-1 py-3 rounded-xl bg-primary text-white text-xs font-bold shadow-lg hover:bg-primary/90 active:scale-95 transition-all"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItineraryView;
