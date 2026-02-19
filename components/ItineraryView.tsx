
import React, { useState, useEffect, useMemo } from 'react';
import { ItineraryItem } from '../types';

interface Props {
  items: ItineraryItem[];
  onSave: (item: ItineraryItem) => void;
  onDelete: (id: string) => void;
  tripStartDate: string;
  tripEndDate: string;
}

const ItineraryView: React.FC<Props> = ({ items, onSave, onDelete, tripStartDate, tripEndDate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [formData, setFormData] = useState<Partial<ItineraryItem>>({ type: 'activity' });

  // Generate Date Range Array
  const dateRange = useMemo(() => {
    if (!tripStartDate) return [];
    const dates = [];
    const start = new Date(tripStartDate);
    const end = tripEndDate ? new Date(tripEndDate) : new Date(tripStartDate);

    // Safety break loop
    let current = new Date(start);
    let count = 0;
    while (current <= end && count < 30) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
      count++;
    }
    return dates;
  }, [tripStartDate, tripEndDate]);

  // Set default selected date
  useEffect(() => {
    if (dateRange.length > 0 && !selectedDate) {
      setSelectedDate(dateRange[0]);
    } else if (dateRange.length === 0 && !selectedDate) {
      setSelectedDate(new Date().toISOString().split('T')[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]); // dateRangeの変更のみを監視（selectedDateは初回のみ設定）

  const filteredItems = useMemo(() => {
    if (!selectedDate) return [];
    return items.filter(i => i.date === selectedDate).sort((a, b) => {
      return a.time.localeCompare(b.time);
    });
  }, [items, selectedDate]);

  const handleOpenAdd = () => {
    setFormData({ type: 'activity', date: selectedDate });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ItineraryItem) => {
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.time) return;

    const now = new Date().toISOString();
    const itemToSave: ItineraryItem = {
      ...formData,
      id: formData.id || crypto.randomUUID(),
      date: formData.date || selectedDate,
      updatedAt: now
    } as ItineraryItem;

    onSave(itemToSave);
    setIsModalOpen(false);
    setFormData({ type: 'activity', date: selectedDate });
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('この予定を削除しますか？')) {
      onDelete(id);
    }
  };

  const getDayLabel = (dateStr: string, index: number) => {
    const d = new Date(dateStr);
    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
    return {
      day: `Day ${index + 1}`,
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      week: weekDays[d.getDay()]
    };
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'move': return '✈️';
      case 'meal': return '🍽️';
      case 'stay': return '🏨';
      default: return '✨';
    }
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
        <button onClick={handleOpenAdd} className="text-[10px] font-bold text-primary uppercase tracking-widest border border-primary/40 px-3 py-1.5 rounded-full hover:bg-primary hover:text-white transition-colors">
          + 予定を追加
        </button>
      </div>

      {/* Date Tabs */}
      <div className="overflow-x-auto scrollbar-hide mb-2 px-4">
        <div className="flex gap-3 pb-2 min-w-min">
          {dateRange.map((d, i) => {
            const label = getDayLabel(d, i);
            const isSelected = selectedDate === d;
            return (
              <button
                key={d}
                onClick={() => setSelectedDate(d)}
                className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-2xl border transition-all ${isSelected ? 'bg-primary border-primary shadow-md transform scale-105' : 'bg-surface-gray border-surface-gray-mid text-ink-light'}`}
              >
                <span className={`text-[9px] font-bold uppercase tracking-wider mb-1 ${isSelected ? 'text-white' : 'text-ink-light'}`}>{label.day}</span>
                <span className={`text-lg font-bold leading-none ${isSelected ? 'text-white' : 'text-ink'}`}>{label.date.split('/')[1]}</span>
                <span className={`text-[10px] font-bold ${isSelected ? 'text-white/80' : 'text-ink-light'}`}>{label.week}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-20 relative">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-40">
            <p className="text-sm">予定はありません</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-[54px] top-4 bottom-0 w-[2px] bg-surface-gray-mid"></div>

            {filteredItems.map((item, idx) => (
              <div key={item.id} className="flex gap-4 mb-6 relative group">
                {/* Time Column */}
                <div className="w-10 text-right pt-1 flex-shrink-0">
                  <span className="text-sm font-bold text-ink block">{item.time}</span>
                </div>

                {/* Dot */}
                <div className="relative z-10 pt-2 flex-shrink-0">
                  <div className="w-3 h-3 bg-accent rounded-full ring-4 ring-surface-gray"></div>
                </div>

                {/* Content Card */}
                <div className="flex-1 min-w-0">
                  <div
                    onClick={() => handleOpenEdit(item)}
                    className="bg-white p-4 rounded-xl border border-surface-gray-mid hover:border-primary/30 hover:shadow-sm transition-all relative cursor-pointer active:scale-[0.98]"
                  >
                    {/* Delete Button - Made larger and higher z-index */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(item.id);
                      }}
                      className="absolute top-1 right-1 w-12 h-12 flex items-center justify-center text-ink-light hover:text-rose-500 rounded-full hover:bg-surface-gray transition-colors z-40"
                    >
                      <div className="w-8 h-8 rounded-full bg-surface-gray flex items-center justify-center pointer-events-none">
                        <span className="text-lg leading-none mb-0.5">×</span>
                      </div>
                    </button>

                    <div className="flex items-start gap-3 mb-2 pr-10">
                      <span className="text-2xl">{getTypeIcon(item.type)}</span>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider block mb-0.5">{item.type}</span>
                        <h3 className="text-base font-bold text-ink leading-tight truncate">{item.title}</h3>
                      </div>
                    </div>

                    {item.location && (
                      <div className="flex items-center gap-1.5 mb-2 text-ink-sub">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <span className="text-xs truncate">{item.location}</span>
                      </div>
                    )}

                    {item.memo && (
                      <p className="text-xs text-ink-sub bg-surface-gray p-2 rounded-lg mb-2">{item.memo}</p>
                    )}

                    {/* Action Button */}
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2 bg-primary-light hover:bg-primary/20 rounded-lg text-xs font-bold text-primary transition-colors mt-2 relative z-20"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span>Open Link / Map</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] bg-primary/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[24px] p-6 border border-surface-gray-mid shadow-xl overflow-y-auto max-h-[80vh] pb-10">
            <h3 className="text-lg font-sans font-bold mb-4 text-ink">{formData.id ? '予定を編集' : '予定を追加'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-ink-sub mb-2 uppercase tracking-widest">タイトル</label>
                <input type="text" placeholder="例: ディナー" className="w-full bg-surface-gray border border-surface-gray-mid rounded-xl p-3 text-sm text-ink outline-none focus:border-primary" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-ink-sub mb-2 uppercase tracking-widest">日付</label>
                  <input type="date" className="w-full bg-surface-gray border border-surface-gray-mid rounded-xl p-3 text-sm text-ink outline-none" value={formData.date || ''} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-ink-sub mb-2 uppercase tracking-widest">時間</label>
                  <input type="time" className="w-full bg-surface-gray border border-surface-gray-mid rounded-xl p-3 text-sm text-ink outline-none" value={formData.time || ''} onChange={e => setFormData({ ...formData, time: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-ink-sub mb-2 uppercase tracking-widest">種類</label>
                <div className="grid grid-cols-4 gap-2">
                  {['activity', 'meal', 'move', 'stay'].map(type => (
                    <button
                      key={type}
                      onClick={() => setFormData({ ...formData, type: type as any })}
                      className={`py-2 rounded-lg text-xl border transition-all ${formData.type === type ? 'bg-primary border-primary' : 'bg-surface-gray border-surface-gray-mid opacity-60'}`}
                    >
                      {getTypeIcon(type)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-ink-sub mb-2 uppercase tracking-widest">場所名</label>
                <input type="text" placeholder="例: 東京駅" className="w-full bg-surface-gray border border-surface-gray-mid rounded-xl p-3 text-sm text-ink outline-none" value={formData.location || ''} onChange={e => setFormData({ ...formData, location: e.target.value })} />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-ink-sub mb-2 uppercase tracking-widest">Map / サイト URL</label>
                <input type="url" placeholder="https://maps.google.com/..." className="w-full bg-surface-gray border border-surface-gray-mid rounded-xl p-3 text-sm text-ink outline-none" value={formData.link || ''} onChange={e => setFormData({ ...formData, link: e.target.value })} />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-ink-sub mb-2 uppercase tracking-widest">メモ</label>
                <textarea rows={2} className="w-full bg-surface-gray border border-surface-gray-mid rounded-xl p-3 text-sm text-ink outline-none" value={formData.memo || ''} onChange={e => setFormData({ ...formData, memo: e.target.value })} />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl text-xs font-bold text-ink-sub hover:bg-surface-gray">キャンセル</button>
                <button onClick={handleSubmit} className="flex-1 py-3 rounded-xl bg-primary text-white text-xs font-bold shadow-lg">保存</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItineraryView;
