import { generateRecommendations } from "../../src/recommender.js";
import { loadConfig } from "../../src/config.js";
import { defaultFeedback, applyFeedbackEvent } from "../../src/feedback.js";
import { publicSecretsStatus } from "../../src/secrets.js";

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function json(statusCode, payload) {
  return {
    statusCode,
    headers: jsonHeaders,
    body: JSON.stringify(payload, null, 2),
  };
}

function text(statusCode, body, contentType = "text/plain; charset=utf-8") {
  return {
    statusCode,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    },
    body,
  };
}

function parseBody(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    return {};
  }
}

function apiPath(event) {
  const rawPath = event.rawUrl ? new URL(event.rawUrl).pathname : event.path;
  return rawPath
    .replace(/^\/\.netlify\/functions\/api\/?/, "/")
    .replace(/^\/api\/?/, "/")
    .replace(/^\/+/, "/");
}

function envSecrets() {
  return {
    pexelsApiKey: process.env.PEXELS_API_KEY || "",
    unsplashAccessKey: process.env.UNSPLASH_ACCESS_KEY || "",
    openaiApiKey: process.env.OPENAI_API_KEY || "",
    openaiBaseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    openaiModel: process.env.OPENAI_MODEL || "gpt-5-mini",
    pinterestClientId: process.env.PINTEREST_CLIENT_ID || "",
    pinterestClientSecret: process.env.PINTEREST_CLIENT_SECRET || "",
    pinterestRefreshToken: process.env.PINTEREST_REFRESH_TOKEN || "",
  };
}

function mergeRequestSecrets(body) {
  return {
    ...envSecrets(),
    ...(body.secrets ?? {}),
  };
}

function serverlessConfig(config, body = {}) {
  const sourceWeights = {
    ...config.sourceWeights,
    pexels: process.env.PEXELS_API_KEY ? config.sourceWeights?.pexels ?? 0.28 : 0,
    unsplash: process.env.UNSPLASH_ACCESS_KEY ? config.sourceWeights?.unsplash ?? 0.28 : 0,
    openverse: 0,
    pinterest: 0,
  };

  return {
    ...config,
    ...(body.config ?? {}),
    dailyCount: Number(body.config?.dailyCount ?? config.dailyCount ?? 10),
    sourceWeights,
    queryPacks: (body.config?.queryPacks ?? config.queryPacks ?? []).map((pack) => ({
      ...pack,
      queries: (pack.queries ?? []).slice(0, 1),
    })),
  };
}

async function liveReport(body = {}) {
  const config = serverlessConfig(await loadConfig(), body);
  const secrets = mergeRequestSecrets(body);
  return generateRecommendations({
    config,
    secrets,
    feedback: body.feedback ?? defaultFeedback,
    useNetwork: true,
  });
}

function mockThumbSvg(type, title) {
  const safeType = String(type || "创意灵感").replace(/[<>&]/g, "");
  const safeTitle = String(title || "游戏参考").replace(/[<>&]/g, "");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#10c8c2"/>
      <stop offset="50%" stop-color="#3461ff"/>
      <stop offset="100%" stop-color="#ff6b8a"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#bg)"/>
  <rect x="160" y="150" width="880" height="500" rx="34" fill="#fff" opacity=".9"/>
  <circle cx="360" cy="410" r="82" fill="#ffb547"/>
  <rect x="520" y="300" width="300" height="210" rx="28" fill="#10c8c2"/>
  <path d="M280 560 C430 420 560 610 730 430 S880 350 960 520" fill="none" stroke="#3461ff" stroke-width="34" stroke-linecap="round"/>
  <text x="160" y="100" font-family="Arial, Microsoft YaHei, sans-serif" font-size="42" font-weight="700" fill="#fff">${safeType}</text>
  <text x="160" y="720" font-family="Arial, Microsoft YaHei, sans-serif" font-size="54" font-weight="700" fill="#fff">${safeTitle}</text>
</svg>`;
}

export async function handler(event) {
  const path = apiPath(event);
  const method = event.httpMethod;

  try {
    if (method === "GET" && path === "/today") {
      return json(200, await liveReport());
    }

    if (method === "POST" && path === "/refresh") {
      return json(200, await liveReport(parseBody(event)));
    }

    if (method === "GET" && path === "/config") {
      return json(200, serverlessConfig(await loadConfig()));
    }

    if (method === "POST" && path === "/config") {
      const body = parseBody(event);
      return json(200, serverlessConfig(await loadConfig(), { config: body }));
    }

    if (method === "GET" && path === "/feedback") {
      return json(200, defaultFeedback);
    }

    if (method === "POST" && path === "/feedback") {
      const body = parseBody(event);
      return json(200, {
        ok: true,
        feedback: applyFeedbackEvent(body.feedback ?? defaultFeedback, body),
      });
    }

    if (method === "GET" && path === "/favorites") {
      return json(200, { items: [] });
    }

    if (method === "GET" && path === "/history") {
      return json(200, []);
    }

    if (method === "GET" && path === "/secrets") {
      return json(200, publicSecretsStatus(envSecrets()));
    }

    if (method === "POST" && path === "/secrets") {
      const body = parseBody(event);
      return json(200, publicSecretsStatus(mergeRequestSecrets(body)));
    }

    if (method === "GET" && path.startsWith("/mock-thumb/")) {
      const parts = path.split("/").slice(2).map(decodeURIComponent);
      return text(200, mockThumbSvg(parts[0], (parts[1] ?? "").replace(/\.svg$/, "")), "image/svg+xml; charset=utf-8");
    }

    return json(404, { error: "not found" });
  } catch (error) {
    return json(500, { error: error.message });
  }
}
