import { AiProviderError, type AiMessage, type AiCompleteOptions, type AiProvider } from "./types";

const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 500;

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

    const systemText = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");

    const systemInstruction = systemText
      ? { parts: [{ text: systemText }] }
      : undefined;

    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [
          { text: m.content },
          ...(m.image
            ? [
                {
                  inline_data: {
                    mime_type: m.image.mimeType,
                    data: m.image.dataBase64,
                  },
                },
              ]
            : []),
        ],
      }));

    const timeoutMs = 60_000;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${
      options.model ?? this.defaultModel
    }:generateContent`;
    const payload = JSON.stringify({
      contents,
      ...(systemInstruction ? { systemInstruction } : {}),
      generationConfig: {
        maxOutputTokens: options.maxOutputTokens ?? 4096,
        temperature: options.temperature ?? 0.7,
        ...(options.jsonMode ? { responseMimeType: "application/json" } : {}),
      },
    });

    const result = await this.fetchWithRetry(url, payload, timeoutMs);
    if (result instanceof AiProviderError) {
      throw result;
    }

    const data = (await result.json()) as GeminiResponse;

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

  private async fetchWithRetry(
    url: string,
    payload: string,
    timeoutMs: number,
  ): Promise<Response | AiProviderError> {
    let lastError: AiProviderError | null = null;

    for (let attempt = 0; attempt <= RETRY_ATTEMPTS; attempt++) {
      let response: Response;
      try {
        response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": this.apiKey,
          },
          signal: AbortSignal.timeout(timeoutMs),
          body: payload,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown network error";
        lastError = new AiProviderError(
          `Gemini request failed: ${message}`,
          this.name,
        );

        if (attempt === RETRY_ATTEMPTS) {
          return lastError;
        }

        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY_MS * 2 ** attempt),
        );
        continue;
      }

      if (response.ok) {
        return response;
      }

      const message = `Gemini API ${response.status}: ${await response.text()}`;
      lastError = new AiProviderError(message, this.name);

      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === RETRY_ATTEMPTS) {
        return lastError;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY_MS * 2 ** attempt),
      );
    }

    return lastError ?? new AiProviderError("Gemini request failed", this.name);
  }
}