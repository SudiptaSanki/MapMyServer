/* ─────────────────────────────────────────────
 *  Safe Change Application Planner
 *
 *  Decomposes architecture proposals into ordered, atomic operations
 *  with dependency tracking, required permissions, and destructive safeguards.
 * ───────────────────────────────────────────── */

import type { ServerBlueprint } from "./index";
import type { ArchitectureProposal, ArchitectureDiff } from "./aiTypes";
import type { ServerTemplate } from "./templateTypes";
import { computeArchitectureDiff } from "./architectureDiffEngine";

export type OperationType =
  | "CREATE_CATEGORY"
  | "DELETE_CATEGORY"
  | "CREATE_CHANNEL"
  | "MODIFY_CHANNEL"
  | "DELETE_CHANNEL"
  | "CREATE_ROLE"
  | "UPDATE_PERMISSIONS";

export interface PlannedOperation {
  id: string;
  type: OperationType;
  resourceType: "category" | "channel" | "role";
  resourceName: string;
  categoryName?: string;
  details: string;
  dependencies: string[]; // IDs of operations that must execute first (e.g., category before channel)
  requiredPermissions: string[];
  isDestructive: boolean;
  requiresConfirmation: boolean;
  estimatedApiCost: number; // approximate Discord REST API calls
}

export interface ChangeExecutionPlan {
  id: string;
  serverId: string;
  targetTitle: string;
  generatedAt: number;
  totalOperations: number;
  destructiveOperationsCount: number;
  estimatedDurationMs: number;
  requiredBotPermissions: string[];
  operations: PlannedOperation[];
  diffSummary: ArchitectureDiff;
}

export function generateChangeExecutionPlan(
  current: ServerBlueprint,
  target: ArchitectureProposal | ServerTemplate
): ChangeExecutionPlan {
  // Convert template to proposal if template passed
  const proposal: ArchitectureProposal =
    "targetAudienceOrPurpose" in target
      ? (target as ArchitectureProposal)
      : {
          id: target.id,
          serverId: current.server.id,
          title: target.name,
          description: target.description,
          targetAudienceOrPurpose: target.category,
          categories: target.categories.map((c, i) => ({
            id: `cat-${i}`,
            name: c.name,
            position: c.position,
          })),
          channels: target.categories.flatMap((c, i) =>
            c.channels.map((ch, j) => ({
              id: `ch-${i}-${j}`,
              name: ch.name,
              type: ch.type,
              categoryId: `cat-${i}`,
              position: ch.position,
              topic: ch.topic,
              description: ch.description,
              purpose: ch.purpose,
              suggestedVisibility: ch.visibility,
              suggestedRolesWithAccess: ch.suggestedRolesWithAccess,
            }))
          ),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

  const diff = computeArchitectureDiff(current, proposal);
  const operations: PlannedOperation[] = [];
  const requiredPermissionsSet = new Set<string>();

  // 1. Create Added Categories first (dependencies for channels)
  const categoryOpIds = new Map<string, string>();
  for (const addCat of diff.addedCategories) {
    const opId = `op-create-cat-${addCat.name.toLowerCase().replace(/\s+/g, "-")}`;
    categoryOpIds.set(addCat.name.toLowerCase(), opId);
    requiredPermissionsSet.add("MANAGE_CHANNELS");

    operations.push({
      id: opId,
      type: "CREATE_CATEGORY",
      resourceType: "category",
      resourceName: addCat.name,
      details: `Create new parent category "${addCat.name}"`,
      dependencies: [],
      requiredPermissions: ["MANAGE_CHANNELS"],
      isDestructive: false,
      requiresConfirmation: false,
      estimatedApiCost: 1,
    });
  }

  // 2. Create Added Channels (depend on parent category creation if category is also added)
  for (const addChan of diff.addedChannels) {
    const parentCat = proposal.categories.find((c) => c.id === addChan.categoryId);
    const parentCatName = parentCat?.name;
    const catDepId = parentCatName ? categoryOpIds.get(parentCatName.toLowerCase()) : undefined;

    const opId = `op-create-chan-${addChan.name}`;
    requiredPermissionsSet.add("MANAGE_CHANNELS");

    operations.push({
      id: opId,
      type: "CREATE_CHANNEL",
      resourceType: "channel",
      resourceName: `#${addChan.name}`,
      categoryName: parentCatName,
      details: `Create new ${addChan.type} channel "#${addChan.name}" in category "${parentCatName || "Uncategorized"}"`,
      dependencies: catDepId ? [catDepId] : [],
      requiredPermissions: ["MANAGE_CHANNELS"],
      isDestructive: false,
      requiresConfirmation: false,
      estimatedApiCost: 1,
    });
  }

  // 3. Modify Channels (e.g. renames, type changes, moves)
  for (const mod of diff.modifiedChannels) {
    const opId = `op-mod-chan-${mod.proposed.name}`;
    requiredPermissionsSet.add("MANAGE_CHANNELS");

    operations.push({
      id: opId,
      type: "MODIFY_CHANNEL",
      resourceType: "channel",
      resourceName: `#${mod.current.name}`,
      details: `Update settings for #${mod.current.name}: ${mod.differences.join("; ")}`,
      dependencies: [],
      requiredPermissions: ["MANAGE_CHANNELS"],
      isDestructive: false,
      requiresConfirmation: false,
      estimatedApiCost: 1,
    });
  }

  // 4. Proposed Removals / Consolidations (Strictly Destructive - require explicit confirmation)
  for (const remChan of diff.removedChannels) {
    const opId = `op-del-chan-${remChan.name}`;
    requiredPermissionsSet.add("MANAGE_CHANNELS");

    operations.push({
      id: opId,
      type: "DELETE_CHANNEL",
      resourceType: "channel",
      resourceName: `#${remChan.name}`,
      details: `Remove redundant channel #${remChan.name} (DESTRUCTIVE - channel messages will be deleted)`,
      dependencies: [],
      requiredPermissions: ["MANAGE_CHANNELS"],
      isDestructive: true,
      requiresConfirmation: true,
      estimatedApiCost: 1,
    });
  }

  for (const remCat of diff.removedCategories) {
    const opId = `op-del-cat-${remCat.name}`;
    requiredPermissionsSet.add("MANAGE_CHANNELS");

    operations.push({
      id: opId,
      type: "DELETE_CATEGORY",
      resourceType: "category",
      resourceName: remCat.name,
      details: `Delete empty/redundant category "${remCat.name}"`,
      dependencies: [],
      requiredPermissions: ["MANAGE_CHANNELS"],
      isDestructive: true,
      requiresConfirmation: true,
      estimatedApiCost: 1,
    });
  }

  // Estimate total duration assuming 400ms delay per REST call to stay well below Discord limits
  const totalApiCost = operations.reduce((sum, op) => sum + op.estimatedApiCost, 0);
  const estimatedDurationMs = totalApiCost * 400;

  return {
    id: `plan-${Date.now()}`,
    serverId: current.server.id,
    targetTitle: proposal.title,
    generatedAt: Date.now(),
    totalOperations: operations.length,
    destructiveOperationsCount: operations.filter((op) => op.isDestructive).length,
    estimatedDurationMs,
    requiredBotPermissions: Array.from(requiredPermissionsSet),
    operations,
    diffSummary: diff,
  };
}

