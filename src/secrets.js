import { paths } from "./paths.js";
import { readJson, writeJson } from "./storage.js";

export const defaultSecrets = {
  pexelsApiKey: "",
  unsplashAccessKey: "",
  openaiApiKey: "",
  openaiBaseUrl: "https://api.openai.com/v1",
  openaiModel: "gpt-5-mini",
  pinterestClientId: "",
  pinterestClientSecret: "",
  pinterestRefreshToken: "",
  updatedAt: null,
};

const secretKeys = [
  "pexelsApiKey",
  "unsplashAccessKey",
  "openaiApiKey",
  "pinterestClientId",
  "pinterestClientSecret",
  "pinterestRefreshToken",
];

export async function loadSecrets() {
  const loaded = await readJson(paths.secrets, defaultSecrets);
  return {
    ...defaultSecrets,
    ...loaded,
  };
}

export async function saveSecrets(nextSecrets) {
  await writeJson(paths.secrets, {
    ...defaultSecrets,
    ...nextSecrets,
    updatedAt: new Date().toISOString(),
  });
}

export async function mergeSecretsUpdate(update) {
  const current = await loadSecrets();
  const next = { ...current };

  for (const key of secretKeys) {
    if (update.clear?.[key]) {
      next[key] = "";
    } else if (typeof update[key] === "string" && update[key].trim()) {
      next[key] = update[key].trim();
    }
  }

  if (typeof update.openaiBaseUrl === "string" && update.openaiBaseUrl.trim()) {
    next.openaiBaseUrl = update.openaiBaseUrl.trim().replace(/\/+$/, "");
  }

  if (typeof update.openaiModel === "string" && update.openaiModel.trim()) {
    next.openaiModel = update.openaiModel.trim();
  }

  await saveSecrets(next);
  return next;
}

function maskSecret(value) {
  if (!value) return "";
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}

export function publicSecretsStatus(secrets) {
  return {
    pexelsApiKey: {
      configured: Boolean(secrets.pexelsApiKey),
      masked: maskSecret(secrets.pexelsApiKey),
    },
    unsplashAccessKey: {
      configured: Boolean(secrets.unsplashAccessKey),
      masked: maskSecret(secrets.unsplashAccessKey),
    },
    openaiApiKey: {
      configured: Boolean(secrets.openaiApiKey),
      masked: maskSecret(secrets.openaiApiKey),
    },
    openaiBaseUrl: secrets.openaiBaseUrl || defaultSecrets.openaiBaseUrl,
    openaiModel: secrets.openaiModel || defaultSecrets.openaiModel,
    pinterestClientId: {
      configured: Boolean(secrets.pinterestClientId),
      masked: maskSecret(secrets.pinterestClientId),
    },
    pinterestClientSecret: {
      configured: Boolean(secrets.pinterestClientSecret),
      masked: maskSecret(secrets.pinterestClientSecret),
    },
    pinterestRefreshToken: {
      configured: Boolean(secrets.pinterestRefreshToken),
      masked: maskSecret(secrets.pinterestRefreshToken),
    },
    updatedAt: secrets.updatedAt,
  };
}
