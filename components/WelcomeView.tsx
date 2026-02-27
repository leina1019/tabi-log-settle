import React, { useState } from 'react';
import { UserProfile } from '../types';
import { AppIcon } from './AppIcon';
import { MEMBER_COLORS } from '../constants';
import { AppLogo } from './AppLogo';

interface OnboardingData {
    name: string;
    startDate: string;
    endDate: string;
    userProfiles: UserProfile[];
    coverImage: string;
}

interface Props {
    onStart: (data: OnboardingData, onComplete: (shareUrl: string) => void) => void;
    onDemoStart?: () => void;
}

const WelcomeView: React.FC<Props> = ({ onStart, onDemoStart }) => {
    const [step, setStep] = useState<'welcome' | 'info' | 'members' | 'share'>('welcome');
    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [tempMembers, setTempMembers] = useState<{ id: string; name: string; color: string }[]>([
        { id: crypto.randomUUID(), name: '', color: MEMBER_COLORS[0] }
    ]);
    const [coverImage] = useState('https://images.unsplash.com/photo-1527631746610-bca00a040d60?q=80&w=800&auto=format&fit=crop');
    const [shareUrl, setShareUrl] = useState('');
    const [copyFeedback, setCopyFeedback] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

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
            id: m.id,
            displayName: m.name,
            color: m.color,
            avatarUrl: '',
            updatedAt: new Date().toISOString()
        }));

        setIsCreating(true);
        onStart(
            { name, startDate, endDate, userProfiles, coverImage },
            (url: string) => {
                setShareUrl(url);
                setIsCreating(false);
                setStep('share');
            }
        );
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopyFeedback(true);
            setTimeout(() => setCopyFeedback(false), 2500);
        } catch {
            const input = document.createElement('input');
            input.value = shareUrl;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            setCopyFeedback(true);
            setTimeout(() => setCopyFeedback(false), 2500);
        }
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: '旅行グループに参加してください！',
                    text: `「${name}」の旅行グループに招待します。このリンクを開いてください。`,
                    url: shareUrl
                });
            } catch (e) {
                console.log('Share canceled', e);
            }
        } else {
            handleCopy();
        }
    };

    const addMember = () => {
        setTempMembers([...tempMembers, { id: crypto.randomUUID(), name: '', color: MEMBER_COLORS[tempMembers.length % MEMBER_COLORS.length] }]);
    };

    const removeMember = (id: string) => {
        if (tempMembers.length > 1) {
            setTempMembers(tempMembers.filter(m => m.id !== id));
        }
    };

    const updateMember = (id: string, memberName: string) => {
        setTempMembers(tempMembers.map(m => m.id === id ? { ...m, name: memberName } : m));
    };

    return (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col overflow-y-auto">
            <div className="absolute top-0 left-0 right-0 h-64 bg-ocean-dark -z-10 rounded-b-[40px] opacity-10"></div>

            <div className="flex-1 flex flex-col items-center px-6 py-12 max-w-sm mx-auto w-full">

                {/* Step: Welcome */}
                {step === 'welcome' && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
                        <div className="mb-4 animate-in zoom-in duration-700">
                            <AppLogo className="w-40 h-40" />
                        </div>
                        <h2 className="text-4xl font-sans font-black text-ink mb-4 leading-tight tracking-tighter">たびログへ<br />ようこそ！</h2>
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

                {/* Step: Info */}
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

                {/* Step: Members */}
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
                                        <AppIcon name="user" className="w-8 h-8 text-primary/30" />
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
                                disabled={isCreating}
                                className="w-full bg-primary text-white py-5 rounded-3xl font-bold shadow-xl shadow-primary/20 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {isCreating ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        旅行を作成中...
                                    </>
                                ) : (
                                    <>この内容で旅を始める！ <AppIcon name="ticket" className="w-4 h-4" /></>
                                )}
                            </button>
                            <button onClick={() => setStep('info')} className="w-full mt-2 text-ink-light text-xs font-bold py-2">戻る</button>
                        </div>
                    </div>
                )}

                {/* Step: Share（旅行グループURL共有） */}
                {step === 'share' && (
                    <div className="w-full animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center text-center">
                        {/* 完了演出 */}
                        <div className="mt-4 mb-6">
                            <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner animate-bounce">
                                <span className="text-5xl">🎉</span>
                            </div>
                            <h2 className="text-2xl font-sans font-black text-ink mb-2">旅行グループ作成完了！</h2>
                            <p className="text-sm text-ink-sub leading-relaxed">
                                メンバーと <strong className="text-primary">この専用URLを共有</strong> しないと<br />みんなのデータが同期されません！
                            </p>
                        </div>

                        {/* 重要バナー */}
                        <div className="w-full bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 mb-6 text-left">
                            <p className="text-xs font-black text-amber-700 mb-1">⚠️ 必ず共有してください</p>
                            <p className="text-[11px] text-amber-600 leading-relaxed">
                                このURLがあなたのグループ専用リンクです。<br />
                                メンバー全員がこのリンクからアクセスすることで、支出・スケジュール・荷物リストが自動で同期されます。
                            </p>
                        </div>

                        {/* URL表示 + コピーボタン */}
                        <div className="w-full bg-surface-gray rounded-2xl p-4 mb-4 flex items-center gap-3 border border-surface-gray-mid">
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-ink-light font-bold mb-1 uppercase tracking-widest">グループURL</p>
                                <p className="text-xs font-bold text-ink truncate font-mono">{shareUrl}</p>
                            </div>
                            <button
                                onClick={handleCopy}
                                className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-black transition-all ${copyFeedback ? 'bg-emerald-500 text-white scale-95' : 'bg-white text-primary border border-primary/20 hover:bg-primary/5'}`}
                            >
                                {copyFeedback ? '✓ コピー済み' : '📋 コピー'}
                            </button>
                        </div>

                        {/* メインCTA: 共有ボタン */}
                        <button
                            onClick={handleNativeShare}
                            className="w-full py-5 bg-gradient-to-r from-ocean-dark to-primary text-white rounded-3xl font-bold shadow-xl shadow-primary/20 active:scale-95 transition-all text-base flex items-center justify-center gap-3 mb-4"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            LINEやメッセージで共有する
                        </button>

                        {/* スキップ */}
                        <button
                            onClick={() => window.location.reload()}
                            className="text-xs text-ink-light font-bold py-3 opacity-60 hover:opacity-100 transition-opacity"
                        >
                            あとで共有する → 旅を始める
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};

export default WelcomeView;
