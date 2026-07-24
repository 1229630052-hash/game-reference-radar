import { stableId, uniqueTags } from "./utils.js";

const ASSET_TYPES = ["ICON", "宣传图", "活动图"];

export function inferAssetType(candidate) {
  if (ASSET_TYPES.includes(candidate.assetType)) return candidate.assetType;

  const text = [
    candidate.assetType,
    candidate.title,
    candidate.description,
    candidate.query,
    ...(candidate.tags ?? []),
  ]
    .join(" ")
    .toLowerCase();

  if (text.includes("icon") || text.includes("artwork")) return "ICON";
  if (
    text.includes("活动") ||
    text.includes("event") ||
    text.includes("banner") ||
    text.includes("activity")
  ) {
    return "活动图";
  }

  const width = Number(candidate.width ?? 0);
  const height = Number(candidate.height ?? 0);
  if (width > 0 && height > 0 && width / height >= 1.25) return "活动图";

  return "宣传图";
}

export function normalizeCandidate(candidate) {
  const source = candidate.source ?? "unknown";
  const sourceId = String(candidate.sourceId ?? candidate.sourceUrl ?? candidate.thumbnailUrl);
  const assetType = inferAssetType(candidate);
  const title = candidate.title ?? candidate.description ?? candidate.query ?? "Untitled reference";
  const gameTitle = candidate.gameTitle ?? String(title).replace(/\s*·\s*(ICON|宣传图|活动图|Google Play 截图|商店截图).*$/i, "");
  const gameId = String(
    candidate.gameId ??
      [
        source,
        candidate.sourceUrl?.replace(/[?#].*$/, ""),
        gameTitle,
      ]
        .filter(Boolean)
        .join(":"),
  );
  const tags = uniqueTags([
    candidate.inspirationType,
    candidate.query,
    assetType,
    ...(candidate.tags ?? []),
  ]);

  return {
    id: stableId(source, sourceId, candidate.sourceUrl, candidate.thumbnailUrl),
    source,
    sourceId,
    gameId,
    gameTitle,
    market: candidate.market ?? "",
    title,
    description: candidate.description ?? "",
    thumbnailUrl: candidate.thumbnailUrl ?? "",
    cachedThumbPath: candidate.cachedThumbPath ?? "",
    sourceUrl: candidate.sourceUrl ?? "",
    author: candidate.author ?? "",
    licenseLabel: candidate.licenseLabel ?? "Check source",
    licenseUrl: candidate.licenseUrl ?? "",
    inspirationType: candidate.inspirationType ?? "场景氛围",
    category: candidate.category ?? "",
    subcategory: candidate.subcategory ?? "",
    assetType,
    tags,
    scores: candidate.scores ?? {},
    reason: candidate.reason ?? "",
    gameIdea: candidate.gameIdea ?? "",
    query: candidate.query ?? "",
    width: Number(candidate.width ?? 0),
    height: Number(candidate.height ?? 0),
    createdAt: candidate.createdAt ?? new Date().toISOString(),
  };
}

export function dedupeCandidates(candidates) {
  const seen = new Set();
  const output = [];
  for (const candidate of candidates) {
    const normalized = normalizeCandidate(candidate);
    const key = [
      normalized.source,
      normalized.sourceId,
      normalized.sourceUrl.replace(/[?#].*$/, ""),
    ]
      .filter(Boolean)
      .join("|")
      .toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(normalized);
  }
  return output;
}
