// One shared loader for project images, used by the totems and the LED
// wall. Cached for the whole visit, so re-entering the hall costs nothing.
// Resolves to null on failure: callers keep their placeholder.

const cache = new Map();

export function loadImage(url) {
    if (!url) return Promise.resolve(null);
    if (!cache.has(url)) {
        cache.set(url, new Promise(resolve => {
            const img = new Image();
            img.crossOrigin = 'anonymous'; // Blob storage sends CORS headers; WebGL needs them
            img.decoding = 'async';
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = url;
        }));
    }
    return cache.get(url);
}

// object-fit: cover of `img` into the rectangle (x, y, w, h).
export function drawCover(ctx, img, x, y, w, h) {
    const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    ctx.restore();
}
