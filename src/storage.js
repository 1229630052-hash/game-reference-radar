import fs from "node:fs/promises";
import path from "node:path";
import { paths } from "./paths.js";

export async function ensureDirs() {
  await Promise.all([
    fs.mkdir(paths.data, { recursive: true }),
    fs.mkdir(paths.recommendations, { recursive: true }),
    fs.mkdir(paths.thumbs, { recursive: true }),
    fs.mkdir(paths.logs, { recursive: true }),
  ]);
}

export async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") return structuredClone(fallback);
    throw error;
  }
}

export async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function recommendationPath(date) {
  return path.join(paths.recommendations, `${date}.json`);
}

export async function appendLog(line) {
  await fs.mkdir(paths.logs, { recursive: true });
  await fs.appendFile(paths.dailyLog, `${new Date().toISOString()} ${line}\n`);
}

export async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
