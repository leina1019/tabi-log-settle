
import React, { useState } from 'react';
import { UserProfile, Participant } from '../types';
import { MEMBER_COLORS } from '../constants';

interface OnboardingData {
    name: string;
    startDate: string;
    endDate: string;
    userProfiles: UserProfile[];
    coverImage: string;
}

interface Props {
    onStart: (data: OnboardingData) => void;
    onDemoStart?: () => void;
}

const WelcomeView: React.FC<Props> = ({ onStart, onDemoStart }) => {
    const [step, setStep] = useState<'welcome' | 'info' | 'members'>('welcome');
    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [tempMembers, setTempMembers] = useState<{ id: string; name: string; color: string }[]>([
        { id: crypto.randomUUID(), name: '', color: MEMBER_COLORS[0] }
    ]);
    const [coverImage, setCoverImage] = useState('https://images.unsplash.com/photo-1527631746610-bca00a040d60?q=80&w=800&auto=format&fit=crop');

    const handleNext = () => {
        if (step === 'welcome') setStep('info');
        else if (step === 'info') {
            if (!name || !startDate || !endDate) {
                alert('タイトルと日程を入力してください');
                return;
            }
            setStep('members');
        }
    };

    const handleFinish = () => {
        const validMembers = tempMembers.filter(m => m.name.trim() !== '');
        if (validMembers.length === 0) {
            alert('メンバーを1人以上入力してください');
            return;
        }

        const userProfiles: UserProfile[] = validMembers.map(m => ({
            id: m.name, // Use name as ID for now to match current logic, or randomUUID
            displayName: m.name,
            color: m.color,
            avatarUrl: '',
            updatedAt: new Date().toISOString()
        }));

        onStart({
            name,
            startDate,
            endDate,
            userProfiles,
            coverImage
        });
    };

    const addMember = () => {
        setTempMembers([...tempMembers, { id: crypto.randomUUID(), name: '', color: MEMBER_COLORS[tempMembers.length % MEMBER_COLORS.length] }]);
    };

    const removeMember = (id: string) => {
        if (tempMembers.length > 1) {
            setTempMembers(tempMembers.filter(m => m.id !== id));
        }
    };

    const updateMember = (id: string, name: string) => {
        setTempMembers(tempMembers.map(m => m.id === id ? { ...m, name } : m));
    };

    return (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col overflow-y-auto">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 right-0 h-64 bg-ocean-dark -z-10 rounded-b-[40px] opacity-10"></div>

            <div className="flex-1 flex flex-col items-center px-6 py-12 max-w-sm mx-auto w-full">

                {step === 'welcome' && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
                        <div className="w-24 h-24 bg-primary-light rounded-[32px] flex items-center justify-center text-5xl mb-8 shadow-inner">✈️</div>
                        <h2 className="text-3xl font-bold text-ink mb-4 leading-tight">たびログくんへ<br />ようこそ！</h2>
                        <p className="text-ink-sub text-sm mb-12 leading-relaxed px-4">
                            旅行のスケジュール管理から、面倒な割り勘の計算まで。みんなで共有して最高の旅を作りましょう。
                        </p>
                        <button
                            onClick={handleNext}
                            className="w-full bg-primary text-white py-5 rounded-3xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-lg"
                        >
                            旅を計画！始める ✨
                        </button>
                        {onDemoStart && (
                            <button
                                onClick={onDemoStart}
                                className="w-full mt-4 bg-white border-2 border-primary/20 text-primary py-4 rounded-3xl font-bold hover:bg-primary/5 active:scale-95 transition-all text-sm"
                            >
                                デモ版をひらく（検証用）
                            </button>
                        )}
                        <p className="mt-8 text-[10px] text-ink-light uppercase tracking-widest font-bold">Powered by Reina</p>
                    </div>
                )}

                {step === 'info' && (
                    <div className="w-full animate-in slide-in-from-right-8 fade-in duration-300">
                        <div className="mb-8">
                            <span className="text-primary font-bold text-xs uppercase tracking-widest">Step 1 / 2</span>
                            <h2 className="text-2xl font-bold text-ink mt-1">旅行の基本情報</h2>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-bold text-ink-sub mb-2 uppercase tracking-widest">旅行のタイトル</label>
                                <input
                                    type="text"
                                    placeholder="例: 北海道 卒業旅行"
                                    className="w-full bg-surface-gray border-2 border-transparent focus:border-primary/30 rounded-2xl p-4 text-ink outline-none transition-all shadow-sm"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-ink-sub mb-2 uppercase tracking-widest">開始日</label>
                                    <input
                                        type="date"
                                        className="w-full bg-surface-gray border-2 border-transparent focus:border-primary/30 rounded-2xl p-4 text-sm text-ink outline-none transition-all shadow-sm"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-ink-sub mb-2 uppercase tracking-widest">終了日</label>
                                    <input
                                        type="date"
                                        className="w-full bg-surface-gray border-2 border-transparent focus:border-primary/30 rounded-2xl p-4 text-sm text-ink outline-none transition-all shadow-sm"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="pt-8">
                                <button
                                    onClick={handleNext}
                                    className="w-full bg-primary text-white py-5 rounded-3xl font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all"
                                >
                                    次へ進む
                                </button>
                                <button onClick={() => setStep('welcome')} className="w-full mt-4 text-ink-light text-xs font-bold py-2">戻る</button>
                            </div>
                        </div>
                    </div>
                )}

                {step === 'members' && (
                    <div className="w-full animate-in slide-in-from-right-8 fade-in duration-300 pb-20">
                        <div className="mb-8">
                            <span className="text-primary font-bold text-xs uppercase tracking-widest">Step 2 / 2</span>
                            <h2 className="text-2xl font-bold text-ink mt-1">メンバーを追加</h2>
                            <p className="text-xs text-ink-sub mt-2 leading-relaxed">旅行に参加するメンバーの名前を入力してください。後からでも追加できます。</p>
                        </div>

                        <div className="space-y-3">
                            {tempMembers.map((m, idx) => (
                                <div key={m.id} className="flex items-center gap-3 animate-in slide-in-from-left-4 fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                                    <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-lg shadow-sm" style={{ backgroundColor: m.color }}>
                                        👤
                                    </div>
                                    <input
                                        type="text"
                                        placeholder={`メンバー ${idx + 1}`}
                                        className="flex-1 bg-surface-gray border-2 border-transparent focus:border-primary/30 rounded-xl px-4 py-3 text-sm text-ink outline-none transition-all"
                                        value={m.name}
                                        onChange={e => updateMember(m.id, e.target.value)}
                                    />
                                    <button
                                        onClick={() => removeMember(m.id)}
                                        className="w-10 h-10 text-ink-light hover:text-rose-500 transition-colors"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}

                            <button
                                onClick={addMember}
                                className="w-full py-4 border-2 border-dashed border-surface-gray-mid rounded-2xl text-xs font-bold text-ink-light hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2"
                            >
                                <span>+</span> メンバーを追加
                            </button>
                        </div>

                        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent max-w-sm mx-auto">
                            <button
                                onClick={handleFinish}
                                className="w-full bg-primary text-white py-5 rounded-3xl font-bold shadow-xl shadow-primary/20 active:scale-95 transition-all"
                            >
                                この内容で旅を始める！ 🎫
                            </button>
                            <button onClick={() => setStep('info')} className="w-full mt-2 text-ink-light text-xs font-bold py-2">戻る</button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default WelcomeView;
