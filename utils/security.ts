
/**
 * XSS対策用のHTMLエスケープ関数
 */
export function escapeHtml(str: string): string {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>"']/g, (match) => {
        const map: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
        };
        return map[match];
    });
}
