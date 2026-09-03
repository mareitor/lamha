// Client-side dominant-color extraction from an uploaded logo image, so
// the admin never has to know or type a hex code (plan doc: "auto-extract
// from logo, recommended"). Pure canvas pixel sampling — no backend, no
// extra dependency.
//
// Approach: downscale onto a small canvas, bucket pixels into a coarse
// color histogram (ignoring near-white/near-black/near-gray/transparent
// pixels, which are usually background rather than brand color), and
// return the most common bucket's average color. This is a heuristic,
// not perceptual color science — good enough for "pick a plausible accent",
// with a manual override always available in the admin editor.
export function extractDominantColor(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = 48;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 128) continue; // transparent

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const isNearWhite = min > 235;
          const isNearBlack = max < 25;
          const isGray = max - min < 18; // low saturation -> treat as background
          if (isNearWhite || isNearBlack || isGray) continue;

          // Coarse quantization so near-identical shades bucket together.
          const key = `${Math.round(r / 24)}-${Math.round(g / 24)}-${Math.round(b / 24)}`;
          const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
          bucket.count++;
          bucket.r += r;
          bucket.g += g;
          bucket.b += b;
          buckets.set(key, bucket);
        }

        let best: { count: number; r: number; g: number; b: number } | null = null;
        for (const bucket of buckets.values()) {
          if (!best || bucket.count > best.count) best = bucket;
        }

        if (!best || best.count === 0) {
          resolve(null);
          return;
        }
        const r = Math.round(best.r / best.count);
        const g = Math.round(best.g / best.count);
        const b = Math.round(best.b / best.count);
        const toHex = (n: number) => n.toString(16).padStart(2, "0");
        resolve(`#${toHex(r)}${toHex(g)}${toHex(b)}`);
      } catch {
        resolve(null);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
