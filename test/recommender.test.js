import assert from "node:assert/strict";
import test from "node:test";
import { applyFeedbackEvent, defaultFeedback } from "../src/feedback.js";
import { dedupeCandidates } from "../src/normalize.js";
import { generateRecommendations } from "../src/recommender.js";
import { scoreCandidate } from "../src/scorer.js";

const baseConfig = {
  dailyCount: 10,
  sourceWeights: { mock: 1, openverse: 1 },
  preferredTags: ["puzzle"],
  blockedTags: [],
  blockedDomains: [],
  typeQuotas: {
    "玩法机制": 2,
    "关卡结构": 2,
    "场景氛围": 2,
    "道具交互": 1,
    "视觉风格": 1,
    "UI反馈": 1,
    "反常组合": 1,
  },
  queryPacks: [
    { type: "玩法机制", queries: ["mechanical toy puzzle"] },
    { type: "关卡结构", queries: ["isometric room design"] },
    { type: "场景氛围", queries: ["cozy fantasy room"] },
  ],
};

test("dedupeCandidates removes repeated source/url candidates", () => {
  const items = dedupeCandidates([
    {
      source: "pexels",
      sourceId: "1",
      sourceUrl: "https://example.com/a?utm=1",
      thumbnailUrl: "https://example.com/a.jpg",
    },
    {
      source: "pexels",
      sourceId: "1",
      sourceUrl: "https://example.com/a?utm=2",
      thumbnailUrl: "https://example.com/a2.jpg",
    },
  ]);
  assert.equal(items.length, 1);
});

test("scoreCandidate reflects feedback and blocked tags", () => {
  const candidate = {
    source: "mock",
    title: "mechanical toy puzzle",
    description: "room puzzle",
    inspirationType: "玩法机制",
    tags: ["puzzle", "toy"],
    thumbnailUrl: "/mock.svg",
    width: 1200,
    height: 800,
  };
  const favoriteFeedback = {
    ...defaultFeedback,
    tagWeights: { puzzle: 3 },
  };
  const base = scoreCandidate(candidate, baseConfig, defaultFeedback);
  const boosted = scoreCandidate(candidate, baseConfig, favoriteFeedback);
  const blocked = scoreCandidate(
    candidate,
    { ...baseConfig, blockedTags: ["puzzle"] },
    defaultFeedback,
  );

  assert.ok(boosted.total > base.total);
  assert.ok(blocked.total < 0);
});

test("applyFeedbackEvent updates tag and item state", () => {
  const next = applyFeedbackEvent(defaultFeedback, {
    id: "abc",
    action: "favorite",
    item: { source: "mock", tags: ["puzzle", "room"] },
  });
  assert.equal(next.items.abc.action, "favorite");
  assert.ok(next.tagWeights.puzzle > 0);
  assert.ok(next.sourceWeights.mock > 0);
});

test("generateRecommendations works without network or API keys", async () => {
  const report = await generateRecommendations({
    config: baseConfig,
    feedback: defaultFeedback,
    useNetwork: false,
    date: "2026-07-08",
  });
  assert.equal(report.date, "2026-07-08");
  assert.equal(report.recommendations.length, 10);
  assert.ok(report.recommendations.every((item) => item.reason && item.gameIdea));
});
