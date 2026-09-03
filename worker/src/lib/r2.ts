import type { Env } from "../types";

const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB

export function logoPath(demoId: string, ext: string): string {
  return `logos/${demoId}.${ext}`;
}

export async function uploadLogo(
  env: Env,
  demoId: string,
  file: File,
): Promise<{ storagePath: string; publicUrl: string }> {
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new Error(`Unsupported logo type: ${file.type}. Use PNG, JPEG, SVG, or WebP.`);
  }
  if (file.size > MAX_LOGO_BYTES) {
    throw new Error(`Logo too large (${Math.round(file.size / 1024)}KB) — max 2MB.`);
  }

  const storagePath = logoPath(demoId, ext);
  const buffer = await file.arrayBuffer();
  await env.LAMHA_LOGOS.put(storagePath, buffer, {
    httpMetadata: { contentType: file.type },
  });

  // Served through the Worker proxy route (/api/demo/:id/logo), not a
  // public bucket URL — see plan doc "logo delivery" note.
  return { storagePath, publicUrl: `/api/demo/${demoId}/logo` };
}

export async function deleteLogo(env: Env, storagePath: string | null): Promise<void> {
  if (!storagePath) return;
  await env.LAMHA_LOGOS.delete(storagePath);
}

export async function getLogoObject(env: Env, storagePath: string): Promise<R2ObjectBody | null> {
  return env.LAMHA_LOGOS.get(storagePath);
}
