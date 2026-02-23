
import { GoogleGenAI } from "@google/genai";

// Vite の define で注入された API キーを取得
// vite.config.ts で process.env.API_KEY → env.GEMINI_API_KEY にマッピング済み
const API_KEY = process.env.API_KEY;

/**
 * APIキーが有効かどうかチェックする
 */
function isApiKeyValid(): boolean {
  return !!(API_KEY && API_KEY !== 'PLACEHOLDER_API_KEY' && API_KEY.length > 10);
}

// 通貨コードと有効範囲のマッピング
const CURRENCY_RANGE_MAP: Record<string, [number, number]> = {
  AUD: [50, 200],
  USD: [100, 200],
  EUR: [100, 250],
  KRW: [0.05, 0.2],
  TWD: [3, 8],
};

/**
 * 通貨コードのデフォルトレートを返す
 */
function getDefaultRate(currency: string): number {
  const defaults: Record<string, number> = {
    AUD: 105, USD: 150, EUR: 165, KRW: 0.11, TWD: 4.8, JPY: 1
  };
  return defaults[currency] ?? 1;
}

/**
 * 指定された日付・通貨の為替レートをGemini AIで取得します
 * @param date - 日付（YYYY-MM-DD形式）
 * @param currency - 通貨コード（AUD, USD, EUR, KRW, TWD）
 */
export async function getExchangeRate(date: string, currency: string = 'AUD') {
  // JPYは変換不要
  if (currency === 'JPY') {
    return { rate: 1, sourceUrl: '' };
  }

  // APIキー未設定の場合は早期リターン
  if (!isApiKeyValid()) {
    console.warn('[AI Rate] APIキーが未設定のため、デフォルトレートを使用します。');
    return { rate: getDefaultRate(currency), sourceUrl: '' };
  }

  const range = CURRENCY_RANGE_MAP[currency];
  if (!range) {
    return { rate: getDefaultRate(currency), sourceUrl: '' };
  }

  try {
    // @google/genai v1.x の正しい呼び出し方
    const ai = new GoogleGenAI({ apiKey: API_KEY! });

    const prompt = `${date}の${currency}/JPY（${currency}から日本円）の為替レートを数値のみで答えてください。
例：AUDなら「97.50」、USDなら「149.80」のように、数値とドットのみで回答してください。
説明や単位は不要です。数値だけ答えてください。`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    const text = (response.text || '').trim();
    console.log(`[AI Rate] ${currency}/JPY raw response: "${text}"`);

    // 数値を抽出（小数点対応）
    const matches = text.match(/\d+(\.\d+)?/g);
    const [min, max] = range;

    if (matches) {
      const validRates = matches
        .map(m => parseFloat(m))
        .filter(n => n >= min && n <= max);

      if (validRates.length > 0) {
        const rate = validRates[0];
        const sourceUrl = `https://www.google.com/search?q=${currency}+JPY+${date}`;
        console.log(`[AI Rate] ${currency}/JPY = ${rate}`);
        return { rate, sourceUrl };
      }
    }

    console.warn(`[AI Rate] パース失敗。デフォルト値を使用。response: "${text}"`);
    return { rate: getDefaultRate(currency), sourceUrl: '' };

  } catch (error: any) {
    console.error(`[AI Rate] ${currency}/JPY の取得に失敗:`, error?.message || error);
    return { rate: getDefaultRate(currency), sourceUrl: '' };
  }
}



/**
 * APIキーの設定状態を確認する（デバッグ用）
 */
export function checkApiKeyStatus(): { isValid: boolean; message: string } {
  if (!API_KEY) {
    return { isValid: false, message: 'APIキーが未設定です（undefined）' };
  }
  if (API_KEY === 'PLACEHOLDER_API_KEY') {
    return { isValid: false, message: 'APIキーがプレースホルダーのままです。' };
  }
  if (API_KEY.length < 10) {
    return { isValid: false, message: 'APIキーが短すぎます。' };
  }
  return { isValid: true, message: 'APIキーは設定されています。' };
}
