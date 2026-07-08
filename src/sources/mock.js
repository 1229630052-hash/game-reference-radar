const mockIdeas = [
  ["玩法机制", "螺丝消除竞品截图", "螺丝、挡板和孔位天然适合拆解成点击顺序与阻挡关系。", "宣传图"],
  ["玩法机制", "停车堵塞关卡", "车辆方向、出口和阻塞链条适合做路径规划与逐步释放。", "宣传图"],
  ["关卡结构", "货架三消整理", "货架分层和同类商品聚合适合做 goods sort / triple match。", "宣传图"],
  ["关卡结构", "找物房间布局", "高密度物件和区域分块适合隐藏物、收纳和清理玩法参考。", "宣传图"],
  ["场景氛围", "房间改造活动页", "家装前后对比和奖励目标适合做装修、合成、剧情推进。", "活动图"],
  ["场景氛围", "合成庄园地图", "区域解锁和任务节点适合做长线目标包装。", "宣传图"],
  ["道具交互", "液体排序瓶子", "颜色分层和容器容量适合做规则清晰的轻解谜。", "宣传图"],
  ["视觉风格", "Match-3 卡通关卡", "大色块、圆润道具和清晰目标适合休闲游戏美术参考。", "宣传图"],
  ["UI反馈", "通关奖励弹窗", "星级、金币和按钮层级适合参考结算反馈。", "活动图"],
  ["反常组合", "清洁整理小游戏", "脏污到干净的强对比适合做爽感反馈和短关卡循环。", "宣传图"],
  ["反常组合", "闲置工厂包装", "生产线与升级按钮适合做轻度经营与合成转化。", "ICON"],
];

export function fetchMockCandidates(config) {
  const output = [];
  let index = 0;
  for (const [type, title, description, assetType] of mockIdeas) {
    const query = config.queryPacks
      ?.find((pack) => pack.type === type)
      ?.queries?.[0] ?? type;
    output.push({
      source: "mock",
      sourceId: `mock-${index}`,
      title,
      description,
      thumbnailUrl: `/api/mock-thumb/${encodeURIComponent(type)}/${encodeURIComponent(title)}.svg`,
      sourceUrl: "",
      author: "Game Reference Radar",
      licenseLabel: "Local mock preview",
      licenseUrl: "",
      inspirationType: type,
      assetType,
      tags: ["mock", type, query, title, assetType, "casual game", "competitor"],
      query,
      width: assetType === "ICON" ? 512 : 1200,
      height: assetType === "ICON" ? 512 : assetType === "活动图" ? 675 : 800,
    });
    index += 1;
  }
  return output;
}
