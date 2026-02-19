
// OGP（Open Graph Protocol）情報を取得するサービス
// CORS制限があるためallorigins.winプロキシを使用し、多重フォールバックで安定動作させる

export interface OgpData {
    image?: string;  // og:image
    title?: string;  // og:title
    description?: string;
}

/**
 * URLからOGP情報を取得する。
 * 失敗してもエラーをスローせず、見つかった分だけ返す設計。
 */
export const fetchOgpData = async (url: string): Promise<OgpData> => {
    if (!url || !url.startsWith('http')) return {};

    try {
        // allorigins.winを使ってCORSを回避（タイムアウト5秒）
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);

        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl, { signal: controller.signal });
        clearTimeout(timer);

        if (!response.ok) return {};

        const data = await response.json();
        const html: string = data.contents || '';

        // OGPタグをパース
        const getMetaContent = (property: string): string => {
            // og:xxx または name="xxx" 形式の両方に対応
            const patterns = [
                new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i'),
                new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${property}["']`, 'i'),
            ];
            for (const pattern of patterns) {
                const match = html.match(pattern);
                if (match?.[1]) return match[1].trim();
            }
            return '';
        };

        const image = getMetaContent('og:image') || getMetaContent('twitter:image');
        const title = getMetaContent('og:title') || getMetaContent('twitter:title');
        const description = getMetaContent('og:description') || getMetaContent('twitter:description');

        return { image: image || undefined, title: title || undefined, description: description || undefined };

    } catch {
        // タイムアウト・ネットワークエラーは静かに無視
        return {};
    }
};
