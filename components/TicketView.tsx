import React, { useState, useRef } from 'react';
import { Ticket, UserProfile, Participant } from '../types';
import { AppIcon } from './AppIcon';

interface Props {
  tickets: Ticket[];
  userProfiles: UserProfile[];
  onSave: (ticket: Ticket) => void;
  onDelete: (id: string) => void;
  tripEndDate: string;
  tripStartDate?: string;
  isTablet?: boolean;
}

// チケット種別の日本語マッピング
const TYPE_LABELS: Record<string, string> = {
  flight: '飛行機',
  train: '電車・新幹線',
  hotel: 'ホテル',
  event: 'イベント',
  other: 'その他',
};

const TicketView: React.FC<Props> = ({ tickets, userProfiles, onSave, onDelete, tripStartDate, tripEndDate, isTablet = false }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Ticket>>({ type: 'flight' });
  const [selectedDate, setSelectedDate] = useState<string>('');
  // F1: 'overall'は全員表示、'personal'は個人フィルタリング
  const [viewMode, setViewMode] = useState<'overall' | 'personal'>('overall');
  const [selectedMemberId, setSelectedMemberId] = useState<string>(userProfiles[0]?.id || '');
  const [error, setError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  // F2: window.confirm廃止 → インライン削除確認用のstate
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // C1: OCR状態管理
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const ocrInputRef = useRef<HTMLInputElement>(null);

  // 旅行期間の日付配列
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
      setError('保存中にエラーが発生しました');
    }
  };

  // F2: インライン削除確認
  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
  };
  const handleDeleteConfirm = (id: string) => {
    onDelete(id);
    setDeletingId(null);
  };
  const handleDeleteCancel = () => {
    setDeletingId(null);
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

  // F1修正: overallは全員のチケット（日付フィルタのみ）、personalは個人フィルタリング
  const filteredTickets = tickets.filter(t => {
    const isDateMatch = !selectedDate || t.date === selectedDate;
    if (!isDateMatch) return false;
    if (viewMode === 'personal') return t.participantId === selectedMemberId;
    return true; // overall: 全員表示
  });

  // C1: Tesseract.jsを使ったOCR読み取り
  const handleOcrImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsOcrRunning(true);
    setOcrProgress(0);

    try {
      // 動的インポートでバンドルサイズを削減
      const Tesseract = await import('tesseract.js');

      // 英語+日本語の両方で認識を試みる
      const result = await Tesseract.recognize(
        file,
        'eng+jpn',
        {
          logger: (m: { status: string; progress: number }) => {
            if (m.status === 'recognizing text') {
              setOcrProgress(Math.round(m.progress * 100));
            }
          }
        }
      );

      const text = result.data.text;

      // 予約番号らしい英数字パターンを抽出（6〜15文字の英数字）
      const referencePattern = /\b[A-Z0-9]{5,15}\b/g;
      const candidates = text.match(referencePattern) || [];

      // 一般的すぎる単語を除外してもっとも長い候補を予約番号として使う
      const filtered = candidates.filter(c =>
        !['AND', 'THE', 'FOR', 'FROM', 'WITH', 'THIS', 'THAT'].includes(c)
      );

      if (filtered.length > 0) {
        // 最長の候補を予約番号として採用
        const best = filtered.sort((a, b) => b.length - a.length)[0];
        setFormData(prev => ({ ...prev, referenceNumber: best }));
      }

      // タイトルがまだ空の場合はOCRテキストの最初の行を候補として入れる
      if (!formData.title) {
        const firstLine = text.split('\n').find(l => l.trim().length > 2)?.trim() || '';
        if (firstLine) {
          setFormData(prev => ({ ...prev, title: prev.title || firstLine.slice(0, 30) }));
        }
      }

    } catch (err) {
      console.error('OCR error:', err);
      setError('OCR読み取りに失敗しました。別の写真をお試しください。');
    } finally {
      setIsOcrRunning(false);
      setOcrProgress(0);
      // inputをリセットして同じファイルも再選択できる状態に
      if (ocrInputRef.current) ocrInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 pt-2 pb-24">
      {/* ヘッダー */}
      <div className="flex justify-between items-center px-4">
        <h2 className="text-2xl font-sans font-black tracking-tight text-ink">チケット</h2>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="bg-primary hover:bg-primary/90 text-white text-[11px] font-black uppercase tracking-widest px-6 py-2.5 rounded-full shadow-xl shadow-primary/20 active:scale-95 transition-all"
        >
          + 追加
        </button>
      </div>

      {/* メンバー & 日付フィルター */}
      <div className="space-y-4 sticky top-0 z-30 bg-surface-gray/95 backdrop-blur-md py-4 -mx-4 px-4 border-b border-surface-gray-mid/50">
        {/* U3: 全員/個人タブを日本語に */}
        <div className="flex bg-white/50 p-1.5 rounded-2xl border border-surface-gray-mid/30 shadow-inner">
          <button
            onClick={() => setViewMode('overall')}
            className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${viewMode === 'overall' ? 'bg-ink text-white shadow-lg' : 'text-ink-sub hover:bg-white'}`}
          >
            🌎 全員
          </button>
          <button
            onClick={() => setViewMode('personal')}
            className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${viewMode === 'personal' ? 'bg-primary text-white shadow-lg' : 'text-ink-sub hover:bg-white'}`}
          >
            👤 個人
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
        {/* U2: 空状態を日本語化してCTAボタン追加 */}
        {filteredTickets.length === 0 && (
          <div className="bg-white/50 p-16 rounded-[40px] text-center border-2 border-dashed border-surface-gray-mid/50 shadow-inner">
            <div className="mb-4 opacity-20">
              <span className="text-7xl">🎫</span>
            </div>
            <p className="text-sm font-black text-ink mb-1">チケットはまだありません</p>
            <p className="text-[11px] text-ink-sub mt-1 mb-6">「+ 追加」からフライトや宿泊を登録しましょう</p>
            <button
              onClick={handleOpenAdd}
              className="px-6 py-3 bg-primary text-white text-sm font-bold rounded-full shadow-lg shadow-primary/20 active:scale-95 transition-all"
            >
              + チケットを追加
            </button>
          </div>
        )}

        {filteredTickets.map(ticket => {
          const profile = getProfile(ticket.participantId);
          const isDeleting = deletingId === ticket.id;

          return (
            <div key={ticket.id} className="relative group perspective">
              <div className="bg-white rounded-[40px] overflow-hidden shadow-2xl shadow-ink/5 border border-surface-gray-mid/30 hover:shadow-primary/10 transition-all duration-500 relative">

                {/* プレミアム・ボーディングパス装飾 */}
                <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-ocean-dark via-primary to-accent/60 opacity-90" />

                {/* メンバーバッジ（複数対応スタック表示） */}
                {(() => {
                  const pIds = (ticket as any).passengerIds || (ticket.participantId ? [ticket.participantId] : []);
                  if (pIds.length === 0) {
                    return (
                      <div className="absolute top-6 right-8 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-surface-gray/90 backdrop-blur-md border border-white/50 shadow-sm">
                        <span className="text-[11px] font-black text-emerald-600 uppercase tracking-widest">🌎 全員</span>
                      </div>
                    );
                  }

                  const profiles = userProfiles.filter(p => pIds.includes(p.id));
                  return (
                    <div className="absolute top-6 right-8 z-20 flex -space-x-3 items-center">
                      {profiles.map((p, i) => (
                        <div
                          key={p.id}
                          className="w-9 h-9 rounded-full border-2 border-white overflow-hidden shadow-lg transform hover:-translate-y-1 transition-transform cursor-help"
                          style={{ zIndex: 10 - i }}
                          title={p.displayName}
                        >
                          {p.avatarUrl ? (
                            <img src={p.avatarUrl} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-white font-bold" style={{ backgroundColor: p.color }}>
                              {p.displayName[0]}
                            </div>
                          )}
                        </div>
                      ))}
                      {profiles.length > 0 && (
                        <div className="ml-2 bg-surface-gray/80 backdrop-blur-sm px-2 py-1 rounded-md border border-white/50 shadow-sm">
                          <span className="text-[9px] font-black text-ink-sub uppercase tracking-tighter">
                            {profiles.length === 1 ? profiles[0].displayName : `${profiles.length}名`}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* チケットパンチ（左右の切り込み） */}
                <div className="absolute top-[65%] -left-5 w-10 h-10 bg-surface-gray rounded-full border border-surface-gray-mid/50 z-10 shadow-[inset_-4px_0_8px_rgba(0,0,0,0.05)]"></div>
                <div className="absolute top-[65%] -right-5 w-10 h-10 bg-surface-gray rounded-full border border-surface-gray-mid/50 z-10 shadow-[inset_4px_0_8px_rgba(0,0,0,0.05)]"></div>

                <div className="p-10 pb-6 relative">
                  {/* ヘッダーセクション */}
                  <div className="flex justify-between items-start mb-10">
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 rounded-[28px] bg-surface-gray flex items-center justify-center text-4xl shadow-inner border border-white relative group-hover:scale-105 transition-transform duration-500">
                        {getTypeIcon(ticket.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          {/* U4: typeを日本語表示 */}
                          <span className="text-[11px] font-black text-primary uppercase tracking-[0.25em]">{TYPE_LABELS[ticket.type] || ticket.type}</span>
                          <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
                          <span className="text-[11px] font-black text-ink-sub/60 tracking-widest uppercase truncate max-w-[140px]">{ticket.provider}</span>
                        </div>
                        <h3 className="font-black text-ink text-3xl leading-none tracking-tighter">{ticket.title}</h3>
                      </div>
                    </div>
                  </div>

                  {/* メイン情報セクション */}
                  <div className="grid grid-cols-2 gap-10 mb-8 px-2">
                    <div className="space-y-6">
                      <div>
                        {/* U1: 英語ラベルを日本語化 */}
                        <p className="text-[10px] font-black text-ink-light uppercase tracking-[0.25em] mb-2">日付・時刻</p>
                        <div className="flex items-baseline gap-2.5">
                          <p className="text-2xl font-black text-ink">{ticket.date.split('-').slice(1).join('/')}</p>
                          {ticket.time && <p className="text-lg font-black text-primary/80">{ticket.time}</p>}
                        </div>
                      </div>

                      <div
                        className={`group/ref rounded-[24px] p-5 transition-all cursor-pointer relative overflow-hidden border-2 ${copyFeedback === ticket.referenceNumber ? 'bg-emerald-50 border-emerald-200' : 'bg-surface-gray/40 border-transparent hover:border-primary/20'}`}
                        onClick={() => ticket.referenceNumber && handleCopy(ticket.referenceNumber)}
                      >
                        <p className="text-[10px] font-black text-ink-sub uppercase tracking-widest mb-2 flex justify-between items-center opacity-60">
                          予約番号・席番
                          <AppIcon name="save" className="w-3.5 h-3.5 group-hover/ref:scale-110 transition-transform" />
                        </p>
                        <p className="text-base font-mono font-black text-ink tracking-[0.1em] truncate">{ticket.referenceNumber || '---'}</p>
                        {copyFeedback === ticket.referenceNumber && (
                          <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center backdrop-blur-[2px] animate-in fade-in zoom-in duration-200">
                            <span className="text-[11px] font-black text-emerald-600 uppercase tracking-widest">コピー済み ✓</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col justify-between py-1">
                      <div className="bg-gradient-to-br from-ink/3 to-ink/7 rounded-3xl p-6 border border-white/50 shadow-sm flex flex-col items-center justify-center text-center">
                        <p className="text-[10px] font-black text-ink-light uppercase tracking-widest mb-2.5">ステータス</p>
                        <div className="text-[11px] font-black text-ink tracking-[0.2em] border-2 border-ink px-4 py-1.5 bg-white/40 rotate-[-1deg] shadow-sm transform hover:rotate-0 transition-transform">有効チケット</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(ticket)}
                        className="w-full py-4 bg-white hover:bg-surface-gray rounded-2xl border border-surface-gray-mid/40 text-[11px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-sm"
                      >
                        ✏️ 編集する
                      </button>
                    </div>
                  </div>

                  {/* 備考・メモセクション */}
                  {ticket.notes && (
                    <div className="mb-10 bg-accent/5 p-5 rounded-[28px] border border-accent/10 relative overflow-hidden group/note">
                      <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-accent/10 rounded-full blur-2xl group-hover/note:scale-150 transition-transform duration-700"></div>
                      <p className="text-[10px] font-black text-accent-dark uppercase tracking-widest mb-2 flex items-center gap-2">
                        <span className="text-sm">📝</span> メモ
                      </p>
                      <p className="text-[12px] font-bold text-ink-sub leading-relaxed relative z-10">{ticket.notes}</p>
                    </div>
                  )}

                  {/* 切り取り線（点線） */}
                  <div className="relative h-10 flex items-center justify-center pointer-events-none -mx-10 overflow-hidden">
                    <div className="w-full border-t-[3px] border-dashed border-surface-gray-mid/30"></div>
                  </div>

                  {/* アクションセクション */}
                  <div className="flex gap-4 mt-2">
                    {ticket.link ? (
                      <a
                        href={ticket.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-3 py-5 bg-ink text-white rounded-[24px] text-xs font-black uppercase tracking-[0.3em] hover:bg-primary transition-all shadow-2xl shadow-ink/20 active:scale-[0.98] overflow-hidden relative group/btn"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000"></div>
                        <span className="text-xl">🎟️</span>
                        チケットを開く
                      </a>
                    ) : (
                      <div className="flex-1 py-5 bg-surface-gray/50 rounded-[24px] text-xs font-black uppercase tracking-[0.3em] text-ink-sub/40 flex items-center justify-center gap-3 border border-surface-gray-mid/20">
                        <span className="text-xl opacity-30">🎟️</span>
                        リンクなし
                      </div>
                    )}

                    {/* F2: インライン削除確認 */}
                    {isDeleting ? (
                      <div className="flex gap-2 items-center animate-in fade-in duration-200">
                        <button
                          type="button"
                          onClick={() => handleDeleteConfirm(ticket.id)}
                          className="h-16 px-4 flex items-center justify-center bg-rose-500 hover:bg-rose-600 text-white rounded-[24px] text-[10px] font-black tracking-widest transition-all active:scale-90 shadow-lg shadow-rose-500/20"
                        >
                          削除
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteCancel}
                          className="h-16 px-4 flex items-center justify-center bg-surface-gray hover:bg-surface-gray-mid rounded-[24px] text-[10px] font-black tracking-widest transition-all active:scale-90"
                        >
                          戻る
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(ticket.id); }}
                        className="w-16 h-16 items-center justify-center bg-rose-50/50 hover:bg-rose-100 border border-rose-100 rounded-[24px] text-rose-300 hover:text-rose-600 transition-all active:scale-90 flex shadow-sm group/del"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover/del:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 追加・編集モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-ink/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[48px] p-10 border border-white shadow-2xl overflow-y-auto max-h-[90vh] pb-14 relative animate-in slide-in-from-bottom duration-500">
            {/* 閉じるボタン */}
            <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 w-12 h-12 rounded-full bg-surface-gray flex items-center justify-center text-ink-sub hover:bg-ink hover:text-white transition-all shadow-sm text-2xl font-light">×</button>

            <h3 className="text-3xl font-sans font-black mb-6 text-ink tracking-tighter">
              {formData.id ? '✏️ 編集' : '🎫 チケット追加'}
            </h3>

            {/* C1: OCR自動読み取りセクション */}
            <div className="mb-8 p-5 bg-primary/5 border border-primary/20 rounded-[28px]">
              <p className="text-[11px] font-black text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
                <span>📷</span> 写真からOCR自動入力
              </p>
              <p className="text-[10px] text-ink-sub mb-4 leading-relaxed">
                チケットや予約確認メールの写真を選択すると、予約番号を自動で読み取ります
              </p>

              {/* OCR進行中のプログレスバー */}
              {isOcrRunning && (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-primary">読み取り中...</span>
                    <span className="text-[10px] font-bold text-primary">{ocrProgress}%</span>
                  </div>
                  <div className="w-full bg-surface-gray rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${ocrProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <input
                ref={ocrInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleOcrImage}
              />
              <button
                type="button"
                onClick={() => ocrInputRef.current?.click()}
                disabled={isOcrRunning}
                className={`w-full py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 border-2 border-dashed ${isOcrRunning
                  ? 'border-primary/30 bg-primary/5 text-primary/40 cursor-not-allowed'
                  : 'border-primary/40 hover:border-primary hover:bg-primary/5 text-primary'
                  }`}
              >
                {isOcrRunning ? '🔍 読み取り中...' : '📷 写真を選択してOCR読み取り'}
              </button>
            </div>

            <div className="space-y-8">
              {/* エラー表示 */}
              {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 text-xs font-bold text-rose-600">
                  ⚠️ {error}
                </div>
              )}

              {/* 搭乗者・利用者（複数選択） */}
              <div>
                <label className="block text-[11px] font-black text-ink-sub mb-1 uppercase tracking-[0.25em] px-1">搭乗者・利用者</label>
                <p className="text-[10px] text-ink-light mb-4 px-1">複数選択OK。選択なし=全員対象</p>
                <div className="flex flex-wrap gap-2.5">
                  {userProfiles.map(p => {
                    const passengers = (formData as any).passengerIds as string[] || [];
                    const selected = passengers.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          const curr: string[] = (formData as any).passengerIds || [];
                          const next = curr.includes(p.id) ? curr.filter((x: string) => x !== p.id) : [...curr, p.id];
                          setFormData({ ...formData, passengerIds: next } as any);
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
                {((formData as any).passengerIds || []).length === 0 && (
                  <p className="mt-2 text-[10px] font-bold text-emerald-600">✓ 全員対象のチケット</p>
                )}
              </div>


              {/* 種類 */}
              <div>
                <label className="block text-[11px] font-black text-ink-sub mb-4 uppercase tracking-[0.25em] px-1">種類</label>
                <div className="grid grid-cols-5 gap-3.5">
                  {(['flight', 'train', 'hotel', 'event', 'other'] as Ticket['type'][]).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: t })}
                      className={`flex flex-col items-center justify-center p-4 rounded-[22px] border-2 transition-all active:scale-90 ${formData.type === t ? 'bg-primary/5 border-primary text-primary shadow-xl shadow-primary/5' : 'bg-surface-gray border-transparent text-ink-sub hover:border-surface-gray-mid'}`}
                    >
                      <span className="text-2xl mb-2">{getTypeIcon(t)}</span>
                      {/* U4: 種類ボタンを日本語に */}
                      <span className="text-[8px] font-black">{t === 'flight' ? '飛行機' : t === 'train' ? '電車' : t === 'hotel' ? 'ホテル' : t === 'event' ? 'ｲﾍﾞﾝﾄ' : 'その他'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* タイトル & プロバイダー */}
              <div className="space-y-5">
                <div>
                  <label className="block text-[11px] font-black text-ink-sub mb-2.5 uppercase tracking-[0.25em] px-1">タイトル *</label>
                  <input type="text" placeholder="例: 成田フライト" className="w-full bg-surface-gray border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-6 py-4 text-base font-bold text-ink outline-none transition-all shadow-inner" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-ink-sub mb-2.5 uppercase tracking-[0.25em] px-1">会社・提供者</label>
                  <input type="text" placeholder="例: JAL, Hilton" className="w-full bg-surface-gray border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-6 py-4 text-base font-bold text-ink outline-none transition-all shadow-inner" value={formData.provider || ''} onChange={e => setFormData({ ...formData, provider: e.target.value })} />
                </div>
              </div>

              {/* 日付 + 時間 */}
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-[11px] font-black text-ink-sub mb-2.5 uppercase tracking-[0.25em] px-1">日付 *</label>
                  <input type="date" className="w-full bg-surface-gray border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-6 py-4 text-sm font-bold text-ink outline-none transition-all shadow-inner" value={formData.date || ''} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-ink-sub mb-2.5 uppercase tracking-[0.25em] px-1">時刻</label>
                  <input type="time" className="w-full bg-surface-gray border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-6 py-4 text-sm font-bold text-ink outline-none transition-all shadow-inner" value={formData.time || ''} onChange={e => setFormData({ ...formData, time: e.target.value })} />
                </div>
              </div>

              {/* 予約番号（OCRで自動入力される） */}
              <div>
                <label className="block text-[11px] font-black text-ink-sub mb-2.5 uppercase tracking-[0.25em] px-1">
                  予約番号・座席番号
                  <span className="ml-2 text-primary/60 normal-case tracking-normal font-bold">← OCRで自動入力</span>
                </label>
                <input
                  type="text"
                  placeholder="예: ABC123XYZ"
                  className={`w-full bg-surface-gray border-2 rounded-2xl px-6 py-4 text-base font-bold text-ink outline-none transition-all shadow-inner ${formData.referenceNumber ? 'border-primary/30 bg-primary/5' : 'border-transparent focus:border-primary/20 focus:bg-white'}`}
                  value={formData.referenceNumber || ''}
                  onChange={e => setFormData({ ...formData, referenceNumber: e.target.value })}
                />
              </div>

              {/* メモ */}
              <div>
                <label className="block text-[11px] font-black text-ink-sub mb-2.5 uppercase tracking-[0.25em] px-1">メモ・注意事項</label>
                <textarea
                  placeholder="乗り換えや注意点など..."
                  rows={2}
                  className="w-full bg-surface-gray border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-6 py-4 text-base font-bold text-ink outline-none transition-all shadow-inner resize-none"
                  value={formData.notes || ''}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              {/* URL */}
              <div className="pt-2">
                <label className="block text-[11px] font-black text-ink-sub mb-2.5 uppercase tracking-[0.25em] px-1">チケットURL（予約サイト等）</label>
                <input type="url" placeholder="https://..." className="w-full bg-surface-gray border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-6 py-4 text-base font-bold text-ink outline-none transition-all shadow-inner" value={formData.link || ''} onChange={e => setFormData({ ...formData, link: e.target.value })} />
              </div>

              {/* ボタン */}
              <div className="flex gap-4 pt-10">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 rounded-[28px] text-xs font-black uppercase tracking-[0.3em] text-ink-sub hover:bg-surface-gray transition-all active:scale-[0.98]">キャンセル</button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleSubmit(e); }}
                  className="flex-[2] py-5 rounded-[28px] bg-ink text-white text-xs font-black uppercase tracking-[0.4em] shadow-2xl shadow-ink/30 hover:bg-primary transition-all active:scale-[0.98]"
                >
                  💾 保存する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketView;
