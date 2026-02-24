
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ItineraryItem, UserProfile, Participant } from '../types';
import { fetchOgpData } from '../services/ogpService';
import { MEMBER_COLORS } from '../constants';
import { fetchWeather, WeatherData, searchLocation } from '../services/weatherService';
import { WeatherIcon } from './WeatherIcon';
import { AppIcon, type IconName } from './AppIcon';
import { escapeHtml } from '../utils/security';

// 予定種類の定義（ラベル + アイコン）
const ITEM_TYPES: { value: ItineraryItem['type']; label: string; icon: string }[] = [
  { value: 'activity', label: 'アクティビティ', icon: '🎾' },
  { value: 'sightseeing', label: '観光・スポット', icon: '📸' },
  { value: 'meal', label: '食事・カフェ', icon: '🍴' },
  { value: 'shopping', label: 'ショッピング', icon: '🛍️' },
  { value: 'move', label: '移動・交通', icon: '✈️' },
  { value: 'stay', label: '宿泊', icon: '🏨' },
  { value: 'other', label: 'その他', icon: '✨' },
];

const TYPE_IMAGES: Record<string, string> = {
  activity: 'https://images.unsplash.com/photo-1540206276207-39257e7aade0?q=80&w=800&auto=format&fit=crop',
  sightseeing: 'https://images.unsplash.com/photo-1542931287-023b922fa89b?q=80&w=800&auto=format&fit=crop',
  meal: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=800&auto=format&fit=crop',
  shopping: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=800&auto=format&fit=crop',
  move: 'https://images.unsplash.com/photo-1436491865332-7a61a109c0f3?q=80&w=800&auto=format&fit=crop',
  stay: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=800&auto=format&fit=crop',
  other: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=800&auto=format&fit=crop',
};

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
  const [isCopying, setIsCopying] = useState(false);
  const [isFetchingOgp, setIsFetchingOgp] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
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

  // 天気情報の取得
  useEffect(() => {
    const loadWeather = async () => {
      try {
        // 全日程の代表的な場所を特定（最初に見つかった場所）
        const destination = items.find(i => i.location)?.location;
        if (!destination) return;

        const loc = await searchLocation(destination);
        if (loc) {
          const weather = await fetchWeather(loc.latitude, loc.longitude);
          setWeatherData(weather);
        }
      } catch (e) {
        console.error('Weather sync failed:', e);
      }
    };
    loadWeather();
  }, [items, tripStartDate]); // 加えて旅行開始日が設定された時も実行

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
  }, [items, selectedDate, viewMode, selectedMemberId, visibleMemberIds]);

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

  const handleCopySchedule = () => {
    if (filteredItems.length === 0) return;

    const date = new Date(selectedDate);
    const dateStr = `${date.getMonth() + 1}/${date.getDate()}(${['日', '月', '火', '水', '木', '金', '土'][date.getDay()]})`;

    let text = `【${dateStr}の予定】\n`;
    filteredItems.forEach(item => {
      text += `\n⏰ ${item.time}${item.endTime ? `～${item.endTime}` : ''}\n📍 ${item.title}`;
      if (item.location) text += ` @ ${item.location}`;
      if (item.memo) text += `\n📝 ${item.memo}`;

      // リンク情報の追加
      if (item.mapUrl) {
        text += `\n📍 マップ🔗: ${item.mapUrl}`;
      }
      if (item.link) {
        text += `\n🔗 リンク: ${item.link}`;
      }
      if (item.links && item.links.length > 0) {
        item.links.forEach(lnk => {
          const label = lnk.label || '関連リンク';
          text += `\n[${label}]🔗: ${lnk.url}`;
        });
      }
      text += `\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      setIsCopying(true);
      setTimeout(() => setIsCopying(false), 2000);
    });
  };

  // URL入力後にOGPを自動取得（0.8秒のデバウンス）
  useEffect(() => {
    // 優先順位: 1.mapUrl > 2.link > 3.links[0]
    const url = formData.mapUrl || formData.link || (formData.links && formData.links.length > 0 ? formData.links[0].url : '');

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
  }, [formData.mapUrl, formData.link, formData.links]);

  // 日付タブのラベル生成
  const getDayLabel = (dateStr: string, index: number) => {
    const d = new Date(dateStr);
    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
    return {
      day: `${index + 1}日目`,
      date: `${d.getDate()}`,
      week: weekDays[d.getDay()],
    };
  };

  if (!tripStartDate) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
        <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mb-4">
          <AppIcon name="itinerary" className="w-10 h-10 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-ink mb-2">旅行の計画を始めましょう</h3>
        <p className="text-ink-sub text-sm mb-6">Homeタブで旅行の日程を設定してください。</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pt-2">
      <div className="flex justify-between items-center px-4 mb-4">
        <h2 className="text-xl font-sans font-bold tracking-wide text-ink">スケジュール</h2>
        <div className="flex gap-2">
          {filteredItems.length > 0 && (
            <button
              onClick={handleCopySchedule}
              className={`text-[10px] font-bold uppercase tracking-widest border px-3 py-1.5 rounded-full transition-all ${isCopying ? 'bg-emerald-500 border-emerald-500 text-white' : 'text-emerald-600 border-emerald-600/40 hover:bg-emerald-50'}`}
            >
              {isCopying ? '✅ Copied' : '📝 予定をコピー'}
            </button>
          )}
          <button
            onClick={handleOpenAdd}
            className="text-[10px] font-bold text-primary uppercase tracking-widest border border-primary/40 px-3 py-1.5 rounded-full hover:bg-primary hover:text-white transition-colors"
          >
            + 予定を追加
          </button>
        </div>
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
      <div className="overflow-x-auto scrollbar-hide mb-2 px-4 pt-4">
        <div className="flex gap-3 pb-2 min-w-min">
          {dateRange.map((d, i) => {
            const label = getDayLabel(d, i);
            const isSelected = selectedDate === d;
            const isToday = d === new Date().toISOString().split('T')[0];
            return (
              <button
                key={d}
                onClick={() => setSelectedDate(d)}
                className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-24 rounded-2xl border transition-all relative ${isSelected
                  ? 'bg-primary border-primary shadow-md transform scale-105'
                  : 'bg-surface-gray border-surface-gray-mid text-ink-light'
                  }`}
              >
                {isToday && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full shadow-sm z-10 animate-pulse whitespace-nowrap">
                    TODAY
                  </span>
                )}
                <span className={`text-[9px] font-bold uppercase tracking-wider mb-1 ${isSelected ? 'text-white' : 'text-ink-light'}`}>{label.day}</span>
                <span className={`text-lg font-bold leading-none ${isSelected ? 'text-white' : 'text-ink'}`}>{label.date}</span>
                <span className={`text-[10px] font-bold ${isSelected ? 'text-white/80' : 'text-ink-light'} mb-1`}>{label.week}</span>

                {/* 日付タブ内の天気アイコン */}
                {weatherData.find(w => w.date === d) && (
                  <div className="mt-1">
                    <WeatherIcon code={weatherData.find(w => w.date === d)!.weatherCode} className="w-5 h-5" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 今日の天気サマリー (7日以内) */}
      {selectedDate && weatherData.length > 0 && (() => {
        const dayWeather = weatherData.find(w => w.date === selectedDate);
        if (!dayWeather) return null;
        return (
          <div className="px-4 mb-4">
            return (
            <div className="px-4 mb-4">
              <div className="bg-white/50 backdrop-blur-sm border border-white/60 rounded-2xl p-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <WeatherIcon code={dayWeather.weatherCode} className="w-8 h-8" />
                  <div>
                    <p className="text-[8px] font-bold text-ink-sub uppercase tracking-widest">Forecast</p>
                    <p className="text-[10px] font-bold text-ink">今日の予報</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-ink">{dayWeather.tempMax}° / {dayWeather.tempMin}°</p>
                  <p className="text-[8px] font-bold text-ink-light uppercase">Celsius</p>
                </div>
              </div>
            </div>
            );
          </div>
        );
      })()}

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

            {filteredItems.map((item, idx) => {
              const typeInfo = getTypeInfo(item.type);
              const now = new Date();
              const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
              const isToday = selectedDate === now.toISOString().split('T')[0];

              // 次の予定判定: 今日かつ、まだ始まっていない最初の予定
              const isNext = isToday && item.time > currentTimeStr && (idx === 0 || filteredItems[idx - 1].time <= currentTimeStr);

              return (
                <React.Fragment key={item.id}>
                  <div className="flex gap-4 mb-6 relative group">
                    {/* 時刻 */}
                    <div className="w-12 text-right pt-1 flex-shrink-0">
                      <span className="text-sm font-bold text-ink block">{item.time}</span>
                      {item.endTime && <span className="text-[10px] text-ink-light block whitespace-nowrap">～{item.endTime}</span>}
                    </div>

                    {/* ドット */}
                    <div className="relative z-10 pt-2 flex-shrink-0 flex flex-col items-center">
                      <div className="w-3 h-3 bg-accent rounded-full ring-4 ring-white min-h-[12px]"></div>
                    </div>

                    {/* カード */}
                    <div className="flex-1 min-w-0">
                      <div
                        onClick={() => handleOpenEdit(item)}
                        className="bg-white rounded-xl border border-surface-gray-mid hover:border-primary/30 hover:shadow-sm transition-all relative cursor-pointer active:scale-[0.98] overflow-hidden"
                      >
                        {/* 既存の予定カードの内容 (中略) */}
                        {/* 個人カラーインジケーター */}
                        {item.participantId && (
                          <div
                            className="absolute left-0 top-0 bottom-0 w-1 z-30"
                            style={{ backgroundColor: userProfiles.find(u => u.id === item.participantId)?.color }}
                          />
                        )}

                        {/* OGP/タイプ別テンプレート画像 */}
                        {(item.imageUrl || TYPE_IMAGES[item.type]) && (
                          <div className="w-full h-28 overflow-hidden bg-surface-gray-mid/30 relative">
                            <img
                              src={item.imageUrl || TYPE_IMAGES[item.type]}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const img = e.target as HTMLImageElement;
                                if (item.imageUrl && img.src === item.imageUrl) {
                                  img.src = TYPE_IMAGES[item.type];
                                } else {
                                  (img.parentElement as HTMLElement).style.display = 'none';
                                }
                              }}
                            />
                            <div className="absolute inset-0 bg-surface-gray-mid/10 -z-10"></div>
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
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">{typeInfo.label}</span>
                                {isNext && (
                                  <span className="bg-emerald-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full animate-pulse shadow-sm shadow-emerald-500/20">
                                    NEXT
                                  </span>
                                )}
                              </div>
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
                            <div className="text-xs text-ink-sub bg-surface-gray p-3 rounded-lg mb-2 relative">
                              <div className="flex items-center justify-between mb-1.5 border-b border-surface-gray-mid/50 pb-1">
                                <span className="text-[10px] font-bold text-ink-light tracking-widest">MEMO</span>
                              </div>
                              <p className="whitespace-pre-wrap leading-relaxed">{item.memo}</p>
                            </div>
                          )}

                          {(item.mapUrl || item.link || (item.links && item.links.length > 0)) && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {item.mapUrl && (
                                <a
                                  href={item.mapUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2 bg-rose-50 hover:bg-rose-100 rounded-lg text-xs font-bold text-rose-600 transition-colors relative z-20 border border-rose-200"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span>📍 マップ</span>
                                </a>
                              )}
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
                                  <span>{lnk.label || 'Link'} 🔗</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 空き時間カード */}
                  {gaps[item.id] && (
                    <div className="flex gap-4 mb-6 relative">
                      <div className="w-12 flex-shrink-0"></div>
                      <div className="relative z-0 flex-shrink-0 flex items-center justify-center">
                        <div className="w-[2px] h-full bg-surface-gray-mid absolute left-1/2 -translate-x-1/2 -top-6 -bottom-6"></div>
                      </div>
                      <div className="flex-1">
                        <div className="bg-ocean-light/10 border-2 border-dashed border-ocean-light/30 rounded-2xl p-4 flex items-center justify-center gap-3 animate-in fade-in duration-500">
                          <span className="text-xl">🕑</span>
                          <div className="text-center">
                            <p className="text-[10px] font-bold text-ocean-dark/60 uppercase tracking-widest mb-0.5">Idle Time</p>
                            <p className="text-sm font-bold text-ocean-dark">
                              空き時間 {gaps[item.id]}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </React.Fragment>
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
                    <AppIcon name="globe" className="w-3 h-3 inline-block mr-1" /> 全員
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
                <div className="flex flex-wrap gap-2 mt-1">
                  {ITEM_TYPES.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: type.value })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${formData.type === type.value ? 'bg-primary text-white border-primary' : 'bg-surface-gray text-ink-light border-surface-gray-mid'}`}
                    >
                      <AppIcon name={type.icon} className="w-3 h-3" /> {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 場所名 + Googleマップ */}
              <div className="grid grid-cols-1 gap-3">
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
                <div>
                  <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest text-rose-500">
                    <AppIcon name="map" className="w-3 h-3 inline-block mr-1" /> GoogleマップURL
                  </label>
                  <input
                    type="url"
                    placeholder="https://maps.app.goo.gl/..."
                    className="w-full bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-ink outline-none focus:border-rose-400"
                    value={formData.mapUrl || ''}
                    onChange={e => setFormData({ ...formData, mapUrl: e.target.value })}
                  />
                </div>
              </div>

              {/* Links (複数対応) */}
              <div>
                <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">
                  <AppIcon name="link" className="w-3 h-3 inline-block mr-1" /> 関連リンク
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
                        <AppIcon name="close" className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, links: [...(formData.links || []), { label: '', url: '' }] })}
                    className="w-full py-2 border-2 border-dashed border-surface-gray-mid rounded-xl text-[10px] font-bold text-ink-light hover:border-primary/40 hover:text-primary transition-all"
                  >
                    <AppIcon name="plus" className="w-3 h-3 inline-block mr-1" /> リンクを追加
                  </button>
                </div>
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
