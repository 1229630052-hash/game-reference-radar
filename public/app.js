const state = {
  report: null,
  feedback: null,
  config: null,
  secrets: null,
  view: "today",
  boardMode: "selected",
  detailItem: null,
  gameCategoryFilter: "",
  typeFilter: "",
  assetFilter: "",
  tagSearch: "",
};

const browserKeys = {
  secrets: "game-reference-radar.secrets",
  config: "game-reference-radar.config",
  feedback: "game-reference-radar.feedback",
  lastReport: "game-reference-radar.lastReport",
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

function readLocal(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function setStatus(text) {
  $("#statusText").textContent = text;
}

function currentItems() {
  if (state.boardMode === "explore") return state.report?.explorationPool || [];
  return state.report?.recommendations || [];
}

function imageUrl(item) {
  return item.cachedThumbPath || item.thumbnailUrl || `/api/mock-thumb/${encodeURIComponent(item.inspirationType)}/${encodeURIComponent(item.title)}.svg`;
}

function itemFeedbackAction(item) {
  return state.feedback?.items?.[item.id]?.action;
}

function assetTypeFor(item) {
  if (item.assetType) return item.assetType;
  const text = [item.title, item.description, ...(item.tags || [])].join(" ").toLowerCase();
  if (text.includes("icon")) return "ICON";
  if (text.includes("活动") || text.includes("event") || text.includes("banner")) return "活动图";
  return "宣传图";
}

function categoryOk(item) {
  if (!state.gameCategoryFilter) return true;
  const keywords = state.gameCategoryFilter.split(",");
  const text = [item.title, item.description, item.query, ...(item.tags || [])].join(" ").toLowerCase();
  return keywords.some((keyword) => text.includes(keyword.trim()));
}

function filteredItems(items) {
  const q = state.tagSearch.trim().toLowerCase();
  return (items || []).filter((item) => {
    const typeOk = !state.typeFilter || item.inspirationType === state.typeFilter;
    const assetOk = !state.assetFilter || assetTypeFor(item) === state.assetFilter;
    const tagText = [item.title, item.description, item.reason, item.gameIdea, ...(item.tags || [])]
      .join(" ")
      .toLowerCase();
    return categoryOk(item) && typeOk && assetOk && (!q || tagText.includes(q));
  });
}

function renderTypeOptions(items) {
  const current = $("#typeFilter").value;
  const types = [...new Set((items || []).map((item) => item.inspirationType).filter(Boolean))];
  $("#typeFilter").innerHTML = [
    `<option value="">全部灵感类型</option>`,
    ...types.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`),
  ].join("");
  $("#typeFilter").value = types.includes(current) ? current : "";
  state.typeFilter = $("#typeFilter").value;
}

function countBy(items, key) {
  const counts = {};
  for (const item of items || []) {
    const value = typeof key === "function" ? key(item) : item[key];
    if (!value) continue;
    counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
}

function sourceSummary(items) {
  const counts = countBy(items, "source");
  return Object.entries(counts)
    .map(([source, count]) => `${source} ${count}`)
    .join(" · ");
}

function renderMetrics() {
  const stats = state.report?.stats || {};
  const candidateSources = stats.sourceCounts || {};
  $("#metricCandidates").textContent = stats.candidateCount ?? 0;
  $("#metricSelected").textContent = stats.selectedCount ?? state.report?.count ?? 0;
  $("#metricExplore").textContent = stats.explorationCount ?? state.report?.explorationPool?.length ?? 0;
  $("#metricStrength").textContent = stats.averageStrength ?? 0;
  $("#metricAppStore").textContent = candidateSources.appstore || 0;
  $("#metricGooglePlay").textContent = candidateSources.googleplay || 0;
}

function renderDigest() {
  const summary = state.report?.summary;
  $("#digestTitle").textContent = summary?.headline || "今日重点正在生成";
  $("#digestText").textContent = summary?.text || "暂无摘要。刷新推荐后会生成今日策展小结。";
  $("#digestBullets").innerHTML = (summary?.bullets || [])
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
}

function strengthFor(item) {
  if (Number.isFinite(item.scores?.strength)) return item.scores.strength;
  return Math.round(Math.min(100, Math.max(0, Number(item.scores?.total ?? 0) * 60)));
}

function renderCards(container, items) {
  const template = $("#cardTemplate");
  container.innerHTML = "";
  if (!items.length) {
    container.innerHTML = `<div class="empty">没有匹配的灵感卡片。</div>`;
    return;
  }

  for (const item of items) {
    const node = template.content.firstElementChild.cloneNode(true);
    const openButton = node.querySelector(".card-open");
    const img = node.querySelector(".card-image");
    const strength = strengthFor(item);
    node.dataset.source = item.source || "";
    node.dataset.feedback = itemFeedbackAction(item) || "";
    openButton.addEventListener("click", () => openDetail(item));
    img.src = imageUrl(item);
    img.alt = item.title;
    node.querySelector(".type-pill").textContent = item.inspirationType;
    node.querySelector(".asset-pill").textContent = assetTypeFor(item);
    node.querySelector(".score-pill").textContent = strength;
    node.querySelector("h3").textContent = item.title;
    node.querySelector(".meta").innerHTML = compactMeta(item)
      .filter(Boolean)
      .join(" · ");
    container.append(node);
  }
}

function compactMeta(item) {
  return [
    item.source ? escapeHtml(item.source) : "",
    item.author ? escapeHtml(item.author) : "",
  ];
}

function sourceMeta(item) {
  return [
    item.source ? `来源：${escapeHtml(item.source)}` : "",
    item.author ? `作者：${escapeHtml(item.author)}` : "",
    item.licenseLabel ? `许可：${escapeHtml(item.licenseLabel)}` : "",
    item.query ? `查询词：${escapeHtml(item.query)}` : "",
  ];
}

function renderDetailModal(item) {
  const strength = strengthFor(item);
  $("#detailImage").src = imageUrl(item);
  $("#detailImage").alt = item.title;
  $("#detailTitle").textContent = item.title;
  $("#detailPills").innerHTML = [
    `<span class="type-pill">${escapeHtml(item.inspirationType)}</span>`,
    `<span class="asset-pill">${escapeHtml(assetTypeFor(item))}</span>`,
    `<span class="score-pill">推荐强度 ${strength}</span>`,
  ].join("");
  $("#detailReason").textContent = item.reason || "这张图有可提炼的视觉或玩法参考。";
  $("#detailIdea").textContent = item.gameIdea || "试着把图中的空间、物件或反馈拆成一个核心互动规则。";
  $("#detailCompetitor").value = item.scores?.competitor ?? 0;
  $("#detailCreative").value = item.scores?.creative ?? 0;
  $("#detailVisual").value = item.scores?.visual ?? 0;
  $("#detailTags").innerHTML = (item.tags || [])
    .slice(0, 12)
    .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
    .join("");
  $("#detailMeta").innerHTML = sourceMeta(item).filter(Boolean).join("<br>");
  $("#detailSourceLink").href = item.sourceUrl || imageUrl(item);

  const activeAction = itemFeedbackAction(item);
  for (const button of $$("#detailModal [data-detail-action]")) {
    const action = button.dataset.detailAction;
    button.dataset.active = activeAction === action ? "true" : "false";
    button.onclick = () => submitFeedback(item, action);
  }
}

function openDetail(item) {
  state.detailItem = item;
  renderDetailModal(item);
  $("#detailModal").hidden = false;
  document.body.classList.add("detail-open");
}

function closeDetail() {
  state.detailItem = null;
  $("#detailModal").hidden = true;
  document.body.classList.remove("detail-open");
}

function filterHint() {
  const parts = [];
  const categoryLabel = $("#gameCategoryFilter").selectedOptions[0]?.textContent;
  const typeLabel = $("#typeFilter").selectedOptions[0]?.textContent;
  const assetLabel = $("#assetFilter").selectedOptions[0]?.textContent;
  if (state.gameCategoryFilter && categoryLabel) parts.push(categoryLabel);
  if (state.typeFilter && typeLabel) parts.push(typeLabel);
  if (state.assetFilter && assetLabel) parts.push(assetLabel);
  if (state.tagSearch.trim()) parts.push(`关键词：${state.tagSearch.trim()}`);
  return parts.length ? parts.join(" / ") : "当前显示全部";
}

function renderToday() {
  const items = currentItems();
  const visible = filteredItems(items);
  $("#reportDate").textContent = state.report?.date || "暂无日报";
  $("#sourceSummary").textContent = sourceSummary(items);
  $("#boardTitle").textContent =
    state.boardMode === "explore"
      ? `灵感探索池 ${items.length} 张`
      : `今日精选 ${state.report?.count || 0} 张`;
  $("#boardSubtitle").textContent =
    state.boardMode === "explore"
      ? "候选素材池适合按品类、用途和关键词继续深挖。"
      : "把竞品素材拆成可执行的玩法、美术和包装想法。";
  renderMetrics();
  renderDigest();
  renderTypeOptions(items);
  $("#visibleCount").textContent = `${visible.length} 张素材`;
  $("#filterHint").textContent = filterHint();
  renderCards($("#cardsGrid"), visible);
}

async function renderFavorites() {
  const favoriteIds = new Set(
    Object.entries(state.feedback?.items || {})
      .filter(([, value]) => value.action === "favorite")
      .map(([id]) => id),
  );
  const localItems = [
    ...(state.report?.recommendations || []),
    ...(state.report?.explorationPool || []),
  ].filter((item) => favoriteIds.has(item.id));
  renderCards($("#favoritesGrid"), localItems);
  setStatus("收藏夹已更新");
}

async function renderHistory() {
  const lastReport = readLocal(browserKeys.lastReport, null);
  const historyList = $("#historyList");
  historyList.innerHTML = "";
  if (!lastReport) {
    historyList.innerHTML = `<div class="empty">暂无历史日报。</div>`;
    $("#historyGrid").innerHTML = "";
    return;
  }
  const button = document.createElement("button");
  button.textContent = `${lastReport.date} · ${lastReport.count} 张精选`;
  button.addEventListener("click", () => renderCards($("#historyGrid"), lastReport.recommendations || []));
  historyList.append(button);
  renderCards($("#historyGrid"), lastReport.recommendations || []);
  setStatus("历史日报已更新");
}

function renderSettings() {
  $("#dailyCount").value = state.config.dailyCount;
  $("#explorationCount").value = state.config.explorationCount || 60;
  $("#scheduleTime").value = state.config.scheduleTime;
  $("#preferredTags").value = (state.config.preferredTags || []).join("\n");
  $("#blockedTags").value = (state.config.blockedTags || []).join("\n");
  $("#queryPacks").value = JSON.stringify(state.config.queryPacks || [], null, 2);
  renderSecretFields();
}

function renderSecretFields() {
  const serverSecrets = state.secrets || {};
  const browserSecrets = readLocal(browserKeys.secrets, {});
  const fields = [
    ["pexelsApiKey", "clearPexelsApiKey"],
    ["unsplashAccessKey", "clearUnsplashAccessKey"],
    ["openaiApiKey", "clearOpenaiApiKey"],
    ["pinterestClientId", "clearPinterestClientId"],
    ["pinterestClientSecret", "clearPinterestClientSecret"],
    ["pinterestRefreshToken", "clearPinterestRefreshToken"],
  ];

  for (const [id, clearId] of fields) {
    const input = $(`#${id}`);
    const status = $(`#${id}Status`);
    const clear = $(`#${clearId}`);
    if (!input || !status || !clear) continue;
    input.value = "";
    clear.checked = false;
    const configured = Boolean(serverSecrets[id]?.configured || browserSecrets[id]);
    input.placeholder = configured ? "留空保留已有 key" : "未配置";
    status.textContent = configured ? "已配置，完整内容不会显示" : "未配置";
  }

  $("#openaiModel").value = browserSecrets.openaiModel || serverSecrets.openaiModel || "gpt-5-mini";
  $("#openaiBaseUrl").value = browserSecrets.openaiBaseUrl || serverSecrets.openaiBaseUrl || "https://api.openai.com/v1";
}

async function switchView(view) {
  state.view = view;
  $$(".nav-tab").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  $$(".view").forEach((panel) => panel.classList.remove("active"));
  $(`#${view}View`).classList.add("active");
  if (view === "today") renderToday();
  if (view === "favorites") await renderFavorites();
  if (view === "history") await renderHistory();
  if (view === "settings") renderSettings();
}

async function submitFeedback(item, action) {
  const tag = item.tags?.[0] || item.inspirationType;
  const body = { id: item.id, item, action, tag, feedback: state.feedback };
  try {
    state.feedback = (await api("/api/feedback", { method: "POST", body: JSON.stringify(body) })).feedback;
  } catch {
    state.feedback = applyFeedbackLocally(state.feedback, body);
  }
  writeLocal(browserKeys.feedback, state.feedback);
  setStatus(actionLabel(action, tag));
  renderToday();
  if (state.detailItem?.id === item.id) renderDetailModal(item);
  if (state.view === "favorites") await renderFavorites();
}

function applyFeedbackLocally(feedback, { id, action, item, tag }) {
  const next = structuredClone(feedback || { items: {}, tagWeights: {}, sourceWeights: {}, blockedTags: [], blockedSources: [] });
  const now = new Date().toISOString();
  if (id) next.items[id] = { ...(next.items[id] || {}), action, updatedAt: now };
  if (action === "block_tag" && tag && !next.blockedTags.includes(tag)) next.blockedTags.push(tag);
  if (action === "favorite") {
    for (const targetTag of item.tags || []) {
      next.tagWeights[targetTag] = Number(next.tagWeights[targetTag] || 0) + 2;
    }
  }
  return { ...next, updatedAt: now };
}

function actionLabel(action, tag) {
  if (action === "favorite") return "已收藏，这类方向会加权。";
  if (action === "skip") return "已跳过，类似方向会降权。";
  if (action === "more_like") return "已记录，近期会多推荐类似灵感。";
  if (action === "block_tag") return `已屏蔽标签：${tag}`;
  return "反馈已记录。";
}

async function refreshToday() {
  $("#refreshBtn").disabled = true;
  setStatus("正在重新生成今日推荐");
  try {
    state.report = await api("/api/refresh", {
      method: "POST",
      body: JSON.stringify({
        config: state.config,
        feedback: state.feedback,
        secrets: readLocal(browserKeys.secrets, {}),
      }),
    });
    writeLocal(browserKeys.lastReport, state.report);
    renderToday();
    setStatus(`已生成 ${state.report.count} 张精选，灵感探索池 ${state.report.explorationPool?.length || 0} 张`);
  } finally {
    $("#refreshBtn").disabled = false;
  }
}

async function saveSettings(event) {
  event.preventDefault();
  const next = {
    ...state.config,
    dailyCount: Number($("#dailyCount").value),
    explorationCount: Number($("#explorationCount").value),
    scheduleTime: $("#scheduleTime").value,
    preferredTags: lines($("#preferredTags").value),
    blockedTags: lines($("#blockedTags").value),
    queryPacks: JSON.parse($("#queryPacks").value),
  };
  state.config = await api("/api/config", { method: "POST", body: JSON.stringify(next) });
  writeLocal(browserKeys.config, state.config);
  const secretForm = readSecretForm();
  saveBrowserSecrets(secretForm);
  state.secrets = await api("/api/secrets", { method: "POST", body: JSON.stringify(secretForm) });
  renderSecretFields();
  setStatus("设置和 API Key 已保存，下次刷新推荐时生效。");
}

function readSecretForm() {
  return {
    pexelsApiKey: $("#pexelsApiKey").value,
    unsplashAccessKey: $("#unsplashAccessKey").value,
    openaiApiKey: $("#openaiApiKey").value,
    openaiBaseUrl: $("#openaiBaseUrl").value,
    openaiModel: $("#openaiModel").value,
    pinterestClientId: $("#pinterestClientId").value,
    pinterestClientSecret: $("#pinterestClientSecret").value,
    pinterestRefreshToken: $("#pinterestRefreshToken").value,
    clear: {
      pexelsApiKey: $("#clearPexelsApiKey").checked,
      unsplashAccessKey: $("#clearUnsplashAccessKey").checked,
      openaiApiKey: $("#clearOpenaiApiKey").checked,
      pinterestClientId: $("#clearPinterestClientId").checked,
      pinterestClientSecret: $("#clearPinterestClientSecret").checked,
      pinterestRefreshToken: $("#clearPinterestRefreshToken").checked,
    },
  };
}

function saveBrowserSecrets(update) {
  const next = readLocal(browserKeys.secrets, {});
  for (const key of [
    "pexelsApiKey",
    "unsplashAccessKey",
    "openaiApiKey",
    "openaiBaseUrl",
    "openaiModel",
    "pinterestClientId",
    "pinterestClientSecret",
    "pinterestRefreshToken",
  ]) {
    if (update.clear?.[key]) {
      delete next[key];
    } else if (typeof update[key] === "string" && update[key].trim()) {
      next[key] = update[key].trim();
    }
  }
  writeLocal(browserKeys.secrets, next);
}

function setBoardMode(mode) {
  state.boardMode = mode;
  $$(".segment").forEach((button) => button.classList.toggle("active", button.dataset.boardMode === mode));
  renderToday();
}

function clearFilters() {
  state.gameCategoryFilter = "";
  state.typeFilter = "";
  state.assetFilter = "";
  state.tagSearch = "";
  $("#gameCategoryFilter").value = "";
  $("#typeFilter").value = "";
  $("#assetFilter").value = "";
  $("#tagSearch").value = "";
  renderToday();
}

function lines(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function init() {
  setStatus("正在加载竞品灵感策展台");
  const [report, feedback, config, secrets] = await Promise.all([
    api("/api/today"),
    api("/api/feedback"),
    api("/api/config"),
    api("/api/secrets"),
  ]);
  state.report = report || readLocal(browserKeys.lastReport, null);
  state.feedback = readLocal(browserKeys.feedback, feedback) || feedback;
  state.config = { ...config, ...(readLocal(browserKeys.config, null) || {}) };
  state.secrets = secrets;
  if (state.report) writeLocal(browserKeys.lastReport, state.report);
  renderToday();
  setStatus(`已加载 ${state.report?.count || 0} 张精选，灵感探索池 ${state.report?.explorationPool?.length || 0} 张`);

  $("#refreshBtn").addEventListener("click", refreshToday);
  $("#clearFiltersBtn").addEventListener("click", clearFilters);
  $$(".segment").forEach((button) =>
    button.addEventListener("click", () => setBoardMode(button.dataset.boardMode)),
  );
  $("#gameCategoryFilter").addEventListener("change", (event) => {
    state.gameCategoryFilter = event.target.value;
    renderToday();
  });
  $("#typeFilter").addEventListener("change", (event) => {
    state.typeFilter = event.target.value;
    renderToday();
  });
  $("#assetFilter").addEventListener("change", (event) => {
    state.assetFilter = event.target.value;
    renderToday();
  });
  $("#tagSearch").addEventListener("input", (event) => {
    state.tagSearch = event.target.value;
    renderToday();
  });
  $$(".nav-tab").forEach((button) =>
    button.addEventListener("click", () => switchView(button.dataset.view)),
  );
  $("#settingsForm").addEventListener("submit", saveSettings);
  $$("[data-close-detail]").forEach((node) => node.addEventListener("click", closeDetail));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !$("#detailModal").hidden) closeDetail();
  });
}

init().catch((error) => {
  console.error(error);
  setStatus(`加载失败：${error.message}`);
});
