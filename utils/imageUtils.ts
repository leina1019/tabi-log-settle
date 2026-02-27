/**
 * 画像ファイルを読み込み、指定されたサイズにリサイズ・圧縮して
 * Base64データ（data:image/jpeg;base64,...）として返します。
 */
export const resizeImage = (file: File, maxSize: number = 800): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxSize) {
                        height *= maxSize / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width *= maxSize / height;
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx?.drawImage(img, 0, 0, width, height);

                // JPEG 75% 圧縮で品質と容量のバランスをとる
                const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
                resolve(dataUrl);
            };
            img.onerror = reject;
            img.src = event.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};
