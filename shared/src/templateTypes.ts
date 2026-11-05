/* ─────────────────────────────────────────────
 *  Discord Server Architecture — Template Models & Validation
 * ───────────────────────────────────────────── */

import type { ChannelType, ChannelPurpose, VisibilityClassification, ServerBlueprint } from "./index";

export type TemplateAudience =
  | "community"
  | "developer"
  | "gaming"
  | "opensource"
  | "education"
  | "creator"
  | "startup"
  | "organization"
  | "support";

export interface TemplateChannel {
  name: string;
  type: ChannelType;
  position: number;
  topic?: string;
  description?: string;
  purpose?: ChannelPurpose;
  visibility?: VisibilityClassification;
  suggestedRolesWithAccess?: string[];
  isStaffOnly?: boolean;
}

export interface TemplateCategory {
  name: string;
  position: number;
  description?: string;
  channels: TemplateChannel[];
  isStaffOnly?: boolean;
}

export interface TemplateRole {
  name: string;
  position: number;
  color?: string;
  permissions: string[];
  hoist?: boolean;
  mentionable?: boolean;
  description?: string;
}

export interface TemplateSecurityConfig {
  verificationLevel?: "none" | "low" | "medium" | "high" | "highest";
  defaultNotifications?: "all_messages" | "only_mentions";
  explicitContentFilter?: "disabled" | "members_without_roles" | "all_members";
  requireTwoFactorForModerators?: boolean;
  recommendedModeratorRoles?: string[];
}

export interface ServerTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateAudience;
  version: string;
  author?: string;
  tags: string[];
  categories: TemplateCategory[];
  uncategorizedChannels?: TemplateChannel[];
  roles: TemplateRole[];
  securityConfig?: TemplateSecurityConfig;
  onboardingSuggestions?: string[];
  createdAt: number;
  updatedAt: number;
}

// ── Blueprint to Template Converter ────────────

export interface BlueprintToTemplateOptions {
  name?: string;
  description?: string;
  category?: TemplateAudience;
  tags?: string[];
  excludePrivateStaff?: boolean;
}

export function blueprintToTemplate(
  blueprint: ServerBlueprint,
  options: BlueprintToTemplateOptions = {}
): ServerTemplate {
  const excludePrivate = options.excludePrivateStaff ?? false;

  const categoryMap = new Map<string, typeof blueprint.categories[0]>();
  for (const cat of blueprint.categories) {
    categoryMap.set(cat.id, cat);
  }

  // Convert categories and their channels
  const templateCategories: TemplateCategory[] = [];

  for (const cat of blueprint.categories) {
    const isCatPrivate = cat.visibility && !cat.visibility.accessibleToUser;
    if (excludePrivate && isCatPrivate) continue;

    const catChannels = blueprint.channels.filter((c) => c.parentId === cat.id);
    const convertedChannels: TemplateChannel[] = [];

    for (const ch of catChannels) {
      const isRestricted =
        ch.visibilityAnalysis?.classification === "role-restricted" ||
        ch.visibilityAnalysis?.classification === "member-restricted";

      if (excludePrivate && isRestricted) continue;

      convertedChannels.push({
        name: ch.name,
        type: ch.type,
        position: ch.position,
        topic: ch.topic,
        description: ch.description,
        purpose: ch.purpose?.purpose,
        visibility: ch.visibilityAnalysis?.classification || "broadly-accessible",
        suggestedRolesWithAccess: ch.visibilityAnalysis?.rolesWithAccess || [],
        isStaffOnly: isRestricted,
      });
    }

    if (convertedChannels.length > 0 || !excludePrivate) {
      templateCategories.push({
        name: cat.name,
        position: cat.position,
        channels: convertedChannels,
        isStaffOnly: isCatPrivate,
      });
    }
  }

  // Convert uncategorized channels
  const uncategorizedChannels: TemplateChannel[] = [];
  const uncategorized = blueprint.channels.filter(
    (c) => c.type !== "category" && (!c.parentId || !categoryMap.has(c.parentId))
  );

  for (const ch of uncategorized) {
    const isRestricted =
      ch.visibilityAnalysis?.classification === "role-restricted" ||
      ch.visibilityAnalysis?.classification === "member-restricted";

    if (excludePrivate && isRestricted) continue;

    uncategorizedChannels.push({
      name: ch.name,
      type: ch.type,
      position: ch.position,
      topic: ch.topic,
      description: ch.description,
      purpose: ch.purpose?.purpose,
      visibility: ch.visibilityAnalysis?.classification || "broadly-accessible",
      suggestedRolesWithAccess: ch.visibilityAnalysis?.rolesWithAccess || [],
      isStaffOnly: isRestricted,
    });
  }

  // Convert roles (excluding @everyone and stripping IDs)
  const templateRoles: TemplateRole[] = blueprint.roles
    .filter((r) => r.name.toLowerCase() !== "@everyone" && r.position > 0)
    .sort((a, b) => b.position - a.position)
    .map((r) => ({
      name: r.name,
      position: r.position,
      color: r.color,
      permissions: r.permissions || [],
      hoist: r.hoist,
      mentionable: r.mentionable,
    }));

  const now = Date.now();
  return {
    id: `template-${now}`,
    name: options.name || `${blueprint.server.name} Template`,
    description: options.description || `Reusable architecture derived from ${blueprint.server.name}`,
    category: options.category || "community",
    version: "1.0.0",
    tags: options.tags || ["custom", "exported"],
    categories: templateCategories,
    uncategorizedChannels: uncategorizedChannels.length > 0 ? uncategorizedChannels : undefined,
    roles: templateRoles,
    securityConfig: {
      requireTwoFactorForModerators: true,
      defaultNotifications: "only_mentions",
      explicitContentFilter: "all_members",
    },
    onboardingSuggestions: [
      "Set rules channel as read-only for new members",
      "Assign welcome role upon accepting rules",
    ],
    createdAt: now,
    updatedAt: now,
  };
}

// ── Template Validator ─────────────────────────

export function validateTemplate(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Template payload must be a JSON object."] };
  }

  const obj = data as Partial<ServerTemplate>;
  if (!obj.name || typeof obj.name !== "string" || !obj.name.trim()) {
    errors.push("Template must have a non-empty name.");
  }

  if (!obj.category || typeof obj.category !== "string") {
    errors.push("Template must have a category (e.g. community, developer, gaming).");
  }

  if (!Array.isArray(obj.categories)) {
    errors.push("Template must contain a 'categories' array.");
  } else {
    for (let i = 0; i < obj.categories.length; i++) {
      const cat = obj.categories[i];
      if (!cat.name || typeof cat.name !== "string") {
        errors.push(`Category at index ${i} is missing a name.`);
      }
      if (!Array.isArray(cat.channels)) {
        errors.push(`Category "${cat.name || i}" must have a 'channels' array.`);
      }
    }
  }

  if (obj.roles && !Array.isArray(obj.roles)) {
    errors.push("'roles' must be an array if provided.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
