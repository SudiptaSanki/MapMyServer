/* ─────────────────────────────────────────────
 *  AI Recommendation Engine
 *
 *  Manages architectural suggestions, life-cycle states
 *  (new, accepted, rejected, deferred, completed), and persistence.
 * ───────────────────────────────────────────── */

import type { AIRecommendation, RecommendationState, ServerBlueprint } from "@mapmyserver/shared";
import type { SecurityAuditReport } from "@mapmyserver/shared";
import { AIService } from "./AIService";
import { buildServerAIContext } from "@mapmyserver/shared";

const STORAGE_KEY_PREFIX = "ai_recommendations:";

export class AIRecommendationEngine {
  /**
   * Loads all recommendations for a given server ID.
   */
  static async loadRecommendations(serverId: string): Promise<AIRecommendation[]> {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const key = `${STORAGE_KEY_PREFIX}${serverId}`;
      const res = await chrome.storage.local.get(key);
      return (res[key] as AIRecommendation[]) || [];
    }
    return [];
  }

  /**
   * Saves recommendations for a given server ID.
   */
  static async saveRecommendations(
    serverId: string,
    recommendations: AIRecommendation[]
  ): Promise<void> {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const key = `${STORAGE_KEY_PREFIX}${serverId}`;
      await chrome.storage.local.set({ [key]: recommendations });
    }
  }

  /**
   * Updates the state of a single recommendation (e.g. accepted, rejected, completed).
   */
  static async updateRecommendationState(
    serverId: string,
    recId: string,
    state: RecommendationState,
    notes?: string
  ): Promise<AIRecommendation[]> {
    const all = await this.loadRecommendations(serverId);
    const updated = all.map((r) => {
      if (r.id === recId) {
        return {
          ...r,
          state,
          notes: notes ?? r.notes,
          updatedAt: Date.now(),
        };
      }
      return r;
    });
    await this.saveRecommendations(serverId, updated);
    return updated;
  }

  /**
   * Calls the configured AI provider to analyze the server blueprint and generate structured recommendations.
   */
  static async generateRecommendations(
    blueprint: ServerBlueprint,
    auditReport?: SecurityAuditReport | null
  ): Promise<AIRecommendation[]> {
    const context = buildServerAIContext(blueprint, auditReport);

    const prompt = `Analyze this Discord server architecture and generate 4 to 8 high-impact, actionable recommendations to improve organization, user onboarding, role clarity, and security.

Return a JSON object in this exact schema:
{
  "recommendations": [
    {
      "title": "string",
      "description": "string",
      "category": "architecture" | "permissions" | "channel-structure" | "onboarding" | "growth" | "security",
      "priority": "critical" | "high" | "medium" | "low",
      "reason": "string",
      "evidence": ["string"],
      "suggestedImplementation": "string",
      "expectedBenefit": "string",
      "affectedResources": ["string"],
      "confidence": "high" | "medium" | "low"
    }
  ]
}`;

    const messages = [
      { role: "system" as const, content: context },
      { role: "user" as const, content: prompt },
    ];

    const response = await AIService.generateStructured<{ recommendations: Omit<AIRecommendation, "id" | "state" | "createdAt" | "updatedAt">[] }>(
      messages,
      { jsonMode: true }
    );

    const now = Date.now();
    const newRecs: AIRecommendation[] = (response.recommendations || []).map((r, i) => ({
      ...r,
      id: `rec-${blueprint.server.id}-${now}-${i}`,
      state: "new" as const,
      createdAt: now,
      updatedAt: now,
    }));

    // Merge with existing recommendations
    const existing = await this.loadRecommendations(blueprint.server.id);
    const combined = [...newRecs, ...existing];
    await this.saveRecommendations(blueprint.server.id, combined);

    return combined;
  }
}

