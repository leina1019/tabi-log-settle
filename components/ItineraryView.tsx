
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ItineraryItem, UserProfile } from '../types';
import { fetchOgpData } from '../services/ogpService';
import { fetchWeather, WeatherData, searchLocation } from '../services/weatherService';
import { WeatherIcon } from './WeatherIcon';
import { AppIcon } from './AppIcon';
import { useTripDates } from '../hooks/useTripDates';
import { useMemberFilter } from '../hooks/useMemberFilter';
import { useTranslation } from '../contexts/LanguageContext';
import { resizeImage } from '../utils/imageUtils';
import { getLocalDateString, getCurrentTimeStr } from '../utils/dateUtils';

// 予定種類の定義（ラベル + アイコン）
const ITEM_TYPES: { value: ItineraryItem['type']; labelKey: string; icon: string }[] = [
  { value: 'activity', labelKey: 'itinerary.type_activity', icon: '🎾' },
  { value: 'sightseeing', labelKey: 'itinerary.type_sightseeing', icon: '📸' },
  { value: 'meal', labelKey: 'itinerary.type_meal', icon: '🍴' },
  { value: 'shopping', labelKey: 'itinerary.type_shopping', icon: '🛍️' },
  { value: 'move', labelKey: 'itinerary.type_move', icon: '✈️' },
  { value: 'stay', labelKey: 'itinerary.type_stay', icon: '🏨' },
  { value: 'other', labelKey: 'itinerary.type_other', icon: '✨' },
];

// カテゴリ別サンプル画像（AI生成、ローカル配置）
// OGP取得失敗時のフォールバックとして使用
const TYPE_IMAGES: Record<string, string> = {
  activity: '/images/categories/activity.png',
  sightseeing: '/images/categories/sightseeing.png',
  meal: '/images/categories/meal.png',
  shopping: '/images/categories/shopping.png',
  move: '/images/categories/move.png',
  stay: '/images/categories/stay.png',
  other: '/images/categories/other.png',
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
  autoOpenAdd?: boolean;
}

