
import React, { useState } from 'react';
import { Ticket, UserProfile, Participant } from '../types';
import { MEMBER_COLORS } from '../constants';

interface Props {
  tickets: Ticket[];
  userProfiles: UserProfile[];
  onSave: (ticket: Ticket) => void;
  onDelete: (id: string) => void;
}

const TicketView: React.FC<Props> = ({ tickets, userProfiles, onSave, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Ticket>>({ type: 'flight' });
  const [viewMode, setViewMode] = useState<'overall' | 'personal'>('overall');
  const [selectedMemberId, setSelectedMemberId] = useState<string>(userProfiles[0]?.id || '');
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

  const filteredTickets = tickets.filter(t => {
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
            Overall
          </button>
          <button
            onClick={() => setViewMode('personal')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${viewMode === 'personal' ? 'bg-accent text-white shadow-sm' : 'text-ink-sub hover:bg-surface-gray'}`}
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
      </div>

      <div className="space-y-4">
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
              <div className="bg-white rounded-[24px] overflow-hidden shadow-sm border border-surface-gray-mid relative">
                {/* メンバーインジケーター */}
                {profile && (
                  <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: profile.color }}></div>
                )}

                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-surface-gray flex items-center justify-center text-2xl shadow-inner uppercase">
                        {getTypeIcon(ticket.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-ink-sub uppercase tracking-widest">{ticket.type}</span>
                          {profile && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: profile.color }}>
                              {profile.displayName}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-ink text-lg leading-tight">{ticket.title}</h3>
                        <p className="text-xs font-bold text-primary mt-0.5">{ticket.provider}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(ticket)}
                        className="p-2 hover:bg-surface-gray rounded-full transition-colors text-ink-sub"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(ticket.id)}
                        className="p-2 hover:bg-red-50 rounded-full transition-colors text-red-400"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <div className="bg-surface-gray rounded-2xl p-3 border border-surface-gray-mid/50">
                      <p className="text-[9px] font-bold text-ink-sub uppercase tracking-widest mb-1">Date</p>
                      <p className="text-sm font-bold text-ink">{ticket.date}</p>
                      {ticket.time && <p className="text-xs font-bold text-primary">{ticket.time}</p>}
                    </div>
                    <div
                      className={`rounded-2xl p-3 border border-surface-gray-mid/50 transition-all cursor-pointer relative overflow-hidden active:scale-95 ${copyFeedback === ticket.referenceNumber ? 'bg-emerald-50 border-emerald-200' : 'bg-surface-gray'}`}
                      onClick={() => ticket.referenceNumber && handleCopy(ticket.referenceNumber)}
                    >
                      <p className="text-[9px] font-bold text-ink-sub uppercase tracking-widest mb-1 flex justify-between">
                        Reference
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h6a2 2 0 002-2v-2" /></svg>
                      </p>
                      <p className="text-sm font-mono font-bold text-ink truncate">{ticket.referenceNumber || '---'}</p>
                      {copyFeedback === ticket.referenceNumber && (
                        <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center backdrop-blur-[1px]">
                          <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-tighter">Copied!</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {ticket.link && (
                    <a
                      href={ticket.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-4 bg-ink text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-ink/90 transition-all shadow-lg active:scale-[0.98]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Open Ticket
                    </a>
                  )}
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
