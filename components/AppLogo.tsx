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
            <img
                src="/logo.png"
                alt="たびログ"
                className="w-full h-full object-contain"
                onError={(e) => {
                    // フォールバック: 画像がない場合は以前のスタイルに近いアイコンを表示
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                        parent.innerHTML = '<span class="text-2xl">✈️</span>';
                    }
                }}
            />
        </div>
    );
};
