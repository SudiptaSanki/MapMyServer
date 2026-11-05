/* ─────────────────────────────────────────────
 *  Architecture Diff Engine
 *
 *  Compares a live ServerBlueprint with a proposed architecture
 *  to compute structural additions, removals, moves, and modifications.
 * ───────────────────────────────────────────── */

import type {
  ServerBlueprint,
  Category,
  Channel,
  Role,
} from "./index";
import type {
  ArchitectureProposal,
  ArchitectureDiff,
  ProposedCategory,
  ProposedChannel,
} from "./aiTypes";

export function computeArchitectureDiff(
  current: ServerBlueprint,
  proposal: ArchitectureProposal
): ArchitectureDiff {
  const currentCategories = current.categories;
  const currentChannels = current.channels.filter((c) => c.type !== "category");

  const currentCatMap = new Map<string, Category>();
  const currentCatByName = new Map<string, Category>();
  for (const cat of currentCategories) {
    currentCatMap.set(cat.id, cat);
    currentCatByName.set(cat.name.trim().toLowerCase(), cat);
  }

  const propCatMap = new Map<string, ProposedCategory>();
  const propCatByName = new Map<string, ProposedCategory>();
  for (const pCat of proposal.categories) {
    propCatMap.set(pCat.id, pCat);
    propCatByName.set(pCat.name.trim().toLowerCase(), pCat);
  }

  // 1. Added Categories (in proposal, not in current by name or id)
  const addedCategories: ProposedCategory[] = [];
  for (const pCat of proposal.categories) {
    const norm = pCat.name.trim().toLowerCase();
    if (!currentCatMap.has(pCat.id) && !currentCatByName.has(norm)) {
      addedCategories.push(pCat);
    }
  }

  // 2. Removed Categories (in current, not in proposal)
  const removedCategories: Category[] = [];
  for (const cCat of currentCategories) {
    const norm = cCat.name.trim().toLowerCase();
    if (!propCatMap.has(cCat.id) && !propCatByName.has(norm)) {
      removedCategories.push(cCat);
    }
  }

  // 3. Channels Diff
  const currentChanMap = new Map<string, Channel>();
  const currentChanByName = new Map<string, Channel>();
  for (const ch of currentChannels) {
    currentChanMap.set(ch.id, ch);
    currentChanByName.set(ch.name.trim().toLowerCase(), ch);
  }

  const propChanMap = new Map<string, ProposedChannel>();
  const propChanByName = new Map<string, ProposedChannel>();
  for (const pch of proposal.channels) {
    propChanMap.set(pch.id, pch);
    propChanByName.set(pch.name.trim().toLowerCase(), pch);
  }

  // Added Channels
  const addedChannels: ProposedChannel[] = [];
  for (const pch of proposal.channels) {
    const norm = pch.name.trim().toLowerCase();
    if (!currentChanMap.has(pch.id) && !currentChanByName.has(norm)) {
      addedChannels.push(pch);
    }
  }

  // Removed Channels
  const removedChannels: Channel[] = [];
  for (const cch of currentChannels) {
    const norm = cch.name.trim().toLowerCase();
    if (!propChanMap.has(cch.id) && !propChanByName.has(norm)) {
      removedChannels.push(cch);
    }
  }

  // Modified Channels (matches existing channel by id or name, but attributes differ)
  const modifiedChannels: ArchitectureDiff["modifiedChannels"] = [];
  for (const pch of proposal.channels) {
    const norm = pch.name.trim().toLowerCase();
    const existing = currentChanMap.get(pch.id) || currentChanByName.get(norm);
    if (!existing) continue;

    const differences: string[] = [];

    // Type change
    if (existing.type !== pch.type) {
      differences.push(`Type changed from "${existing.type}" to "${pch.type}"`);
    }

    // Category move
    const existingCat = existing.parentId ? currentCatMap.get(existing.parentId) : null;
    const propCat = pch.categoryId ? propCatMap.get(pch.categoryId) : null;
    if (existingCat?.name.toLowerCase() !== propCat?.name.toLowerCase()) {
      const fromName = existingCat ? `"${existingCat.name}"` : "(No Category)";
      const toName = propCat ? `"${propCat.name}"` : "(No Category)";
      differences.push(`Moved from ${fromName} to ${toName}`);
    }

    // Topic / Description change
    if (pch.topic && pch.topic !== existing.topic) {
      differences.push(`Topic updated: "${pch.topic}"`);
    }

    // Visibility change
    if (
      pch.suggestedVisibility &&
      existing.visibilityAnalysis?.classification !== pch.suggestedVisibility
    ) {
      differences.push(
        `Visibility changed to "${pch.suggestedVisibility}" (currently: "${
          existing.visibilityAnalysis?.classification || "unknown"
        }")`
      );
    }

    if (differences.length > 0) {
      modifiedChannels.push({
        current: existing,
        proposed: pch,
        differences,
      });
    }
  }

  const totalChanges =
    addedCategories.length +
    removedCategories.length +
    addedChannels.length +
    removedChannels.length +
    modifiedChannels.length;

  return {
    addedCategories,
    removedCategories,
    addedChannels,
    removedChannels,
    modifiedChannels,
    totalChanges,
  };
}

