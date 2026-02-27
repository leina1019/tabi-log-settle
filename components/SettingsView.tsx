import React, { useRef } from 'react';
import { Participant, UserProfile, ViewModeSize, Expense, ItineraryItem, Ticket, TripData } from '../types';
import { AppIcon } from './AppIcon';
import { MEMBER_COLORS, DEVICE_CONFIG } from '../constants';

interface Props {
  userProfiles: UserProfile[];
  expenses: any[];
  itinerary: any[];
  tickets: any[];
  packingList?: any[]; // 荷物リストエクスポート用
  budget: number;
  tripName: string;
  tripStartDate: string;
  tripEndDate: string;
  coverImage: string;
  masterSheetUrl?: string; // マスターシートへのリンク
  onUpdateProfile: (id: Participant, updates: Partial<UserProfile>) => void;
  onAddMember: (name: string, color: string) => void;     // 新規メンバー追加
  onRemoveMember: (id: string) => void;                   // メンバー削除
  onLoadSampleData: () => void;
  onLoadUltimateDemoData: () => void;
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
  userProfiles, expenses, itinerary, tickets, packingList = [], budget, tripName, tripStartDate, tripEndDate, coverImage, masterSheetUrl,
  onUpdateProfile, onAddMember, onRemoveMember, onLoadSampleData, onLoadUltimateDemoData, onRestoreData, onBack, viewModeSize, onUpdateViewModeSize,
  onImportFullData, onSyncToSheet, onFetchFromSheet, isSyncing
}) => {
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const jsonImportRef = useRef<HTMLInputElement>(null);
  // window.confirm/alert 廃止用
  const [importFeedback, setImportFeedback] = React.useState<string | null>(null);
  // メンバー追加モーダル
  const [isAddingMember, setIsAddingMember] = React.useState(false);
  const [newMemberName, setNewMemberName] = React.useState('');
  const [newMemberColor, setNewMemberColor] = React.useState(MEMBER_COLORS[0]);
  // メンバー削除確認
  const [removingMemberId, setRemovingMemberId] = React.useState<string | null>(null);
  // スプシ同期完了フラグ
  const [showSheetLink, setShowSheetLink] = React.useState(false);

  const prevIsSyncing = React.useRef(isSyncing);
  React.useEffect(() => {
    if (prevIsSyncing.current && !isSyncing) {
      // 同期が完了した瞬間（true -> false）
      setShowSheetLink(true);
      // 10秒後に通常の表示に戻す（任意）
      setTimeout(() => setShowSheetLink(false), 10000);
    }
    prevIsSyncing.current = isSyncing;
  }, [isSyncing]);

  const handleAddMemberSubmit = () => {
    if (!newMemberName.trim()) return;
    onAddMember(newMemberName.trim(), newMemberColor);
    setNewMemberName('');
    setNewMemberColor(MEMBER_COLORS[0]);
    setIsAddingMember(false);
  };

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
                    {/* メンバー削除 */}
                    {userProfiles.length > 1 && (
                      removingMemberId === pId ? (
                        <div className="flex items-center gap-2 p-3 bg-rose-50 rounded-2xl border border-rose-200">
                          <p className="flex-1 text-xs font-bold text-rose-600">「{profile.displayName}」を削除しますか？</p>
                          <button onClick={() => { onRemoveMember(pId); setRemovingMemberId(null); }} className="px-3 py-1.5 bg-rose-500 text-white text-xs font-black rounded-xl active:scale-95">削除</button>
                          <button onClick={() => setRemovingMemberId(null)} className="px-3 py-1.5 bg-white text-ink-sub text-xs font-bold rounded-xl border border-surface-gray-mid active:scale-95">キャンセル</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setRemovingMemberId(pId)}
                          className="text-[10px] font-bold text-rose-400 hover:text-rose-600 transition-colors flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          このメンバーを削除
                        </button>
                      )
                    )}
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

        {/* メンバー追加ボタン */}
        {!isAddingMember ? (
          <button
            onClick={() => setIsAddingMember(true)}
            className="w-full py-4 border-2 border-dashed border-primary/30 rounded-3xl text-sm font-bold text-primary hover:border-primary/60 hover:bg-primary/5 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span className="text-lg">+</span> メンバーを追加
          </button>
        ) : (
          <div className="bg-white rounded-[32px] p-6 shadow-xl border border-primary/20 space-y-4 animate-in slide-in-from-bottom-4 fade-in duration-200">
            <h4 className="text-sm font-black text-ink">新しいメンバーを追加</h4>
            <div>
              <label className="text-[10px] font-bold text-ink-sub uppercase tracking-widest mb-2 block">名前</label>
              <input
                type="text"
                autoFocus
                placeholder="例: たろう"
                value={newMemberName}
                onChange={e => setNewMemberName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddMemberSubmit()}
                className="w-full bg-surface-gray border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-5 py-3.5 text-sm font-bold text-ink outline-none transition-all shadow-inner"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-ink-sub uppercase tracking-widest mb-2 block">カラー</label>
              <div className="flex flex-wrap gap-2.5">
                {MEMBER_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewMemberColor(color)}
                    className={`w-8 h-8 rounded-full border-4 transition-all active:scale-75 ${newMemberColor === color ? 'border-ink/20 scale-110 shadow-md' : 'border-transparent opacity-80 hover:opacity-100'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setIsAddingMember(false)} className="flex-1 py-3 rounded-2xl text-xs font-bold text-ink-sub bg-surface-gray hover:bg-surface-gray-mid transition-colors">キャンセル</button>
              <button onClick={handleAddMemberSubmit} disabled={!newMemberName.trim()} className="flex-1 py-3 rounded-2xl text-xs font-bold bg-primary text-white shadow-lg disabled:opacity-40 active:scale-95 transition-all">追加する</button>
            </div>
          </div>
        )}
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

      {/* 3. Googleスプレッドシートエクスポート */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <span className="text-xl">📊</span>
          <h3 className="text-xs font-black text-ink uppercase tracking-[0.2em]">Googleスプレッドシートエクスポート</h3>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-teal-500 p-7 rounded-[32px] text-white shadow-xl shadow-emerald-600/20 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="relative z-10 space-y-5">
            {/* ヘッダー */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" /><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" /><path fill="none" d="M0 0h48v48H0z" /></svg>
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-widest mb-1">一括エクスポート</h4>
                <p className="text-[10px] opacity-80 font-bold leading-relaxed">
                  マスターシートを白紙にしてから<br />全データを一気に書き込みます
                </p>
              </div>
            </div>

            {/* データカウント */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '支出', count: expenses.length, icon: '💴' },
                { label: '持ち物', count: packingList.length, icon: '🎒' },
                { label: 'チケット', count: tickets.length, icon: '🎫' },
              ].map(item => (
                <div key={item.label} className="bg-white/10 rounded-2xl p-3 text-center backdrop-blur-sm">
                  <p className="text-xl mb-1">{item.icon}</p>
                  <p className="text-lg font-black leading-none">{item.count}</p>
                  <p className="text-[9px] opacity-70 font-bold mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>

            {/* エクスポートボタン */}
            <button
              onClick={onSyncToSheet}
              disabled={isSyncing}
              className="w-full group flex items-center justify-center gap-3 py-4 bg-white text-emerald-700 font-black text-sm rounded-2xl shadow-xl active:scale-95 transition-all disabled:opacity-50"
            >
              {isSyncing ? (
                <><div className="w-5 h-5 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />エクスポート中...</>
              ) : (
                <><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>マスターシートへエクスポート</>
              )}
            </button>

            {/* マスターシートを開くリンク */}
            {masterSheetUrl && (
              <a
                href={masterSheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center gap-2 py-4 rounded-2xl text-xs font-black transition-all active:scale-95 ${showSheetLink ? 'bg-white text-emerald-700 shadow-xl scale-105 animate-bounce ring-4 ring-white/20' : 'bg-white/10 hover:bg-white/20 border border-white/20 text-white'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                {showSheetLink ? '✨ 今すぐマスターシートを確認！' : 'マスターシートを開く'}
              </a>
            )}

            {/* 注意書き */}
            <div className="bg-black/10 border border-white/10 rounded-xl p-3 space-y-1.5">
              <p className="text-[9px] font-bold opacity-80">📋 エクスポートの仕組み</p>
              <ul className="text-[9px] font-bold opacity-60 space-y-1 list-disc list-inside">
                <li>毎回マスターシートを白紙にしてから書き込みます</li>
                <li>他のグループのデータには影響しません</li>
                <li>マスターシートは読み取り専用です</li>
                <li>編集したい場合はダウンロードしてください</li>
              </ul>
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
              <p className="text-sm font-black text-primary tracking-tight">通常サンプルデータを読み込む</p>
              <p className="text-[10px] text-ink-light font-bold mt-1 opacity-60">シドニー旅行の標準的なデモデータを読み込みます。</p>
            </div>
          </button>

          <button
            onClick={onLoadUltimateDemoData}
            className="w-full relative overflow-hidden bg-gradient-to-br from-primary to-ocean-dark p-6 rounded-[32px] flex flex-col items-center gap-3 hover:shadow-xl hover:scale-[1.02] transition-all active:scale-95 group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:scale-150 transition-transform"></div>
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl shadow-lg ring-4 ring-white/10 group-hover:rotate-12 transition-transform">
              🌍
            </div>
            <div className="text-center relative z-10">
              <p className="text-sm font-black text-white tracking-tight">究極のデモデータを読み込む (MECE)</p>
              <p className="text-[10px] text-white/80 font-bold mt-1">パリ・ロンドン海外旅行版。機能活用率100%の決定番データ！</p>
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
