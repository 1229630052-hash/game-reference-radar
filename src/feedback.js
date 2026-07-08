import { paths } from "./paths.js";
import { readJson, writeJson } from "./storage.js";
import { normalizeTag } from "./utils.js";

export const defaultFeedback = {
  items: {},
  tagWeights: {},
  sourceWeights: {},
  blockedTags: [],
  blockedSources: [],
  updatedAt: null,
};

export async function loadFeedback() {
  const loaded = await readJson(paths.feedback, defaultFeedback);
  return {
    ...defaultFeedback,
    ...loaded,
    items: loaded.items ?? {},
    tagWeights: loaded.tagWeights ?? {},
    sourceWeights: loaded.sourceWeights ?? {},
    blockedTags: loaded.blockedTags ?? [],
    blockedSources: loaded.blockedSources ?? [],
  };
}

export async function saveFeedback(feedback) {
  await writeJson(paths.feedback, {
    ...feedback,
    updatedAt: new Date().toISOString(),
  });
}

export function applyFeedbackEvent(feedback, { id, action, item, tag }) {
  if (!id && !tag) throw new Error("feedback requires id or tag");
  const next = structuredClone(feedback);
  const targetTags = item?.tags?.map(normalizeTag).filter(Boolean) ?? [];
  const source = item?.source;
  const now = new Date().toISOString();

  if (id) {
    next.items[id] = {
      ...(next.items[id] ?? {}),
      action,
      updatedAt: now,
    };
  }

  const bumpTags = (delta) => {
    for (const targetTag of targetTags) {
      next.tagWeights[targetTag] = Number(next.tagWeights[targetTag] ?? 0) + delta;
    }
  };

  if (action === "favorite") {
    bumpTags(2);
    if (source) next.sourceWeights[source] = Number(next.sourceWeights[source] ?? 0) + 0.3;
  } else if (action === "skip") {
    bumpTags(-1);
  } else if (action === "more_like") {
    bumpTags(1.5);
  } else if (action === "block_tag") {
    const blocked = normalizeTag(tag ?? targetTags[0]);
    if (blocked && !next.blockedTags.includes(blocked)) {
      next.blockedTags.push(blocked);
    }
  } else if (action === "block_source" && source) {
    if (!next.blockedSources.includes(source)) next.blockedSources.push(source);
  }

  next.updatedAt = now;
  return next;
}
