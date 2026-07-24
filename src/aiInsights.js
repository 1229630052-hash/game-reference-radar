function getResponseText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  const parts = [];
  for (const item of data.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) parts.push(content.text);
      if (content.type === "text" && content.text) parts.push(content.text);
    }
  }
  return parts.join("\n");
}

function getChatText(data) {
  return data.choices?.[0]?.message?.content ?? "";
}

function parseJsonText(text) {
  return JSON.parse(
    String(text)
      .trim()
      .replace(/^```json\s*|\s*```$/g, ""),
  );
}

function normalizeBaseUrl(value) {
  return (value || "https://api.openai.com/v1").replace(/\/+$/, "");
}

async function postJson(url, apiKey, payload, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const response = await fetch(url, {
    method: "POST",
    signal: controller.signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}`);
  }

  return response.json();
}

export async function enrichWithOpenAI(items, secrets = {}) {
  const apiKey = secrets.openaiApiKey || process.env.OPENAI_API_KEY;
  if (!apiKey || items.length === 0) return items;

  const model = secrets.openaiModel || process.env.OPENAI_MODEL || "gpt-5-mini";
  const baseUrl = normalizeBaseUrl(
    secrets.openaiBaseUrl || process.env.OPENAI_BASE_URL,
  );
  const systemPrompt =
    "You are a senior mobile game competitor analysis assistant. Output only a JSON array. Each item must include id, reason, gameIdea, and analysis. analysis must include recommendationReason, gameplayBorrow, pacing, artPackaging, uiFeedback, suitableProjects, adaptation, and risks. Write concise professional Chinese.";
  const userPrompt = `Write professional inspiration notes for these mobile game competitor references. Focus on gameplay borrowability and art packaging. reason is a one-line card summary; gameIdea is the most useful gameplay borrowing point; analysis is the detail view structure.\n${JSON.stringify(
    items.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      inspirationType: item.inspirationType,
      category: item.category,
      subcategory: item.subcategory,
      assetSummary: item.assetSummary,
      tags: item.tags,
      source: item.source,
      sources: item.sources,
      query: item.query,
    })),
  )}`;

  try {
    let parsed;
    try {
      const responsesData = await postJson(`${baseUrl}/responses`, apiKey, {
        model,
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
      parsed = parseJsonText(getResponseText(responsesData));
    } catch {
      const chatData = await postJson(`${baseUrl}/chat/completions`, apiKey, {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
      parsed = parseJsonText(getChatText(chatData));
    }

    const byId = new Map(parsed.map((item) => [item.id, item]));
    return items.map((item) => {
      const insight = byId.get(item.id);
      if (!insight) return item;
      return {
        ...item,
        reason: insight.reason || item.reason,
        gameIdea: insight.gameIdea || item.gameIdea,
        analysis: insight.analysis ? { ...(item.analysis ?? {}), ...insight.analysis } : item.analysis,
        scores: {
          ...item.scores,
          ai: 1,
        },
      };
    });
  } catch (error) {
    return items.map((item) => ({
      ...item,
      scores: {
        ...item.scores,
        ai: 0,
        aiError: error.message,
      },
    }));
  }
}
