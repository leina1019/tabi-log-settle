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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    // ... existing handleFileChange ...
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
        if (window.confirm('データをインポートしますか？現在のデータは上書きされます。')) {
          onImportFullData(data);
          alert('インポートが完了しました。');
        }
      } catch (err) {
        alert('無効なJSONファイルです。');
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 pt-2 pb-10">
      <div className="flex items-center gap-2 mb-4 px-2">
        <button type="button" onClick={onBack} className="p-2 -ml-2 text-ink-sub hover:text-ink">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h2 className="text-xl font-sans font-bold text-ink">設定</h2>
      </div>

      {/* クラウド同期セクション */}
      <div className="bg-white p-6 rounded-3xl space-y-4 shadow-sm border border-surface-gray-mid">
        <p className="text-[10px] text-ink-light font-bold uppercase tracking-widest">クラウド同期</p>
        <p className="text-[11px] text-ink-sub leading-relaxed font-bold">
          Googleスプレッドシートとデータを同期します。
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onSyncToSheet}
            disabled={isSyncing}
            className="flex flex-col items-center justify-center p-4 bg-emerald-50 border border-emerald-100 rounded-2xl gap-2 active:scale-95 transition-all disabled:opacity-50"
          >
            <AppIcon name="export" className="text-primary" />
            <span className="text-[10px] font-bold text-emerald-700">保存・同期</span>
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
            className="flex flex-col items-center justify-center p-4 bg-ocean-light/20 border border-ocean-light/30 rounded-2xl gap-2 active:scale-95 transition-all disabled:opacity-50"
          >
            <AppIcon name="import" className="text-primary" />
            <span className="text-[10px] font-bold text-ocean-dark">最新を取得</span>
          </button>
        </div>
        <p className="text-[8px] text-ink-light leading-relaxed italic mt-1">
          ※ 取得ボタン長押し(1秒以上)で「スプレッドシートから全データ強制再取得」が可能です。
        </p>
      </div>

      {/* データ管理セクション */}
      <div className="bg-white p-6 rounded-3xl space-y-4 shadow-sm border border-surface-gray-mid">
        <p className="text-[10px] text-ink-light font-bold uppercase tracking-widest">データ管理</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleExportJSON}
            className="flex flex-col items-center justify-center p-4 bg-surface-gray border border-surface-gray-mid rounded-2xl gap-2 active:scale-95 transition-all"
          >
            <AppIcon name="save" className="text-primary" />
            <span className="text-[10px] font-bold text-ink">JSONエクスポート</span>
          </button>
          <button
            onClick={() => jsonImportRef.current?.click()}
            className="flex flex-col items-center justify-center p-4 bg-surface-gray border border-surface-gray-mid rounded-2xl gap-2 active:scale-95 transition-all"
          >
            <AppIcon name="folder" className="text-primary" />
            <span className="text-[10px] font-bold text-ink">JSONインポート</span>
          </button>
          <input
            type="file"
            ref={jsonImportRef}
            className="hidden"
            accept=".json"
            onChange={handleImportJSONChange}
          />
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl space-y-6 shadow-sm border border-surface-gray-mid">
        <p className="text-[10px] text-ink-light font-bold uppercase tracking-widest">プロフィール編集</p>
        {/* ... userProfiles components remain same ... */}
        {userProfiles.map(profile => {
          const pId = profile.id;
          return (
            <div key={pId} className="flex flex-col gap-3 p-4 bg-surface-gray rounded-2xl border border-surface-gray-mid">
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-full bg-primary-light border-2 border-primary/20 flex items-center justify-center overflow-hidden relative cursor-pointer hover:border-accent transition-colors flex-shrink-0"
                  onClick={() => fileInputRefs.current[pId]?.click()}
                >
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={profile.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary/50" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  )}
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-[8px] font-bold text-white">EDIT</span>
                  </div>
                </div>

                <div className="flex-1">
                  <label className="text-[9px] font-bold text-ink-light uppercase tracking-wider mb-1 block">表示名</label>
                  <input
                    type="text"
                    value={profile.displayName}
                    onChange={(e) => onUpdateProfile(pId, { displayName: e.target.value })}
                    className="w-full bg-transparent border-b border-surface-gray-mid py-1 text-sm font-bold text-ink outline-none focus:border-primary transition-colors"
                  />
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

              <div className="mt-4 pt-4 border-t border-surface-gray-mid/50">
                <label className="text-[9px] font-bold text-ink-light uppercase tracking-wider mb-2 block">メンバーカラー</label>
                <div className="flex flex-wrap gap-2">
                  {MEMBER_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => onUpdateProfile(pId, { color })}
                      className={`w-7 h-7 rounded-sm border-2 transition-all ${profile.color === color ? 'border-ink scale-110 shadow-sm' : 'border-white/50'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white p-6 rounded-3xl space-y-4 shadow-sm border border-surface-gray-mid">
        <p className="text-[10px] text-ink-light font-bold uppercase tracking-widest">表示設定</p>
        <p className="text-[11px] text-ink-sub leading-relaxed font-bold">
          利用中のデバイスに合わせて画面サイズを切り替えます。
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(Object.entries(DEVICE_CONFIG) as [ViewModeSize, typeof DEVICE_CONFIG[keyof typeof DEVICE_CONFIG]][]).map(([key, config]) => (
            <button
              key={key}
              onClick={() => onUpdateViewModeSize(key)}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-start gap-1 group ${viewModeSize === key ? 'border-primary bg-primary/5 shadow-inner' : 'border-surface-gray-mid bg-surface-gray hover:border-primary/40'}`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-xl group-hover:scale-110 transition-transform">{config.icon}</span>
                {viewModeSize === key && <div className="w-2 h-2 rounded-full bg-primary" />}
              </div>
              <span className={`text-[11px] font-black uppercase tracking-wider ${viewModeSize === key ? 'text-primary' : 'text-ink-sub'}`}>{config.label}</span>
              <span className="text-[9px] text-ink-light">{config.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-2 space-y-4">
        <button
          onClick={onLoadSampleData}
          className="w-full bg-white border border-dashed border-primary/40 p-5 rounded-3xl flex flex-col items-center gap-2 hover:bg-primary-light/30 transition-colors shadow-sm active:scale-95"
        >
          <span className="text-xl">✈️</span>
          <div className="text-center">
            <p className="text-sm font-bold text-primary text-center">デモ用サンプルデータを読み込む</p>
          </div>
        </button>

        {localStorage.getItem('oz-wari-last-backup-key') && (
          <button
            onClick={onRestoreData}
            className="w-full bg-emerald-50 border border-emerald-200 p-5 rounded-3xl flex flex-col items-center gap-2 hover:bg-emerald-100/50 transition-colors shadow-sm active:scale-95"
          >
            <AppIcon name="back" className="text-primary" />
            <div className="text-center">
              <p className="text-sm font-bold text-emerald-700">元のデータに戻す</p>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};

export default SettingsView;
