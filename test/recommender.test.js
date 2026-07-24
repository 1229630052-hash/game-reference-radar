import assert from "node:assert/strict";
import test from "node:test";
import { applyFeedbackEvent, defaultFeedback } from "../src/feedback.js";
import { dedupeCandidates } from "../src/normalize.js";
import { generateRecommendations, selectDiverseCandidates } from "../src/recommender.js";
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

test("selectDiverseCandidates keeps key store sources visible", () => {
  const candidates = [
    ...Array.from({ length: 14 }, (_, index) =>
      testCandidate(`app-${index}`, "appstore", 1.5 - index * 0.01),
    ),
    ...Array.from({ length: 3 }, (_, index) =>
      testCandidate(`gp-${index}`, "googleplay", 0.9 - index * 0.01),
    ),
  ];

  const selected = selectDiverseCandidates(
    candidates,
    { ...baseConfig, dailyCount: 10, typeQuotas: {} },
    "2026-07-24",
  );

  assert.equal(selected.length, 10);
  assert.ok(selected.some((item) => item.source === "appstore"));
  assert.ok(selected.some((item) => item.source === "googleplay"));
});

test("selectDiverseCandidates rotates high-score candidates by date", () => {
  const candidates = Array.from({ length: 18 }, (_, index) =>
    testCandidate(`mock-${index}`, "mock", 1.1),
  );
  const config = { ...baseConfig, dailyCount: 6, typeQuotas: {} };
  const firstDay = selectDiverseCandidates(candidates, config, "2026-07-24").map((item) => item.id);
  const nextDay = selectDiverseCandidates(candidates, config, "2026-07-25").map((item) => item.id);

  assert.notDeepEqual(nextDay, firstDay);
});

function testCandidate(id, source, total) {
  return {
    id,
    source,
    sourceId: id,
    sourceUrl: `https://example.com/${id}`,
    title: id,
    description: id,
    inspirationType: "玩法机制",
    assetType: "宣传图",
    tags: ["puzzle"],
    thumbnailUrl: `/thumbs/${id}.jpg`,
    scores: {
      total,
      strength: 90,
      competitor: source === "mock" ? 40 : 90,
      creative: 80,
      visual: 80,
    },
  };
}
