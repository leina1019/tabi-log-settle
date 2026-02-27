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
    const primaryColor = "#003780"; // 規定のプライマリーカラー

    return (
        <div className={className} style={size ? { width: size, height: size } : undefined}>
            <svg
                viewBox="0 0 512 512"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full drop-shadow-xl"
            >
                {/* 背景の角丸正方形 */}
                <rect width="512" height="512" rx="128" fill={primaryColor} />

                {/* ノート本体 */}
                <path
                    d="M144 112C144 94.3 158.3 80 176 80H352C369.7 80 384 94.3 384 112V400C384 417.7 369.7 432 352 432H176C158.3 432 144 417.7 144 400V112Z"
                    fill="white"
                />

                {/* ノートのリング部分 */}
                <path
                    d="M128 144H160M128 208H160M128 272H160M128 336H160"
                    stroke={primaryColor}
                    strokeWidth="16"
                    strokeLinecap="round"
                />

                {/* ノートの留め具 */}
                <rect x="352" y="192" width="48" height="64" rx="8" fill={primaryColor} />

                {/* 飛行機シルエット - よりシャープでダイナミックな形状に */}
                <path
                    d="M344 216L288 200L184 104L168 112L232 208L144 232L112 208L96 216L128 256L96 296L112 304L144 280L232 304L168 400L184 408L288 312L344 296C368 288 384 272 384 256C384 240 368 224 344 216Z"
                    fill={primaryColor}
                    transform="scale(0.9) translate(30, 30)"
                />

                {/* しおりの¥マーク - 垂直方向に調整してバランスを向上 */}
                <path
                    d="M192 370V448L224 430L256 448V370H192Z"
                    fill={primaryColor}
                    opacity="0.9"
                />
                <path
                    d="M208 385L224 398L240 385M204 405H244M204 399H244"
                    stroke="white"
                    strokeWidth="4"
                    strokeLinecap="round"
                />

                {/* 光沢効果 */}
                <circle cx="128" cy="128" r="64" fill="white" fillOpacity="0.1" />
            </svg>
        </div>
    );
};