// ── Two-Server Architecture Comparison (Core Feature) ──

export interface ChannelDiffItem {
  channelName: string;
  referenceChannel?: Channel;
  targetChannel?: Channel;
  status: "missing-in-target" | "extra-in-target" | "modified" | "identical";
  differences: string[];
}

export interface CategoryDiffItem {
  categoryName: string;
  referenceCategory?: Category;
  targetCategory?: Category;
  status: "missing-in-target" | "extra-in-target" | "modified" | "identical";
  channelsDiff: ChannelDiffItem[];
}

export interface RoleDiffItem {
  roleName: string;
  referenceRole?: Role;
  targetRole?: Role;
  status: "missing-in-target" | "extra-in-target" | "modified" | "identical";
  differences: string[];
}

export interface ComparisonRecommendation {
  type: "create-category" | "create-channel" | "reorganize-channel" | "create-role" | "adjust-permissions";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
}

export interface ServerComparisonResult {
  referenceServer: { id: string; name: string; memberCount?: number };
  targetServer: { id: string; name: string; memberCount?: number };
  comparedAt: number;

  metrics: {
    categoryAlignmentScore: number;
    channelAlignmentScore: number;
    roleAlignmentScore: number;
    overallStructuralAlignment: number;
    totalMissingChannels: number;
    totalExtraChannels: number;
    totalModifiedChannels: number;
    totalIdenticalChannels: number;
    totalMissingCategories: number;
    totalExtraCategories: number;
    totalMissingRoles: number;
    totalExtraRoles: number;
  };

  categories: CategoryDiffItem[];
  uncategorizedChannels: ChannelDiffItem[];
  roles: RoleDiffItem[];
  recommendations: ComparisonRecommendation[];
}

/**
 * Deeply compares a Reference Server Blueprint against a Target Server Blueprint.
 * Evaluates structural categories, channel taxonomy, channel types, visibility profiles,
 * and role hierarchy configurations.
 */
