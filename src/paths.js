import path from "node:path";
import { fileURLToPath } from "node:url";

function moduleDir() {
  if (typeof __dirname !== "undefined") return __dirname;
  return path.dirname(fileURLToPath(import.meta.url));
}

export const projectRoot = path.resolve(moduleDir(), "..");

export const paths = {
  data: path.join(projectRoot, "data"),
  recommendations: path.join(projectRoot, "data", "recommendations"),
  feedback: path.join(projectRoot, "data", "feedback.json"),
  config: path.join(projectRoot, "data", "config.json"),
  secrets: path.join(projectRoot, "data", "secrets.json"),
  manualSeeds: path.join(projectRoot, "data", "manual-seeds.json"),
  public: path.join(projectRoot, "public"),
  cache: path.join(projectRoot, "cache"),
  thumbs: path.join(projectRoot, "cache", "thumbs"),
  logs: path.join(projectRoot, "logs"),
  dailyLog: path.join(projectRoot, "logs", "daily.log"),
};
