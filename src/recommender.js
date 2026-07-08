import { loadConfig } from "./config.js";
import { enrichWithOpenAI } from "./aiInsights.js";
import { loadFeedback } from "./feedback.js";
import { dedupeCandidates } from "./normalize.js";
import { addTemplateInsight, scoreCandidate } from "./scorer.js";
import { loadSecrets } from "./secrets.js";
import { cacheRecommendationThumbnails } from "./thumbCache.js";
import { todayInTimezone } from "./utils.js";
import { fetchManualCandidates } from "./sources/manual.js";
import { fetchMockCandidates } from "./sources/mock.js";
import { fetchAppStoreCandidates } from "./sources/appstore.js";
import { fetchGooglePlayCandidates } from "./sources/googleplay.js";
import { fetchOpenverseCandidates } from "./sources/openverse.js";
import { fetchPexelsCandidates } from "./sources/pexels.js";
import { fetchPinterestCandidates } from "./sources/pinterest.js";
import { fetchUnsplashCandidates } from "./sources/unsplash.js";

export async function collectCandidates(config, { useNetwork = true, secrets = {} } = {}) {
  const errors = [];
  const batches = [];
  const sourceFns = [];
  if (useNetwork) {
    if (Number(config.sourceWeights?.appstore ?? 1) > 0) sourceFns.push(fetchAppStoreCandidates);
    if (Number(config.sourceWeights?.googleplay ?? 1) > 0) sourceFns.push(fetchGooglePlayCandidates);
    if (
      Number(config.sourceWeights?.pexels ?? 0) > 0 &&
      (secrets.pexelsApiKey || process.env.PEXELS_API_KEY)
    ) {
      sourceFns.push(fetchPexelsCandidates);
    }
    if (
      Number(config.sourceWeights?.unsplash ?? 0) > 0 &&
      (secrets.unsplashAccessKey || process.env.UNSPLASH_ACCESS_KEY)
    ) {
      sourceFns.push(fetchUnsplashCandidates);
    }
    if (Number(config.sourceWeights?.openverse ?? 0) > 0) sourceFns.push(fetchOpenverseCandidates);
  }

  for (const queryPack of config.queryPacks ?? []) {
    for (const fn of sourceFns) {
      try {
        batches.push(await fn(queryPack, { secrets }));
      } catch (error) {
        errors.push(`${fn.name}:${queryPack.type}:${error.message}`);
      }
    }
  }

  try {
    batches.push(await fetchManualCandidates());
  } catch (error) {
    errors.push(`manual:${error.message}`);
  }

  try {
    batches.push(await fetchPinterestCandidates({ secrets }));
  } catch (error) {
    errors.push(`pinterest:${error.message}`);
  }

  batches.push(fetchMockCandidates(config));

  return {
    candidates: dedupeCandidates(batches.flat()),
    errors,
  };
}

export function selectDiverseCandidates(candidates, config) {
  const selected = [];
  const quotas = { ...(config.typeQuotas ?? {}) };
  const sorted = [...candidates].sort((a, b) => b.scores.total - a.scores.total);

  for (const [type, quota] of Object.entries(quotas)) {
    const picks = sorted
      .filter((item) => item.inspirationType === type && !selected.some((s) => s.id === item.id))
      .slice(0, quota);
    selected.push(...picks);
  }

  for (const item of sorted) {
    if (selected.length >= config.dailyCount) break;
    if (!selected.some((s) => s.id === item.id)) selected.push(item);
  }

  return ensureAssetCoverage(selected.slice(0, config.dailyCount), sorted, config.dailyCount);
}

function ensureAssetCoverage(selected, sorted, dailyCount) {
  const requiredAssets = ["ICON", "宣传图", "活动图"];
  const output = [...selected];

  for (const assetType of requiredAssets) {
    if (output.some((item) => item.assetType === assetType)) continue;
    const candidate = sorted.find(
      (item) =>
        item.assetType === assetType &&
        !output.some((selectedItem) => selectedItem.id === item.id),
    );
    if (!candidate) continue;

    if (output.length < dailyCount) {
      output.push(candidate);
      continue;
    }

    const replaceIndex = findReplaceIndex(output, assetType);
    if (replaceIndex >= 0) output[replaceIndex] = candidate;
  }

  return output.slice(0, dailyCount);
}

function findReplaceIndex(items, incomingAssetType) {
  const counts = new Map();
  for (const item of items) {
    counts.set(item.assetType, (counts.get(item.assetType) ?? 0) + 1);
  }

  let replaceIndex = -1;
  let replaceScore = Infinity;
  items.forEach((item, index) => {
    if (item.assetType === incomingAssetType) return;
    if ((counts.get(item.assetType) ?? 0) <= 1) return;
    if (item.scores.total < replaceScore) {
      replaceScore = item.scores.total;
      replaceIndex = index;
    }
  });

  if (replaceIndex >= 0) return replaceIndex;
  return items.length - 1;
}

export async function generateRecommendations(options = {}) {
  const config = options.config ?? (await loadConfig());
  const feedback = options.feedback ?? (await loadFeedback());
  const secrets = options.secrets ?? (await loadSecrets());
  const date = options.date ?? todayInTimezone(config.timezone);
  const { candidates, errors } = await collectCandidates(config, {
    useNetwork: options.useNetwork ?? true,
    secrets,
  });

  const scored = candidates
    .map((candidate) => ({
      ...addTemplateInsight(candidate),
      date,
      scores: scoreCandidate(candidate, config, feedback),
      createdAt: new Date().toISOString(),
    }))
    .filter((candidate) => candidate.scores.total > -1)
    .filter((candidate) => candidate.thumbnailUrl || candidate.source === "mock");

  const selected = selectDiverseCandidates(scored, config);
  const enriched = options.useNetwork === false ? selected : await enrichWithOpenAI(selected, secrets);
  const recommendations = await cacheRecommendationThumbnails(enriched);

  return {
    date,
    generatedAt: new Date().toISOString(),
    count: recommendations.length,
    errors,
    recommendations,
  };
}
