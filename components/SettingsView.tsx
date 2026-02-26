import React, { useRef } from 'react';
import { Participant, UserProfile, ViewModeSize, Expense, ItineraryItem, Ticket, TripData } from '../types';
import { AppIcon } from './AppIcon';
import { MEMBER_COLORS, DEVICE_CONFIG } from '../constants';

interface Props {
  userProfiles: UserProfile[];
  expenses: any[];
  itinerary: any[];
  tickets: any[];
  budget: number;
  tripName: string;
  tripStartDate: string;
  tripEndDate: string;
  coverImage: string;
  onUpdateProfile: (id: Participant, updates: Partial<UserProfile>) => void;
  onLoadSampleData: () => void;
  onRestoreData: () => void;
  onBack: () => void;
  viewModeSize: ViewModeSize;
  onUpdateViewModeSize: (size: ViewModeSize) => void;
  onImportFullData: (data: any) => void;
  onSyncToSheet: () => void;
  onFetchFromSheet: (isLongPress?: boolean) => void;
  isSyncing: boolean;
}

const SettingsView: React.FC<Props> = ({
  userProfiles, expenses, itinerary, tickets, budget, tripName, tripStartDate, tripEndDate, coverImage,
  onUpdateProfile, onLoadSampleData, onRestoreData, onBack, viewModeSize, onUpdateViewModeSize,
  onImportFullData, onSyncToSheet, onFetchFromSheet, isSyncing
}) => {
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const jsonImportRef = useRef<HTMLInputElement>(null);
  // window.confirm/alert 廃止用
  const [importFeedback, setImportFeedback] = React.useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const maxSize = 200;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) { height *= maxSize / width; width = maxSize; }
        } else {
          if (height > maxSize) { width *= maxSize / height; height = maxSize; }
        }
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        onUpdateProfile(id, { avatarUrl: dataUrl });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleExportJSON = () => {
    const data = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      tripDetails: { tripName, tripStartDate, tripEndDate, coverImage, budget },
      userProfiles,
      expenses,
      itinerary,
      tickets
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tabilog-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSONChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        // window.confirm廃止: ファイルを選択した時点で意図確認済みとみなしインポートを実行
        onImportFullData(data);
        setImportFeedback('✓ インポート完了しました');
        setTimeout(() => setImportFeedback(null), 3000);
      } catch (err) {
        setImportFeedback('⚠️ 無効なJSONファイルです');
        setTimeout(() => setImportFeedback(null), 3000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 pt-2 pb-20 max-w-2xl mx-auto px-1">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm border border-surface-gray-mid text-ink-sub hover:text-primary transition-all active:scale-90"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-2xl font-sans font-black text-ink tracking-tight">アプリ設定</h2>
        </div>
        <div className="text-[10px] font-bold text-ink-light bg-surface-gray px-3 py-1.5 rounded-full uppercase tracking-widest border border-surface-gray-mid/50 shadow-sm">
          Ver 1.2
        </div>
      </div>

      {/* 1. プロフィール編集 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <span className="text-xl">👤</span>
          <h3 className="text-xs font-black text-ink uppercase tracking-[0.2em]">プロフィール編集</h3>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {userProfiles.map(profile => {
            const pId = profile.id;
            return (
              <div key={pId} className="bg-white rounded-[32px] p-6 shadow-xl shadow-ink/5 border border-surface-gray-mid/50 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary/10 transition-colors"></div>
                <div className="relative z-10 flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                  {/* アバター */}
                  <div className="relative">
                    <div
                      className="w-24 h-24 rounded-[32px] bg-surface-gray border-4 border-white shadow-lg flex items-center justify-center overflow-hidden cursor-pointer hover:scale-105 transition-all group/avatar"
                      onClick={() => fileInputRefs.current[pId]?.click()}
                      style={{ borderColor: profile.color + '40' }}
                    >
                      {profile.avatarUrl ? (
                        <img src={profile.avatarUrl} alt={profile.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-ink-light/30" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      )}
                      <div className="absolute inset-0 bg-ink/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity backdrop-blur-[2px]">
                        <span className="text-[10px] font-black text-white tracking-widest">変更</span>
                      </div>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center border border-surface-gray-mid">
                      <AppIcon name="camera" className="w-4 h-4 text-primary" />
                    </div>
                  </div>

                  {/* 詳細 */}
                  <div className="flex-1 w-full space-y-5">
                    <div>
                      <label className="text-[10px] font-bold text-ink-sub uppercase tracking-widest mb-2 block">表示名</label>
                      <input
                        type="text"
                        value={profile.displayName}
                        onChange={(e) => onUpdateProfile(pId, { displayName: e.target.value })}
                        className="w-full bg-surface-gray border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-5 py-3.5 text-sm font-bold text-ink outline-none transition-all shadow-inner"
                        placeholder="名前を入力..."
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-ink-sub uppercase tracking-widest mb-2 block">メンバーカラー</label>
                      <div className="flex flex-wrap gap-2.5">
                        {MEMBER_COLORS.map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => onUpdateProfile(pId, { color })}
                            className={`w-8 h-8 rounded-full border-4 transition-all active:scale-75 ${profile.color === color ? 'border-ink/20 scale-110 shadow-md' : 'border-transparent opacity-80 hover:opacity-100'}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <input
                  type="file"
                  ref={(el) => { if (el) fileInputRefs.current[pId] = el; }}
                  className="hidden"
                  accept="image/*"
                  onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                  onChange={(e) => handleFileChange(e, pId)}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. 表示設定 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <span className="text-xl">📱</span>
          <h3 className="text-xs font-black text-ink uppercase tracking-[0.2em]">表示設定</h3>
        </div>
        <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-ink/5 border border-surface-gray-mid/50">
          <p className="text-[11px] text-ink-sub leading-relaxed font-bold mb-6 px-1">
            利用中のデバイスに合わせて画面サイズを切り替えます。
          </p>
          <div className="grid grid-cols-2 gap-4">
            {(Object.entries(DEVICE_CONFIG) as [ViewModeSize, typeof DEVICE_CONFIG[keyof typeof DEVICE_CONFIG]][]).map(([key, config]) => (
              <button
                key={key}
                onClick={() => onUpdateViewModeSize(key)}
                className={`group p-5 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 relative ${viewModeSize === key ? 'border-primary bg-primary/5 shadow-lg' : 'border-surface-gray-mid/30 bg-surface-gray/50 hover:bg-white hover:border-primary/20 hover:shadow-md'}`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl transition-transform group-hover:scale-110 ${viewModeSize === key ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'bg-white text-ink-sub shadow-sm'}`}>
                  {config.icon}
                </div>
                <div className="text-center">
                  <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${viewModeSize === key ? 'text-primary' : 'text-ink-sub'}`}>{config.label}</span>
                  <span className="text-[8px] font-bold text-ink-light opacity-60 block leading-tight">{config.description}</span>
                </div>
                {viewModeSize === key && (
                  <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-accent shadow-[0_0_8px_rgba(255,215,0,0.8)] animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3. クラウド同期 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <span className="text-xl">☁️</span>
          <h3 className="text-xs font-black text-ink uppercase tracking-[0.2em]">クラウド同期</h3>
        </div>
        <div className="bg-gradient-to-br from-ocean-dark to-primary p-7 rounded-[32px] text-white shadow-xl shadow-ocean-dark/20 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" /><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" /><path fill="none" d="M0 0h48v48H0z" /></svg>
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-widest mb-1">スプレッドシート同期</h4>
                <p className="text-[10px] opacity-70 font-bold leading-tight">Googleスプレッドシートとデータを<br />リアルタイムで同期します。</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={onSyncToSheet}
                disabled={isSyncing}
                className="group flex items-center justify-between p-4 bg-white/10 hover:bg-white/20 active:bg-white/30 backdrop-blur-md border border-white/20 rounded-2xl transition-all disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg group-active:scale-90 transition-transform">
                    <AppIcon name="export" className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest">保存・同期を実行</span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
              </button>

              <button
                onPointerDown={(e) => {
                  const timer = setTimeout(() => {
                    onFetchFromSheet(true);
                  }, 1000);
                  const cancel = () => {
                    clearTimeout(timer);
                    e.target.removeEventListener('pointerup', cancel);
                    e.target.removeEventListener('pointerleave', cancel);
                  };
                  e.target.addEventListener('pointerup', cancel);
                  e.target.addEventListener('pointerleave', cancel);
                }}
                onClick={() => onFetchFromSheet(false)}
                disabled={isSyncing}
                className="group flex items-center justify-between p-4 bg-white/10 hover:bg-white/20 active:bg-white/30 backdrop-blur-md border border-white/20 rounded-2xl transition-all disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-ocean-light rounded-lg flex items-center justify-center shadow-lg group-active:scale-90 transition-transform">
                    <AppIcon name="import" className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest">最新データを取得</span>
                </div>
                <div className="flex items-center gap-2">
                  {isSyncing && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </div>
              </button>
            </div>

            <div className="mt-4 flex items-start gap-2 text-white/50 bg-black/10 p-3 rounded-xl border border-white/5">
              <span className="text-xs">💡</span>
              <p className="text-[9px] font-bold leading-relaxed">
                [最新を取得] ボタンを **1秒以上長押し** すると、ローカルの変更を破棄してスプレッドシートから強制再取得できます。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. データ管理 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <span className="text-xl">📁</span>
          <h3 className="text-xs font-black text-ink uppercase tracking-[0.2em]">データ管理</h3>
        </div>
        <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-ink/5 border border-surface-gray-mid/50">
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleExportJSON}
              className="flex flex-col items-center justify-center p-5 bg-surface-gray/50 hover:bg-white border-2 border-transparent hover:border-primary/20 rounded-3xl gap-3 transition-all active:scale-95 hover:shadow-md"
            >
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                <AppIcon name="save" className="w-6 h-6 text-primary" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-ink">JSON エクスポート</span>
            </button>
            <button
              onClick={() => jsonImportRef.current?.click()}
              className="flex flex-col items-center justify-center p-5 bg-surface-gray/50 hover:bg-white border-2 border-transparent hover:border-primary/20 rounded-3xl gap-3 transition-all active:scale-95 hover:shadow-md"
            >
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                <AppIcon name="folder" className="w-6 h-6 text-primary" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-ink">JSON インポート</span>
            </button>
            {/* インポート結果フィードバック */}
            {importFeedback && (
              <div className={`col-span-2 text-center text-xs font-bold py-2 px-4 rounded-xl transition-all animate-in fade-in duration-200 ${importFeedback.startsWith('✓') ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
                }`}>
                {importFeedback}
              </div>
            )}
            <input
              type="file"
              ref={jsonImportRef}
              className="hidden"
              accept=".json"
              onChange={handleImportJSONChange}
            />
          </div>
        </div>
      </section>

      {/* 5. デモデータ */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <span className="text-xl">🚀</span>
          <h3 className="text-xs font-black text-ink uppercase tracking-[0.2em]">デモデータ</h3>
        </div>
        <div className="px-1 space-y-4">
          <button
            onClick={onLoadSampleData}
            className="w-full relative overflow-hidden bg-white border-2 border-dashed border-primary/20 p-6 rounded-[32px] flex flex-col items-center gap-3 hover:bg-primary/5 hover:border-primary/40 transition-all shadow-sm active:scale-95 group"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:scale-150 transition-transform"></div>
            <div className="w-16 h-16 bg-primary-light/30 rounded-full flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">
              ✈️
            </div>
            <div className="text-center relative z-10">
              <p className="text-sm font-black text-primary tracking-tight">サンプル旅行データを読み込む</p>
              <p className="text-[10px] text-ink-light font-bold mt-1 opacity-60">アプリの機能を体験するためのデモデータを読み込みます。</p>
            </div>
          </button>

          {localStorage.getItem('tabilog-last-backup-key') && (
            <button
              onClick={onRestoreData}
              className="w-full bg-emerald-50 border-2 border-emerald-100/50 p-6 rounded-[32px] flex items-center justify-center gap-4 hover:bg-emerald-100 transition-all shadow-sm active:scale-95 group"
            >
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-emerald-600 group-hover:rotate-[-12deg] transition-transform">
                <AppIcon name="back" className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="text-xs font-black text-emerald-700 uppercase tracking-widest">前のデータを復元</p>
                <p className="text-[9px] text-emerald-600/60 font-bold">デモ読み込み前のデータに復元します。</p>
              </div>
            </button>
          )}
        </div>
      </section>

      {/* フッターとしての戻るボタン */}
      <div className="pt-6 border-t border-surface-gray-mid/30 px-2">
        <button
          type="button"
          onClick={onBack}
          className="w-full py-5 bg-ink text-white rounded-[24px] text-xs font-black uppercase tracking-[0.3em] shadow-xl shadow-ink/20 active:scale-95 transition-all"
        >
          ダッシュボードに戻る
        </button>
      </div>
    </div>
  );
};

export default SettingsView;
