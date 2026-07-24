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
import { buildGameGroups } from "./gameGroups.js";

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

  const queryBudgetPerPack = Math.max(1, Number(config.queryBudgetPerPack ?? 1));
  const sourceTimeoutMs = Math.max(1000, Number(config.sourceTimeoutMs ?? 7000));
  const tasks = [];
  for (const queryPack of config.queryPacks ?? []) {
    const activeQueryPack = {
      ...queryPack,
      queries: (queryPack.queries ?? []).slice(0, queryBudgetPerPack),
    };
    for (const fn of sourceFns) {
      tasks.push(async () => {
        try {
          batches.push(await withTimeout(fn(activeQueryPack, { secrets }), sourceTimeoutMs));
        } catch (error) {
          errors.push(`${fn.name}:${activeQueryPack.type}:${error.message}`);
        }
      });
    }
  }
  await runWithConcurrency(tasks, Number(config.requestConcurrency ?? 4));

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

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`timeout after ${timeoutMs}ms`)), timeoutMs),
    ),
  ]);
}

async function runWithConcurrency(tasks, concurrency) {
  const workers = Array.from({ length: Math.max(1, concurrency) }, async (_, workerIndex) => {
    for (let index = workerIndex; index < tasks.length; index += concurrency) {
      await tasks[index]();
    }
  });
  await Promise.all(workers);
}

const requiredVisibleSources = ["appstore", "googleplay"];
const requiredAssetTypes = ["ICON", "宣传图", "活动图"];

function hashText(value) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function dailySortKey(item, date, salt = "") {
  return hashText([date, salt, item.source, item.sourceId, item.sourceUrl, item.id].join("|"));
}

function rankWithDailyRotation(items, date, { windowSize = 12, salt = "" } = {}) {
  const scoreSorted = [...items].sort((a, b) => b.scores.total - a.scores.total);
  const output = [];

  for (let index = 0; index < scoreSorted.length; index += windowSize) {
    const window = scoreSorted.slice(index, index + windowSize);
    window.sort((a, b) => dailySortKey(a, date, salt) - dailySortKey(b, date, salt));
    output.push(...window);
  }

  return output;
}

export function selectDiverseCandidates(candidates, config, date = todayInTimezone(config.timezone)) {
  const selected = [];
  const quotas = { ...(config.typeQuotas ?? {}) };
  const sorted = rankWithDailyRotation(candidates, date, { windowSize: 12, salt: "selected" });

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

  const withAssets = ensureAssetCoverage(selected.slice(0, config.dailyCount), sorted, config.dailyCount);
  return ensureSourceCoverage(withAssets, sorted, config.dailyCount);
}

