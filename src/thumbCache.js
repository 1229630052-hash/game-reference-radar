import fs from "node:fs/promises";
import path from "node:path";
import { paths } from "./paths.js";

const contentTypeToExt = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};

function extensionFor(contentType, fallbackUrl) {
  const cleanType = String(contentType ?? "").split(";")[0].trim().toLowerCase();
  if (contentTypeToExt[cleanType]) return contentTypeToExt[cleanType];
  try {
    const ext = path.extname(new URL(fallbackUrl).pathname).toLowerCase();
    if ([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"].includes(ext)) {
      return ext === ".jpeg" ? ".jpg" : ext;
    }
  } catch {
    return ".jpg";
  }
  return ".jpg";
}

export async function cacheThumbnail(item) {
  if (!item.thumbnailUrl || item.thumbnailUrl.startsWith("/")) return item;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(item.thumbnailUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "GameReferenceRadar/1.0" },
    });
    if (!response.ok) return item;
    const contentType = response.headers.get("content-type");
    if (!String(contentType).startsWith("image/")) return item;
    const ext = extensionFor(contentType, item.thumbnailUrl);
    const fileName = `${item.id}${ext}`;
    const filePath = path.join(paths.thumbs, fileName);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > 3_000_000) return item;
    await fs.mkdir(paths.thumbs, { recursive: true });
    await fs.writeFile(filePath, bytes);
    return {
      ...item,
      cachedThumbPath: `/thumbs/${fileName}`,
    };
  } catch {
    return item;
  } finally {
    clearTimeout(timeout);
  }
}

export async function cacheRecommendationThumbnails(items) {
  const output = [];
  for (const item of items) {
    output.push(await cacheThumbnail(item));
  }
  return output;
}
