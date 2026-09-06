/**
 * ARIA — AI PROVIDER ABSTRACTION (Stage E)
 *
 * The ONLY file in the codebase that knows which AI provider ARIA uses.
 * Swapping providers later (e.g. to Anthropic, if budget allows) means
 * rewriting this file only — callers just see generateAriaReply().
 */

export class AriaProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AriaProviderError";
  }
}

export interface AriaChatMessage {
  role: "user" | "assistant";
  content: string;
}

const GEMINI_MODEL = "gemini-3.1-flash-lite";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export async function generateAriaReply(
  systemPrompt: string,
  history: AriaChatMessage[],
  userMessage: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AriaProviderError("GEMINI_API_KEY is not configured on the server.");
  }

  const contents = [
    ...history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: userMessage }] },
  ];

  let response: Response;
  try {
    response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: 700 },
      }),
    });
  } catch (e) {
    console.error("[ARIA Provider] network error:", e);
    throw new AriaProviderError("Could not reach the AI service.");
  }

  if (response.status === 429) {
    throw new AriaProviderError("The AI service's free-tier limit was reached. Please try again shortly.");
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("[ARIA Provider] non-OK response:", response.status, body);
    throw new AriaProviderError("The AI service returned an error.");
  }

  const data = await response.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    console.error("[ARIA Provider] unexpected response shape:", JSON.stringify(data).slice(0, 500));
    throw new AriaProviderError("The AI service returned an empty response.");
  }

  return text.trim();
}