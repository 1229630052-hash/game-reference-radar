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

async function postJson(url, apiKey, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

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
    "You are a game creative curation assistant. Output only a JSON array. Each item must include id, reason, and gameIdea. Write in concise Chinese.";
  const userPrompt = `Write inspiration notes for these game reference images. reason explains why the image is worth recommending; gameIdea explains how to turn it into gameplay, level, art, or UI inspiration.\n${JSON.stringify(
    items.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      inspirationType: item.inspirationType,
      tags: item.tags,
      source: item.source,
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
