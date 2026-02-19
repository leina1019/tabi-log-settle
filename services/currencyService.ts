
import { CURRENCIES } from '../constants';

export const fetchExchangeRate = async (currency: string): Promise<number | null> => {
    if (currency === 'JPY') return 1;

    try {
        // Frankfurter API (EU中央銀行データ) - 完全無料・APIキー不要
        // https://www.frankfurter.app/docs/
        const response = await fetch(`https://api.frankfurter.app/latest?amount=1&from=${currency}&to=JPY`);

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        // レートが取得できた場合
        if (data && data.rates && data.rates.JPY) {
            return data.rates.JPY;
        }

        throw new Error('Invalid data format');
    } catch (error) {
        console.warn(`[CurrencyService] Failed to fetch rate for ${currency}:`, error);

        // エラー時はconstantsのデフォルトレート（固定値）を返す
        // これによりAPIがダウンしていてもアプリは最低限動作する
        const currencyInfo = CURRENCIES.find(c => c.code === currency);
        return currencyInfo ? currencyInfo.defaultRate : null;
    }
};
