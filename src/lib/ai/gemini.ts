import { AiProviderError, type AiMessage, type AiCompleteOptions, type AiProvider } from "./types";

const DEFAULT_MODEL = "gemini-2.5-flash";

type GeminiResponse = {
  candidates?: {
    content?: { parts?: { text?: string }[] };
  }[];
  error?: { message: string };
};

/**
 * Gemini provider backed by the REST generateContent endpoint — no SDK
 * dependency, just GEMINI_API_KEY. Swap/override via options.model.
 */
export class GeminiProvider implements AiProvider {
  readonly name = "gemini";

  constructor(
    private readonly apiKey: string,
    private readonly defaultModel = DEFAULT_MODEL,
  ) {}

  async complete(
    messages: AiMessage[],
    options: AiCompleteOptions = {},
  ): Promise<string> {
    if (!this.apiKey) {
      throw new AiProviderError("GEMINI_API_KEY is not set", this.name);
    }

    const systemInstruction = messages
      .filter((m) => m.role === "system")
      .map((m) => ({ text: m.content }));

    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const timeoutMs = 60_000;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${
        options.model ?? this.defaultModel
      }:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        signal: AbortSignal.timeout(timeoutMs),
        body: JSON.stringify({
          contents,
          systemInstruction,
          generationConfig: {
            maxOutputTokens: options.maxOutputTokens ?? 4096,
            temperature: options.temperature ?? 0.7,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new AiProviderError(
        `Gemini API ${response.status}: ${await response.text()}`,
        this.name,
      );
    }

    const data = (await response.json()) as GeminiResponse;

    if (data.error) {
      throw new AiProviderError(data.error.message, this.name);
    }

    const text = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("");

    if (!text) {
      throw new AiProviderError("Gemini returned an empty response", this.name);
    }

    return text;
  }
}