import { paths } from "./paths.js";
import { readJson, writeJson } from "./storage.js";

export const defaultQueryPacks = [
  {
    type: "玩法机制",
    category: "解谜益智",
    subcategory: "螺丝/插销解谜",
    queries: ["screw puzzle", "nuts bolts puzzle"],
  },
  {
    type: "关卡结构",
    category: "排序 / 整理",
    subcategory: "货架/整理/分类",
    queries: ["goods sort", "triple match"],
  },
  {
    type: "场景氛围",
    category: "装修 / 改造",
    subcategory: "装修/改造",
    queries: ["home design game", "room makeover game"],
  },
  {
    type: "道具交互",
    category: "竞速 / 停车 / Jam",
    subcategory: "停车/堵塞",
    queries: ["parking jam", "traffic jam puzzle"],
  },
  {
    type: "视觉风格",
    category: "三消 / 消除",
    subcategory: "三消/Tile Match",
    queries: ["match 3 puzzle", "tile match"],
  },
  {
    type: "UI反馈",
    category: "LiveOps / 活动包装",
    subcategory: "活动/奖励包装",
    queries: ["daily puzzle game", "reward puzzle"],
  },
  {
    type: "反常组合",
    category: "合成 / Merge",
    subcategory: "合成/庄园",
    queries: ["merge game", "merge mansion"],
  },
  {
    type: "道具交互",
    category: "找物 / 清理",
    subcategory: "找物/清理",
    queries: ["hidden objects", "cleaning game"],
  },
  {
    type: "关卡结构",
    category: "模拟经营",
    subcategory: "餐厅/农场/商店",
    queries: ["cooking game", "farm simulation game"],
  },
  {
    type: "UI反馈",
    category: "放置 / Idle",
    subcategory: "放置/经营成长",
    queries: ["idle tycoon game", "factory idle game"],
  },
  {
    type: "玩法机制",
    category: "跑酷 / 轻动作",
    subcategory: "跑酷/轻动作",
    queries: ["runner game", "subway runner game"],
  },
  {
    type: "关卡结构",
    category: "塔防 / 轻策略",
    subcategory: "塔防/轻策略",
    queries: ["tower defense game", "strategy battle game"],
  },
  {
    type: "视觉风格",
    category: "卡牌 / 收集",
    subcategory: "卡牌/收集",
    queries: ["card collection game", "gacha game"],
  },
  {
    type: "场景氛围",
    category: "RPG / 轻中度包装",
    subcategory: "冒险/RPG包装",
    queries: ["rpg adventure game", "hero quest game"],
  },
  {
    type: "反常组合",
    category: "社交 / 派对",
    subcategory: "派对/多人",
    queries: ["party game", "multiplayer casual game"],
  },
  {
    type: "视觉风格",
    category: "体育 / 竞技",
    subcategory: "体育/竞技",
    queries: ["soccer game", "sports game"],
  },
  {
    type: "UI反馈",
    category: "Casino / Slots 包装参考",
    subcategory: "老虎机/金币包装",
    queries: ["slots game", "casino game"],
  },
];

export const defaultTypeQuotas = {
  玩法机制: 2,
  关卡结构: 2,
  场景氛围: 2,
  道具交互: 1,
  视觉风格: 1,
  UI反馈: 1,
  反常组合: 1,
};

export const defaultConfig = {
  dailyCount: 10,
  explorationCount: 60,
  timezone: "Asia/Shanghai",
  scheduleTime: "09:00",
  port: 4188,
  queryBudgetPerPack: 1,
  requestConcurrency: 8,
  sourceTimeoutMs: 7000,
  aiInsightLimit: 12,
  sourceWeights: {
    appstore: 1.55,
    googleplay: 1.45,
    pexels: 0,
    unsplash: 0,
    openverse: 0,
    pinterest: 0.7,
    manual: 0.8,
    mock: 0.55,
  },
  typeQuotas: defaultTypeQuotas,
  preferredTags: [
    "casual game",
    "competitor",
    "puzzle",
    "match",
    "sort",
    "merge",
    "app store",
    "google play",
  ],
  blockedTags: [],
  blockedDomains: [],
  queryPacks: defaultQueryPacks,
};

export async function loadConfig() {
  const loaded = await readJson(paths.config, defaultConfig);
  return {
    ...defaultConfig,
    ...loaded,
    sourceWeights: {
      ...defaultConfig.sourceWeights,
      ...(loaded.sourceWeights ?? {}),
    },
    typeQuotas: {
      ...defaultConfig.typeQuotas,
      ...(loaded.typeQuotas ?? {}),
    },
    preferredTags: loaded.preferredTags ?? defaultConfig.preferredTags,
    blockedTags: loaded.blockedTags ?? defaultConfig.blockedTags,
    blockedDomains: loaded.blockedDomains ?? defaultConfig.blockedDomains,
    queryPacks: loaded.queryPacks?.length
      ? loaded.queryPacks
      : defaultConfig.queryPacks,
  };
}

export async function saveConfig(nextConfig) {
  await writeJson(paths.config, {
    ...defaultConfig,
    ...nextConfig,
    dailyCount: Number(nextConfig.dailyCount) || defaultConfig.dailyCount,
    explorationCount: Number(nextConfig.explorationCount) || defaultConfig.explorationCount,
    port: Number(nextConfig.port) || defaultConfig.port,
    queryBudgetPerPack: Number(nextConfig.queryBudgetPerPack) || defaultConfig.queryBudgetPerPack,
    requestConcurrency: Number(nextConfig.requestConcurrency) || defaultConfig.requestConcurrency,
    sourceTimeoutMs: Number(nextConfig.sourceTimeoutMs) || defaultConfig.sourceTimeoutMs,
    aiInsightLimit: Number(nextConfig.aiInsightLimit) || defaultConfig.aiInsightLimit,
  });
}
