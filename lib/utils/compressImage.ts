/**
 * Compress an image file using the Canvas API before uploading.
 * Returns a new File with reduced size while maintaining acceptable quality.
 */
export async function compressImage(
    file: File,
    { maxWidth = 1200, maxHeight = 1200, quality = 0.8 }: { maxWidth?: number; maxHeight?: number; quality?: number } = {},
): Promise<File> {
    console.log(`[compressImage] Input: ${file.name}, ${file.size} bytes, type=${file.type}`);

    // Only compress image types
    if (!file.type.startsWith('image/')) {
        console.log('[compressImage] Not an image, skipping');
        return file;
    }

    // If already small enough (under 500KB), skip compression
    if (file.size <= 500 * 1024) {
        console.log('[compressImage] Already under 500KB, skipping');
        return file;
    }

    return new Promise((resolve, reject) => {
        const img = new window.Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);

            let { width, height } = img;

            // Scale down if needed
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(file); // fallback to original
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        resolve(file);
                        return;
                    }

                    // If compression made it bigger, use original
                    if (blob.size >= file.size) {
                        console.log(`[compressImage] Compressed is bigger (${blob.size} >= ${file.size}), using original`);
                        resolve(file);
                        return;
                    }

                    const compressed = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    });

                    console.log(`[compressImage] Compressed: ${file.size} -> ${compressed.size} bytes (${Math.round(compressed.size / file.size * 100)}%)`);
                    resolve(compressed);
                },
                'image/jpeg',
                quality,
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image for compression'));
        };

        img.src = url;
    });
}
