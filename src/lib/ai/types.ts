export type AiRole = "system" | "user" | "assistant";

export type AiMessage = {
  role: AiRole;
  content: string;
};

export type AiCompleteOptions = {
  maxOutputTokens?: number;
  temperature?: number;
  /** Model override; defaults to the provider's configured default. */
  model?: string;
};

export interface AiProvider {
  readonly name: string;
  complete(messages: AiMessage[], options?: AiCompleteOptions): Promise<string>;
}

export class AiProviderError extends Error {
  constructor(message: string, readonly provider: string) {
    super(message);
    this.name = "AiProviderError";
  }
}