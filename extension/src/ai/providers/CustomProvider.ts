/* ─────────────────────────────────────────────
 *  Custom OpenAI-Compatible Provider Implementation
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

export class CustomProvider implements AIProvider {
  readonly id: AIProviderId = "custom";
  readonly name = "Custom / Local Endpoint";

  validateConfiguration(config: AIProviderConfig): { valid: boolean; error?: string } {
    if (!config.customEndpoint || !config.customEndpoint.trim()) {
      return { valid: false, error: "A custom API endpoint URL is required." };
    }

    try {
      const url = new URL(config.customEndpoint.trim());
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return { valid: false, error: "Custom endpoint must use http:// or https:// protocol." };
      }
    } catch {
      return { valid: false, error: "Invalid endpoint URL format." };
    }

    if (!config.modelId || !config.modelId.trim()) {
      return { valid: false, error: "A model name/identifier must be specified." };
    }

    return { valid: true };
  }

  getAvailableModels(): AIModel[] {
    return DEFAULT_MODELS_BY_PROVIDER.custom;
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
        errorMessage: "No response received from custom endpoint.",
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
    let endpoint = config.customEndpoint!.trim().replace(/\/$/, "");
    if (!endpoint.endsWith("/chat/completions")) {
      endpoint = `${endpoint}/chat/completions`;
    }

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

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (config.apiKey && config.apiKey.trim()) {
      headers.Authorization = `Bearer ${config.apiKey.trim()}`;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
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
      throw Object.assign(new Error(`Custom endpoint request failed: ${msg}`), { status: "unavailable" });
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
