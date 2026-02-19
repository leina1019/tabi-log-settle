
import React, { useRef } from 'react';
import { Participant, UserProfile } from '../types';
import { PARTICIPANTS } from '../constants';

interface Props {
  userProfiles: UserProfile[];
  onUpdateProfile: (id: Participant, updates: Partial<UserProfile>) => void;
  onBack: () => void;
}

const SettingsView: React.FC<Props> = ({ userProfiles, onUpdateProfile, onBack }) => {
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

        {PARTICIPANTS.map(pId => {
          const profile = getProfile(pId);
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
    </div>
  );
};

export default SettingsView;
