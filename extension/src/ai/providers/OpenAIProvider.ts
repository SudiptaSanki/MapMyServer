/* ─────────────────────────────────────────────
 *  OpenAI Provider Implementation
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

export class OpenAIProvider implements AIProvider {
  readonly id: AIProviderId = "openai";
  readonly name = "OpenAI";

  validateConfiguration(config: AIProviderConfig): { valid: boolean; error?: string } {
    if (!config.apiKey || !config.apiKey.trim()) {
      return { valid: false, error: "OpenAI API key is required." };
    }
    if (!config.apiKey.startsWith("sk-")) {
      return { valid: false, error: "OpenAI API keys typically start with 'sk-'." };
    }
    if (!config.modelId || !config.modelId.trim()) {
      return { valid: false, error: "A model must be selected." };
    }
    return { valid: true };
  }

  getAvailableModels(): AIModel[] {
    return DEFAULT_MODELS_BY_PROVIDER.openai;
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
        errorMessage: "No response received from OpenAI.",
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
    const endpoint = config.customEndpoint?.trim() || "https://api.openai.com/v1/chat/completions";

    const body: Record<string, unknown> = {
      model: config.modelId || "gpt-4o",
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
      throw Object.assign(new Error(`OpenAI request failed: ${msg}`), { status: "unavailable" });
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

// ── Helpers ────────────────────────────────────

export function parseJSONFromText<T>(text: string): T {
  // Strip Markdown JSON codeblocks if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/```\s*$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/```\s*$/, "");
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    throw new Error(`Failed to parse AI structured response as JSON: ${(err as Error).message}\nRaw text: ${cleaned.slice(0, 300)}`);
  }
}

export function normalizeError(err: unknown): ProviderConnectionState {
  const errorObj = err as { status?: string; message?: string };
  const message = errorObj?.message || String(err);

  if (errorObj?.status === "auth-failed" || message.includes("401") || message.toLowerCase().includes("unauthorized") || message.toLowerCase().includes("invalid api key")) {
    return {
      status: "auth-failed",
      errorMessage: "Authentication failed. Please verify your API key.",
      lastChecked: Date.now(),
    };
  }

  if (errorObj?.status === "rate-limited" || message.includes("429") || message.toLowerCase().includes("quota") || message.toLowerCase().includes("rate limit")) {
    return {
      status: "rate-limited",
      errorMessage: "Rate limit or quota exceeded. Check your provider balance or tier.",
      lastChecked: Date.now(),
    };
  }

  return {
    status: "unavailable",
    errorMessage: message.slice(0, 200),
    lastChecked: Date.now(),
  };
}
