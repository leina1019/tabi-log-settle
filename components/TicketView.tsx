
import React, { useState } from 'react';
import { Ticket, UserProfile, Participant } from '../types';
import { MEMBER_COLORS } from '../constants';

interface Props {
  tickets: Ticket[];
  userProfiles: UserProfile[];
  onSave: (ticket: Ticket) => void;
  onDelete: (id: string) => void;
  tripEndDate: string;
  isTablet?: boolean;
}

const TicketView: React.FC<Props> = ({ tickets, userProfiles, onSave, onDelete, tripStartDate, tripEndDate, isTablet = false }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Ticket>>({ type: 'flight' });
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [viewMode, setViewMode] = useState<'overall' | 'personal'>('overall');
  const [selectedMemberId, setSelectedMemberId] = useState<string>(userProfiles[0]?.id || '');

  // 旅行期間の日付配列を生成 (ItineraryViewと共通)
  const dateRange = React.useMemo(() => {
    if (!tripStartDate) return [];
    const dates: string[] = [];
    const start = new Date(tripStartDate);
    const end = tripEndDate ? new Date(tripEndDate) : new Date(tripStartDate);
    let current = new Date(start);
    let count = 0;
    while (current <= end && count * 1000 * 60 * 60 * 24 < (30 * 1000 * 60 * 60 * 24)) { // 安全装置
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
      count++;
      if (count > 31) break;
    }
    return dates;
  }, [tripStartDate, tripEndDate]);

  // 選択日の初期化
  React.useEffect(() => {
    if (dateRange.length > 0 && !selectedDate) {
      setSelectedDate(dateRange[0]);
    }
  }, [dateRange, selectedDate]);
  const [error, setError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setFormData({ type: 'flight' });
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

    // バリデーション
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
      default: return '✨';
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
    <div className="space-y-6 pt-2 pb-20">
      <div className="flex justify-between items-center px-2">
        <h2 className="text-xl font-sans font-bold tracking-wide text-ink">チケット</h2>
        <button type="button" onClick={handleOpenAdd} className="bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full shadow-lg shadow-primary/20 active:scale-95 transition-all">
          + 追加
        </button>
      </div>

      {/* メンバーフィルター */}
      <div className="space-y-4 sticky top-0 z-30 bg-surface-gray/95 backdrop-blur-md py-2 -mx-4 px-4 border-b border-surface-gray-mid">
        <div className="flex bg-white p-1 rounded-xl border border-surface-gray-mid">
          <button
            onClick={() => setViewMode('overall')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${viewMode === 'overall' ? 'bg-primary text-white shadow-sm' : 'text-ink-sub hover:bg-surface-gray'}`}
          >
            全体
          </button>
          <button
            onClick={() => setViewMode('personal')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${viewMode === 'personal' ? 'bg-accent text-white shadow-sm' : 'text-ink-sub hover:bg-surface-gray'}`}
          >
            個人
          </button>
        </div>

        {viewMode === 'personal' && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {userProfiles.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedMemberId(p.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-[10px] font-bold transition-all border flex items-center gap-1.5 ${selectedMemberId === p.id ? 'text-white border-transparent' : 'bg-white text-ink-light border-surface-gray-mid'}`}
                style={selectedMemberId === p.id ? { backgroundColor: p.color } : {}}
              >
                <div className="w-4 h-4 rounded-full overflow-hidden bg-white/20 flex items-center justify-center">
                  {p.avatarUrl ? <img src={p.avatarUrl} className="w-full h-full object-cover" /> : <span>👤</span>}
                </div>
                {p.displayName}
              </button>
            ))}
          </div>
        )}

        {/* 日付タブ (ItineraryViewとデザインを統一) */}
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2">
          <div className="flex gap-2 min-w-min">
            {dateRange.map((d, i) => {
              const label = getDayLabel(d, i);
              const isSelected = selectedDate === d;
              return (
                <button
                  key={d}
                  onClick={() => setSelectedDate(d)}
                  className={`flex-shrink-0 flex flex-col items-center justify-center w-14 h-16 rounded-xl border transition-all ${isSelected
                    ? 'bg-primary border-primary shadow-sm'
                    : 'bg-white border-surface-gray-mid text-ink-light'
                    }`}
                >
                  <span className={`text-[7px] font-bold uppercase tracking-tighter mb-0.5 ${isSelected ? 'text-white/80' : 'text-ink-sub'}`}>{label.day}</span>
                  <span className={`text-base font-black leading-none ${isSelected ? 'text-white' : 'text-ink'}`}>{label.date}</span>
                  <span className={`text-[8px] font-bold ${isSelected ? 'text-white/60' : 'text-ink-sub/50'}`}>{label.week}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className={`space-y-4 px-1 ${isTablet ? 'grid grid-cols-2 gap-4 space-y-0' : ''}`}>
        {filteredTickets.length === 0 && (
          <div className="bg-white p-12 rounded-[32px] text-center border border-dashed border-surface-gray-mid">
            <div className="text-5xl mb-4 grayscale opacity-20">🎫</div>
            <p className="text-sm font-bold text-ink-light uppercase tracking-widest">No tickets found</p>
            <p className="text-[10px] text-ink-sub mt-1">このカテゴリーにチケットはまだありません</p>
          </div>
        )}

        {filteredTickets.map(ticket => {
          const profile = getProfile(ticket.participantId);
          return (
            <div key={ticket.id} className="relative group perspective">
              <div className="bg-gradient-to-br from-white to-slate-50 rounded-[28px] overflow-hidden shadow-xl shadow-ocean-dark/5 border border-surface-gray-mid relative">
                {/* メンバーラベル - フローティング */}
                {profile && (
                  <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/90 backdrop-blur-sm shadow-sm border border-surface-gray-mid">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: profile.color }}></div>
                    <span className="text-[8px] font-bold text-ink uppercase tracking-wider">{profile.displayName}</span>
                  </div>
                )}

                {/* 装飾的な円 - 切り取り線用 */}
                <div className="absolute top-1/2 -left-3 w-6 h-6 bg-surface-gray rounded-full border border-surface-gray-mid z-10 -translate-y-1/2"></div>
                <div className="absolute top-1/2 -right-3 w-6 h-6 bg-surface-gray rounded-full border border-surface-gray-mid z-10 -translate-y-1/2"></div>

                {/* 背景の装飾 */}
                <div className="absolute -right-8 -top-8 w-24 h-24 bg-ocean-light/5 rounded-full pointer-events-none"></div>

                <div className="p-6 relative">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-3xl bg-white flex items-center justify-center text-3xl shadow-lg shadow-ocean-dark/5 border border-surface-gray-mid uppercase">
                        {getTypeIcon(ticket.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-ocean-light uppercase tracking-[0.2em]">{ticket.type}</span>
                          <span className="w-1 h-1 rounded-full bg-surface-gray-mid"></span>
                          <span className="text-[9px] font-bold text-ink-sub tracking-wider uppercase">{ticket.provider}</span>
                        </div>
                        <h3 className="font-bold text-ink text-xl leading-tight">{ticket.title}</h3>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(ticket)}
                        className="w-9 h-9 flex items-center justify-center bg-white hover:bg-surface-gray rounded-full border border-surface-gray-mid transition-all text-ink-sub active:scale-95 shadow-sm"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(ticket.id)}
                        className="w-9 h-9 flex items-center justify-center bg-white hover:bg-rose-50 rounded-full border border-surface-gray-mid transition-all text-rose-400 active:scale-95 shadow-sm"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>

                  {/* 中間の切り取り線 */}
                  <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-surface-gray-mid pointer-events-none -translate-y-1/2"></div>

                  <div className="grid grid-cols-2 gap-4 mt-8">
                    <div className="flex flex-col gap-4">
                      <div>
                        <p className="text-[9px] font-bold text-ink-light uppercase tracking-[0.2em] mb-1">Schedule</p>
                        <p className="text-base font-bold text-ink">{ticket.date}</p>
                        {ticket.time && <p className="text-sm font-bold text-ocean-light">{ticket.time}</p>}
                      </div>
                      <div
                        className={`rounded-2xl p-4 transition-all cursor-pointer relative overflow-hidden active:scale-95 border ${copyFeedback === ticket.referenceNumber ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-surface-gray-mid shadow-sm'}`}
                        onClick={() => ticket.referenceNumber && handleCopy(ticket.referenceNumber)}
                      >
                        <p className="text-[9px] font-bold text-ink-sub uppercase tracking-widest mb-1 flex justify-between">
                          Ref No.
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h6a2 2 0 002-2v-2" /></svg>
                        </p>
                        <p className="text-sm font-mono font-black text-ink tracking-widest truncate">{ticket.referenceNumber || '---'}</p>
                        {copyFeedback === ticket.referenceNumber && (
                          <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center backdrop-blur-[1px]">
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter animate-bounce">Success!</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col justify-between">
                      <div className="bg-slate-100/50 rounded-2xl p-3 border border-slate-200/50">
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 text-center">Ticket Status</p>
                        <div className="flex justify-center text-xs font-black text-slate-800">VALID VOUCHER</div>
                      </div>

                      {ticket.link && (
                        <a
                          href={ticket.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-4 bg-ink text-white rounded-[20px] text-[10px] font-bold uppercase tracking-widest hover:bg-ocean-dark transition-all shadow-lg shadow-ink/20 active:scale-[0.98] mt-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Boarding
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-primary/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[24px] p-5 border border-surface-gray-mid shadow-xl overflow-y-auto max-h-[80vh] pb-10">
            <h3 className="text-lg font-sans font-bold mb-3 text-ink">{formData.id ? 'チケット編集' : 'チケット追加'}</h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-500 text-xs font-bold rounded-xl border border-red-100 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">割り当て</label>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, participantId: undefined })}
                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-bold transition-all border ${!formData.participantId ? 'bg-primary text-white border-transparent shadow-md shadow-primary/20' : 'bg-surface-gray text-ink-sub border-surface-gray-mid'}`}
                  >
                    全体
                  </button>
                  {userProfiles.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, participantId: p.id })}
                      className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-bold transition-all border ${formData.participantId === p.id ? 'text-white border-transparent shadow-md' : 'bg-surface-gray text-ink-sub border-surface-gray-mid'}`}
                      style={formData.participantId === p.id ? { backgroundColor: p.color, boxShadow: `0 4px 12px ${p.color}33` } : {}}
                    >
                      {p.displayName}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">種類</label>
                <div className="grid grid-cols-5 gap-2">
                  {['flight', 'train', 'hotel', 'event', 'other'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: t as any })}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${formData.type === t ? 'bg-primary-light border-primary text-primary' : 'bg-surface-gray border-surface-gray-mid text-ink-sub'}`}
                    >
                      <span className="text-xl mb-1">{getTypeIcon(t as any)}</span>
                      <span className="text-[8px] font-bold uppercase tracking-tighter">{t === 'other' ? 'ETC' : t}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">タイトル</label>
                <input type="text" placeholder="例: 帰りのフライト" className="w-full bg-surface-gray border border-surface-gray-mid rounded-2xl px-4 py-3.5 text-sm text-ink outline-none focus:border-primary transition-all" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">詳細 (会社名・場所など)</label>
                <input type="text" placeholder="例: JAL, 東京ドーム" className="w-full bg-surface-gray border border-surface-gray-mid rounded-2xl px-4 py-3.5 text-sm text-ink outline-none focus:border-primary transition-all" value={formData.provider || ''} onChange={e => setFormData({ ...formData, provider: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">日付</label>
                  <input type="date" className="w-full bg-surface-gray border border-surface-gray-mid rounded-2xl px-4 py-3.5 text-sm text-ink outline-none focus:border-primary transition-all" value={formData.date || ''} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">時間</label>
                  <input type="time" className="w-full bg-surface-gray border border-surface-gray-mid rounded-2xl px-4 py-3.5 text-sm text-ink outline-none focus:border-primary transition-all" value={formData.time || ''} onChange={e => setFormData({ ...formData, time: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">予約番号 / 座席</label>
                <input type="text" placeholder="番号や座席など" className="w-full bg-surface-gray border border-surface-gray-mid rounded-2xl px-4 py-3.5 text-sm text-ink outline-none focus:border-primary transition-all" value={formData.referenceNumber || ''} onChange={e => setFormData({ ...formData, referenceNumber: e.target.value })} />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">チケットURL</label>
                <input type="url" placeholder="https://..." className="w-full bg-surface-gray border border-surface-gray-mid rounded-2xl px-4 py-3.5 text-sm text-ink outline-none focus:border-primary transition-all" value={formData.link || ''} onChange={e => setFormData({ ...formData, link: e.target.value })} />
              </div>

              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 rounded-2xl text-xs font-bold text-ink-sub hover:bg-surface-gray border border-surface-gray-mid transition-all">キャンセル</button>
                <button type="button" onClick={(e) => { e.stopPropagation(); handleSubmit(e); }} className="flex-[1.5] py-4 rounded-2xl bg-primary text-white text-xs font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-95 transition-all">保存する</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketView;
