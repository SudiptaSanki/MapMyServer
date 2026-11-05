/* ─────────────────────────────────────────────
 *  Google Gemini Provider Implementation
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

export class GeminiProvider implements AIProvider {
  readonly id: AIProviderId = "gemini";
  readonly name = "Google Gemini";

  validateConfiguration(config: AIProviderConfig): { valid: boolean; error?: string } {
    if (!config.apiKey || !config.apiKey.trim()) {
      return { valid: false, error: "Google Gemini API key is required." };
    }
    if (!config.modelId || !config.modelId.trim()) {
      return { valid: false, error: "A Gemini model must be selected." };
    }
    return { valid: true };
  }

  getAvailableModels(): AIModel[] {
    return DEFAULT_MODELS_BY_PROVIDER.gemini;
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
        errorMessage: "No response received from Google Gemini.",
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
    const model = config.modelId || "gemini-2.0-flash";
    const endpoint =
      config.customEndpoint?.trim() ||
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
        config.apiKey.trim()
      )}`;

    const systemMessage = messages.find((m) => m.role === "system")?.content;
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    if (contents.length === 0) {
      contents.push({ role: "user", parts: [{ text: "Hello" }] });
    }

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: options?.temperature ?? config.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens,
      },
    };

    if (systemMessage) {
      body.systemInstruction = {
        parts: [{ text: systemMessage }],
      };
    }

    if (options?.jsonMode) {
      (body.generationConfig as Record<string, unknown>).responseMimeType = "application/json";
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: options?.abortSignal,
    });

    if (!res.ok) {
      const errorText = await res.text();
      let errorJson: { error?: { message?: string; status?: string } } | null = null;
      try {
        errorJson = JSON.parse(errorText);
      } catch {
        // ignore
      }

      const msg = errorJson?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
      if (res.status === 400 && msg.includes("API_KEY_INVALID")) {
        throw Object.assign(new Error(`Authentication failed: Invalid API Key`), { status: "auth-failed" });
      }
      if (res.status === 429 || res.status === 403) {
        throw Object.assign(new Error(`Quota or Rate limit exceeded: ${msg}`), { status: "rate-limited" });
      }
      throw Object.assign(new Error(`Gemini request failed: ${msg}`), { status: "unavailable" });
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const textPart = candidate?.content?.parts?.[0];
    const text = textPart?.text || "";

    return {
      text,
      model,
      tokensUsed: data.usageMetadata
        ? {
            prompt: data.usageMetadata.promptTokenCount,
            completion: data.usageMetadata.candidatesTokenCount,
            total: data.usageMetadata.totalTokenCount,
          }
        : undefined,
      finishReason: candidate?.finishReason,
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
