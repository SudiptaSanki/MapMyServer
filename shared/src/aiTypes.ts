/* ─────────────────────────────────────────────
 *  Discord Server Blueprint — AI & Architecture Types
 *
 *  Shared models for Multi-Provider AI (BYOK),
 *  AI context generation, server recommendations,
 *  architecture planning, and diffing.
 * ───────────────────────────────────────────── */

import type { ChannelType, ChannelPurpose, VisibilityClassification, Category, Channel } from "./index";

// ── Provider Definitions ───────────────────────

export type AIProviderId = "openai" | "anthropic" | "gemini" | "openrouter" | "custom";

export interface AIModel {
  id: string;
  name: string;
  contextWindow?: number;
  description?: string;
}

export interface AIProviderConfig {
  providerId: AIProviderId;
  apiKey: string;
  modelId: string;
  customEndpoint?: string;
  temperature?: number;
  maxTokens?: number;
  createdAt?: number;
  updatedAt?: number;
}

export type ConnectionStatus =
  | "not-configured"
  | "testing"
  | "connected"
  | "auth-failed"
  | "rate-limited"
  | "unavailable"
  | "invalid-config";

export interface ProviderConnectionState {
  status: ConnectionStatus;
  lastChecked?: number;
  errorMessage?: string;
  testedModel?: string;
}

// ── Standard Default Models ────────────────────

export const DEFAULT_MODELS_BY_PROVIDER: Record<AIProviderId, AIModel[]> = {
  openai: [
    { id: "gpt-4o", name: "GPT-4o (Omni - Recommended)", contextWindow: 128000 },
    { id: "gpt-4o-mini", name: "GPT-4o Mini (Fast & Cost-Efficient)", contextWindow: 128000 },
    { id: "o3-mini", name: "o3-mini (Advanced Reasoning)", contextWindow: 200000 },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo", contextWindow: 128000 },
  ],
  anthropic: [
    { id: "claude-3-7-sonnet-20250219", name: "Claude 3.7 Sonnet (Hybrid Reasoning)", contextWindow: 200000 },
    { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet (Recommended)", contextWindow: 200000 },
    { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku (Fast)", contextWindow: 200000 },
  ],
  gemini: [
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash (Recommended)", contextWindow: 1048576 },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro (Deep Context)", contextWindow: 2097152 },
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash (Lightweight)", contextWindow: 1048576 },
  ],
  openrouter: [
    { id: "anthropic/claude-3.7-sonnet", name: "Claude 3.7 Sonnet (via OpenRouter)", contextWindow: 200000 },
    { id: "openai/gpt-4o", name: "OpenAI GPT-4o (via OpenRouter)", contextWindow: 128000 },
    { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B Instruct", contextWindow: 131072 },
    { id: "deepseek/deepseek-r1", name: "DeepSeek R1", contextWindow: 64000 },
  ],
  custom: [
    { id: "custom-model", name: "Custom Model (Configured on Endpoint)", contextWindow: 32000 },
  ],
};

// ── Messages & Generation ──────────────────────

export type AIMessageRole = "system" | "user" | "assistant";

export interface AIMessage {
  role: AIMessageRole;
  content: string;
  timestamp?: number;
}

export interface AIGenerationOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  abortSignal?: AbortSignal;
}

export interface AIGenerationResponse {
  text: string;
  model: string;
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
  finishReason?: string;
}

// ── AI Recommendations ─────────────────────────

export type RecommendationState = "new" | "accepted" | "rejected" | "deferred" | "completed";
export type RecommendationPriority = "critical" | "high" | "medium" | "low";
export type RecommendationCategory =
  | "architecture"
  | "permissions"
  | "channel-structure"
  | "onboarding"
  | "growth"
  | "security";

export interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  reason: string;
  evidence: string[];
  suggestedImplementation: string;
  expectedBenefit: string;
  affectedResources: string[];
  confidence: "high" | "medium" | "low";
  state: RecommendationState;
  createdAt: number;
  updatedAt: number;
  notes?: string;
}

// ── Architecture Planning & Diffing ────────────

export interface ProposedCategory {
  id: string;
  name: string;
  position: number;
  description?: string;
}

export interface ProposedChannel {
  id: string;
  name: string;
  type: ChannelType;
  categoryId?: string | null;
  position: number;
  topic?: string;
  description?: string;
  purpose?: ChannelPurpose;
  suggestedVisibility?: VisibilityClassification;
  suggestedRolesWithAccess?: string[];
  reason?: string;
}

export interface ArchitectureProposal {
  id: string;
  serverId: string;
  title: string;
  description: string;
  targetAudienceOrPurpose: string;
  categories: ProposedCategory[];
  channels: ProposedChannel[];
  createdAt: number;
  updatedAt: number;
}

export interface ArchitectureDiff {
  addedCategories: ProposedCategory[];
  removedCategories: Category[];
  addedChannels: ProposedChannel[];
  removedChannels: Channel[];
  modifiedChannels: {
    current: Channel;
    proposed: ProposedChannel;
    differences: string[];
  }[];
  totalChanges: number;
}

// ── Conversation Management ────────────────────

export interface AIConversation {
  id: string;
  serverId: string;
  title: string;
  messages: AIMessage[];
  createdAt: number;
  updatedAt: number;
}

// ── Context Generator Options ──────────────────

export interface ContextToggles {
  includeRoles: boolean;
  includeChannels: boolean;
  includeAuditFindings: boolean;
  includeStats: boolean;
  includeTopics: boolean;
  maxTokensBudget?: number;
}

export const DEFAULT_CONTEXT_TOGGLES: ContextToggles = {
  includeRoles: true,
  includeChannels: true,
  includeAuditFindings: true,
  includeStats: true,
  includeTopics: true,
  maxTokensBudget: 4000,
};

