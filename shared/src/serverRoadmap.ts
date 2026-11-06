/* ─────────────────────────────────────────────
 *  MapMyServer — Server Roadmap & Change Tracker
 *
 *  Tracks implementation progress when a user adopts
 *  an AI-recommended or custom server architecture.
 *  Compares live Discord server blueprints against the plan,
 *  highlighting completed items in green and detailing
 *  remaining changes.
 * ───────────────────────────────────────────── */

import type {
  ServerBlueprint,
  ChannelType,
  Category,
  Channel,
  Role,
  ArchitectureProposal,
} from "./index";

export interface PlannedCategory {
  id: string;
  name: string;
  position: number;
  isPrivate?: boolean;
  privateAudience?: string;
  description?: string;
}

export interface PlannedChannel {
  id: string;
  name: string;
  type: ChannelType;
  categoryId?: string | null;
  categoryName?: string;
  position: number;
  topic?: string;
  isPrivate?: boolean;
  privateAudience?: string;
  purpose?: string;
  reason?: string;
}

export interface PlannedRole {
  name: string;
  color?: string;
  permissions?: string[];
  reason?: string;
}

export interface ActiveServerPlan {
  id: string;
  serverId: string;
  serverName: string;
  title: string;
  description: string;
  adoptedAt: number;
  categories: PlannedCategory[];
  channels: PlannedChannel[];
  roles?: PlannedRole[];
}

export interface CategoryProgress {
  planned: PlannedCategory;
  isCompleted: boolean;
  matchedCategory?: Category;
}

export interface ChannelProgress {
  planned: PlannedChannel;
  isCompleted: boolean;
  matchedChannel?: Channel;
}

export interface RoleProgress {
  planned: PlannedRole;
  isCompleted: boolean;
  matchedRole?: Role;
}

export interface RoadmapProgressReport {
  planId: string;
  serverId: string;
  serverName: string;
  totalItems: number;
  completedItems: number;
  percentCompleted: number;
  categoryProgress: CategoryProgress[];
  channelProgress: ChannelProgress[];
  roleProgress: RoleProgress[];
  pendingCategoriesCount: number;
  pendingChannelsCount: number;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^[\s#🔊🎤📋📢🖼️💬┃・—–-─—·•►▸▹▾▿▼▽◆◇○●■□]+/, "")
    .replace(/[\s#🔊🎤📋📢🖼️💬┃・—–-─—·•►▸▹▾▿▼▽◆◇○●■□]+$/, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .trim();
}

/**
 * Evaluates live ServerBlueprint against an adopted ActiveServerPlan.
 * Identifies completed components (green lights) vs pending tasks.
 */
export function evaluateRoadmapProgress(
  blueprint: ServerBlueprint,
  plan: ActiveServerPlan
): RoadmapProgressReport {
  // 1. Evaluate Categories
  const categoryProgress: CategoryProgress[] = plan.categories.map((plannedCat) => {
    const plannedNorm = normalizeName(plannedCat.name);
    const matched = blueprint.categories.find(
      (c) => normalizeName(c.name) === plannedNorm
    );
    return {
      planned: plannedCat,
      isCompleted: Boolean(matched),
      matchedCategory: matched,
    };
  });

  // Map of planned category ID -> name
  const plannedCatNameMap = new Map<string, string>();
  for (const cat of plan.categories) {
    plannedCatNameMap.set(cat.id, cat.name);
  }

  // 2. Evaluate Channels
  const channelProgress: ChannelProgress[] = plan.channels.map((plannedCh) => {
    const plannedNorm = normalizeName(plannedCh.name);
    const expectedCatName = plannedCh.categoryName || (plannedCh.categoryId ? plannedCatNameMap.get(plannedCh.categoryId) : undefined);

    const matched = blueprint.channels.find((ch) => {
      if (normalizeName(ch.name) !== plannedNorm) return false;
      // If expected category is specified, verify category match if possible
      if (expectedCatName && ch.parentId) {
        const parentCat = blueprint.categories.find((c) => c.id === ch.parentId);
        if (parentCat && normalizeName(parentCat.name) === normalizeName(expectedCatName)) {
          return true;
        }
      }
      return true;
    });

    return {
      planned: plannedCh,
      isCompleted: Boolean(matched),
      matchedChannel: matched,
    };
  });

  // 3. Evaluate Roles
  const roleProgress: RoleProgress[] = (plan.roles || []).map((plannedRole) => {
    const plannedNorm = normalizeName(plannedRole.name);
    const matched = blueprint.roles.find(
      (r) => normalizeName(r.name) === plannedNorm
    );
    return {
      planned: plannedRole,
      isCompleted: Boolean(matched),
      matchedRole: matched,
    };
  });

  const totalCategories = categoryProgress.length;
  const completedCategories = categoryProgress.filter((c) => c.isCompleted).length;

  const totalChannels = channelProgress.length;
  const completedChannels = channelProgress.filter((c) => c.isCompleted).length;

  const totalRoles = roleProgress.length;
  const completedRoles = roleProgress.filter((r) => r.isCompleted).length;

  const totalItems = totalCategories + totalChannels + totalRoles;
  const completedItems = completedCategories + completedChannels + completedRoles;
  const percentCompleted = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 100;

  return {
    planId: plan.id,
    serverId: plan.serverId,
    serverName: blueprint.server.name || plan.serverName,
    totalItems,
    completedItems,
    percentCompleted,
    categoryProgress,
    channelProgress,
    roleProgress,
    pendingCategoriesCount: totalCategories - completedCategories,
    pendingChannelsCount: totalChannels - completedChannels,
  };
}

/**
 * Converts an ArchitectureProposal into an adoptable ActiveServerPlan.
 */
export function proposalToActivePlan(
  proposal: ArchitectureProposal,
  serverName: string
): ActiveServerPlan {
  return {
    id: `plan_${proposal.id}`,
    serverId: proposal.serverId,
    serverName,
    title: proposal.title,
    description: proposal.description,
    adoptedAt: Date.now(),
    categories: proposal.categories.map((c, i) => ({
      id: c.id,
      name: c.name,
      position: c.position ?? i,
      description: c.description,
      isPrivate: (c as any).isPrivate,
      privateAudience: (c as any).privateAudience,
    })),
    channels: proposal.channels.map((ch, i) => ({
      id: ch.id,
      name: ch.name,
      type: ch.type,
      categoryId: ch.categoryId,
      categoryName: proposal.categories.find((c) => c.id === ch.categoryId)?.name,
      position: ch.position ?? i,
      topic: ch.topic,
      isPrivate:
        ch.suggestedVisibility === "role-restricted" ||
        ch.suggestedVisibility === "member-restricted" ||
        Boolean((ch as any).isPrivate),
      privateAudience:
        (ch as any).privateAudience ||
        (ch.suggestedRolesWithAccess?.length ? ch.suggestedRolesWithAccess.join(", ") : undefined),
      purpose: ch.purpose,
      reason: ch.reason,
    })),
  };
}
