import React from 'react';

interface AppLogoProps {
    className?: string;
    size?: number | string;
}

/**
 * たびログ公式SVGロゴコンポーネント
 * 画像ファイルを使用せず、SVGで直接描画することで
 * 透過背景の問題を完全に解決し、ピクセルパーフェクトな美しさを実現します。
 */
export const AppLogo: React.FC<AppLogoProps> = ({ className = "w-full h-auto", size }) => {
    return (
        <div className={`${className} flex items-center justify-center`} style={size ? { width: size, height: size } : undefined}>
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                {/* 背景: 角丸のネイビーブルー */}
                <rect width="200" height="200" rx="44" fill="#003780" />

                {/* ノート/たびログ帳の形状 */}
                <path d="M50 45C50 42.2386 52.2386 40 55 40H145C147.761 40 150 42.2386 150 45V155C150 157.761 147.761 160 145 160H55C52.2386 160 50 157.761 50 155V45Z" fill="white" />

                {/* ノートの背表紙・ライン */}
                <rect x="58" y="40" width="4" height="120" fill="#003780" opacity="0.1" />
                <rect x="134" y="40" width="2" height="120" fill="#003780" />

                {/* 飛行機アイコン */}
                <path d="M125.5 110L125.5 100.2C125.5 98.6 124.6 97.2 123.2 96.5L106.1 87.8L106.1 71.9C106.1 66.8 102 62.7 96.9 62.7C91.8 62.7 87.7 66.8 87.7 71.9V87.8L70.6 96.5C69.2 97.2 68.3 98.6 68.3 100.2V110L87.7 104.2V122.9L82.9 126.5V132.8L96.9 130.4L110.9 132.8V126.5L106.1 122.9V104.2L125.5 110Z" fill="#003780" />

                {/* しおり */}
                <path d="M78 145V168L88 162L98 168V145H78Z" fill="white" stroke="#003780" strokeWidth="1" />

                {/* 円形（しおりの中） */}
                <circle cx="88" cy="153" r="6" fill="#003780" />

                {/* 円形の中の文字 (¥) */}
                <text x="88" y="156" fontSize="6" fontWeight="bold" fill="white" textAnchor="middle" fontFamily="sans-serif">¥</text>

                {/* ノートの留め具 */}
                <rect x="142" y="85" width="16" height="30" rx="6" fill="white" stroke="#003780" strokeWidth="2" />
                <rect x="146" y="93" width="8" height="14" rx="2" fill="#003780" opacity="0.2" />
            </svg>
        </div>
    );
};
