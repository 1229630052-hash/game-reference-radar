import { fetchJson } from "../utils.js";

export async function fetchUnsplashCandidates(queryPack, { perPage = 8, secrets = {} } = {}) {
  const accessKey = secrets.unsplashAccessKey || process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return [];

  const candidates = [];
  for (const query of queryPack.queries ?? []) {
    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", String(perPage));
    url.searchParams.set("orientation", "landscape");
    url.searchParams.set("content_filter", "high");

    const data = await fetchJson(url, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });

    for (const photo of data.results ?? []) {
      candidates.push({
        source: "unsplash",
        sourceId: photo.id,
        title: photo.alt_description || photo.description || query,
        description: photo.description || photo.alt_description || "",
        thumbnailUrl: photo.urls?.regular || photo.urls?.small,
        sourceUrl: photo.links?.html,
        author: photo.user?.name,
        licenseLabel: "Unsplash License",
        licenseUrl: "https://unsplash.com/license",
        inspirationType: queryPack.type,
        category: queryPack.category,
        subcategory: queryPack.subcategory,
        tags: [
          "unsplash",
          queryPack.type,
          query,
          ...(photo.tags ?? []).map((tag) => tag.title),
        ],
        query,
        width: photo.width,
        height: photo.height,
      });
    }
  }
  return candidates;
}
