/* ─────────────────────────────────────────────
 *  OpenRouter Provider Implementation
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

export class OpenRouterProvider implements AIProvider {
  readonly id: AIProviderId = "openrouter";
  readonly name = "OpenRouter";

  validateConfiguration(config: AIProviderConfig): { valid: boolean; error?: string } {
    if (!config.apiKey || !config.apiKey.trim()) {
      return { valid: false, error: "OpenRouter API key is required." };
    }
    if (!config.modelId || !config.modelId.trim()) {
      return { valid: false, error: "A model must be selected." };
    }
    return { valid: true };
  }

  getAvailableModels(): AIModel[] {
    return DEFAULT_MODELS_BY_PROVIDER.openrouter;
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
        errorMessage: "No response received from OpenRouter.",
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
    const endpoint = config.customEndpoint?.trim() || "https://openrouter.ai/api/v1/chat/completions";

    const body: Record<string, unknown> = {
      model: config.modelId,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? config.temperature ?? 0.7,
    };

    if (options?.maxTokens) {
      body.max_tokens = options.maxTokens;
    }

    if (options?.jsonMode) {
      body.response_format = { type: "json_object" };
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey.trim()}`,
        "HTTP-Referer": "https://github.com/MapMyServer",
        "X-Title": "MapMyServer Discord Architect",
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
      throw Object.assign(new Error(`OpenRouter request failed: ${msg}`), { status: "unavailable" });
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const text = choice?.message?.content || "";

    return {
      text,
      model: data.model || config.modelId,
      tokensUsed: data.usage
        ? {
            prompt: data.usage.prompt_tokens,
            completion: data.usage.completion_tokens,
            total: data.usage.total_tokens,
          }
        : undefined,
      finishReason: choice?.finish_reason,
    };
  }

  async generateStructuredResponse<T>(
    messages: AIMessage[],
    config: AIProviderConfig,
    options?: AIGenerationOptions
  ): Promise<T> {
    const res = await this.generateResponse(messages, config, {
      ...options,
      jsonMode: true,
    });

    return parseJSONFromText<T>(res.text);
  }
}
