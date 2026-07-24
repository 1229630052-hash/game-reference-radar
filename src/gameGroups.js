import { stableId } from "./utils.js";

export const gameCategories = [
  { label: "全部移动游戏", keywords: ["game", "mobile", "app"] },
  { label: "解谜益智", keywords: ["puzzle", "brain", "screw", "pin", "nuts", "bolts", "logic"] },
  { label: "三消 / 消除", keywords: ["match", "match 3", "tile", "blast", "candy", "crush"] },
  { label: "合成 / Merge", keywords: ["merge", "mansion", "combine", "craft"] },
  { label: "排序 / 整理", keywords: ["sort", "goods", "organize", "shelf", "triple"] },
  { label: "找物 / 清理", keywords: ["hidden", "object", "clean", "cleaning", "declutter"] },
  { label: "装修 / 改造", keywords: ["home", "room", "decor", "design", "makeover", "renovation"] },
  { label: "模拟经营", keywords: ["sim", "simulation", "cooking", "farm", "restaurant", "store", "business"] },
  { label: "放置 / Idle", keywords: ["idle", "tycoon", "factory", "incremental"] },
  { label: "跑酷 / 轻动作", keywords: ["runner", "run", "subway", "action", "arcade"] },
  { label: "竞速 / 停车 / Jam", keywords: ["parking", "jam", "traffic", "racing", "car"] },
  { label: "塔防 / 轻策略", keywords: ["tower", "defense", "strategy", "battle", "war"] },
  { label: "卡牌 / 收集", keywords: ["card", "collect", "collection", "deck", "gacha"] },
  { label: "RPG / 轻中度包装", keywords: ["rpg", "hero", "quest", "adventure", "fantasy"] },
  { label: "社交 / 派对", keywords: ["party", "social", "friends", "multiplayer"] },
  { label: "体育 / 竞技", keywords: ["sports", "soccer", "football", "basketball", "tennis"] },
  { label: "Casino / Slots 包装参考", keywords: ["casino", "slots", "coin", "bingo", "jackpot"] },
  { label: "LiveOps / 活动包装", keywords: ["event", "daily", "season", "reward", "battle pass", "活动"] },
];

const analysisByType = {
  玩法机制: {
    gameplay: "重点看核心动词、目标阻碍和反馈链条：是否能抽象成点击顺序、路径释放、排序归位或阶段触发。",
    pacing: "适合拆成 15-45 秒短关卡，前段给明确目标，中段制造阻塞，末段用连续消除或释放形成爽点。",
    art: "包装上要让可操作对象和阻挡关系一眼可读，主物件需要高对比边缘和清晰层级。",
  },
  关卡结构: {
    gameplay: "重点看空间分区、目标点和障碍摆放，适合提炼成从外到内、从上到下或分区解锁的关卡结构。",
    pacing: "节奏上可以用小目标串联大目标，每解开一个区域给一次短反馈，避免玩家只看到漫长清理过程。",
    art: "构图应强化区域边界和目标聚焦，用颜色、光照或物件密度提示玩家下一步关注点。",
  },
  场景氛围: {
    gameplay: "适合把场景主题转成任务包：收集、修复、装饰、解锁，让玩法目标和世界包装绑定。",
    pacing: "用阶段式视觉变化承接长期目标，例如破旧到焕新、空白到丰满、普通到节日版本。",
    art: "美术重点是题材记忆点、色彩情绪和主视觉卖点，适合沉淀成活动主题或关卡包皮肤。",
  },
  道具交互: {
    gameplay: "重点看道具是否能承载拖拽、旋转、合成、开关、容量限制或连锁反应。",
    pacing: "每个道具最好只引入一个新规则，再通过组合和顺序变化扩展难度。",
    art: "道具需要有强轮廓和可点击暗示，材质反馈要支撑玩家理解重量、容量和状态变化。",
  },
  视觉风格: {
    gameplay: "玩法借鉴点在于风格如何降低理解成本：圆润形状、夸张比例和大色块能服务轻度规则表达。",
    pacing: "视觉节奏应服务操作节奏，重要反馈需要比背景更亮、更大或更动感。",
    art: "重点拆颜色数量、材质语言、边缘处理和图标一致性，避免只学表面配色。",
  },
  UI反馈: {
    gameplay: "重点看目标、进度、奖励和完成反馈如何让玩家知道自己正在变强或接近胜利。",
    pacing: "适合拆成开始提示、过程确认、完成爆点三段反馈，降低短关卡重复疲劳。",
    art: "UI 需要明确主次层级，奖励数字、按钮和动效焦点要服务下一步行动。",
  },
  反常组合: {
    gameplay: "适合提炼题材反差，把两个不常同屏的元素绑定成一个简单互动动词。",
    pacing: "先用反差吸引点击，再用熟悉规则留住玩家，避免只靠噱头没有可持续关卡变化。",
    art: "包装要控制冲突元素的主次，保证第一眼新鲜，第二眼仍能理解玩法对象。",
  },
};

