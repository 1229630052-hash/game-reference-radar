import { fetchJson } from "../utils.js";

function appStoreScreenshotUrls(app) {
  return [
    ...(app.screenshotUrls ?? []),
    ...(app.ipadScreenshotUrls ?? []),
  ].filter(Boolean);
}

function imageSizeFromUrl(url) {
  const match = String(url).match(/(\d+)x(\d+)[a-z]*\.(?:jpg|jpeg|png|webp)/i);
  if (!match) return null;
  return {
    width: Number(match[1]),
    height: Number(match[2]),
  };
}

function screenshotAssetType(url) {
  const size = imageSizeFromUrl(url);
  if (size && size.width / size.height >= 1.25) return "活动图";
  return "宣传图";
}

export async function fetchAppStoreCandidates(queryPack, { perPage = 5 } = {}) {
  const candidates = [];
  const countries = ["us", "cn"];

  for (const query of queryPack.queries ?? []) {
    for (const country of countries) {
      const url = new URL("https://itunes.apple.com/search");
      url.searchParams.set("term", query);
      url.searchParams.set("country", country);
      url.searchParams.set("media", "software");
      url.searchParams.set("entity", "software");
      url.searchParams.set("limit", String(perPage));

      const data = await fetchJson(url);
      for (const app of data.results ?? []) {
        const screenshots = appStoreScreenshotUrls(app).slice(0, 4);
        const iconUrl = app.artworkUrl512 || app.artworkUrl100;

        screenshots.forEach((imageUrl, index) => {
          const size = imageSizeFromUrl(imageUrl);
          const assetType = screenshotAssetType(imageUrl);
          const gameTitle = app.trackName || query;
          candidates.push({
            source: "appstore",
            sourceId: `${app.trackId}-${country}-screenshot-${index}`,
            gameId: `appstore:${app.trackId}`,
            gameTitle,
            market: country,
            title: `${gameTitle} · ${assetType} ${index + 1}`,
            description: app.description || "",
            thumbnailUrl: imageUrl,
            sourceUrl: app.trackViewUrl,
            author: app.sellerName || app.artistName || "",
            licenseLabel: "App Store marketing asset, check source",
            licenseUrl: app.trackViewUrl || "",
            inspirationType: queryPack.type,
            category: queryPack.category,
            subcategory: queryPack.subcategory,
            assetType,
            tags: [
              "competitor",
              "app store",
              "casual game",
              "store screenshot",
              assetType,
              country,
              queryPack.type,
              query,
              ...(app.genres ?? []),
            ],
            query,
            width: size?.width ?? 1290,
            height: size?.height ?? 2796,
          });
        });

        if (iconUrl) {
          const gameTitle = app.trackName || query;
          candidates.push({
            source: "appstore",
            sourceId: `${app.trackId}-${country}-icon`,
            gameId: `appstore:${app.trackId}`,
            gameTitle,
            market: country,
            title: `${gameTitle} · ICON`,
            description: app.description || "",
            thumbnailUrl: iconUrl,
            sourceUrl: app.trackViewUrl,
            author: app.sellerName || app.artistName || "",
            licenseLabel: "App Store app icon, check source",
            licenseUrl: app.trackViewUrl || "",
            inspirationType: queryPack.type,
            category: queryPack.category,
            subcategory: queryPack.subcategory,
            assetType: "ICON",
            tags: [
              "competitor",
              "app store",
              "casual game",
              "icon",
              "ICON",
              country,
              queryPack.type,
              query,
              ...(app.genres ?? []),
            ],
            query,
            width: 512,
            height: 512,
          });
        }
      }
    }
  }

  return candidates;
}
