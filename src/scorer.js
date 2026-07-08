import { clamp, extractDomain, normalizeTag } from "./utils.js";

const typeKeywords = {
  玩法机制: ["puzzle", "mechanic", "toy", "machine", "maze", "run", "board"],
  关卡结构: ["room", "layout", "isometric", "interior", "diorama", "maze"],
  场景氛围: ["cozy", "fantasy", "garden", "workshop", "environment", "whimsical"],
  道具交互: ["tool", "object", "props", "box", "kitchen", "storage"],
  视觉风格: ["clay", "paper", "craft", "felt", "toy", "3d"],
  UI反馈: ["reward", "badge", "icon", "progress", "feedback", "ui"],
  反常组合: ["surreal", "unexpected", "dream", "fantasy", "machine"],
};

export function scoreCandidate(candidate, config, feedback) {
  const text = [
    candidate.title,
    candidate.description,
    candidate.query,
    ...(candidate.tags ?? []),
  ]
    .join(" ")
    .toLowerCase();

  const sourceWeight = Number(config.sourceWeights?.[candidate.source] ?? 1);
  let relevance = 0.35;

  for (const keyword of typeKeywords[candidate.inspirationType] ?? []) {
    if (text.includes(keyword)) relevance += 0.08;
  }

  for (const tag of config.preferredTags ?? []) {
    if (text.includes(normalizeTag(tag))) relevance += 0.06;
  }

  const aspect =
    candidate.width && candidate.height
      ? Math.min(candidate.width / candidate.height, candidate.height / candidate.width)
      : 0.65;
  const visualQuality = clamp(0.4 + aspect * 0.4 + (candidate.thumbnailUrl ? 0.2 : 0), 0, 1);

  let feedbackScore = 0;
  for (const tag of candidate.tags ?? []) {
    feedbackScore += Number(feedback.tagWeights?.[normalizeTag(tag)] ?? 0) * 0.08;
  }
  feedbackScore += Number(feedback.sourceWeights?.[candidate.source] ?? 0) * 0.1;

  const sourceDomain = extractDomain(candidate.sourceUrl);
  const blocked =
    feedback.blockedSources?.includes(candidate.source) ||
    (config.blockedDomains ?? []).some((domain) => sourceDomain.endsWith(domain)) ||
    (config.blockedTags ?? []).some((tag) => text.includes(normalizeTag(tag))) ||
    (feedback.blockedTags ?? []).some((tag) => text.includes(normalizeTag(tag)));

  const assetAdjustment =
    candidate.assetType === "ICON"
      ? -0.16
      : candidate.assetType === "活动图"
        ? 0.05
        : 0.08;

  const raw = blocked
    ? -10
    : sourceWeight * (relevance * 0.52 + visualQuality * 0.32) +
      feedbackScore +
      assetAdjustment;

  return {
    relevance: Number(clamp(relevance, 0, 1).toFixed(3)),
    visualQuality: Number(visualQuality.toFixed(3)),
    feedback: Number(feedbackScore.toFixed(3)),
    asset: Number(assetAdjustment.toFixed(3)),
    total: Number(raw.toFixed(3)),
  };
}

export function addTemplateInsight(candidate) {
  if (candidate.reason && candidate.gameIdea) return candidate;
  const type = candidate.inspirationType;
  const title = candidate.title || "这张参考图";
  const reasonByType = {
    玩法机制: `${title} 里有可以被抽象成规则的结构，适合提炼成路径、排序、联动或触发机制。`,
    关卡结构: `${title} 的空间分区和层次关系比较清晰，适合作为关卡布局、目标点和障碍摆放参考。`,
    场景氛围: `${title} 有明确情绪和主题，可以启发一组关卡包、活动主题或世界观包装。`,
    道具交互: `${title} 里的物件具有可操作感，适合转化成可拖拽、可收纳、可组合的交互道具。`,
    视觉风格: `${title} 的材质、边缘和色彩语言可以帮助确定一套低成本但有记忆点的美术方向。`,
    UI反馈: `${title} 的层级、奖励感或图形节奏适合借鉴到按钮、进度、连击和完成反馈里。`,
    反常组合: `${title} 把不常放在一起的元素组合起来，适合生成更有辨识度的关卡主题。`,
  };
  const ideaByType = {
    玩法机制: "把图中的结构拆成 3 个可互动部件：入口、变化器和出口，让玩家通过调整顺序完成目标。",
    关卡结构: "以图的空间层级为模板，设计一个从外到内逐步解锁的小关卡，每个区域只引入一个新规则。",
    场景氛围: "把这张图延展成一套 10 关主题包，每关复用同一视觉母题，但改变目标道具和反馈动画。",
    道具交互: "选择 5 个最有辨识度的小物件，分别做成拖拽、旋转、合成、开关和收集交互。",
    视觉风格: "用这张图的材质和配色做一版小型美术规范：背景、主物件、按钮、奖励特效各取一个规则。",
    UI反馈: "把画面中的节奏拆成开始、进行中、完成三段反馈，用在关卡胜利或奖励结算界面。",
    反常组合: "保留两个最冲突的元素做主题，例如“家电 + 花园”，再围绕它设计一个核心互动动词。",
  };

  return {
    ...candidate,
    reason: reasonByType[type] ?? reasonByType.场景氛围,
    gameIdea: ideaByType[type] ?? ideaByType.场景氛围,
  };
}