function ensureAssetCoverage(selected, sorted, dailyCount) {
  const output = [...selected];

  for (const assetType of requiredAssetTypes) {
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

function ensureSourceCoverage(selected, sorted, dailyCount) {
  const output = [...selected];

  for (const source of requiredVisibleSources) {
    if (!sorted.some((item) => item.source === source)) continue;
    if (output.some((item) => item.source === source)) continue;

    const candidate = sorted.find(
      (item) => item.source === source && !output.some((selectedItem) => selectedItem.id === item.id),
    );
    if (!candidate) continue;

    if (output.length < dailyCount) {
      output.push(candidate);
      continue;
    }

    const replaceIndex = findSourceReplaceIndex(output, source);
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

function findSourceReplaceIndex(items, incomingSource) {
  const sourceCounts = new Map();
  const assetCounts = new Map();
  for (const item of items) {
    sourceCounts.set(item.source, (sourceCounts.get(item.source) ?? 0) + 1);
    assetCounts.set(item.assetType, (assetCounts.get(item.assetType) ?? 0) + 1);
  }

  let replaceIndex = -1;
  let replaceScore = Infinity;
  items.forEach((item, index) => {
    if (item.source === incomingSource) return;
    if ((sourceCounts.get(item.source) ?? 0) <= 1) return;
    if (requiredAssetTypes.includes(item.assetType) && (assetCounts.get(item.assetType) ?? 0) <= 1) return;
    if (item.scores.total < replaceScore) {
      replaceScore = item.scores.total;
      replaceIndex = index;
    }
  });

  if (replaceIndex >= 0) return replaceIndex;

  items.forEach((item, index) => {
    if (item.source === incomingSource) return;
    if (item.scores.total < replaceScore) {
      replaceScore = item.scores.total;
      replaceIndex = index;
    }
  });

  if (replaceIndex >= 0) return replaceIndex;
  return items.length - 1;
}

function countBy(items, key) {
  const counts = {};
  for (const item of items) {
    const value = typeof key === "function" ? key(item) : item[key];
    if (!value) continue;
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

function topEntries(counts, limit = 3) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);
}

function buildStats({ candidates, scored, recommendations, explorationPool, gameGroups, errors }) {
  const averageStrength = recommendations.length
    ? Math.round(
        recommendations.reduce((sum, item) => sum + Number(item.scores?.strength ?? 0), 0) /
          recommendations.length,
      )
    : 0;

  return {
    candidateCount: candidates.length,
    scoredCount: scored.length,
    selectedCount: recommendations.length,
    explorationCount: explorationPool.length,
    gameGroupCount: gameGroups.length,
    recommendedGameCount: gameGroups.filter((group) => group.isRecommended).length,
    dedupedAssetCount: gameGroups.reduce((sum, group) => sum + Number(group.assetSummary?.total ?? 0), 0),
    averageStrength,
    sourceCounts: countBy(scored, "source"),
    selectedSourceCounts: countBy(recommendations, "source"),
    visibleSourceCounts: countBy([...recommendations, ...explorationPool], "source"),
    assetCounts: countBy(recommendations, "assetType"),
    typeCounts: countBy(recommendations, "inspirationType"),
    errorCount: errors.length,
  };
}

function buildSummary(stats, recommendations) {
  const topTypes = topEntries(stats.typeCounts, 2).map(([type]) => type);
  const topAssets = topEntries(stats.assetCounts, 2).map(([asset]) => asset);
  const topSources = topEntries(stats.selectedSourceCounts, 2).map(([source, count]) => `${source} ${count}`);
  const strongest = [...recommendations].sort((a, b) => (b.scores?.strength ?? 0) - (a.scores?.strength ?? 0))[0];
  const focus = topTypes.length ? topTypes.join("、") : "休闲游戏竞品";
  const assets = topAssets.length ? topAssets.join("、") : "玩法截图";
  const sources = topSources.length ? topSources.join("，") : "暂无来源分布";

  return {
    headline: `今日重点关注 ${focus}`,
    text: `今日从 ${stats.candidateCount} 个候选里整理出 ${stats.gameGroupCount} 个竞品游戏，其中 ${stats.recommendedGameCount} 个带推荐标签。素材以 ${assets} 为主，来源分布：${sources}。建议优先拆解${strongest ? `《${strongest.gameTitle || strongest.title}》` : "前排推荐"}的玩法结构和包装表达。`,
    bullets: [
      `首页已合并重复素材，同一游戏的 ICON、截图和活动图会收进详情合集。`,
      stats.errorCount > 0
        ? `有 ${stats.errorCount} 个来源请求失败，已用其他来源补足推荐。`
        : "本次抓取没有阻断性错误。",
    ],
  };
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
    .filter((candidate) => candidate.thumbnailUrl || candidate.source === "mock")
    .sort((a, b) => b.scores.total - a.scores.total);

  const selected = selectDiverseCandidates(scored, config, date);
  const enriched = selected;
  const recommendations = await cacheRecommendationThumbnails(enriched);
  const selectedIds = new Set(recommendations.map((item) => item.id));
  const explorationLimit = Number(config.explorationCount ?? 60);
  const explorationCandidates = rankWithDailyRotation(
    scored.filter((item) => !selectedIds.has(item.id)),
    date,
    { windowSize: 20, salt: "explore" },
  );
  const explorationPool = ensureSourceCoverage(
    explorationCandidates.slice(0, explorationLimit),
    explorationCandidates,
    explorationLimit,
  );
  const rawGameGroups = buildGameGroups(scored, { feedback, date });
  const aiInsightLimit = Math.max(0, Number(config.aiInsightLimit ?? 12));
  const enrichedGameGroupSample =
    options.useNetwork === false
      ? rawGameGroups.slice(0, aiInsightLimit)
      : await enrichWithOpenAI(rawGameGroups.slice(0, aiInsightLimit), secrets);
  const enrichedGroupsById = new Map(enrichedGameGroupSample.map((group) => [group.id, group]));
  const gameGroups = rawGameGroups.map((group) => enrichedGroupsById.get(group.id) ?? group);
  const stats = buildStats({ candidates, scored, recommendations, explorationPool, gameGroups, errors });

  return {
    date,
    generatedAt: new Date().toISOString(),
    count: recommendations.length,
    errors,
    stats,
    summary: buildSummary(stats, recommendations),
    recommendations,
    explorationPool,
    gameGroups,
  };
}