const ItineraryView: React.FC<Props> = ({ items, userProfiles, onSave, onDelete, tripStartDate, tripEndDate, autoOpenAdd }) => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { selectedDate, setSelectedDate, dateRange, getDayLabel, isTodayDate } = useTripDates(tripStartDate, tripEndDate);
  const { showOverall, setShowOverall, visibleMemberIds, setVisibleMemberIds } = useMemberFilter(userProfiles);
  const [formData, setFormData] = useState<Partial<ItineraryItem>>({ type: 'activity', links: [] });
  const [isCopying, setIsCopying] = useState(false);
  const [isFetchingOgp, setIsFetchingOgp] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // A3: destinationをメモ化して、場所が変わったときだけ天気APIを叩く
  const destination = useMemo(() => items.find(i => i.location)?.location || '', [items]);


  // 直接追加フォームを開く処理
  useEffect(() => {
    if (autoOpenAdd) {
      setFormData({
        type: 'activity',
        date: selectedDate || (dateRange[0] || getLocalDateString()),
        time: getCurrentTimeStr(),
        links: [],
        participantIds: [] // デフォルトは全員(空)
      });
      setIsModalOpen(true);
    }
  }, [autoOpenAdd, selectedDate, dateRange]);

  // A3: 天気情報の取得 - destination (場所名) が変わったときだけAPIを叩く
  useEffect(() => {
    const loadWeather = async () => {
      try {
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
  }, [destination, tripStartDate]); // 場所名か旅行開始日が変わったときだけ実行

  // 選択日の予定を時刻順に並べる
  const filteredItems = useMemo(() => {
    if (!selectedDate) return [];

    // 1. 日付で絞り込み
    let list = items.filter(i => i.date === selectedDate);

    // 2. 「全体」と「個人のスケジュール」表示設定で絞り込み
    list = list.filter(i => {
      if (showOverall) return true; // 全員表示モードなら全て出す

      // 個人表示モード（showOverall=false）の場合
      const pIds = i.participantIds || (i.participantId ? [i.participantId] : []);
      // 選択されているメンバーのいずれかが含まれているか、または予定が「全員向け(pIdsが空)」の場合は表示
      if (pIds.length === 0) return true;
      return pIds.some(id => visibleMemberIds.includes(id));
    });

    return list.sort((a, b) => a.time.localeCompare(b.time));
  }, [items, selectedDate, showOverall, visibleMemberIds]);

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
        res[cur.id] = h > 0 ? `${h}${t('common.time_h') || '時間'}${m}${t('common.time_m') || '分'}` : `${m}${t('common.time_m') || '分'}`;
      }
    }
    return res;
  }, [filteredItems, t]);

  const handleOpenAdd = () => {
    setFormData({ type: 'activity', date: selectedDate, time: getCurrentTimeStr() });
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
      setValidationError(t('itinerary.errTitle'));
      return;
    }

    try {
      const nowStr = new Date().toISOString();
      const itemToSave: ItineraryItem = {
        ...formData,
        id: formData.id || crypto.randomUUID(),
        title: (formData.title || '').trim(),
        date: formData.date || selectedDate,
        time: formData.time || getCurrentTimeStr(),
        type: formData.type || 'activity',
        links: formData.links || [],
        updatedAt: nowStr,
      } as ItineraryItem;

      onSave(itemToSave);
      setIsModalOpen(false);
      setFormData({ type: 'activity', date: selectedDate, links: [] });
      setValidationError('');
    } catch (err) {
      console.error(err);
      alert(t('common.saveError'));
    }
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm(t('common.confirmDelete'))) {
      onDelete(id);
    }
  };

  // 写真ファイルをCanvasでリサイズ・圧縮してformDataにセット
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await resizeImage(file);
      setFormData(prev => ({ ...prev, imageUrl: dataUrl }));
    } catch (err) {
      console.error('Image processing failed:', err);
      alert(t('common.imageProcessError'));
    }
  };

  const handleCopySchedule = () => {
    if (filteredItems.length === 0) return;

    const date = new Date(selectedDate);
    const dayNames = t('common.daysShort') ? t('common.daysShort').split(',') : ['日', '月', '火', '水', '木', '金', '土'];
    const dateStr = `${date.getMonth() + 1}/${date.getDate()}(${dayNames[date.getDay()]})`;

    let text = t('itinerary.copyFormatTitle', { date: dateStr }) || `【${dateStr}の予定】\n`;
    filteredItems.forEach(item => {
      text += `\n⏰ ${item.time}${item.endTime ? `～${item.endTime}` : ''}\n📍 ${item.title}`;
      if (item.location) text += ` @ ${item.location}`;
      if (item.memo) text += `\n📝 ${item.memo}`;

      // リンク情報の追加
      const effectiveMapUrl = item.mapUrl || (item.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}` : '');
      if (effectiveMapUrl) {
        text += `\n📍 ${t('itinerary.checkMap') || 'マップ'}: ${effectiveMapUrl}`;
      }
      if (item.link) {
        text += `\n🔗 Link: ${item.link}`;
      }
      if (item.links && item.links.length > 0) {
        item.links.forEach(lnk => {
          const label = lnk.label || t('itinerary.relatedLinks') || 'Link';
          text += `\n[${label}]: ${lnk.url}`;
        });
      }
      text += `\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      setIsCopying(true);
      setTimeout(() => setIsCopying(false), 2000);
    });
  };

  // カバー画像の自動取得（0.8秒デバウンス）
  // 優先順位: 関連リンク[0] > link > mapUrl の順でOGP取得
  // チェックボックス廃止 → 常に自動取得（画像がない場合）
  useEffect(() => {
    const url = (formData.links && formData.links.length > 0 ? formData.links[0].url : '') || formData.link || formData.mapUrl;

    if (!url || !url.startsWith('http')) return;

    // すでに画像がある場合はスキップ（ユーザーがアップロードした画像を上書きしない）
    if (formData.imageUrl) return;

    // GoogleマップSearch URLはOGP画像がないのでスキップ
    if (url.includes('google.com/maps/search')) return;

    const timer = setTimeout(async () => {
      setIsFetchingOgp(true);
      try {
        const ogp = await fetchOgpData(url);
        if (ogp && ogp.image) {
          setFormData(prev => ({ ...prev, imageUrl: ogp.image }));
        }
      } catch (err) {
        console.error('OGP fetching failed:', err);
      } finally {
        setIsFetchingOgp(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [formData.mapUrl, formData.link, JSON.stringify(formData.links)]); // JSON.stringify for deep comparison


  if (!tripStartDate) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
        <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mb-4">
          <AppIcon name="itinerary" className="w-10 h-10 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-ink mb-2">{t('itinerary.startPlanning')}</h3>
        <p className="text-ink-sub text-sm mb-6">{t('itinerary.setDatesMsg')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col pt-2">
      <div className="flex justify-between items-center px-4 mb-4">
        <h2 className="text-xl font-sans font-bold tracking-wide text-ink">{t('itinerary.title')}</h2>
        <div className="flex gap-2">
          {filteredItems.length > 0 && (
            <button
              onClick={handleCopySchedule}
              className={`text-[10px] font-bold uppercase tracking-widest border px-3 py-1.5 rounded-full transition-all ${isCopying ? 'bg-emerald-500 border-emerald-500 text-white' : 'text-emerald-600 border-emerald-600/40 hover:bg-emerald-50'}`}
            >
              {isCopying ? t('common.copied') : ('📝 ' + t('itinerary.copySchedule'))}
            </button>
          )}
          <button
            onClick={handleOpenAdd}
            className="text-[10px] font-bold text-primary uppercase tracking-widest border border-primary/40 px-3 py-1.5 rounded-full hover:bg-primary hover:text-white transition-colors"
          >
            {'+ ' + t('itinerary.addSchedule')}
          </button>
        </div>
      </div>

      {/* 画面上部：メンバートグル - チケットセクション統一デザイン */}
      <div className="bg-surface-gray border-b border-surface-gray-mid/50 pt-4 pb-2 px-4 shadow-sm">
        <div className="flex bg-white/80 p-1 rounded-full mb-4 mx-auto w-full max-w-[320px] shadow-sm border border-surface-gray-mid/50">
          <button
            onClick={() => setShowOverall(true)}
            className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-full transition-all duration-500 flex items-center justify-center gap-2.5 ${showOverall ? 'bg-ink text-white shadow-xl shadow-ink/20 scale-[1.02]' : 'bg-transparent text-ink-sub hover:text-ink'}`}
          >
            <span className="text-sm">🌎</span>
            {t('expenseList.all')}
          </button>
          <button
            onClick={() => setShowOverall(false)}
            className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-full transition-all duration-500 flex items-center justify-center gap-2.5 ${!showOverall ? 'bg-ink text-white shadow-xl shadow-ink/20 scale-[1.02]' : 'bg-transparent text-ink-sub hover:text-ink'}`}
          >
            <span className="text-sm">👤</span>
            {t('expenseList.individual')}
          </button>
        </div>

        {/* メンバー選択 */}
        {!showOverall && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-4 mb-1 animate-in fade-in slide-in-from-top-2 duration-500 justify-start sm:justify-center">
            {userProfiles.map(p => (
              <button
                key={p.id}
                onClick={() => {
                  setVisibleMemberIds(prev =>
                    prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                  );
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all border-2 shadow-sm ${visibleMemberIds.includes(p.id) ? 'bg-white border-primary/30 text-ink scale-105' : 'bg-white/40 border-transparent text-ink-light opacity-60 hover:opacity-100'}`}
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

      {/* 日付タブ */}
      <div className="overflow-x-auto scrollbar-hide mb-2 px-4 pt-4">
        <div className="flex gap-3 pb-2 min-w-min">
          {dateRange.map((d, i) => {
            const label = getDayLabel(d, i);
            const isSelected = selectedDate === d;
            const weatherForDate = weatherData.find(w => w.date === d);
            const isToday = isTodayDate(d);

            return (
              <div key={d} className="relative pt-4 pb-2">
                {isToday && (
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 z-20 bg-white px-2 py-0.5 rounded-full shadow-md border border-primary/10">
                    <span className="text-[7px] font-black text-primary tracking-widest whitespace-nowrap">TODAY</span>
                  </div>
                )}
                <button
                  onClick={() => setSelectedDate(d)}
                  className={`flex-shrink-0 flex flex-col items-center justify-center w-20 h-24 rounded-[28px] border transition-all active:scale-95 ${isSelected
                    ? 'bg-primary border-primary shadow-xl shadow-primary/20 scale-105 z-10'
                    : 'bg-white border-surface-gray-mid/50 text-ink-light'
                    }`}
                >
                  <span className={`text-[9px] font-black uppercase tracking-tighter mb-1.5 ${isSelected ? 'text-white/70' : 'text-ink-sub'}`}>
                    {label.day}
                  </span>

                  <span className={`text-2xl font-black leading-none ${isSelected ? 'text-white' : 'text-ink'}`}>
                    {label.date}
                  </span>

                  <div className="flex items-center gap-1 mt-2">
                    {weatherForDate ? (
                      <div className="flex flex-col items-center">
                        <WeatherIcon code={weatherForDate.weatherCode} className="w-5 h-5 text-current" />
                        <span className={`text-[8px] font-bold ${isSelected ? 'text-white/80' : 'text-ink-sub'}`}>
                          {weatherForDate.tempMax}°
                        </span>
                      </div>
                    ) : (
                      <span className={`text-[9px] font-bold ${isSelected ? 'text-white/50' : 'text-ink-sub/40'}`}>
                        {label.week}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* U1: 天気サマリー（英語ラベルを日本語化） */}
      {
        selectedDate && weatherData.length > 0 && (() => {
          const dayWeather = weatherData.find(w => w.date === selectedDate);
          if (!dayWeather) return null;
          return (
            <div className="px-4 mb-4">
              <div className="bg-white/50 backdrop-blur-sm border border-white/60 rounded-2xl p-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <WeatherIcon code={dayWeather.weatherCode} className="w-8 h-8" />
                  <div>
                    <p className="text-[8px] font-bold text-ink-sub uppercase tracking-widest">{t('itinerary.weatherForecast')}</p>
                    <p className="text-[10px] font-bold text-ink">{selectedDate === getLocalDateString() ? t('itinerary.todayForecast') : t('itinerary.dayForecast')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-ink">{dayWeather.tempMax}° / {dayWeather.tempMin}°</p>
                  <p className="text-[8px] font-bold text-ink-light">{t('itinerary.highLowTemp')}</p>
                </div>
              </div>
            </div>
          );
        })()
      }

      {/* 予定表示エリア */}
      <div className="relative">
        {/* U2: 空状態を改善して追加ボタンを目立たせる */}
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">🗓️</span>
            </div>
            <p className="text-sm font-bold text-ink mb-1">{t('itinerary.noSchedule')}</p>
            <p className="text-xs text-ink-light mb-6">{t('itinerary.noScheduleSub')}</p>
            <button
              onClick={handleOpenAdd}
              className="px-6 py-3 bg-primary text-white text-sm font-bold rounded-full shadow-lg shadow-primary/20 active:scale-95 transition-all"
            >
              {'+ ' + t('itinerary.addSchedule')}
            </button>
          </div>
        ) : (
          <div className="relative">
            {/* タイムライン縦線 */}
            <div className="absolute left-[54px] top-4 bottom-0 w-[2px] bg-surface-gray-mid"></div>

            {filteredItems.map((item, idx) => {
              const typeInfo = getTypeInfo(item.type);
              const currentTimeStr = getCurrentTimeStr();
              const isToday = selectedDate === getLocalDateString();

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
                        {/* A5: 複数アバター表示 */}
                        <div className="absolute top-3 left-3 z-30 flex -space-x-2">
                          {(() => {
                            const pIds = item.participantIds || (item.participantId ? [item.participantId] : []);
                            const profiles = userProfiles.filter(p => pIds.includes(p.id));

                            if (profiles.length === 0) {
                              // 全員向け予定
                              return (
                                <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm bg-primary/10 flex items-center justify-center text-[10px]" title="全員">
                                  🌎
                                </div>
                              );
                            }

                            return (
                              <>
                                {profiles.slice(0, 3).map(p => (
                                  <div key={p.id} className="w-8 h-8 rounded-full border-2 border-white shadow-sm overflow-hidden" title={p.displayName} style={{ backgroundColor: p.color }}>
                                    {p.avatarUrl ? <img src={p.avatarUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-white font-black">{p.displayName[0]}</div>}
                                  </div>
                                ))}
                                {profiles.length > 3 && (
                                  <div className="w-8 h-8 rounded-full bg-white border-2 border-white shadow-sm flex items-center justify-center text-[10px] font-black text-ink">
                                    +{profiles.length - 3}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>

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
                                <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">{t(typeInfo.labelKey)}</span>
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

                          {(item.mapUrl || item.location || item.link || (item.links && item.links.length > 0)) && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {(() => {
                                const effectiveMapUrl = item.mapUrl || (item.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}` : '');
                                if (!effectiveMapUrl) return null;
                                return (
                                  <a
                                    href={effectiveMapUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2 bg-rose-50 hover:bg-rose-100 rounded-lg text-xs font-bold text-rose-600 transition-colors relative z-20 border border-rose-200"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span>📍 {t('itinerary.checkMap')}</span>
                                  </a>
                                );
                              })()}
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
                      {/* U1: 空き時間カードの英語ラベルを削除 */}
                      <div className="flex-1">
                        <div className="bg-ocean-light/10 border-2 border-dashed border-ocean-light/30 rounded-2xl p-4 flex items-center justify-center gap-3 animate-in fade-in duration-500">
                          <span className="text-xl">🕑</span>
                          <div className="text-center">
                            <p className="text-sm font-bold text-ocean-dark">
                              {t('itinerary.freeTime')} {gaps[item.id]}
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
      {
        isModalOpen && (
          <div className="fixed inset-0 z-[100] bg-primary/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <div
              className="bg-white w-full max-w-sm rounded-[24px] p-5 border border-surface-gray-mid shadow-xl overflow-y-auto max-h-[88vh] pb-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-sans font-bold mb-4 text-ink">
                {formData.id ? t('itinerary.editSchedule') : t('itinerary.addSchedule')}
              </h3>

              <div className="space-y-4">
                {/* タイトル */}
                <div>
                  <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">{t('common.title')} *</label>
                  <input
                    type="text"
                    placeholder={t('itinerary.titlePlaceholder')}
                    className="w-full bg-surface-gray border border-surface-gray-mid rounded-xl p-3 text-sm text-ink outline-none focus:border-primary"
                    value={formData.title || ''}
                    onChange={e => { setFormData({ ...formData, title: e.target.value }); setValidationError(''); }}
                  />
                  {validationError && (
                    <p className="text-xs text-rose-500 mt-1">{validationError}</p>
                  )}
                </div>

                {/* A5: 複数メンバー選択（チップ形式） */}
                <div className="mb-6">
                  <label className="block text-[11px] font-black text-ink-sub mb-3 uppercase tracking-[0.25em] px-1">{t('itinerary.scheduleMembers')}</label>
                  <div className="flex flex-wrap gap-2.5">
                    {userProfiles.map(p => {
                      const pIds = formData.participantIds || (formData.participantId ? [formData.participantId] : []);
                      const selected = pIds.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            const curr = formData.participantIds || (formData.participantId ? [formData.participantId] : []);
                            const next = curr.includes(p.id) ? curr.filter(id => id !== p.id) : [...curr, p.id];
                            setFormData({ ...formData, participantIds: next, participantId: undefined });
                          }}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[11px] font-black border-2 transition-all active:scale-95 ${selected ? 'text-white border-transparent shadow-lg' : 'bg-surface-gray text-ink-sub border-transparent hover:border-surface-gray-mid'}`}
                          style={selected ? { backgroundColor: p.color, boxShadow: `0 8px 20px ${p.color}44` } : {}}
                        >
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected ? 'bg-white/30 border-white/50' : 'bg-white border-surface-gray-mid'}`}>
                            {selected && <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" /></svg>}
                          </div>
                          {p.displayName}
                        </button>
                      );
                    })}
                  </div>
                  {(formData.participantIds || []).length === 0 && !formData.participantId && (
                    <p className="mt-2 text-[10px] font-bold text-emerald-600 px-1 flex items-center gap-1">
                      <span>🌎</span>
                      {t('itinerary.allMembersCommon')}
                    </p>
                  )}
                </div>

                {/* 日付 + 時間 */}
                <div className="grid grid-cols-2 gap-5 mb-6">
                  <div>
                    <label className="block text-[11px] font-black text-ink-sub mb-2 uppercase tracking-[0.25em]">{t('common.date')}</label>
                    <input type="date" min={tripStartDate} max={tripEndDate} value={formData.date || ''} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full bg-surface-gray rounded-2xl px-5 py-4 text-xs font-bold outline-none border-2 border-transparent focus:border-primary/20 focus:bg-white transition-all shadow-inner" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-ink-sub mb-2 uppercase tracking-[0.25em]">{t('itinerary.startTime')}</label>
                    <input type="time" value={formData.time || ''} onChange={e => setFormData({ ...formData, time: e.target.value })} className="w-full bg-surface-gray rounded-2xl px-5 py-4 text-xs font-bold outline-none border-2 border-transparent focus:border-primary/20 focus:bg-white transition-all shadow-inner" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">{t('itinerary.endTime')}</label>
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
                  <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">{t('itinerary.type')}</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {ITEM_TYPES.map(type => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: type.value })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${formData.type === type.value ? 'bg-primary text-white border-primary' : 'bg-surface-gray text-ink-light border-surface-gray-mid'}`}
                      >
                        <span className="text-xs">{type.icon}</span> {t(type.labelKey)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* A1: 場所名入力 → リアルタイムでGoogleマップリンクを自動生成・プレビュー表示 */}
                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">{t('itinerary.location')}</label>
                    <input
                      type="text"
                      placeholder={t('itinerary.locationPlaceholder')}
                      className="w-full bg-surface-gray border border-surface-gray-mid rounded-xl p-3 text-sm text-ink outline-none focus:border-primary"
                      value={formData.location || ''}
                      onChange={e => {
                        const newLoc = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          location: newLoc,
                          // 場所名が入力されたらGoogleマップURL（検索型）を自動生成
                          // ユーザーが手動でURLを上書きしていた場合はそのまま保持
                          mapUrl: (!prev.mapUrl || prev.mapUrl.includes('google.com/maps/search'))
                            ? (newLoc ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(newLoc)}` : '')
                            : prev.mapUrl
                        }));
                        setValidationError('');
                      }}
                    />
                  </div>

                  {/* A1: 場所名が入力されたらリアルタイムで「マップで確認」ボタンを表示 */}
                  {formData.location && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formData.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-100 transition-colors animate-in fade-in duration-200"
                    >
                      <span>📍</span> {t('itinerary.checkMap')}
                    </a>
                  )}

                  {/* マップURLは場所名の有無に関わらず常時表示 */}
                  <div>
                    <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest text-rose-500">
                      <AppIcon name="map" className="w-3 h-3 inline-block mr-1" /> {t('itinerary.mapUrl')}
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
                    <AppIcon name="link" className="w-3 h-3 inline-block mr-1" /> {t('itinerary.relatedLinks')}
                  </label>
                  <div className="space-y-2">
                    {formData.links?.map((lnk, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          type="text"
                          placeholder={t('itinerary.linkLabel') || "Label"}
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
                      <AppIcon name="plus" className="w-3 h-3 inline-block mr-1" /> {t('itinerary.addLink')}
                    </button>
                  </div>
                </div>

                {/* カバー画像設定: 手動取得 & アップロード */}
                <div className="space-y-3">
                  <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">{t('itinerary.coverImage')}</label>

                  {formData.imageUrl && (
                    <div className="relative aspect-[21/9] rounded-xl overflow-hidden group mb-2 border border-surface-gray-mid">
                      <img src={formData.imageUrl} className="w-full h-full object-cover" alt="" />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, imageUrl: undefined }))}
                        className="absolute top-2 right-2 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const url = (formData.links && formData.links.length > 0 ? formData.links[0].url : '') || formData.link || formData.mapUrl;
                        if (!url || !url.startsWith('http')) {
                          alert(t('itinerary.noImageLink'));
                          return;
                        }
                        setIsFetchingOgp(true);
                        try {
                          const ogp = await fetchOgpData(url);
                          if (ogp && ogp.image) {
                            setFormData(prev => ({ ...prev, imageUrl: ogp.image }));
                          } else {
                            alert(t('itinerary.imageFetchFailed'));
                          }
                        } finally {
                          setIsFetchingOgp(false);
                        }
                      }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[10px] font-bold tracking-wider transition-all border ${isFetchingOgp ? 'bg-surface-gray text-ink-sub' : 'bg-ocean-light/10 border-ocean-light/30 text-ocean-dark hover:bg-ocean-light/20'}`}
                      disabled={isFetchingOgp}
                    >
                      {isFetchingOgp ? <span className="animate-pulse">{t('common.fetching')}</span> : <><span>🌍</span> {t('itinerary.fetchImageFromLink')}</>}
                    </button>

                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[10px] font-bold tracking-wider bg-surface-gray border border-surface-gray-mid text-ink-sub hover:bg-white hover:border-primary/40 transition-all"
                    >
                      <span>📷</span> {t('itinerary.selectPhoto')}
                    </button>
                    <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                  </div>
                </div>

                {/* メモ */}
                <div>
                  <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">{t('common.notes')}</label>
                  <textarea
                    rows={2}
                    placeholder={t('itinerary.memoPlaceholder')}
                    className="w-full bg-surface-gray border border-surface-gray-mid rounded-xl p-3 text-sm text-ink outline-none resize-none"
                    value={formData.memo || ''}
                    onChange={e => setFormData({ ...formData, memo: e.target.value })}
                  />
                </div>

                {/* U3: 保存ボタンを大きくしてタップしやすく */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setIsModalOpen(false); setValidationError(''); }}
                    className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-ink-sub hover:bg-surface-gray border border-surface-gray-mid transition-colors active:scale-95"
                  >
                    {t('common.cancel' )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleSubmit(); }}
                    className="flex-[2] py-4 rounded-2xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-95 transition-all"
                  >
                    {'💾 ' + t('common.save')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
};

export default ItineraryView;
