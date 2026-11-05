/* ─────────────────────────────────────────────
 *  Anthropic Claude Provider Implementation
 * ───────────────────────────────────────────── */

import type { AIProvider } from "./AIProvider";
import {
  type AIProviderId,
  type AIModel,
  type AIProviderConfig,
  type ProviderConnectionState,
  type AIMessage,
  type AIGenerationOptions,
  type AIGenerationResponse,
  DEFAULT_MODELS_BY_PROVIDER,
} from "@mapmyserver/shared";
import { normalizeError, parseJSONFromText } from "./OpenAIProvider";

export class AnthropicProvider implements AIProvider {
  readonly id: AIProviderId = "anthropic";
  readonly name = "Anthropic Claude";

  validateConfiguration(config: AIProviderConfig): { valid: boolean; error?: string } {
    if (!config.apiKey || !config.apiKey.trim()) {
      return { valid: false, error: "Anthropic API key is required." };
    }
    if (!config.apiKey.startsWith("sk-ant-")) {
      return { valid: false, error: "Anthropic API keys typically start with 'sk-ant-'." };
    }
    if (!config.modelId || !config.modelId.trim()) {
      return { valid: false, error: "A Claude model must be selected." };
    }
    return { valid: true };
  }

  getAvailableModels(): AIModel[] {
    return DEFAULT_MODELS_BY_PROVIDER.anthropic;
  }

  async testConnection(config: AIProviderConfig): Promise<ProviderConnectionState> {
    const validation = this.validateConfiguration(config);
    if (!validation.valid) {
      return {
        status: "invalid-config",
        errorMessage: validation.error,
        lastChecked: Date.now(),
      };
    }

    try {
      const response = await this.generateResponse(
        [{ role: "user", content: "Ping" }],
        config,
        { maxTokens: 5, temperature: 0 }
      );

      if (response && response.text) {
        return {
          status: "connected",
          lastChecked: Date.now(),
          testedModel: config.modelId,
        };
      }
      return {
        status: "unavailable",
        errorMessage: "No response received from Anthropic.",
        lastChecked: Date.now(),
      };
    } catch (err: unknown) {
      return normalizeError(err);
    }
  }

  async generateResponse(
    messages: AIMessage[],
    config: AIProviderConfig,
    options?: AIGenerationOptions
  ): Promise<AIGenerationResponse> {
    const endpoint = config.customEndpoint?.trim() || "https://api.anthropic.com/v1/messages";

    // Extract system message if present
    const systemMessage = messages.find((m) => m.role === "system")?.content || "";
    const conversationMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }));

    // Ensure at least one user message
    if (conversationMessages.length === 0) {
      conversationMessages.push({ role: "user", content: "Hello" });
    }

    const body: Record<string, unknown> = {
      model: config.modelId || "claude-3-5-sonnet-20241022",
      messages: conversationMessages,
      max_tokens: options?.maxTokens || 1024,
      temperature: options?.temperature ?? config.temperature ?? 0.7,
    };

    if (systemMessage) {
      body.system = systemMessage;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey.trim(),
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
      signal: options?.abortSignal,
    });

    if (!res.ok) {
      const errorText = await res.text();
      let errorJson: { error?: { message?: string } } | null = null;
      try {
        errorJson = JSON.parse(errorText);
      } catch {
        // ignore
      }

      const msg = errorJson?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
      if (res.status === 401) {
        throw Object.assign(new Error(`Authentication failed: ${msg}`), { status: "auth-failed" });
      }
      if (res.status === 429) {
        throw Object.assign(new Error(`Rate limit exceeded: ${msg}`), { status: "rate-limited" });
      }
      throw Object.assign(new Error(`Anthropic request failed: ${msg}`), { status: "unavailable" });
    }

    const data = await res.json();
    const textBlock = data.content?.find((c: { type: string; text?: string }) => c.type === "text");
    const text = textBlock?.text || "";

    return {
      text,
      model: data.model || config.modelId,
      tokensUsed: data.usage
        ? {
            prompt: data.usage.input_tokens,
            completion: data.usage.output_tokens,
            total: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
          }
        : undefined,
      finishReason: data.stop_reason,
    };
  }

  async generateStructuredResponse<T>(
    messages: AIMessage[],
    config: AIProviderConfig,
    options?: AIGenerationOptions
  ): Promise<T> {
    // Add instruction for JSON
    const structuredMessages: AIMessage[] = [
      ...messages,
      {
        role: "user",
        content: "Respond strictly with valid, parseable JSON matching the requested structure. Do not include markdown codeblocks or conversational preamble.",
      },
    ];

    const res = await this.generateResponse(structuredMessages, config, options);
    return parseJSONFromText<T>(res.text);
  }
}
