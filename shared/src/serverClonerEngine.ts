/* ─────────────────────────────────────────────
 *  MapMyServer — Smart Server Cloner Engine
 *
 *  Core Engine for Stage 6:
 *  - Capture Mode Detection (Full Admin vs Accessible Member)
 *  - Selective Component Filtering & Category/Channel Renaming
 *  - Merge Planning (Full Clone vs Selective Merge vs AI Redesign)
 *  - Idempotent Operation Generation & Manual Step-by-Step Checklist
 * ───────────────────────────────────────────── */

import type {
  ServerBlueprint,
  Category,
  Channel,
  Role,
  PermissionFlagName,
} from "./index";

export type CaptureMode = "full-admin" | "accessible-member";

export interface CaptureModeInfo {
  mode: CaptureMode;
  title: string;
  badge: string;
  description: string;
  notice?: string;
  isOwnerOrAdmin: boolean;
  canCaptureFullRoles: boolean;
  canCapturePrivateChannels: boolean;
}

export type CloneSelectionMode = "everything" | "selected-categories" | "custom-components";
export type CloneWorkflow = "full-clone" | "selective-merge" | "ai-redesign";

export interface CloneSelectionConfig {
  mode: CloneSelectionMode;
  selectedCategoryIds: string[];
  selectedChannelIds: string[];
  selectedRoleIds: string[];
  excludedChannelIds: string[];
  includeRoles: boolean;
  includeDescriptions: boolean;
  includePermissions: boolean;
  categoryRenames: Record<string, string>; // originalId -> newName
  channelRenames: Record<string, string>;  // originalId -> newName
}

export interface ClonerOperation {
  id: string;
  action: "CREATE_CATEGORY" | "CREATE_CHANNEL" | "CREATE_ROLE" | "SKIP_EXISTING" | "UPDATE_TOPIC";
  resourceType: "category" | "channel" | "role";
  name: string;
  categoryName?: string;
  channelType?: string;
  details: string;
  isDestructive: boolean;
  dependencies: string[];
}

export interface CloneExecutionPlan {
  workflow: CloneWorkflow;
  sourceServerName: string;
  destinationServerName: string;
  captureMode: CaptureMode;
  totalCategoriesToCreate: number;
  totalChannelsToCreate: number;
  totalRolesToCreate: number;
  skippedDuplicatesCount: number;
  estimatedApiCost: number;
  requiredBotPermissions: PermissionFlagName[];
  operations: ClonerOperation[];
  filteredBlueprint: ServerBlueprint;
  manualChecklist: string;
}

// ── 1. Detect Capture Mode ──────────────────────

/**
 * Determines whether the scanned blueprint represents a Full Admin capture
 * or an Accessible Member capture.
 */
export function detectCaptureMode(blueprint: ServerBlueprint): CaptureModeInfo {
  const roles = blueprint.roles || [];
  const adminRole = roles.find((r) =>
    (r.permissions || []).some((p) => p.toUpperCase() === "ADMINISTRATOR")
  );

  const hasHighRolePositions = roles.some((r) => r.position > 15);
  const scanQuality = blueprint.scanQuality;
  const isFullData = scanQuality?.permissionDataQuality === "full";

  // Check if current user is detected as Admin or Server Owner
  const isOwnerOrAdmin = !!(adminRole || (isFullData && hasHighRolePositions));

  if (isOwnerOrAdmin) {
    return {
      mode: "full-admin",
      title: "Full Administrative Architecture Capture",
      badge: "Full Admin Mode",
      description: "You have verified administrative visibility. Categories, channels, roles, and accessible permission matrices are captured.",
      isOwnerOrAdmin: true,
      canCaptureFullRoles: true,
      canCapturePrivateChannels: true,
    };
  }

  return {
    mode: "accessible-member",
    title: "Accessible Member Architecture Capture",
    badge: "Member View",
    description: "Captures public and role-accessible categories, channels, and organization visible to your account.",
    notice: "Partial Architecture Capture: This blueprint contains only information visible to your Discord account. Restricted and inaccessible server configurations have not been captured.",
    isOwnerOrAdmin: false,
    canCaptureFullRoles: false,
    canCapturePrivateChannels: false,
  };
}

// ── 2. Filter Blueprint for Cloning ────────────

/**
 * Filters and customizes a source ServerBlueprint based on user selection,
 * exclusions, and renaming overrides.
 */