export function compareServerBlueprints(
  reference: ServerBlueprint,
  target: ServerBlueprint
): ServerComparisonResult {
  const comparedAt = Date.now();

  const refCats = reference.categories;
  const targetCats = target.categories;
  const refChans = reference.channels.filter((c) => c.type !== "category");
  const targetChans = target.channels.filter((c) => c.type !== "category");
  const refRoles = reference.roles.filter((r) => r.name.toLowerCase() !== "@everyone");
  const targetRoles = target.roles.filter((r) => r.name.toLowerCase() !== "@everyone");

  // Maps by normalized name and ID
  const targetCatById = new Map<string, Category>();
  const targetCatByName = new Map<string, Category>();
  for (const c of targetCats) {
    targetCatById.set(c.id, c);
    targetCatByName.set(c.name.trim().toLowerCase(), c);
  }

  const refCatById = new Map<string, Category>();
  const refCatByName = new Map<string, Category>();
  for (const c of refCats) {
    refCatById.set(c.id, c);
    refCatByName.set(c.name.trim().toLowerCase(), c);
  }

  const targetChanByName = new Map<string, Channel>();
  for (const ch of targetChans) targetChanByName.set(ch.name.trim().toLowerCase(), ch);

  const refChanByName = new Map<string, Channel>();
  for (const ch of refChans) refChanByName.set(ch.name.trim().toLowerCase(), ch);

  // ── 1. Compare Categories & Their Channels ─────
  const categoryDiffs: CategoryDiffItem[] = [];
  const processedTargetCatNames = new Set<string>();

  let matchingCatsCount = 0;
  let missingCatsCount = 0;
  let extraCatsCount = 0;

  for (const refCat of refCats) {
    const norm = refCat.name.trim().toLowerCase();
    const targetCat = targetCatByName.get(norm);

    const refCatChannels = refChans.filter((c) => c.parentId === refCat.id);
    const targetCatChannels = targetCat
      ? targetChans.filter((c) => c.parentId === targetCat.id)
      : [];

    const channelsDiff: ChannelDiffItem[] = [];
    const processedTargetChanNames = new Set<string>();

    for (const refCh of refCatChannels) {
      const chNorm = refCh.name.trim().toLowerCase();
      // Match within category or globally
      const targetCh =
        targetCatChannels.find((c) => c.name.trim().toLowerCase() === chNorm) ||
        targetChanByName.get(chNorm);

      if (!targetCh) {
        channelsDiff.push({
          channelName: refCh.name,
          referenceChannel: refCh,
          status: "missing-in-target",
          differences: ["Not present in target server."],
        });
      } else {
        processedTargetChanNames.add(targetCh.name.trim().toLowerCase());
        const diffs: string[] = [];

        if (refCh.type !== targetCh.type) {
          diffs.push(`Type difference: Reference is "${refCh.type}", Target is "${targetCh.type}"`);
        }

        // Parent category check
        const targetParent = targetCh.parentId
          ? targetCats.find((c) => c.id === targetCh.parentId)?.name || "Uncategorized"
          : "Uncategorized";
        if (targetParent.toLowerCase() !== refCat.name.toLowerCase()) {
          diffs.push(`Placed under "${targetParent}" in target server instead of "${refCat.name}"`);
        }

        // Visibility check
        const refVis = refCh.visibilityAnalysis?.classification;
        const targetVis = targetCh.visibilityAnalysis?.classification;
        if (refVis && targetVis && refVis !== targetVis) {
          diffs.push(`Visibility mismatch: Reference is "${refVis}", Target is "${targetVis}"`);
        }

        channelsDiff.push({
          channelName: refCh.name,
          referenceChannel: refCh,
          targetChannel: targetCh,
          status: diffs.length > 0 ? "modified" : "identical",
          differences: diffs,
        });
      }
    }

    // Extra channels present in target's category
    if (targetCat) {
      for (const tCh of targetCatChannels) {
        const chNorm = tCh.name.trim().toLowerCase();
        if (!processedTargetChanNames.has(chNorm)) {
          channelsDiff.push({
            channelName: tCh.name,
            targetChannel: tCh,
            status: "extra-in-target",
            differences: ["Extra channel present in target server."],
          });
        }
      }
    }

    if (!targetCat) {
      missingCatsCount++;
      categoryDiffs.push({
        categoryName: refCat.name,
        referenceCategory: refCat,
        status: "missing-in-target",
        channelsDiff,
      });
    } else {
      matchingCatsCount++;
      processedTargetCatNames.add(norm);
      categoryDiffs.push({
        categoryName: refCat.name,
        referenceCategory: refCat,
        targetCategory: targetCat,
        status: channelsDiff.some((c) => c.status !== "identical") ? "modified" : "identical",
        channelsDiff,
      });
    }
  }

  // Extra categories in target
  for (const targetCat of targetCats) {
    const norm = targetCat.name.trim().toLowerCase();
    if (!processedTargetCatNames.has(norm)) {
      extraCatsCount++;
      const targetCatChannels = targetChans.filter((c) => c.parentId === targetCat.id);
      categoryDiffs.push({
        categoryName: targetCat.name,
        targetCategory: targetCat,
        status: "extra-in-target",
        channelsDiff: targetCatChannels.map((tc) => ({
          channelName: tc.name,
          targetChannel: tc,
          status: "extra-in-target",
          differences: ["Category and channels exist only in target server."],
        })),
      });
    }
  }

  // ── 2. Uncategorized Channels ───────────────────
  const refUncategorized = refChans.filter((c) => !c.parentId || !refCatById.has(c.parentId));
  const targetUncategorized = targetChans.filter((c) => !c.parentId || !targetCatById.has(c.parentId));
  const uncategorizedDiffs: ChannelDiffItem[] = [];

  for (const refCh of refUncategorized) {
    const norm = refCh.name.trim().toLowerCase();
    const targetCh = targetChanByName.get(norm);
    if (!targetCh) {
      uncategorizedDiffs.push({
        channelName: refCh.name,
        referenceChannel: refCh,
        status: "missing-in-target",
        differences: ["Uncategorized channel missing in target."],
      });
    } else {
      const diffs: string[] = [];
      if (refCh.type !== targetCh.type) {
        diffs.push(`Type: "${refCh.type}" vs "${targetCh.type}"`);
      }
      uncategorizedDiffs.push({
        channelName: refCh.name,
        referenceChannel: refCh,
        targetChannel: targetCh,
        status: diffs.length > 0 ? "modified" : "identical",
        differences: diffs,
      });
    }
  }

  for (const tCh of targetUncategorized) {
    const norm = tCh.name.trim().toLowerCase();
    if (!refChanByName.has(norm)) {
      uncategorizedDiffs.push({
        channelName: tCh.name,
        targetChannel: tCh,
        status: "extra-in-target",
        differences: ["Uncategorized channel present only in target server."],
      });
    }
  }

  // ── 3. Role Comparisons ─────────────────────────
  const roleDiffs: RoleDiffItem[] = [];
  const targetRoleByName = new Map<string, Role>();
  for (const r of targetRoles) targetRoleByName.set(r.name.trim().toLowerCase(), r);

  const processedTargetRoles = new Set<string>();
  let missingRolesCount = 0;
  let extraRolesCount = 0;
  let matchingRolesCount = 0;

  for (const refRole of refRoles) {
    const norm = refRole.name.trim().toLowerCase();
    const targetRole = targetRoleByName.get(norm);

    if (!targetRole) {
      missingRolesCount++;
      roleDiffs.push({
        roleName: refRole.name,
        referenceRole: refRole,
        status: "missing-in-target",
        differences: ["Role missing in target server."],
      });
    } else {
      matchingRolesCount++;
      processedTargetRoles.add(norm);
      const diffs: string[] = [];

      const refPerms = new Set<string>(refRole.permissions || []);
      const targetPerms = new Set<string>(targetRole.permissions || []);

      const missingPerms = Array.from(refPerms).filter((p) => !targetPerms.has(p));
      const extraPerms = Array.from(targetPerms).filter((p) => !refPerms.has(p));

      if (missingPerms.length > 0) {
        diffs.push(`Missing permissions in target: ${missingPerms.join(", ")}`);
      }
      if (extraPerms.length > 0) {
        diffs.push(`Extra permissions in target: ${extraPerms.join(", ")}`);
      }
      if (refRole.color && targetRole.color && refRole.color !== targetRole.color) {
        diffs.push(`Color difference: "${refRole.color}" vs "${targetRole.color}"`);
      }
      if (refRole.hoist !== targetRole.hoist) {
        diffs.push(`Hoist display: Reference is ${refRole.hoist ? "Yes" : "No"}, Target is ${targetRole.hoist ? "Yes" : "No"}`);
      }

      roleDiffs.push({
        roleName: refRole.name,
        referenceRole: refRole,
        targetRole,
        status: diffs.length > 0 ? "modified" : "identical",
        differences: diffs,
      });
    }
  }

  for (const targetRole of targetRoles) {
    const norm = targetRole.name.trim().toLowerCase();
    if (!processedTargetRoles.has(norm)) {
      extraRolesCount++;
      roleDiffs.push({
        roleName: targetRole.name,
        targetRole,
        status: "extra-in-target",
        differences: ["Role exists only in target server."],
      });
    }
  }

  // ── 4. Compute Counts & Alignment Scores ───────
  const allChannelDiffs = [
    ...categoryDiffs.flatMap((c) => c.channelsDiff),
    ...uncategorizedDiffs,
  ];

  const totalMissingChannels = allChannelDiffs.filter((c) => c.status === "missing-in-target").length;
  const totalExtraChannels = allChannelDiffs.filter((c) => c.status === "extra-in-target").length;
  const totalModifiedChannels = allChannelDiffs.filter((c) => c.status === "modified").length;
  const totalIdenticalChannels = allChannelDiffs.filter((c) => c.status === "identical").length;

  const maxCats = Math.max(refCats.length, targetCats.length, 1);
  const categoryAlignmentScore = Math.round((matchingCatsCount / maxCats) * 100);

  const totalRefAndTargetChans = Math.max(refChans.length, targetChans.length, 1);
  const channelAlignmentScore = Math.round(
    ((totalIdenticalChannels + totalModifiedChannels * 0.5) / totalRefAndTargetChans) * 100
  );

  const maxRoles = Math.max(refRoles.length, targetRoles.length, 1);
  const roleAlignmentScore = Math.round((matchingRolesCount / maxRoles) * 100);

  // Overall weighted score: 40% channels, 30% categories, 30% roles
  const overallStructuralAlignment = Math.min(
    100,
    Math.max(
      0,
      Math.round(channelAlignmentScore * 0.4 + categoryAlignmentScore * 0.3 + roleAlignmentScore * 0.3)
    )
  );

  // ── 5. Generate Actionable Recommendations ─────
  const recommendations: ComparisonRecommendation[] = [];

  for (const cat of categoryDiffs.filter((c) => c.status === "missing-in-target")) {
    recommendations.push({
      type: "create-category",
      priority: "high",
      title: `Create Category: "${cat.categoryName}"`,
      description: `Reference server organizes key discussions under "${cat.categoryName}". Consider creating this category to group relevant topics.`,
    });
  }

  for (const ch of allChannelDiffs.filter((c) => c.status === "missing-in-target").slice(0, 8)) {
    recommendations.push({
      type: "create-channel",
      priority: "high",
      title: `Add Channel: #${ch.channelName}`,
      description: `Channel #${ch.channelName} (${ch.referenceChannel?.type || "text"}) provides focused engagement in the reference architecture.`,
    });
  }

  for (const mod of allChannelDiffs.filter((c) => c.status === "modified").slice(0, 5)) {
    recommendations.push({
      type: "reorganize-channel",
      priority: "medium",
      title: `Align Channel: #${mod.channelName}`,
      description: `Channel #${mod.channelName} differs from reference: ${mod.differences.join("; ")}.`,
    });
  }

  for (const r of roleDiffs.filter((rd) => rd.status === "missing-in-target").slice(0, 4)) {
    recommendations.push({
      type: "create-role",
      priority: "medium",
      title: `Define Role: @${r.roleName}`,
      description: `Role @${r.roleName} is present in the reference server to manage community hierarchy or access controls.`,
    });
  }

  return {
    referenceServer: {
      id: reference.server.id,
      name: reference.server.name,
      memberCount: reference.server.memberCount,
    },
    targetServer: {
      id: target.server.id,
      name: target.server.name,
      memberCount: target.server.memberCount,
    },
    comparedAt,
    metrics: {
      categoryAlignmentScore,
      channelAlignmentScore,
      roleAlignmentScore,
      overallStructuralAlignment,
      totalMissingChannels,
      totalExtraChannels,
      totalModifiedChannels,
      totalIdenticalChannels,
      totalMissingCategories: missingCatsCount,
      totalExtraCategories: extraCatsCount,
      totalMissingRoles: missingRolesCount,
      totalExtraRoles: extraRolesCount,
    },
    categories: categoryDiffs,
    uncategorizedChannels: uncategorizedDiffs,
    roles: roleDiffs,
    recommendations,
  };
}

