import { paths } from "./paths.js";
import { readJson, writeJson } from "./storage.js";

export const defaultQueryPacks = [
  {
    type: "玩法机制",
    queries: ["screw puzzle", "nuts bolts puzzle", "wood screw puzzle", "pin puzzle"],
  },
  {
    type: "关卡结构",
    queries: ["goods sort", "triple match", "hidden objects", "tile match"],
  },
  {
    type: "场景氛围",
    queries: ["home design game", "room makeover game", "merge mansion", "decor match"],
  },
  {
    type: "道具交互",
    queries: ["water sort puzzle", "ball sort puzzle", "parking jam", "jam puzzle"],
  },
  {
    type: "视觉风格",
    queries: ["match 3 puzzle", "royal match", "toon blast", "candy puzzle"],
  },
  {
    type: "UI反馈",
    queries: ["casual puzzle game", "daily puzzle game", "brain puzzle game", "reward puzzle"],
  },
  {
    type: "反常组合",
    queries: ["merge game", "idle tycoon game", "cleaning game", "organizing game"],
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
  });
}
