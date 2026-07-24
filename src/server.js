import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig, saveConfig } from "./config.js";
import { applyFeedbackEvent, loadFeedback, saveFeedback } from "./feedback.js";
import {
  loadSecrets,
  mergeSecretsUpdate,
  publicSecretsStatus,
} from "./secrets.js";
import { paths } from "./paths.js";
import { runDaily } from "./daily.js";
import {
  ensureDirs,
  fileExists,
  readJson,
  recommendationPath,
} from "./storage.js";
import { todayInTimezone } from "./utils.js";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload, null, 2));
}

function sendText(res, status, text, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": contentType });
  res.end(text);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function serveFile(res, filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const body = await fs.readFile(filePath);
    const noCache = [".html", ".js", ".css"].includes(ext);
    res.writeHead(200, {
      "Content-Type": mimeTypes[ext] ?? "application/octet-stream",
      "Cache-Control": noCache ? "no-cache" : "public, max-age=3600",
    });
    res.end(body);
  } catch (error) {
    if (error.code === "ENOENT") sendText(res, 404, "Not found");
    else sendText(res, 500, error.message);
  }
}

function mockThumbSvg(type, title) {
  const palettes = {
    "玩法机制": ["#2f80ed", "#f2c94c", "#ffffff"],
    "关卡结构": ["#27ae60", "#56ccf2", "#ffffff"],
    "场景氛围": ["#9b51e0", "#f2994a", "#fff7ed"],
    "道具交互": ["#eb5757", "#f2c94c", "#fdf2f2"],
    "视觉风格": ["#6fcf97", "#bb6bd9", "#f4fff8"],
    "UI反馈": ["#f2994a", "#2d9cdb", "#fffaf0"],
    "反常组合": ["#111827", "#f472b6", "#e0f2fe"],
  };
  const [a, b, c] = palettes[type] ?? palettes["场景氛围"];
  const safeType = type.replace(/[<>&]/g, "");
  const safeTitle = title.replace(/[<>&]/g, "");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${a}"/>
      <stop offset="100%" stop-color="${b}"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#000" flood-opacity=".22"/>
    </filter>
  </defs>
  <rect width="1200" height="800" fill="url(#bg)"/>
  <circle cx="1010" cy="150" r="150" fill="${c}" opacity=".22"/>
  <circle cx="170" cy="650" r="220" fill="${c}" opacity=".18"/>
  <g filter="url(#shadow)">
    <rect x="170" y="150" width="860" height="500" rx="34" fill="${c}" opacity=".92"/>
    <path d="M260 520 C360 405 450 570 560 430 S760 315 890 510" fill="none" stroke="${a}" stroke-width="34" stroke-linecap="round" opacity=".9"/>
    <rect x="255" y="245" width="175" height="120" rx="22" fill="${b}" opacity=".9"/>
    <rect x="505" y="230" width="220" height="155" rx="26" fill="${a}" opacity=".85"/>
    <rect x="785" y="265" width="135" height="205" rx="28" fill="${b}" opacity=".82"/>
    <circle cx="346" cy="478" r="46" fill="${a}"/>
    <circle cx="620" cy="500" r="62" fill="${b}"/>
    <circle cx="850" cy="520" r="42" fill="${a}"/>
  </g>
  <text x="170" y="95" font-family="Arial, Microsoft YaHei, sans-serif" font-size="42" font-weight="700" fill="#fff">${safeType}</text>
  <text x="170" y="715" font-family="Arial, Microsoft YaHei, sans-serif" font-size="54" font-weight="700" fill="#fff">${safeTitle}</text>
</svg>`;
}

async function loadTodayReport(config) {
  const date = todayInTimezone(config.timezone);
  const filePath = recommendationPath(date);
  if (await fileExists(filePath)) {
    const report = await readJson(filePath, null);
    if (report?.stats && Array.isArray(report.explorationPool) && Array.isArray(report.gameGroups)) return report;
  }
  return runDaily({ notify: false });
}

async function loadAllReports() {
  try {
    const files = await fs.readdir(paths.recommendations);
    const reports = [];
    for (const file of files.filter((name) => name.endsWith(".json"))) {
      reports.push(await readJson(path.join(paths.recommendations, file), null));
    }
    return reports.filter(Boolean);
  } catch {
    return [];
  }
}

async function route(req, res) {
  const config = await loadConfig();
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/api/today") {
    return sendJson(res, 200, await loadTodayReport(config));
  }

  if (req.method === "POST" && url.pathname === "/api/refresh") {
    const body = await readBody(req);
    const report = await runDaily({
      notify: false,
      config: body.config,
      feedback: body.feedback,
      secrets: body.secrets,
    });
    return sendJson(res, 200, report);
  }

  if (req.method === "POST" && url.pathname === "/api/feedback") {
    const body = await readBody(req);
    const feedback = await loadFeedback();
    const next = applyFeedbackEvent(feedback, body);
    await saveFeedback(next);
    return sendJson(res, 200, { ok: true, feedback: next });
  }

  if (req.method === "GET" && url.pathname === "/api/feedback") {
    return sendJson(res, 200, await loadFeedback());
  }

  if (req.method === "GET" && url.pathname === "/api/history") {
    const date = url.searchParams.get("date");
    if (date) {
      const filePath = recommendationPath(date);
      if (!(await fileExists(filePath))) return sendJson(res, 404, { error: "not found" });
      return sendJson(res, 200, await readJson(filePath, null));
    }
    const reports = await loadAllReports();
    return sendJson(
      res,
      200,
      reports
        .map((report) => ({
          date: report.date,
          count: report.count,
          generatedAt: report.generatedAt,
        }))
        .sort((a, b) => b.date.localeCompare(a.date)),
    );
  }

  if (req.method === "GET" && url.pathname === "/api/favorites") {
    const feedback = await loadFeedback();
    const favoriteIds = new Set(
      Object.entries(feedback.items)
        .filter(([, value]) => value.action === "favorite")
        .map(([id]) => id),
    );
    const reports = await loadAllReports();
    const items = reports
      .flatMap((report) => report.recommendations ?? [])
      .filter((item) => favoriteIds.has(item.id));
    return sendJson(res, 200, { items });
  }

  if (req.method === "GET" && url.pathname === "/api/config") {
    return sendJson(res, 200, config);
  }

  if (req.method === "GET" && url.pathname === "/api/secrets") {
    return sendJson(res, 200, publicSecretsStatus(await loadSecrets()));
  }

  if (req.method === "POST" && url.pathname === "/api/secrets") {
    const body = await readBody(req);
    const secrets = await mergeSecretsUpdate(body);
    return sendJson(res, 200, publicSecretsStatus(secrets));
  }

  if (req.method === "POST" && url.pathname === "/api/config") {
    const body = await readBody(req);
    await saveConfig(body);
    return sendJson(res, 200, await loadConfig());
  }

  if (req.method === "GET" && url.pathname.startsWith("/api/mock-thumb/")) {
    const parts = url.pathname.split("/").slice(3).map(decodeURIComponent);
    return sendText(
      res,
      200,
      mockThumbSvg(parts[0] ?? "场景氛围", (parts[1] ?? "创意灵感").replace(/\.svg$/, "")),
      "image/svg+xml; charset=utf-8",
    );
  }

  if (req.method === "GET" && url.pathname.startsWith("/thumbs/")) {
    const fileName = path.basename(url.pathname);
    return serveFile(res, path.join(paths.thumbs, fileName));
  }

  if (req.method === "GET") {
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const safePath = path.normalize(decodeURIComponent(pathname)).replace(/^[/\\]+/, "");
    const filePath = path.resolve(paths.public, safePath);
    if (!filePath.startsWith(paths.public)) return sendText(res, 403, "Forbidden");
    return serveFile(res, filePath);
  }

  sendText(res, 405, "Method not allowed");
}

export async function startServer() {
  await ensureDirs();
  const config = await loadConfig();
  const server = http.createServer((req, res) => {
    route(req, res).catch((error) => sendJson(res, 500, { error: error.message }));
  });
  server.listen(config.port, "127.0.0.1", () => {
    console.log(`Game Reference Radar running at http://127.0.0.1:${config.port}`);
  });
  return server;
}

if (path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  startServer();
}
