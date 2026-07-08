async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36 GameReferenceRadar/1.0",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/\\u003d/g, "=")
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/<[^>]+>/g, "")
    .trim();
}

function extractMeta(html, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
  );
  return decodeHtml(match?.[1] ?? "");
}

function extractAppIds(html) {
  const ids = [
    ...html.matchAll(/\/store\/apps\/details\?id=([A-Za-z0-9._]+)/g),
  ].map((match) => match[1]);
  return unique(ids);
}

function extractPlayImages(html) {
  const raw = [
    ...html.matchAll(/https:\/\/play-lh\.googleusercontent\.com\/[^"'<>\\\s)]+/g),
    ...html.matchAll(/https:\\\/\\\/play-lh\.googleusercontent\.com\\\/[^"'<>\\\s)]+/g),
  ].map((match) => decodeHtml(match[0]));

  return unique(raw)
    .filter((url) => !url.includes("=s48") && !url.includes("=s64"))
    .filter((url) => /[?=](w|h|rw|s)\d|=w\d+-h\d+/.test(url) || url.includes("=rw"))
    .slice(0, 8);
}

async function fetchGooglePlayDetails(appId, query, queryPack, country) {
  const url = new URL("https://play.google.com/store/apps/details");
  url.searchParams.set("id", appId);
  url.searchParams.set("hl", country === "cn" ? "zh_CN" : "en_US");
  url.searchParams.set("gl", country.toUpperCase());
  const html = await fetchText(url);

  const title =
    extractMeta(html, "og:title")
      .replace(/\s*-\s*Apps on Google Play$/i, "")
      .replace(/\s*-\s*Google Play.*$/i, "") || appId;
  const description = extractMeta(html, "description");
  const sourceUrl = url.toString();
  const images = extractPlayImages(html).slice(0, 4);

  return images.map((imageUrl, index) => ({
    source: "googleplay",
    sourceId: `${appId}-${country}-${index}`,
    title: `${title} · Google Play 截图 ${index + 1}`,
    description,
    thumbnailUrl: imageUrl,
    sourceUrl,
    author: "",
    licenseLabel: "Google Play public store asset, check source",
    licenseUrl: sourceUrl,
    inspirationType: queryPack.type,
    tags: [
      "competitor",
      "google play",
      "casual game",
      country,
      queryPack.type,
      query,
    ],
    query,
    width: 1290,
    height: 2796,
  }));
}

export async function fetchGooglePlayCandidates(queryPack, { perPage = 3 } = {}) {
  const candidates = [];
  const countries = ["us"];

  for (const query of (queryPack.queries ?? []).slice(0, 2)) {
    for (const country of countries) {
      const url = new URL("https://play.google.com/store/search");
      url.searchParams.set("q", query);
      url.searchParams.set("c", "apps");
      url.searchParams.set("hl", country === "cn" ? "zh_CN" : "en_US");
      url.searchParams.set("gl", country.toUpperCase());

      const html = await fetchText(url);
      const appIds = extractAppIds(html).slice(0, perPage);
      for (const appId of appIds) {
        candidates.push(
          ...(await fetchGooglePlayDetails(appId, query, queryPack, country)),
        );
      }
    }
  }

  return candidates;
}
