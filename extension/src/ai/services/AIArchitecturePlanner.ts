/* ─────────────────────────────────────────────
 *  AI Architecture Planner & What-If Sandbox
 *
 *  Generates structured architecture proposals based on community archetypes,
 *  stores draft proposals, and manages diffs against the live server blueprint.
 * ───────────────────────────────────────────── */

import type {
  ServerBlueprint,
  ArchitectureProposal,
  ArchitectureDiff,
} from "@mapmyserver/shared";
import { buildServerAIContext, computeArchitectureDiff } from "@mapmyserver/shared";
import { AIService } from "./AIService";

const STORAGE_KEY_PREFIX = "ai_proposals:";

export class AIArchitecturePlanner {
  static async loadProposals(serverId: string): Promise<ArchitectureProposal[]> {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const key = `${STORAGE_KEY_PREFIX}${serverId}`;
      const res = await chrome.storage.local.get(key);
      return (res[key] as ArchitectureProposal[]) || [];
    }
    return [];
  }

  static async saveProposals(serverId: string, proposals: ArchitectureProposal[]): Promise<void> {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const key = `${STORAGE_KEY_PREFIX}${serverId}`;
      await chrome.storage.local.set({ [key]: proposals });
    }
  }

  static async generateProposal(
    blueprint: ServerBlueprint,
    purposeOrArchetype: string
  ): Promise<ArchitectureProposal> {
    const context = buildServerAIContext(blueprint);

    const prompt = `You are a Discord Community Architecture Specialist.
The server owner wants to structure their community for: "${purposeOrArchetype}".

Analyze their current categories, channels, and permissions, then propose an optimized, professional category & channel architecture.
Keep valuable existing channels, reorganize disordered sections, suggest necessary support/onboarding channels, and remove redundancies.

Return a JSON object in this exact schema:
{
  "title": "Short descriptive proposal title",
  "description": "2-3 sentence strategic summary of the proposed reorganization",
  "targetAudienceOrPurpose": "${purposeOrArchetype}",
  "categories": [
    {
      "id": "cat-slug-id",
      "name": "CATEGORY NAME",
      "position": 0,
      "description": "Purpose of category"
    }
  ],
  "channels": [
    {
      "id": "chan-slug-id",
      "name": "channel-name",
      "type": "text" | "voice" | "forum" | "announcement" | "stage",
      "categoryId": "cat-slug-id",
      "position": 0,
      "topic": "Concise channel topic",
      "description": "Detailed usage guidelines",
      "purpose": "ONBOARDING" | "GOVERNANCE" | "INFORMATION" | "COMMUNITY" | "SUPPORT" | "KNOWLEDGE" | "EVENTS" | "TEAM" | "INTERNAL" | "SHOWCASE" | "FEEDBACK" | "OTHER",
      "suggestedVisibility": "broadly-accessible" | "role-restricted" | "member-restricted",
      "suggestedRolesWithAccess": ["role-names"],
      "reason": "Why this channel is recommended"
    }
  ]
}`;

    const messages = [
      { role: "system" as const, content: context },
      { role: "user" as const, content: prompt },
    ];

    const raw = await AIService.generateStructured<Omit<ArchitectureProposal, "id" | "serverId" | "createdAt" | "updatedAt">>(
      messages,
      { jsonMode: true }
    );

    const now = Date.now();
    const proposal: ArchitectureProposal = {
      ...raw,
      id: `prop-${blueprint.server.id}-${now}`,
      serverId: blueprint.server.id,
      createdAt: now,
      updatedAt: now,
    };

    const existing = await this.loadProposals(blueprint.server.id);
    existing.unshift(proposal);
    await this.saveProposals(blueprint.server.id, existing);

    return proposal;
  }

  static getDiff(current: ServerBlueprint, proposal: ArchitectureProposal): ArchitectureDiff {
    return computeArchitectureDiff(current, proposal);
  }
}
