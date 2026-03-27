import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Ticket, UserProfile } from '../types';
import { AppIcon } from './AppIcon';
import { useTripDates } from '../hooks/useTripDates';
import { useMemberFilter } from '../hooks/useMemberFilter';

interface Props {
  tickets: Ticket[];
  userProfiles: UserProfile[];
  onSave: (ticket: Ticket) => void;
  onDelete: (id: string) => void;
  tripEndDate: string;
  tripStartDate?: string;
  isTablet?: boolean;
  autoOpenAdd?: boolean;
}

// チケット種別の日本語マッピング
const TYPE_LABELS: Record<string, string> = {
  flight: '飛行機',
  train: '電車・新幹線',
  hotel: 'ホテル',
  event: 'イベント',
  other: 'その他',
};

const TicketView: React.FC<Props> = ({ tickets, userProfiles, onSave, onDelete, tripStartDate, tripEndDate, isTablet = false, autoOpenAdd }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { selectedDate, setSelectedDate, dateRange, getDayLabel, isTodayDate } = useTripDates(tripStartDate || '', tripEndDate);
  const { showOverall, setShowOverall, visibleMemberIds, toggleMember } = useMemberFilter(userProfiles);
  const [formData, setFormData] = useState<Partial<Ticket>>({ type: 'flight' });
  const [error, setError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const ocrInputRef = useRef<HTMLInputElement>(null);

  // F1: 画像・PDFのリサイズユーティリティを流用（ItineraryViewから着想）
  const processImageForStorage = async (file: File): Promise<string> => {
    const { resizeImage } = await import('../utils/imageUtils');
    return await resizeImage(file, 1200); // チケットなので少し高画質めに保持
  };

  // 直接追加フォームを開く処理
  useEffect(() => {
    if (autoOpenAdd) {
      handleOpenAdd();
    }
  }, [autoOpenAdd]);

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


  const filteredTickets = useMemo(() => {
    let list = [...tickets];

    // 1. メンバーでフィルタリング
    if (!showOverall) {
      list = list.filter(t => {
        const pIds = t.passengerIds || (t.participantId ? [t.participantId] : []);
        if (pIds.length === 0) return true; // 全員向けは常に表示
        return pIds.some(id => visibleMemberIds.includes(id));
      });
    }

    // 2. 日付で絞り込み
    if (selectedDate) {
      list = list.filter(t => t.date === selectedDate);
    }

    return list.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }, [tickets, showOverall, visibleMemberIds, selectedDate]);

  // C1: Tesseract.jsを使ったOCR読み取り & 画像保存
  const handleOcrImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsOcrRunning(true);
    setOcrProgress(5); // 開始

    try {
      // PDF/画像のデータ保存用（OCRとは別に処理）
      let savedImageUrl = '';
      let fileType: 'image' | 'pdf' = file.type === 'application/pdf' ? 'pdf' : 'image';

      // 1. 保存用の画像処理
      if (file.type === 'application/pdf') {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2.0 });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport } as any).promise;
          savedImageUrl = canvas.toDataURL('image/jpeg', 0.8);
        }
      } else {
        savedImageUrl = await processImageForStorage(file);
      }

      // プレーンに画像を保存（OCRの前に行う）
      setFormData(prev => ({ ...prev, imageUrl: savedImageUrl, fileType }));

      // 2. OCR処理
      const Tesseract = await import('tesseract.js');
      const result = await Tesseract.recognize(
        savedImageUrl || file,
        'eng+jpn',
        {
          logger: (m: { status: string; progress: number }) => {
            if (m.status === 'recognizing text') {
              setOcrProgress(10 + Math.round(m.progress * 90));
            }
          }
        }
      );

      const text = result.data.text;

      // 予約番号抽出
      const referencePattern = /\b[A-Z0-9]{5,15}\b/g;
      const candidates = text.match(referencePattern) || [];
      const filtered = candidates.filter(c =>
        !['AND', 'THE', 'FOR', 'FROM', 'WITH', 'THIS', 'THAT'].includes(c)
      );

      if (filtered.length > 0) {
        const best = filtered.sort((a, b) => b.length - a.length)[0];
        setFormData(prev => ({ ...prev, referenceNumber: best }));
      }

      // タイトル補完
      if (!formData.title) {
        const firstLine = text.split('\n').find(l => l.trim().length > 2)?.trim() || '';
        if (firstLine) {
          setFormData(prev => ({ ...prev, title: prev.title || firstLine.slice(0, 30) }));
        }
      }

    } catch (err) {
      console.error('File processing/OCR error:', err);
      setError('ファイルの処理に失敗しました。');
    } finally {
      setIsOcrRunning(false);
      setOcrProgress(0);
      if (ocrInputRef.current) ocrInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 pt-2">
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

      {/* 画面上部：メンバートグル */}
      <div className="bg-surface-gray border-b border-surface-gray-mid/50 pt-4 pb-2 px-4 shadow-sm">
        <div className="flex bg-white/80 p-1 rounded-full mb-4 mx-auto w-full max-w-[320px] shadow-sm border border-surface-gray-mid/50">
          <button
            onClick={() => setShowOverall(true)}
            className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-full transition-all duration-500 flex items-center justify-center gap-2.5 ${showOverall ? 'bg-ink text-white shadow-xl shadow-ink/20 scale-[1.02]' : 'bg-transparent text-ink-sub hover:text-ink'}`}
          >
            <span className="text-sm">🌎</span>
            全員
          </button>
          <button
            onClick={() => setShowOverall(false)}
            className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-full transition-all duration-500 flex items-center justify-center gap-2.5 ${!showOverall ? 'bg-ink text-white shadow-xl shadow-ink/20 scale-[1.02]' : 'bg-transparent text-ink-sub hover:text-ink'}`}
          >
            <span className="text-sm">👤</span>
            個人
          </button>
        </div>

        {/* メンバー選択 */}
        {!showOverall && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-4 mb-1 animate-in fade-in slide-in-from-top-2 duration-500 justify-start sm:justify-center">
            {userProfiles.map(p => (
              <button
                key={p.id}
                onClick={() => toggleMember(p.id)}
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

        {/* 日付横スクロールバー */}
        {dateRange.length > 0 && (
          <div className="overflow-x-auto scrollbar-hide mb-2 px-0 pt-4">
            <div className="flex gap-3 pb-2 min-w-min justify-start sm:justify-center">
              {dateRange.map((d, i) => {
                const label = getDayLabel(d, i);
                const isSelected = selectedDate === d;
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
                        ? 'bg-ink border-ink shadow-xl shadow-ink/20 scale-105 z-10'
                        : 'bg-white border-surface-gray-mid/50 text-ink-light'
                        }`}
                    >
                      <span className={`text-[9px] font-black uppercase tracking-tighter mb-1.5 ${isSelected ? 'text-white/60' : 'text-ink-sub'}`}>
                        {label.day}
                      </span>

                      <span className={`text-2xl font-black leading-none ${isSelected ? 'text-white' : 'text-ink'}`}>
                        {label.date}
                      </span>

                      <div className="flex items-center gap-1 mt-2">
                        <span className={`text-[9px] font-bold ${isSelected ? 'text-white/50' : 'text-ink-sub/40'}`}>
                          {label.week}
                        </span>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className={`space-y-4 px-2 sm:px-1 ${isTablet ? 'grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 space-y-0' : 'flex flex-col gap-4'}`}>
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
          const isDeleting = deletingId === ticket.id;

          return (
            <div key={ticket.id} className="relative group overflow-visible">
              {/* カード本体 */}
              <div className="bg-white rounded-[24px] overflow-hidden shadow-xl shadow-ink/5 border border-surface-gray-mid/30 hover:shadow-primary/10 transition-all duration-500 relative flex flex-col sm:flex-row min-h-[140px] sm:min-h-0 sm:h-28">

                {/* プレミアム・アクセントライン */}
                <div className="w-full h-1 sm:w-2 sm:h-auto bg-gradient-to-r sm:bg-gradient-to-b from-ocean-dark via-primary to-accent/60 opacity-90" />

                <div className="flex-1 p-3 sm:p-4 flex flex-col sm:flex-row items-stretch gap-3 sm:gap-4">
                  {/* アイコン & タイトル */}
                  <div className="flex-1 flex items-center gap-4 min-w-0 w-full sm:w-auto">
                    <div className="w-12 h-12 rounded-2xl bg-surface-gray flex items-center justify-center text-2xl shadow-inner border border-white flex-shrink-0 group-hover:rotate-6 transition-transform">
                      {getTypeIcon(ticket.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[8px] font-black text-primary uppercase tracking-[0.15em] shrink-0">{TYPE_LABELS[ticket.type] || ticket.type}</span>
                        <div className="w-1 h-1 rounded-full bg-surface-gray-mid/60" />
                        <span className="text-[9px] font-bold text-ink-sub/60 truncate opacity-60">{ticket.provider}</span>
                      </div>
                      <h3 className="font-black text-ink text-base sm:text-lg leading-tight tracking-tight truncate">{ticket.title}</h3>
                      {ticket.notes && <p className="text-[9px] text-ink-sub font-bold truncate opacity-70 mt-0.5">📝 {ticket.notes}</p>}
                    </div>
                  </div>

                  {/* 点線セパレーター (モバイルでは省略してマージンで調整) */}
                  <div className="hidden sm:block w-px border-l-2 border-dashed border-surface-gray-mid/30 my-2" />

                  {/* 日付・予約番号 */}
                  <div className="flex sm:flex-col justify-around sm:justify-center items-center sm:items-start gap-4 sm:gap-1 w-full sm:w-auto px-2">
                    <div className="text-center sm:text-left">
                      <p className="text-[7px] font-black text-ink-light uppercase tracking-widest mb-0.5 opacity-60">DATE/TIME</p>
                      <div className="flex items-baseline justify-center sm:justify-start gap-1">
                        <p className="text-xs font-black text-ink">{ticket.date.split('-').slice(1).join('/')}</p>
                        {ticket.time && <p className="text-[10px] font-bold text-primary/80">{ticket.time}</p>}
                      </div>
                    </div>
                    <div
                      className={`cursor-pointer px-2 py-0.5 rounded-lg transition-all ${copyFeedback === ticket.referenceNumber ? 'bg-emerald-50' : 'hover:bg-surface-gray'}`}
                      onClick={(e) => { e.stopPropagation(); ticket.referenceNumber && handleCopy(ticket.referenceNumber); }}
                    >
                      <p className="text-[7px] font-black text-ink-sub uppercase tracking-widest mb-0.5 opacity-60">REF NO.</p>
                      <p className="text-[10px] font-mono font-black text-ink tracking-tight truncate max-w-[80px]">
                        {ticket.referenceNumber || '---'}
                        {copyFeedback === ticket.referenceNumber && <span className="ml-1 text-emerald-500">✓</span>}
                      </p>
                    </div>
                  </div>

                  {/* 点線セパレーター (2つ目) */}
                  <div className="hidden sm:block w-px border-l-2 border-dashed border-surface-gray-mid/30 my-2" />

                  {/* アクションボタン */}
                  <div className="flex items-center gap-2 flex-1 sm:flex-none">
                    {ticket.imageUrl && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setLightboxImage(ticket.imageUrl!); }}
                        className="flex-1 sm:flex-none h-11 px-5 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-ink transition-all shadow-xl shadow-primary/20 active:scale-95 flex items-center justify-center gap-2"
                      >
                        <span className="text-sm">🔍</span>
                        表示する
                      </button>
                    )}

                    {ticket.link && (
                      <a
                        href={ticket.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex-1 sm:flex-none h-11 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-1.5 ${ticket.imageUrl
                          ? 'bg-ink/5 text-ink-sub border border-surface-gray-mid/50 hover:bg-surface-gray'
                          : 'bg-ink text-white hover:bg-primary shadow-primary/10'
                          }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-sm">{ticket.imageUrl ? '' : '🎟️'}</span>
                        {ticket.imageUrl ? '🎫リンクOPEN' : 'OPEN'}
                      </a>
                    )}

                    {!ticket.imageUrl && !ticket.link && (
                      <div className="flex-1 sm:flex-none h-10 px-4 bg-surface-gray rounded-xl text-[9px] font-black uppercase tracking-widest text-ink-sub/30 flex items-center justify-center gap-1.5 border border-surface-gray-mid/20">
                        EMPTY
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOpenEdit(ticket); }}
                      className="w-10 h-10 flex items-center justify-center bg-white border border-surface-gray-mid/50 rounded-xl text-base hover:bg-surface-gray transition-all active:scale-90 shadow-sm"
                    >
                      ✏️
                    </button>

                    <button
                      onClick={(e) => { e.stopPropagation(); isDeleting ? handleDeleteConfirm(ticket.id) : handleDeleteClick(ticket.id); }}
                      onMouseLeave={() => setDeletingId(null)}
                      className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-90 shadow-sm ${isDeleting ? 'bg-rose-500 text-white shadow-lg' : 'bg-rose-50 text-rose-400 hover:text-rose-600 border border-rose-100'}`}
                    >
                      {isDeleting ? <span className="text-[8px] font-black tracking-widest">OK?</span> : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* メンバスイッチ (Itineraryスタイルに統合) */}
              <div className="absolute top-3 left-3 z-30 flex -space-x-2">
                {(() => {
                  const pIds = ticket.passengerIds || (ticket.participantId ? [ticket.participantId] : []);
                  const profiles = userProfiles.filter(p => pIds.includes(p.id));

                  if (profiles.length === 0) {
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

            {/* C1: OCR・PDF自動読み取りセクション */}
            <div className="mb-8 p-5 bg-primary/5 border border-primary/20 rounded-[28px]">
              <p className="text-[11px] font-black text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
                <span>📷</span> 画像 / PDFから自動入力
              </p>
              <p className="text-[10px] text-ink-sub mb-4 leading-relaxed">
                eチケットのPDFや予約完了メールのスクショを選択すると、予約番号を自動で読み取ります。
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
                accept="image/*,application/pdf"
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
                {isOcrRunning ? '🔍 読み取り中...' : '📷 チケットをアップロード'}
              </button>

              {/* 画像プレビュー（モーダル内） */}
              {formData.imageUrl && (
                <div className="mt-4 relative group">
                  <div className="aspect-[16/9] rounded-2xl overflow-hidden border border-primary/20 bg-black/5">
                    <img src={formData.imageUrl} className="w-full h-full object-contain" alt="Preview" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, imageUrl: undefined, fileType: undefined }))}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg active:scale-90"
                  >
                    ×
                  </button>
                </div>
              )}
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
                  <input type="date" min={tripStartDate} max={tripEndDate} className="w-full bg-surface-gray border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-6 py-4 text-sm font-bold text-ink outline-none transition-all shadow-inner" value={formData.date || ''} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-ink-sub mb-2.5 uppercase tracking-[0.25em] px-1">時刻</label>
                  <input type="time" className="w-full bg-surface-gray border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-6 py-4 text-sm font-bold text-ink outline-none transition-all shadow-inner" value={formData.time || ''} onChange={e => setFormData({ ...formData, time: e.target.value })} />
                </div>
              </div>

              {/* 予約番号 */}
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
      )
      }

      {/* ライトボックス（拡大表示） */}
      {
        lightboxImage && (
          <div
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-in fade-in duration-300"
            onClick={() => setLightboxImage(null)}
          >
            <div className="absolute top-6 right-6 flex gap-4">
              <button
                onClick={() => setLightboxImage(null)}
                className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-3xl font-light transition-all active:scale-90 backdrop-blur-md border border-white/20"
              >
                ×
              </button>
            </div>

            <div className="w-full h-full flex items-center justify-center p-2 sm:p-10 select-none">
              <img
                src={lightboxImage}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-500"
                alt="Full Ticket"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            <p className="absolute bottom-8 text-white/40 text-[10px] uppercase font-black tracking-[0.3em]">
              Tap background to close
            </p>
          </div>
        )
      }
    </div >
  );
};

export default TicketView;
