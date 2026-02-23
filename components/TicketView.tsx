
import React, { useState } from 'react';
import { Ticket } from '../types';

interface Props {
  tickets: Ticket[];
  onSave: (ticket: Ticket) => void;
  onDelete: (id: string) => void;
}

const TicketView: React.FC<Props> = ({ tickets, onSave, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Ticket>>({ type: 'flight' });
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-6 pt-2">
      <div className="flex justify-between items-center px-2">
        <h2 className="text-xl font-sans font-bold tracking-wide text-ink">チケット</h2>
        <button type="button" onClick={handleOpenAdd} className="text-[10px] font-bold text-primary uppercase tracking-widest border border-primary/40 px-3 py-1.5 rounded-full hover:bg-primary hover:text-white transition-colors">
          + 追加
        </button>
      </div>

      <div className="space-y-4">
        {tickets.length === 0 && (
          <div className="bg-white p-8 rounded-2xl text-center border border-surface-gray-mid">
            <div className="text-4xl mb-3 opacity-30">🎫</div>
            <p className="text-sm text-ink-light">保存されたチケットはありません</p>
          </div>
        )}

        {tickets.map(ticket => (
          <div key={ticket.id} className="relative group perspective">

            <div className="bg-gradient-to-r from-white to-slate-100 text-slate-800 rounded-2xl p-5 shadow-xl border-l-[6px] border-ocean-light relative overflow-hidden">
              {/* Action Buttons - Larger touch targets */}
              <div className="absolute top-2 right-2 z-30 flex gap-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleOpenEdit(ticket); }}
                  className="w-10 h-10 bg-ocean-light/90 hover:bg-ocean-light rounded-full text-white flex items-center justify-center shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDeleteClick(ticket.id); }}
                  className="w-10 h-10 bg-red-500/90 hover:bg-red-500 rounded-full text-white flex items-center justify-center shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l18 18" /></svg>
                </button>
              </div>

              {/* Decorative Circles */}
              <div className="absolute -right-6 -top-6 w-20 h-20 bg-ocean-light/10 rounded-full pointer-events-none"></div>
              <div className="absolute -left-6 -bottom-6 w-20 h-20 bg-ocean-light/10 rounded-full pointer-events-none"></div>

              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="pr-20"> {/* Increased padding right to avoid overlap with larger buttons */}
                  <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold bg-slate-200 text-slate-500 uppercase tracking-widest mb-1">{ticket.type}</span>
                  <h3 className="font-bold text-lg leading-tight break-words">{ticket.title}</h3>
                  <p className="text-xs font-medium text-slate-500">{ticket.provider}</p>
                </div>
              </div>

              <div className="flex justify-end mb-3 relative z-10">
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase">DATE</p>
                  <p className="font-bold text-slate-900">{ticket.date}</p>
                  {ticket.time && <p className="text-xs font-bold text-slate-600">{ticket.time}</p>}
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 pt-3 flex flex-col gap-3 relative z-10">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">REF NO.</span>
                    <span className="font-mono font-bold text-sm tracking-widest">{ticket.referenceNumber || '---'}</span>
                  </div>
                </div>

                {ticket.link && (
                  <a
                    href={ticket.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors shadow-lg active:scale-[0.98]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>Open Ticket</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
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

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">種類</label>
                <select className="w-full bg-surface-gray border border-surface-gray-mid rounded-xl p-2.5 text-sm text-ink outline-none" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })}>
                  <option value="flight">✈️ フライト</option>
                  <option value="train">🚄 電車</option>
                  <option value="hotel">🏨 ホテル</option>
                  <option value="event">🎫 イベント</option>
                  <option value="other">✨ その他</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">タイトル</label>
                <input type="text" placeholder="例: 帰りのフライト" className="w-full bg-surface-gray border border-surface-gray-mid rounded-xl p-2.5 text-sm text-ink outline-none" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">詳細 (会社名・場所など)</label>
                <input type="text" placeholder="例: JAL, 東京ドーム" className="w-full bg-surface-gray border border-surface-gray-mid rounded-xl p-2.5 text-sm text-ink outline-none" value={formData.provider || ''} onChange={e => setFormData({ ...formData, provider: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">日付</label>
                  <input type="date" className="w-full bg-surface-gray border border-surface-gray-mid rounded-xl p-2.5 text-sm text-ink outline-none" value={formData.date || ''} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">時間</label>
                  <input type="time" className="w-full bg-surface-gray border border-surface-gray-mid rounded-xl p-2.5 text-sm text-ink outline-none" value={formData.time || ''} onChange={e => setFormData({ ...formData, time: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">予約番号 / 座席</label>
                <input type="text" placeholder="番号や座席など" className="w-full bg-surface-gray border border-surface-gray-mid rounded-xl p-2.5 text-sm text-ink outline-none" value={formData.referenceNumber || ''} onChange={e => setFormData({ ...formData, referenceNumber: e.target.value })} />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-ink-sub mb-1 uppercase tracking-widest">チケットURL</label>
                <input type="url" placeholder="https://..." className="w-full bg-surface-gray border border-surface-gray-mid rounded-xl p-2.5 text-sm text-ink outline-none" value={formData.link || ''} onChange={e => setFormData({ ...formData, link: e.target.value })} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl text-xs font-bold text-ink-sub hover:bg-surface-gray border border-surface-gray-mid">キャンセル</button>
                <button type="button" onClick={(e) => { e.stopPropagation(); handleSubmit(e); }} className="flex-1 py-3 rounded-xl bg-primary text-white text-xs font-bold shadow-lg hover:bg-primary/90 active:scale-95 transition-all">保存</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketView;
