/* ─────────────────────────────────────────────
 *  Architecture Change Monitor
 *
 *  Compares consecutive server blueprints/snapshots to generate
 *  chronological change activity feeds with confidence ratings.
 * ───────────────────────────────────────────── */

import type { ServerBlueprint, BlueprintSnapshot } from "./index";
import { computeArchitectureDiff } from "./architectureDiffEngine";
import type { ArchitectureProposal } from "./aiTypes";

export type ChangeConfidence = "confirmed" | "possible-incomplete-scan" | "manual-review";

export interface ArchitectureChangeEvent {
  id: string;
  serverId: string;
  detectedAt: number;
  changeType:
    | "channel-added"
    | "channel-removed"
    | "channel-modified"
    | "category-added"
    | "category-removed"
    | "permission-changed";
  resourceType: "channel" | "category" | "role";
  resourceName: string;
  description: string;
  confidence: ChangeConfidence;
  oldValue?: string;
  newValue?: string;
}

export function detectArchitectureChanges(
  latest: ServerBlueprint,
  previous?: BlueprintSnapshot | null
): ArchitectureChangeEvent[] {
  if (!previous || !previous.blueprint) {
    return [];
  }

  const prevBp = previous.blueprint;
  const isPartialScan =
    latest.scanQuality?.permissionDataQuality !== "full" ||
    (latest.scanQuality?.completenessScore || 100) < 60;

  const defaultConfidence: ChangeConfidence = isPartialScan
    ? "possible-incomplete-scan"
    : "confirmed";

  // Convert latest blueprint into proposal shape to reuse diff engine
  const latestAsProposal: ArchitectureProposal = {
    id: "temp",
    serverId: latest.server.id,
    title: latest.server.name,
    description: "",
    targetAudienceOrPurpose: "",
    categories: latest.categories.map((c) => ({
      id: c.id,
      name: c.name,
      position: c.position,
    })),
    channels: latest.channels.map((ch) => ({
      id: ch.id,
      name: ch.name,
      type: ch.type,
      categoryId: ch.parentId,
      position: ch.position,
      topic: ch.topic,
      description: ch.description,
      suggestedVisibility: ch.visibilityAnalysis?.classification,
    })),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const diff = computeArchitectureDiff(prevBp, latestAsProposal);
  const events: ArchitectureChangeEvent[] = [];
  const now = Date.now();

  // Added Categories
  for (const cat of diff.addedCategories) {
    events.push({
      id: `change-add-cat-${cat.name}-${now}`,
      serverId: latest.server.id,
      detectedAt: now,
      changeType: "category-added",
      resourceType: "category",
      resourceName: cat.name,
      description: `New category "${cat.name}" was created.`,
      confidence: "confirmed",
    });
  }

  // Removed Categories
  for (const cat of diff.removedCategories) {
    events.push({
      id: `change-rem-cat-${cat.name}-${now}`,
      serverId: latest.server.id,
      detectedAt: now,
      changeType: "category-removed",
      resourceType: "category",
      resourceName: cat.name,
      description: `Category "${cat.name}" was removed or hidden.`,
      confidence: defaultConfidence,
    });
  }

  // Added Channels
  for (const ch of diff.addedChannels) {
    events.push({
      id: `change-add-ch-${ch.name}-${now}`,
      serverId: latest.server.id,
      detectedAt: now,
      changeType: "channel-added",
      resourceType: "channel",
      resourceName: `#${ch.name}`,
      description: `New channel #${ch.name} (${ch.type}) was created.`,
      confidence: "confirmed",
    });
  }

  // Removed Channels
  for (const ch of diff.removedChannels) {
    events.push({
      id: `change-rem-ch-${ch.name}-${now}`,
      serverId: latest.server.id,
      detectedAt: now,
      changeType: "channel-removed",
      resourceType: "channel",
      resourceName: `#${ch.name}`,
      description: `Channel #${ch.name} was deleted or inaccessible.`,
      confidence: defaultConfidence,
    });
  }

  // Modified Channels
  for (const mod of diff.modifiedChannels) {
    const isPermChange = mod.differences.some((d) => d.toLowerCase().includes("visibility"));
    events.push({
      id: `change-mod-ch-${mod.proposed.name}-${now}`,
      serverId: latest.server.id,
      detectedAt: now,
      changeType: isPermChange ? "permission-changed" : "channel-modified",
      resourceType: "channel",
      resourceName: `#${mod.current.name}`,
      description: `Channel #${mod.current.name} updated: ${mod.differences.join(", ")}`,
      confidence: isPermChange && isPartialScan ? "manual-review" : "confirmed",
      oldValue: mod.current.name,
      newValue: mod.proposed.name,
    });
  }

  return events;
}

