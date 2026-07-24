import { fetchJson } from "../utils.js";

export async function fetchPexelsCandidates(queryPack, { perPage = 8, secrets = {} } = {}) {
  const apiKey = secrets.pexelsApiKey || process.env.PEXELS_API_KEY;
  if (!apiKey) return [];

  const candidates = [];
  for (const query of queryPack.queries ?? []) {
    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", String(perPage));
    url.searchParams.set("orientation", "landscape");

    const data = await fetchJson(url, {
      headers: { Authorization: apiKey },
    });

    for (const photo of data.photos ?? []) {
      candidates.push({
        source: "pexels",
        sourceId: photo.id,
        title: photo.alt || query,
        description: photo.alt || "",
        thumbnailUrl: photo.src?.large || photo.src?.medium || photo.src?.original,
        sourceUrl: photo.url,
        author: photo.photographer,
        licenseLabel: "Pexels License",
        licenseUrl: "https://www.pexels.com/license/",
        inspirationType: queryPack.type,
        category: queryPack.category,
        subcategory: queryPack.subcategory,
        tags: ["pexels", queryPack.type, query],
        query,
        width: photo.width,
        height: photo.height,
      });
    }
  }
  return candidates;
}
