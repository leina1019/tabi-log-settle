import React, { useState } from 'react';
import { Ticket, UserProfile, Participant } from '../types';
import { AppIcon } from './AppIcon';
import { MEMBER_COLORS } from '../constants';

interface Props {
  tickets: Ticket[];
  userProfiles: UserProfile[];
  onSave: (ticket: Ticket) => void;
  onDelete: (id: string) => void;
  tripEndDate: string;
  tripStartDate?: string;
  isTablet?: boolean;
}

const TicketView: React.FC<Props> = ({ tickets, userProfiles, onSave, onDelete, tripStartDate, tripEndDate, isTablet = false }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Ticket>>({ type: 'flight' });
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [viewMode, setViewMode] = useState<'overall' | 'personal'>('overall');
  const [selectedMemberId, setSelectedMemberId] = useState<string>(userProfiles[0]?.id || '');
  const [error, setError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const dateRange = React.useMemo(() => {
    if (!tripStartDate) return [];
    const dates: string[] = [];
    const start = new Date(tripStartDate);
    const end = tripEndDate ? new Date(tripEndDate) : new Date(tripStartDate);
    let current = new Date(start);
    let count = 0;
    while (current <= end && count < 31) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
      count++;
    }
    return dates;
  }, [tripStartDate, tripEndDate]);

  React.useEffect(() => {
    if (dateRange.length > 0 && !selectedDate) {
      setSelectedDate(dateRange[0]);
    }
  }, [dateRange, selectedDate]);

  const handleOpenAdd = () => {
    const now = new Date();
    const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setFormData({ type: 'flight', date: selectedDate, time: defaultTime });
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ticket: Ticket) => {
    setFormData({ ...ticket });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    if (!formData.title) {
      setError('タイトルを入力してください');
      return;
    }
    if (!formData.date) {
      setError('日付を入力してください');
      return;
    }

    try {
      const now = new Date().toISOString();
      const itemToSave: Ticket = {
        ...formData,
        id: formData.id || crypto.randomUUID(),
        updatedAt: now
      } as Ticket;

      onSave(itemToSave);
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('保存中にエラーが発生しました');
    }
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('このチケットを削除しますか？')) {
      onDelete(id);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(text);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const getProfile = (id?: string) => {
    return userProfiles.find(p => p.id === id);
  };

  const getTypeIcon = (type: Ticket['type']) => {
    switch (type) {
      case 'flight': return '✈️';
      case 'train': return '🚄';
      case 'hotel': return '🏨';
      case 'event': return '🎫';
      default: return '🎟️';
    }
  };

  const getDayLabel = (dateStr: string, index: number) => {
    const d = new Date(dateStr);
    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
    return {
      day: `${index + 1}日目`,
      date: `${d.getDate()}`,
      week: weekDays[d.getDay()],
    };
  };

  const filteredTickets = tickets.filter(t => {
    const isDateMatch = !selectedDate || t.date === selectedDate;
    if (!isDateMatch) return false;

    if (viewMode === 'overall') return !t.participantId;
    return t.participantId === selectedMemberId;
  });

  return (
    <div className="space-y-6 pt-2 pb-24">
      <div className="flex justify-between items-center px-4">
        <h2 className="text-2xl font-sans font-black tracking-tight text-ink">Tickets</h2>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="bg-primary hover:bg-primary/90 text-white text-[11px] font-black uppercase tracking-widest px-6 py-2.5 rounded-full shadow-xl shadow-primary/20 active:scale-95 transition-all"
        >
          Add Ticket
        </button>
      </div>

      {/* メンバー & 日付フィルター */}
      <div className="space-y-4 sticky top-0 z-30 bg-surface-gray/95 backdrop-blur-md py-4 -mx-4 px-4 border-b border-surface-gray-mid/50">
        <div className="flex bg-white/50 p-1.5 rounded-2xl border border-surface-gray-mid/30 shadow-inner">
          <button
            onClick={() => setViewMode('overall')}
            className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${viewMode === 'overall' ? 'bg-ink text-white shadow-lg' : 'text-ink-sub hover:bg-white'}`}
          >
            Everyone
          </button>
          <button
            onClick={() => setViewMode('personal')}
            className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${viewMode === 'personal' ? 'bg-primary text-white shadow-lg' : 'text-ink-sub hover:bg-white'}`}
          >
            Personal
          </button>
        </div>

        {viewMode === 'personal' && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {userProfiles.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedMemberId(p.id)}
                className={`flex-shrink-0 px-4 py-2.5 rounded-full text-[10px] font-black transition-all border flex items-center gap-2 group ${selectedMemberId === p.id ? 'text-white border-transparent shadow-md' : 'bg-white text-ink-light border-surface-gray-mid/50 hover:border-primary/30'}`}
                style={selectedMemberId === p.id ? { backgroundColor: p.color } : {}}
              >
                <div className="w-5 h-5 rounded-full overflow-hidden bg-white/20 flex items-center justify-center border border-white/10">
                  {p.avatarUrl ? <img src={p.avatarUrl} className="w-full h-full object-cover" /> : <span className="text-[10px]">{p.displayName[0]}</span>}
                </div>
                {p.displayName}
              </button>
            ))}
          </div>
        )}

        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
          <div className="flex gap-3 min-w-min">
            {dateRange.map((d, i) => {
              const label = getDayLabel(d, i);
              const isSelected = selectedDate === d;
              return (
                <button
                  key={d}
                  onClick={() => setSelectedDate(d)}
                  className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-2xl border transition-all active:scale-90 ${isSelected
                    ? 'bg-primary border-primary shadow-xl shadow-primary/20 scale-105 z-10'
                    : 'bg-white border-surface-gray-mid/50 text-ink-light'
                    }`}
                >
                  <span className={`text-[8px] font-black uppercase tracking-tighter mb-1 ${isSelected ? 'text-white/70' : 'text-ink-sub'}`}>{label.day}</span>
                  <span className={`text-xl font-black leading-none ${isSelected ? 'text-white' : 'text-ink'}`}>{label.date}</span>
                  <span className={`text-[9px] font-bold mt-1 ${isSelected ? 'text-white/50' : 'text-ink-sub/40'}`}>{label.week}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className={`space-y-6 px-1 ${isTablet ? 'grid grid-cols-2 gap-6 space-y-0' : ''}`}>
        {filteredTickets.length === 0 && (
          <div className="bg-white/50 p-16 rounded-[40px] text-center border-2 border-dashed border-surface-gray-mid/50 shadow-inner">
            <div className="mb-6 opacity-10">
              <span className="text-8xl">🎫</span>
            </div>
            <p className="text-xs font-black text-ink-light uppercase tracking-[0.3em]">No Tickets Yet</p>
            <p className="text-[10px] text-ink-sub mt-2 font-bold">追加ボタンからチケットを登録しましょう</p>
          </div>
        )}

        {filteredTickets.map(ticket => {
          const profile = getProfile(ticket.participantId);
          const effectiveMapUrl = ticket.mapUrl || (ticket.provider ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ticket.provider} ${ticket.title}`)}` : '');

          return (
            <div key={ticket.id} className="relative group perspective">
              <div className="bg-white rounded-[32px] overflow-hidden shadow-2xl shadow-ink/5 border border-surface-gray-mid/50 hover:shadow-primary/5 transition-all duration-500 relative">

                {/* プレミアム・ボーディングパス装飾 */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-ocean-dark via-primary to-accent/60 opacity-80" />

                {/* メンバーバッジ */}
                {profile && (
                  <div className="absolute top-5 right-6 z-20 flex items-center gap-2 pr-3 pl-1.5 py-1.5 rounded-full bg-surface-gray/80 backdrop-blur-md border border-white/50 shadow-sm">
                    <div className="w-5 h-5 rounded-full overflow-hidden bg-white">
                      {profile.avatarUrl ? <img src={profile.avatarUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full" style={{ backgroundColor: profile.color }} />}
                    </div>
                    <span className="text-[10px] font-black text-ink-sub uppercase tracking-widest">{profile.displayName}</span>
                  </div>
                )}

                {/* 切り取りノッチ */}
                <div className="absolute top-[48%] -left-4 w-8 h-8 bg-surface-gray rounded-full border border-surface-gray-mid/50 z-10 shadow-inner"></div>
                <div className="absolute top-[48%] -right-4 w-8 h-8 bg-surface-gray rounded-full border border-surface-gray-mid/50 z-10 shadow-inner"></div>

                <div className="p-8 pb-4 relative">
                  <div className="flex justify-between items-start mb-8">
                    <div className="flex items-center gap-5">
                      <div className="w-18 h-18 rounded-[24px] bg-surface-gray flex items-center justify-center text-4xl shadow-inner border border-white">
                        {getTypeIcon(ticket.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{ticket.type}</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
                          <span className="text-[10px] font-black text-ink-sub tracking-widest uppercase truncate max-w-[120px]">{ticket.provider}</span>
                        </div>
                        <h3 className="font-black text-ink text-2xl leading-none tracking-tight">{ticket.title}</h3>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 mb-4">
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-black text-ink-light uppercase tracking-[0.2em] mb-1.5">Schedule</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-lg font-black text-ink">{ticket.date.split('-').slice(1).join('/')}</p>
                          {ticket.time && <p className="text-sm font-black text-primary">{ticket.time}</p>}
                        </div>
                      </div>

                      <div
                        className={`group/ref rounded-2xl p-4 transition-all cursor-pointer relative overflow-hidden border-2 ${copyFeedback === ticket.referenceNumber ? 'bg-emerald-50 border-emerald-200' : 'bg-surface-gray/40 border-transparent hover:border-primary/20'}`}
                        onClick={() => ticket.referenceNumber && handleCopy(ticket.referenceNumber)}
                      >
                        <p className="text-[9px] font-black text-ink-sub uppercase tracking-widest mb-1.5 flex justify-between items-center opacity-60">
                          Ref / Seat
                          <AppIcon name="save" className="w-3 h-3 group-hover/ref:scale-110 transition-transform" />
                        </p>
                        <p className="text-sm font-mono font-black text-ink tracking-widest truncate">{ticket.referenceNumber || '---'}</p>
                        {copyFeedback === ticket.referenceNumber && (
                          <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center backdrop-blur-[2px] animate-in fade-in zoom-in duration-200">
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">COPIED</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      <div className="bg-gradient-to-br from-ink/5 to-ink/10 rounded-2xl p-4 border border-white shadow-sm flex flex-col items-center justify-center">
                        <p className="text-[10px] font-black text-ink-light uppercase tracking-widest mb-1.5">E-Ticket Status</p>
                        <div className="text-xs font-black text-ink tracking-widest border-2 border-ink px-3 py-1 bg-white/50 rotate-[-2deg] shadow-sm">VALID VOUCHER</div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(ticket)}
                          className="flex-1 py-3 bg-white hover:bg-surface-gray rounded-xl border border-surface-gray-mid/50 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 備考・メモセクション (notes) */}
                  {ticket.notes && (
                    <div className="mb-6 bg-accent/5 p-4 rounded-2xl border border-accent/10 relative overflow-hidden group">
                      <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-accent/10 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
                      <p className="text-[9px] font-black text-accent-dark uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <span className="text-xs">📝</span> Notes
                      </p>
                      <p className="text-[11px] font-bold text-ink-sub leading-relaxed">{ticket.notes}</p>
                    </div>
                  )}

                  {/* 切取線 */}
                  <div className="relative h-4 flex items-center justify-center my-2 pointer-events-none">
                    <div className="w-full border-t-2 border-dashed border-surface-gray-mid/40"></div>
                  </div>

                  <div className="flex gap-3 mt-4">
                    {ticket.link && (
                      <a
                        href={ticket.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2.5 py-4 bg-ink text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-primary transition-all shadow-xl shadow-ink/20 active:scale-95 overflow-hidden relative group"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                        <span className="text-base">🎫</span>
                        Boarding
                      </a>
                    )}
                    {effectiveMapUrl && (
                      <a
                        href={effectiveMapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center justify-center gap-2.5 py-4 bg-rose-50 border border-rose-100 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] text-rose-500 hover:bg-rose-100 transition-all active:scale-95 ${!ticket.link ? 'flex-1' : 'px-8'}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-base">📍</span>
                        {!ticket.link && "Open Map"}
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDeleteClick(ticket.id); }}
                      className="w-14 items-center justify-center bg-rose-50/30 hover:bg-rose-50 border border-rose-100/50 rounded-2xl text-rose-300 hover:text-rose-500 transition-all active:scale-95 flex"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-ink/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 border border-white shadow-2xl overflow-y-auto max-h-[85vh] pb-12 relative animate-in slide-in-from-bottom duration-500">
            {/* モーダル閉じるボタン */}
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-surface-gray flex items-center justify-center text-ink-sub hover:bg-ink hover:text-white transition-all shadow-sm">×</button>

            <h3 className="text-2xl font-sans font-black mb-8 text-ink tracking-tight">
              {formData.id ? 'Edit Ticket' : 'Add New Ticket'}
            </h3>

            <div className="space-y-6">
              {/* 割り当て */}
              <div>
                <label className="block text-[10px] font-black text-ink-sub mb-3 uppercase tracking-[0.2em] px-1">Assignment</label>
                <div className="flex gap-2.5 overflow-x-auto scrollbar-hide py-1">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, participantId: undefined })}
                    className={`flex-shrink-0 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${!formData.participantId ? 'bg-ink text-white border-ink shadow-lg shadow-ink/20 scale-105' : 'bg-surface-gray text-ink-sub border-transparent hover:border-surface-gray-mid'}`}
                  >
                    Global
                  </button>
                  {userProfiles.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, participantId: p.id })}
                      className={`flex-shrink-0 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${formData.participantId === p.id ? 'text-white border-transparent shadow-lg scale-105' : 'bg-surface-gray text-ink-sub border-transparent hover:border-surface-gray-mid'}`}
                      style={formData.participantId === p.id ? { backgroundColor: p.color, boxShadow: `0 8px 20px ${p.color}44` } : {}}
                    >
                      {p.displayName}
                    </button>
                  ))}
                </div>
              </div>

              {/* 種類 - アイコンタイル */}
              <div>
                <label className="block text-[10px] font-black text-ink-sub mb-3 uppercase tracking-[0.2em] px-1">Category</label>
                <div className="grid grid-cols-5 gap-3">
                  {(['flight', 'train', 'hotel', 'event', 'other'] as Ticket['type'][]).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: t })}
                      className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 transition-all active:scale-90 ${formData.type === t ? 'bg-primary/5 border-primary text-primary shadow-lg shadow-primary/5' : 'bg-surface-gray border-transparent text-ink-sub hover:border-surface-gray-mid'}`}
                    >
                      <span className="text-2xl mb-1.5">{getTypeIcon(t)}</span>
                      <span className="text-[8px] font-black uppercase tracking-tighter">{t === 'other' ? 'ETC' : t}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* タイトル & プロバイダー */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-ink-sub mb-2 uppercase tracking-[0.2em] px-1">Title</label>
                  <input type="text" placeholder="例: 成田フライト" className="w-full bg-surface-gray border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-5 py-4 text-sm font-bold text-ink outline-none transition-all shadow-inner" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-ink-sub mb-2 uppercase tracking-[0.2em] px-1">Provider (Company)</label>
                  <input type="text" placeholder="例: JAL, Hilton" className="w-full bg-surface-gray border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-5 py-4 text-sm font-bold text-ink outline-none transition-all shadow-inner" value={formData.provider || ''} onChange={e => setFormData({ ...formData, provider: e.target.value })} />
                </div>
              </div>

              {/* 日付 + 時間 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-ink-sub mb-2 uppercase tracking-[0.2em] px-1">Date</label>
                  <input type="date" className="w-full bg-surface-gray border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-5 py-4 text-xs font-bold text-ink outline-none transition-all shadow-inner" value={formData.date || ''} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-ink-sub mb-2 uppercase tracking-[0.2em] px-1">Time</label>
                  <input type="time" className="w-full bg-surface-gray border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-5 py-4 text-xs font-bold text-ink outline-none transition-all shadow-inner" value={formData.time || ''} onChange={e => setFormData({ ...formData, time: e.target.value })} />
                </div>
              </div>

              {/* 予約番号 */}
              <div>
                <label className="block text-[10px] font-black text-ink-sub mb-2 uppercase tracking-[0.2em] px-1">Reference No. / Seat</label>
                <input type="text" placeholder="予約番号や座席番号" className="w-full bg-surface-gray border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-5 py-4 text-sm font-bold text-ink outline-none transition-all shadow-inner" value={formData.referenceNumber || ''} onChange={e => setFormData({ ...formData, referenceNumber: e.target.value })} />
              </div>

              {/* メモ (notes) */}
              <div>
                <label className="block text-[10px] font-black text-ink-sub mb-2 uppercase tracking-[0.2em] px-1">Notes</label>
                <textarea
                  placeholder="乗り換えや注意点など..."
                  rows={2}
                  className="w-full bg-surface-gray border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-5 py-4 text-sm font-bold text-ink outline-none transition-all shadow-inner resize-none"
                  value={formData.notes || ''}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              {/* URL連携 */}
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-[10px] font-black text-ink-sub mb-2 uppercase tracking-[0.2em] px-1">Boarding Link (URL)</label>
                  <input type="url" placeholder="https://..." className="w-full bg-surface-gray border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-5 py-4 text-sm font-bold text-ink outline-none transition-all shadow-inner" value={formData.link || ''} onChange={e => setFormData({ ...formData, link: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-rose-500 mb-2 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                    <span className="text-base">📍</span> Google Map Link
                  </label>
                  <input type="url" placeholder="https://maps.app.goo.gl/..." className="w-full bg-rose-50 border-2 border-transparent focus:border-rose-300 focus:bg-white rounded-2xl px-5 py-4 text-sm font-bold text-ink outline-none transition-all shadow-inner" value={formData.mapUrl || ''} onChange={e => setFormData({ ...formData, mapUrl: e.target.value })} />
                </div>
              </div>

              <div className="flex gap-4 pt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 rounded-[24px] text-xs font-black uppercase tracking-[0.2em] text-ink-sub hover:bg-surface-gray transition-all active:scale-95">Cancel</button>
                <button type="button" onClick={(e) => { e.stopPropagation(); handleSubmit(e); }} className="flex-[1.5] py-5 rounded-[24px] bg-ink text-white text-xs font-black uppercase tracking-[0.3em] shadow-2xl shadow-ink/30 hover:bg-primary transition-all active:scale-95">Save Ticket</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketView;
