import { fetchJson } from "../utils.js";

export async function fetchOpenverseCandidates(queryPack, { perPage = 8 } = {}) {
  const candidates = [];
  for (const query of queryPack.queries ?? []) {
    const url = new URL("https://api.openverse.org/v1/images/");
    url.searchParams.set("q", query);
    url.searchParams.set("page_size", String(perPage));
    url.searchParams.set("mature", "false");

    const data = await fetchJson(url);
    for (const image of data.results ?? []) {
      const thumbnailUrl =
        image.thumbnail ||
        image.url ||
        image.foreign_landing_url ||
        "";
      candidates.push({
        source: "openverse",
        sourceId: image.id,
        title: image.title || query,
        description: image.description || "",
        thumbnailUrl,
        sourceUrl: image.foreign_landing_url || image.url,
        author: image.creator || image.provider || "",
        licenseLabel: image.license || "Open license",
        licenseUrl: image.license_url || "",
        inspirationType: queryPack.type,
        tags: [
          "openverse",
          queryPack.type,
          query,
          image.provider,
          image.license,
        ],
        query,
        width: image.width,
        height: image.height,
      });
    }
  }
  return candidates;
}
