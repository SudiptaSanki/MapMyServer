/* ─────────────────────────────────────────────
 *  AI Service Registry & Key Management
 *
 *  Manages provider instances, local BYOK credentials,
 *  connection verification, and generation dispatch.
 * ───────────────────────────────────────────── */

import type {
  AIProviderId,
  AIProviderConfig,
  ProviderConnectionState,
  AIMessage,
  AIGenerationOptions,
  AIGenerationResponse,
} from "@mapmyserver/shared";
import type { AIProvider } from "../providers/AIProvider";
import { OpenAIProvider } from "../providers/OpenAIProvider";
import { AnthropicProvider } from "../providers/AnthropicProvider";
import { GeminiProvider } from "../providers/GeminiProvider";
import { OpenRouterProvider } from "../providers/OpenRouterProvider";
import { CustomProvider } from "../providers/CustomProvider";

const STORAGE_KEY_CONFIGS = "ai_provider_configs";
const STORAGE_KEY_ACTIVE = "ai_active_provider_id";

class AIServiceClass {
  private providers: Map<AIProviderId, AIProvider> = new Map();
  private inMemoryConfigs: Map<AIProviderId, AIProviderConfig> = new Map();
  private inMemoryActive: AIProviderId = "openai";

  constructor() {
    this.registerProvider(new OpenAIProvider());
    this.registerProvider(new AnthropicProvider());
    this.registerProvider(new GeminiProvider());
    this.registerProvider(new OpenRouterProvider());
    this.registerProvider(new CustomProvider());
  }

  registerProvider(provider: AIProvider): void {
    this.providers.set(provider.id, provider);
  }

  getProvider(providerId: AIProviderId): AIProvider | undefined {
    return this.providers.get(providerId);
  }

  getAllProviders(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  // ── Secure Storage Operations (Local-Only) ───

  async loadConfig(providerId: AIProviderId): Promise<AIProviderConfig | null> {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const res = await chrome.storage.local.get(STORAGE_KEY_CONFIGS);
      const allConfigs = (res[STORAGE_KEY_CONFIGS] as Record<string, AIProviderConfig>) || {};
      return allConfigs[providerId] || null;
    }
    return this.inMemoryConfigs.get(providerId) || null;
  }

  async saveConfig(config: AIProviderConfig): Promise<void> {
    const updated: AIProviderConfig = {
      ...config,
      updatedAt: Date.now(),
      createdAt: config.createdAt || Date.now(),
    };

    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const res = await chrome.storage.local.get(STORAGE_KEY_CONFIGS);
      const allConfigs = (res[STORAGE_KEY_CONFIGS] as Record<string, AIProviderConfig>) || {};
      allConfigs[config.providerId] = updated;
      await chrome.storage.local.set({ [STORAGE_KEY_CONFIGS]: allConfigs });
    } else {
      this.inMemoryConfigs.set(config.providerId, updated);
    }
  }

  async removeConfig(providerId: AIProviderId): Promise<void> {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const res = await chrome.storage.local.get(STORAGE_KEY_CONFIGS);
      const allConfigs = (res[STORAGE_KEY_CONFIGS] as Record<string, AIProviderConfig>) || {};
      delete allConfigs[providerId];
      await chrome.storage.local.set({ [STORAGE_KEY_CONFIGS]: allConfigs });
    } else {
      this.inMemoryConfigs.delete(providerId);
    }
  }

  async getActiveProviderId(): Promise<AIProviderId> {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const res = await chrome.storage.local.get(STORAGE_KEY_ACTIVE);
      return (res[STORAGE_KEY_ACTIVE] as AIProviderId) || "openai";
    }
    return this.inMemoryActive;
  }

  async setActiveProviderId(providerId: AIProviderId): Promise<void> {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      await chrome.storage.local.set({ [STORAGE_KEY_ACTIVE]: providerId });
    } else {
      this.inMemoryActive = providerId;
    }
  }

  async getActiveConfig(): Promise<AIProviderConfig | null> {
    const activeId = await this.getActiveProviderId();
    return this.loadConfig(activeId);
  }

  // ── Testing & Execution ──────────────────────

  async testConnection(providerId: AIProviderId, config?: AIProviderConfig): Promise<ProviderConnectionState> {
    const provider = this.getProvider(providerId);
    if (!provider) {
      return {
        status: "invalid-config",
        errorMessage: `Unknown provider "${providerId}"`,
        lastChecked: Date.now(),
      };
    }

    const effectiveConfig = config || (await this.loadConfig(providerId));
    if (!effectiveConfig) {
      return {
        status: "not-configured",
        errorMessage: "No configuration found for this provider.",
        lastChecked: Date.now(),
      };
    }

    return provider.testConnection(effectiveConfig);
  }

  async generate(
    messages: AIMessage[],
    options?: AIGenerationOptions,
    explicitConfig?: AIProviderConfig
  ): Promise<AIGenerationResponse> {
    const config = explicitConfig || (await this.getActiveConfig());
    if (!config) {
      throw new Error("No active AI provider configured. Please configure an API key in AI Settings.");
    }

    const provider = this.getProvider(config.providerId);
    if (!provider) {
      throw new Error(`Provider "${config.providerId}" is not supported.`);
    }

    return provider.generateResponse(messages, config, options);
  }

  async generateStructured<T>(
    messages: AIMessage[],
    options?: AIGenerationOptions,
    explicitConfig?: AIProviderConfig
  ): Promise<T> {
    const config = explicitConfig || (await this.getActiveConfig());
    if (!config) {
      throw new Error("No active AI provider configured. Please configure an API key in AI Settings.");
    }

    const provider = this.getProvider(config.providerId);
    if (!provider) {
      throw new Error(`Provider "${config.providerId}" is not supported.`);
    }

    return provider.generateStructuredResponse<T>(messages, config, options);
  }
}

export const AIService = new AIServiceClass();

