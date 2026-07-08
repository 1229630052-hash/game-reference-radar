import crypto from "node:crypto";

export function todayInTimezone(timeZone = "Asia/Shanghai") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export function stableId(...parts) {
  return crypto
    .createHash("sha1")
    .update(parts.filter(Boolean).join("|"))
    .digest("hex")
    .slice(0, 16);
}

export function normalizeTag(tag) {
  return String(tag ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function uniqueTags(tags) {
  return [...new Set((tags ?? []).map(normalizeTag).filter(Boolean))];
}

export function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 12000);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "GameReferenceRadar/1.0",
        Accept: "application/json",
        ...(options.headers ?? {}),
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${url}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export function weightedPick(items, weightFor) {
  const total = items.reduce((sum, item) => sum + Math.max(0, weightFor(item)), 0);
  if (total <= 0) return items[0];
  let target = Math.random() * total;
  for (const item of items) {
    target -= Math.max(0, weightFor(item));
    if (target <= 0) return item;
  }
  return items.at(-1);
}