export function filterBlueprintForCloning(
  blueprint: ServerBlueprint,
  config: CloneSelectionConfig
): ServerBlueprint {
  const {
    mode,
    selectedCategoryIds,
    selectedChannelIds,
    selectedRoleIds,
    excludedChannelIds,
    includeRoles,
    includeDescriptions,
    categoryRenames,
    channelRenames,
  } = config;

  const excludedSet = new Set(excludedChannelIds);

  // 1. Filter Categories
  let targetCategories: Category[] = [];
  if (mode === "everything") {
    targetCategories = [...blueprint.categories];
  } else if (mode === "selected-categories") {
    targetCategories = blueprint.categories.filter((c) => selectedCategoryIds.includes(c.id));
  } else {
    // custom-components: keep categories that have at least one selected channel
    targetCategories = blueprint.categories.filter(
      (c) =>
        selectedCategoryIds.includes(c.id) ||
        blueprint.channels.some(
          (ch) => ch.parentId === c.id && selectedChannelIds.includes(ch.id)
        )
    );
  }

  // Apply Category Renames
  const finalCategories: Category[] = targetCategories.map((c) => ({
    ...c,
    name: categoryRenames[c.id]?.trim() || c.name,
    channelIds: [], // re-populated below
  }));

  const activeCategoryIds = new Set(finalCategories.map((c) => c.id));

  // 2. Filter Channels
  let targetChannels: Channel[] = [];
  if (mode === "everything") {
    targetChannels = blueprint.channels.filter((ch) => !excludedSet.has(ch.id));
  } else if (mode === "selected-categories") {
    targetChannels = blueprint.channels.filter(
      (ch) =>
        ch.parentId &&
        activeCategoryIds.has(ch.parentId) &&
        !excludedSet.has(ch.id)
    );
  } else {
    // custom-components
    targetChannels = blueprint.channels.filter(
      (ch) => selectedChannelIds.includes(ch.id) && !excludedSet.has(ch.id)
    );
  }

  // Apply Channel Renames & Description toggling
  const finalChannels: Channel[] = targetChannels.map((ch) => ({
    ...ch,
    name: channelRenames[ch.id]?.trim() || ch.name,
    topic: includeDescriptions ? ch.topic : undefined,
    description: includeDescriptions ? ch.description : undefined,
  }));

  // Re-link channelIds on categories
  for (const cat of finalCategories) {
    cat.channelIds = finalChannels.filter((ch) => ch.parentId === cat.id).map((ch) => ch.id);
  }

  // 3. Filter Roles
  let finalRoles: Role[] = [];
  if (includeRoles) {
    if (mode === "everything" || selectedRoleIds.length === 0) {
      finalRoles = blueprint.roles.filter((r) => r.name.toLowerCase() !== "@everyone");
    } else {
      finalRoles = blueprint.roles.filter((r) => selectedRoleIds.includes(r.id));
    }
  }

  // Recompute statistics
  const totalChannels = finalChannels.length;
  const textChannels = finalChannels.filter((c) => c.type === "text").length;
  const voiceChannels = finalChannels.filter((c) => c.type === "voice").length;
  const stageChannels = finalChannels.filter((c) => c.type === "stage").length;
  const forumChannels = finalChannels.filter((c) => c.type === "forum").length;
  const announcementChannels = finalChannels.filter((c) => c.type === "announcement").length;
  const mediaChannels = finalChannels.filter((c) => c.type === "media").length;

  return {
    ...blueprint,
    categories: finalCategories,
    channels: finalChannels,
    roles: finalRoles,
    threads: [],
    statistics: {
      ...blueprint.statistics,
      categories: finalCategories.length,
      textChannels,
      voiceChannels,
      stageChannels,
      forumChannels,
      announcementChannels,
      mediaChannels,
      totalChannels,
      roles: finalRoles.length,
      channelsPerCategory: finalCategories.reduce((acc, cat) => {
        acc[cat.id] = cat.channelIds.length;
        return acc;
      }, {} as Record<string, number>),
    },
  };
}

// ── 3. Create Cloning & Merge Plan ─────────────

/**
 * Creates an ordered, idempotent execution plan for recreating or merging
 * the selected architecture into the destination server.
 */