function textFor(items) {
  return items
    .flatMap((item) => [item.title, item.gameTitle, item.description, item.query, item.inspirationType, ...(item.tags ?? [])])
    .join(" ")
    .toLowerCase();
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

function topValue(counts, fallback = "") {
  return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? fallback;
}

function inferCategory(items) {
  const explicit = topValue(countBy(items, "category"));
  if (explicit) return explicit;
  const text = textFor(items);
  const matches = gameCategories
    .slice(1)
    .map((category) => ({
      label: category.label,
      score: category.keywords.reduce((sum, keyword) => sum + (text.includes(keyword.toLowerCase()) ? 1 : 0), 0),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  return matches[0]?.label ?? "全部移动游戏";
}

function assetSummary(items) {
  const counts = countBy(items, "assetType");
  return {
    icon: counts.ICON ?? 0,
    promo: counts.宣传图 ?? 0,
    event: counts.活动图 ?? 0,
    screenshots: items.filter((item) => item.assetType !== "ICON").length,
    total: items.length,
    label: [
      counts.ICON ? `ICON ${counts.ICON}` : "",
      counts.宣传图 ? `截图 ${counts.宣传图}` : "",
      counts.活动图 ? `活动图 ${counts.活动图}` : "",
    ]
      .filter(Boolean)
      .join(" / "),
  };
}

function recommendationLevel(strength) {
  if (strength >= 85) return "重点推荐";
  if (strength >= 75) return "推荐";
  if (strength >= 65) return "可看看";
  return "普通候选";
}

function chooseCover(items) {
  return (
    items.find((item) => item.assetType === "活动图") ??
    items.find((item) => item.assetType === "宣传图") ??
    items.find((item) => item.assetType === "ICON") ??
    items[0]
  );
}

function groupScores(items, feedback, groupId = "") {
  const maxStrength = Math.max(...items.map((item) => Number(item.scores?.strength ?? 0)), 0);
  const avgCompetitor = Math.round(items.reduce((sum, item) => sum + Number(item.scores?.competitor ?? 0), 0) / items.length);
  const avgCreative = Math.round(items.reduce((sum, item) => sum + Number(item.scores?.creative ?? 0), 0) / items.length);
  const avgVisual = Math.round(items.reduce((sum, item) => sum + Number(item.scores?.visual ?? 0), 0) / items.length);
  const assets = assetSummary(items);
  const completeness = Math.min(100, 34 + assets.icon * 18 + assets.screenshots * 8 + assets.event * 16);
  const favoriteBonus =
    feedback.items?.[groupId]?.action === "favorite" ||
    items.some((item) => feedback.items?.[item.id]?.action === "favorite")
      ? 12
      : 0;
  const skippedPenalty =
    feedback.items?.[groupId]?.action === "skip" ||
    items.some((item) => feedback.items?.[item.id]?.action === "skip")
      ? 10
      : 0;
  const preference = Math.max(0, Math.min(100, 50 + favoriteBonus - skippedPenalty));
  const gameplay = Math.round(Math.min(100, avgCreative * 0.72 + maxStrength * 0.28));
  const art = Math.round(Math.min(100, avgVisual * 0.82 + completeness * 0.18));
  const strength = Math.round(
    Math.min(100, avgCompetitor * 0.24 + gameplay * 0.28 + art * 0.2 + completeness * 0.18 + preference * 0.1),
  );

  return {
    strength,
    competitor: avgCompetitor,
    gameplay,
    art,
    completeness,
    preference,
    total: Number((strength / 60).toFixed(3)),
  };
}

function buildAnalysis(group, items) {
  const type = group.inspirationType;
  const template = analysisByType[type] ?? analysisByType.场景氛围;
  const assets = group.assetSummary.label || `${items.length} 张素材`;
  const sourceLabel = group.sources.join(" / ");

  return {
    recommendationReason: `${group.title} 在 ${group.category} 方向有较高参考价值，当前收录 ${assets}，来源覆盖 ${sourceLabel}，适合优先拆解包装表达和可复用规则。`,
    gameplayBorrow: template.gameplay,
    pacing: template.pacing,
    artPackaging: template.art,
    uiFeedback: "观察目标提示、奖励入口、完成反馈和商店图中强调的卖点，优先借鉴信息层级和反馈节奏，而不是直接复刻界面。",
    suitableProjects: `适合参考到 ${group.category}、${type} 或相近轻中度移动游戏项目中，尤其适合做立项灵感、关卡主题和素材包装方向验证。`,
    adaptation: "保留可读性最强的互动关系，替换题材、道具和胜利反馈；把单一卖点改造成 3-5 个可复用关卡变量，避免只做外观模仿。",
    risks: "注意商店素材可能偏营销图，不一定等同真实玩法；借鉴时需要避开原始角色、图标、版式和独特美术资产，重点学习结构和表达方法。",
  };
}

export function buildGameGroups(items, { feedback = {}, date = "" } = {}) {
  const buckets = new Map();
  for (const item of items) {
    const key = item.gameId || stableId(item.source, item.sourceUrl, item.gameTitle || item.title);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(item);
  }

  return [...buckets.entries()]
    .map(([gameId, groupItems]) => {
      const sortedItems = [...groupItems].sort((a, b) => {
        const assetOrder = { 活动图: 0, 宣传图: 1, ICON: 2 };
        return (assetOrder[a.assetType] ?? 3) - (assetOrder[b.assetType] ?? 3) || (b.scores?.strength ?? 0) - (a.scores?.strength ?? 0);
      });
      const cover = chooseCover(sortedItems);
      const sources = Object.keys(countBy(sortedItems, "source"));
      const category = inferCategory(sortedItems);
      const subcategory = topValue(countBy(sortedItems, "subcategory"), cover.query || "");
      const inspirationType = topValue(countBy(sortedItems, "inspirationType"), cover.inspirationType);
      const groupStableId = stableId("game-group", gameId);
      const scores = groupScores(sortedItems, feedback, groupStableId);
      const level = recommendationLevel(scores.strength);
      const itemActions = [
        feedback.items?.[groupStableId]?.action,
        ...sortedItems.map((item) => feedback.items?.[item.id]?.action),
      ].filter(Boolean);
      const tags = [
        level,
        ...sources.map((source) => (source === "appstore" ? "App Store" : source === "googleplay" ? "Google Play" : source)),
        itemActions.includes("favorite") ? "已收藏" : "",
        category,
        inspirationType,
      ].filter(Boolean);
      const group = {
        id: groupStableId,
        gameId,
        date,
        source: cover.source,
        sources,
        title: cover.gameTitle || cover.title,
        description: cover.description,
        thumbnailUrl: cover.thumbnailUrl,
        cachedThumbPath: cover.cachedThumbPath,
        sourceUrl: cover.sourceUrl,
        author: cover.author,
        licenseLabel: cover.licenseLabel,
        licenseUrl: cover.licenseUrl,
        inspirationType,
        category,
        subcategory: subcategory || cover.query || inspirationType,
        assetType: cover.assetType,
        assetSummary: assetSummary(sortedItems),
        recommendationLevel: level,
        recommendationTags: tags,
        tags: [...new Set(sortedItems.flatMap((item) => item.tags ?? []))].slice(0, 18),
        scores,
        query: cover.query,
        items: sortedItems,
        isRecommended: scores.strength >= 75,
        isNew: !itemActions.length,
        createdAt: cover.createdAt,
      };
      return {
        ...group,
        reason: `${level}：${group.title} 的${category}包装清晰，适合参考${inspirationType}表达。`,
        gameIdea: buildAnalysis(group, sortedItems).gameplayBorrow,
        analysis: buildAnalysis(group, sortedItems),
      };
    })
    .sort((a, b) => {
      const levelOrder = { 重点推荐: 0, 推荐: 1, 可看看: 2, 普通候选: 3 };
      return (
        (levelOrder[a.recommendationLevel] ?? 9) - (levelOrder[b.recommendationLevel] ?? 9) ||
        b.scores.strength - a.scores.strength ||
        a.title.localeCompare(b.title)
      );
    });
}
