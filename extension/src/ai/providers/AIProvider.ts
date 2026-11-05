/* ─────────────────────────────────────────────
 *  AI Provider Interface
 *
 *  Common contract for all AI model providers.
 * ───────────────────────────────────────────── */

import type {
  AIProviderId,
  AIModel,
  AIProviderConfig,
  ProviderConnectionState,
  AIMessage,
  AIGenerationOptions,
  AIGenerationResponse,
} from "@mapmyserver/shared";

export interface AIProvider {
  readonly id: AIProviderId;
  readonly name: string;

  /**
   * Performs an actual test request to verify API key validity, network connectivity, and model availability.
   */
  testConnection(config: AIProviderConfig): Promise<ProviderConnectionState>;

  /**
   * Generates a conversational or text response.
   */
  generateResponse(
    messages: AIMessage[],
    config: AIProviderConfig,
    options?: AIGenerationOptions
  ): Promise<AIGenerationResponse>;

  /**
   * Generates a structured JSON response parsed to type T.
   */
  generateStructuredResponse<T>(
    messages: AIMessage[],
    config: AIProviderConfig,
    options?: AIGenerationOptions
  ): Promise<T>;

  /**
   * Returns list of supported models.
   */
  getAvailableModels(): AIModel[];

  /**
   * Validates configuration parameters before making network calls.
   */
  validateConfiguration(config: AIProviderConfig): { valid: boolean; error?: string };
}

