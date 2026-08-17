import { GeminiProvider } from "./gemini";
import type { AiProvider } from "./types";

/**
 * Provider-agnostic factory. Feature code calls getAiProvider() and never
 * touches a provider SDK directly — swap providers here without rewrites.
 */
export function getAiProvider(): AiProvider {
  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  return new GeminiProvider(key);
}

export type { AiProvider, AiMessage, AiCompleteOptions } from "./types";
export { AiProviderError } from "./types";