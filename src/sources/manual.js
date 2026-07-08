import { paths } from "../paths.js";
import { readJson } from "../storage.js";

export async function fetchManualCandidates() {
  const seeds = await readJson(paths.manualSeeds, []);
  return seeds
    .filter((seed) => seed.sourceUrl || seed.thumbnailUrl)
    .map((seed, index) => ({
      source: "manual",
      sourceId: seed.sourceUrl || `manual-${index}`,
      title: seed.title || "手动灵感种子",
      description: seed.description || "",
      thumbnailUrl: seed.thumbnailUrl || "",
      sourceUrl: seed.sourceUrl || "",
      author: seed.author || "",
      licenseLabel: seed.licenseLabel || "Check source",
      licenseUrl: seed.licenseUrl || "",
      inspirationType: seed.inspirationType || "反常组合",
      assetType: seed.assetType,
      tags: seed.tags || ["manual seed"],
      query: "manual seed",
    }));
}
