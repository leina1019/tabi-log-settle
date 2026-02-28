/**
 * 日付・時刻に関するユーティリティ
 */

/**
 * 現在のローカル（JST前提）の日付を 'YYYY-MM-DD' 形式で取得する
 */
export const getLocalDateString = (date: Date = new Date()): string => {
    const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return d.toISOString().split('T')[0];
};

/**
 * 現在のローカル時刻を 'HH:MM' 形式で取得する
 */
export const getCurrentTimeStr = (date: Date = new Date()): string => {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

/**
 * 日本語の曜日ラベルを取得する
 */
export const getJapaneseWeekDay = (dateStr: string): string => {
    const d = new Date(dateStr);
    return ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
};