export function createCloningPlan(
  sourceBlueprint: ServerBlueprint,
  destinationBlueprint: ServerBlueprint | null,
  workflow: CloneWorkflow,
  config: CloneSelectionConfig
): CloneExecutionPlan {
  const filtered = filterBlueprintForCloning(sourceBlueprint, config);
  const captureModeInfo = detectCaptureMode(sourceBlueprint);

  const operations: ClonerOperation[] = [];
  const requiredBotPermissions: PermissionFlagName[] = ["MANAGE_CHANNELS"];

  const destCategoriesByName = new Map<string, Category>();
  const destChannelsByName = new Map<string, Channel>();

  if (destinationBlueprint && workflow === "selective-merge") {
    for (const c of destinationBlueprint.categories) {
      destCategoriesByName.set(c.name.trim().toLowerCase(), c);
    }
    for (const ch of destinationBlueprint.channels) {
      destChannelsByName.set(ch.name.trim().toLowerCase(), ch);
    }
  }

  // Step 1: Roles
  let totalRolesToCreate = 0;
  if (config.includeRoles && filtered.roles.length > 0) {
    requiredBotPermissions.push("MANAGE_ROLES");
    const sortedRoles = [...filtered.roles].sort((a, b) => a.position - b.position);

    for (const r of sortedRoles) {
      const existing = destinationBlueprint?.roles.find(
        (dr) => dr.name.toLowerCase() === r.name.toLowerCase()
      );

      if (existing && workflow === "selective-merge") {
        operations.push({
          id: `op-role-skip-${r.id}`,
          action: "SKIP_EXISTING",
          resourceType: "role",
          name: r.name,
          details: `Role @${r.name} already exists in destination server. Skipped.`,
          isDestructive: false,
          dependencies: [],
        });
      } else {
        totalRolesToCreate++;
        operations.push({
          id: `op-role-create-${r.id}`,
          action: "CREATE_ROLE",
          resourceType: "role",
          name: r.name,
          details: `Create role @${r.name} with color ${r.color || "default"} and permissions.`,
          isDestructive: false,
          dependencies: [],
        });
      }
    }
  }

  // Step 2: Categories
  let totalCategoriesToCreate = 0;
  const categoryOpMap = new Map<string, string>(); // catId -> opId

  for (const cat of filtered.categories) {
    const norm = cat.name.trim().toLowerCase();
    const existing = destCategoriesByName.get(norm);

    if (existing && workflow === "selective-merge") {
      operations.push({
        id: `op-cat-skip-${cat.id}`,
        action: "SKIP_EXISTING",
        resourceType: "category",
        name: cat.name,
        details: `Category "${cat.name}" already exists in destination server. Child channels will be merged inside it.`,
        isDestructive: false,
        dependencies: [],
      });
      categoryOpMap.set(cat.id, `op-cat-skip-${cat.id}`);
    } else {
      totalCategoriesToCreate++;
      const opId = `op-cat-create-${cat.id}`;
      categoryOpMap.set(cat.id, opId);
      operations.push({
        id: opId,
        action: "CREATE_CATEGORY",
        resourceType: "category",
        name: cat.name,
        details: `Create category "${cat.name}".`,
        isDestructive: false,
        dependencies: [],
      });
    }
  }

  // Step 3: Channels
  let totalChannelsToCreate = 0;
  let skippedDuplicatesCount = 0;

  for (const ch of filtered.channels) {
    const parentCat = filtered.categories.find((c) => c.id === ch.parentId);
    const catName = parentCat?.name;
    const catOpId = ch.parentId ? categoryOpMap.get(ch.parentId) : undefined;
    const norm = ch.name.trim().toLowerCase();

    // Check duplicate in same destination category
    const isDuplicate =
      workflow === "selective-merge" &&
      destChannelsByName.has(norm) &&
      (!parentCat || destCategoriesByName.has(parentCat.name.trim().toLowerCase()));

    if (isDuplicate) {
      skippedDuplicatesCount++;
      operations.push({
        id: `op-ch-skip-${ch.id}`,
        action: "SKIP_EXISTING",
        resourceType: "channel",
        name: ch.name,
        categoryName: catName,
        channelType: ch.type,
        details: `Channel #${ch.name} already exists in target server. Skipped to prevent duplicates.`,
        isDestructive: false,
        dependencies: catOpId ? [catOpId] : [],
      });
    } else {
      totalChannelsToCreate++;
      operations.push({
        id: `op-ch-create-${ch.id}`,
        action: "CREATE_CHANNEL",
        resourceType: "channel",
        name: ch.name,
        categoryName: catName,
        channelType: ch.type,
        details: `Create ${ch.type} channel #${ch.name}${catName ? ` under "${catName}"` : ""}${
          ch.topic ? ` with topic "${ch.topic}"` : ""
        }.`,
        isDestructive: false,
        dependencies: catOpId ? [catOpId] : [],
      });
    }
  }

  const estimatedApiCost = totalCategoriesToCreate + totalChannelsToCreate + totalRolesToCreate;

  // Step 4: Generate Step-by-Step Manual Checklist
  const manualChecklist = generateManualRecreationChecklist({
    workflow,
    sourceServerName: sourceBlueprint.server.name,
    destinationServerName: destinationBlueprint?.server.name || "New Server",
    captureMode: captureModeInfo.mode,
    totalCategoriesToCreate,
    totalChannelsToCreate,
    totalRolesToCreate,
    skippedDuplicatesCount,
    estimatedApiCost,
    requiredBotPermissions,
    operations,
    filteredBlueprint: filtered,
  });

  return {
    workflow,
    sourceServerName: sourceBlueprint.server.name,
    destinationServerName: destinationBlueprint?.server.name || "New Destination Server",
    captureMode: captureModeInfo.mode,
    totalCategoriesToCreate,
    totalChannelsToCreate,
    totalRolesToCreate,
    skippedDuplicatesCount,
    estimatedApiCost,
    requiredBotPermissions,
    operations,
    filteredBlueprint: filtered,
    manualChecklist,
  };
}

