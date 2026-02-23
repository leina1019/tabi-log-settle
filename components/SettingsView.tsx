
import React, { useRef } from 'react';
import { Participant, UserProfile } from '../types';
import { MEMBER_COLORS } from '../constants';

interface Props {
  userProfiles: UserProfile[];
  onUpdateProfile: (id: Participant, updates: Partial<UserProfile>) => void;
  onLoadSampleData: () => void;
  onRestoreData: () => void;
  onBack: () => void;
}

const SettingsView: React.FC<Props> = ({ userProfiles, onUpdateProfile, onLoadSampleData, onRestoreData, onBack }) => {
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

  const getProfile = (id: string) => {
    return userProfiles.find(p => p.id === id) || { id, displayName: id, avatarUrl: '' };
  };

  return (
    <div className="space-y-6 pt-2 pb-10">
      <div className="flex items-center gap-2 mb-4 px-2">
        <button type="button" onClick={onBack} className="p-2 -ml-2 text-ink-sub hover:text-ink">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h2 className="text-xl font-sans font-bold text-ink">メンバー設定</h2>
      </div>

      <div className="bg-white p-6 rounded-3xl space-y-6 shadow-sm border border-surface-gray-mid">
        <p className="text-[10px] text-ink-light font-bold uppercase tracking-widest">プロフィール編集</p>

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

              <div className="flex justify-end gap-3 mt-1">
                <button
                  onClick={() => fileInputRefs.current[pId]?.click()}
                  className="text-[10px] text-accent font-bold uppercase tracking-wider"
                >
                  画像を変更
                </button>
                {profile.avatarUrl && (
                  <button
                    onClick={() => onUpdateProfile(pId, { avatarUrl: '' })}
                    className="text-[10px] text-ink-light hover:text-rose-500 font-bold uppercase"
                  >
                    画像を削除
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-2 space-y-4">
        <button
          onClick={onLoadSampleData}
          className="w-full bg-white border border-dashed border-primary/40 p-5 rounded-3xl flex flex-col items-center gap-2 hover:bg-primary-light/30 transition-colors shadow-sm active:scale-95"
        >
          <span className="text-xl">✈️</span>
          <div className="text-center">
            <p className="text-sm font-bold text-primary text-center">デモ用サンプルデータを読み込む</p>
            <p className="text-[10px] text-ink-light mt-1 text-center">
              5泊6日のオーストラリア旅行データ（3名分）が自動入力されます。<br />
              現在のデータは一時的に保存され、以下から戻すことが可能です。
            </p>
          </div>
        </button>

        {localStorage.getItem('oz-wari-last-backup-key') && (
          <button
            onClick={onRestoreData}
            className="w-full bg-emerald-50 border border-emerald-200 p-5 rounded-3xl flex flex-col items-center gap-2 hover:bg-emerald-100/50 transition-colors shadow-sm active:scale-95"
          >
            <span className="text-xl">🔙</span>
            <div className="text-center">
              <p className="text-sm font-bold text-emerald-700">元のデータに戻す</p>
              <p className="text-[10px] text-emerald-600/70 mt-1">
                サンプルデータを読み込む直前の状態を復元します。
              </p>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};

export default SettingsView;
