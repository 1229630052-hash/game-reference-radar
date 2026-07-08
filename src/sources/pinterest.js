export async function fetchPinterestCandidates({ secrets = {} } = {}) {
  const hasAuth =
    (secrets.pinterestClientId || process.env.PINTEREST_CLIENT_ID) &&
    (secrets.pinterestClientSecret || process.env.PINTEREST_CLIENT_SECRET) &&
    (secrets.pinterestRefreshToken || process.env.PINTEREST_REFRESH_TOKEN);

  if (!hasAuth) return [];

  // Pinterest is intentionally opt-in and official-API-only.
  // The first version does not scrape pages or bypass login; users can add
  // Pinterest links through manual-seeds.json while OAuth ingestion is added.
  return [];
}