// ── 4. Generate Manual Recreation Checklist ────

export function generateManualRecreationChecklist(plan: Omit<CloneExecutionPlan, "manualChecklist">): string {
  const { sourceServerName, destinationServerName, workflow, operations, captureMode } = plan;

  const lines: string[] = [
    `# Discord Server Architecture Recreation Guide`,
    `**Source Server:** ${sourceServerName}`,
    `**Target Server:** ${destinationServerName}`,
    `**Cloning Workflow:** ${workflow === "full-clone" ? "Full Server Rebuild" : workflow === "selective-merge" ? "Selective Component Merge" : "AI Redesign"}`,
    `**Capture Type:** ${captureMode === "full-admin" ? "Full Admin Capture" : "Accessible Member Capture (Public Structure)"}`,
    `\n---\n`,
  ];

  if (captureMode === "accessible-member") {
    lines.push(
      `> **NOTE:** This architecture was captured using Member permissions. Only visible categories and channels are listed.\n`
    );
  }

  // Roles step
  const roleOps = operations.filter((op) => op.action === "CREATE_ROLE");
  if (roleOps.length > 0) {
    lines.push(`## Step 1: Configure Roles (Server Settings -> Roles)`);
    for (const r of roleOps) {
      lines.push(`- [ ] Create role: **@${r.name}**`);
    }
    lines.push(``);
  }

  // Categories & Channels step
  lines.push(`## Step 2: Create Categories & Channels`);
  const catOps = operations.filter((op) => op.action === "CREATE_CATEGORY" || op.action === "SKIP_EXISTING");

  for (const cop of catOps) {
    if (cop.resourceType === "category") {
      lines.push(`### Category: ${cop.name}`);
      if (cop.action === "SKIP_EXISTING") {
        lines.push(`*(Existing category - add new channels inside)*`);
      } else {
        lines.push(`- [ ] Create Category: **${cop.name}**`);
      }

      const childChans = operations.filter(
        (op) => op.resourceType === "channel" && op.categoryName === cop.name && op.action === "CREATE_CHANNEL"
      );

      for (const ch of childChans) {
        lines.push(`  - [ ] Add ${ch.channelType} channel: **#${ch.name}** (${ch.details})`);
      }
      lines.push(``);
    }
  }

  // Uncategorized channels
  const uncategorized = operations.filter(
    (op) => op.resourceType === "channel" && !op.categoryName && op.action === "CREATE_CHANNEL"
  );
  if (uncategorized.length > 0) {
    lines.push(`### Uncategorized Channels`);
    for (const ch of uncategorized) {
      lines.push(`- [ ] Add ${ch.channelType} channel: **#${ch.name}**`);
    }
    lines.push(``);
  }

  lines.push(`---\n*Generated by MapMyServer — Standalone Discord Architecture Intelligence*`);
  return lines.join("\n");
}
