/* ─────────────────────────────────────────────
 *  Discord Permission Engine
 *
 *  Implements Discord's official bitfield flags,
 *  permission calculation hierarchy, category inheritance,
 *  and 5-tier channel visibility analysis.
 * ───────────────────────────────────────────── */

import type {
  Channel,
  Category,
  Role,
  PermissionOverwrite,
  ChannelVisibilityAnalysis,
  VisibilityClassification,
  PermissionFlagName,
} from "./index";

// ── Permission Bitfield Constants ─────────────
// BigInt bitfield flags per Discord Developer Documentation

export const DISCORD_PERMISSIONS: Record<PermissionFlagName, bigint> = {
  CREATE_INSTANT_INVITE: 1n << 0n,
  KICK_MEMBERS: 1n << 1n,
  BAN_MEMBERS: 1n << 2n,
  ADMINISTRATOR: 1n << 3n,
  MANAGE_CHANNELS: 1n << 4n,
  MANAGE_GUILD: 1n << 5n,
  ADD_REACTIONS: 1n << 6n,
  VIEW_AUDIT_LOG: 1n << 7n,
  PRIORITY_SPEAKER: 1n << 8n,
  STREAM: 1n << 9n,
  VIEW_CHANNEL: 1n << 10n,
  SEND_MESSAGES: 1n << 11n,
  SEND_TTS_MESSAGES: 1n << 12n,
  MANAGE_MESSAGES: 1n << 13n,
  EMBED_LINKS: 1n << 14n,
  ATTACH_FILES: 1n << 15n,
  READ_MESSAGE_HISTORY: 1n << 16n,
  MENTION_EVERYONE: 1n << 17n,
  USE_EXTERNAL_EMOJIS: 1n << 18n,
  VIEW_GUILD_INSIGHTS: 1n << 19n,
  CONNECT: 1n << 20n,
  SPEAK: 1n << 21n,
  MUTE_MEMBERS: 1n << 22n,
  DEAFEN_MEMBERS: 1n << 23n,
  MOVE_MEMBERS: 1n << 24n,
  USE_VAD: 1n << 25n,
  CHANGE_NICKNAME: 1n << 26n,
  MANAGE_NICKNAMES: 1n << 27n,
  MANAGE_ROLES: 1n << 28n,
  MANAGE_WEBHOOKS: 1n << 29n,
  MANAGE_GUILD_EXPRESSIONS: 1n << 30n,
  USE_APPLICATION_COMMANDS: 1n << 31n,
  REQUEST_TO_SPEAK: 1n << 32n,
  MANAGE_EVENTS: 1n << 33n,
  MANAGE_THREADS: 1n << 34n,
  CREATE_PUBLIC_THREADS: 1n << 35n,
  CREATE_PRIVATE_THREADS: 1n << 36n,
  USE_EXTERNAL_STICKERS: 1n << 37n,
  SEND_MESSAGES_IN_THREADS: 1n << 38n,
  USE_EMBEDDED_ACTIVITIES: 1n << 39n,
  MODERATE_MEMBERS: 1n << 40n,
  VIEW_CREATOR_MONETIZATION_ANALYTICS: 1n << 41n,
  USE_SOUNDBOARD: 1n << 42n,
  USE_EXTERNAL_SOUNDS: 1n << 45n,
  SEND_VOICE_MESSAGES: 1n << 46n,
};

// All known permissions mask
export const ALL_PERMISSIONS_MASK: bigint = Object.values(DISCORD_PERMISSIONS).reduce(
  (acc, bit) => acc | bit,
  0n
);

/**
 * Converts array of permission string names to a BigInt bitfield.
 */
export function permissionsToBitfield(permNames?: string[]): bigint {
  if (!permNames || permNames.length === 0) return 0n;
  let bitfield = 0n;
  for (const name of permNames) {
    const normalized = name.toUpperCase().replace(/\s+/g, "_") as PermissionFlagName;
    if (DISCORD_PERMISSIONS[normalized]) {
      bitfield |= DISCORD_PERMISSIONS[normalized];
    }
  }
  return bitfield;
}

/**
 * Converts a BigInt bitfield into an array of readable permission flag names.
 */
export function bitfieldToPermissions(bitfield: bigint): PermissionFlagName[] {
  const result: PermissionFlagName[] = [];
  for (const [name, bit] of Object.entries(DISCORD_PERMISSIONS)) {
    if ((bitfield & bit) === bit) {
      result.push(name as PermissionFlagName);
    }
  }
  return result;
}

/**
 * Tests whether a specific permission is granted in a bitfield.
 */
export function hasPermission(bitfield: bigint, perm: PermissionFlagName): boolean {
  if ((bitfield & DISCORD_PERMISSIONS.ADMINISTRATOR) === DISCORD_PERMISSIONS.ADMINISTRATOR) {
    return true;
  }
  const flag = DISCORD_PERMISSIONS[perm];
  return flag !== undefined && (bitfield & flag) === flag;
}

// ── Effective Permission Computation ───────────

export interface ComputePermissionsParams {
  channel: Channel;
  parentCategory?: Category | null;
  guildRoles: Role[];
  memberRoleIds: string[];
  memberId?: string;
  isGuildOwner?: boolean;
}

/**
 * Calculates effective permissions for a member in a specific channel following
 * Discord's official permission hierarchy.
 */
export function computeEffectivePermissions(params: ComputePermissionsParams): {
  bitfield: bigint;
  permissions: PermissionFlagName[];
  isAdmin: boolean;
  isOwner: boolean;
} {
  const { channel, parentCategory, guildRoles, memberRoleIds, memberId, isGuildOwner } = params;

  // 1. Guild owner has all permissions unconditionally
  if (isGuildOwner) {
    return {
      bitfield: ALL_PERMISSIONS_MASK,
      permissions: bitfieldToPermissions(ALL_PERMISSIONS_MASK),
      isAdmin: true,
      isOwner: true,
    };
  }

  // Find @everyone role (either named "@everyone", id == guildId, or lowest position)
  const everyoneRole =
    guildRoles.find((r) => r.name.toLowerCase() === "@everyone") ||
    guildRoles.find((r) => r.position === 0) ||
    guildRoles[guildRoles.length - 1];

  // 2. Base permissions: @everyone
  let permissions = permissionsToBitfield(everyoneRole?.permissions);

  // 3. Apply base permissions of member's assigned roles
  for (const roleId of memberRoleIds) {
    const role = guildRoles.find((r) => r.id === roleId);
    if (role?.permissions) {
      permissions |= permissionsToBitfield(role.permissions);
    }
  }

  // 4. Administrator bypass: if ADMINISTRATOR is granted, return ALL immediately
  if ((permissions & DISCORD_PERMISSIONS.ADMINISTRATOR) === DISCORD_PERMISSIONS.ADMINISTRATOR) {
    return {
      bitfield: ALL_PERMISSIONS_MASK,
      permissions: bitfieldToPermissions(ALL_PERMISSIONS_MASK),
      isAdmin: true,
      isOwner: false,
    };
  }

  // 5. Channel overwrites: check channel overwrites first; if missing, inherit from category
  const activeOverwrites: PermissionOverwrite[] =
    channel.permissions && channel.permissions.length > 0
      ? channel.permissions
      : parentCategory?.visibility ? [] : []; // Category overwrites can be supplied in channel.permissions or parent

  // A. Apply @everyone overwrite
  const everyoneOverwrite = activeOverwrites.find(
    (ow) => ow.type === "role" && (ow.id === everyoneRole?.id || ow.id.toLowerCase().includes("everyone"))
  );

  if (everyoneOverwrite) {
    const denyBits = permissionsToBitfield(everyoneOverwrite.deny);
    const allowBits = permissionsToBitfield(everyoneOverwrite.allow);
    permissions = (permissions & ~denyBits) | allowBits;
  }

  // B. Aggregate role overwrites
  let rolesAllow = 0n;
  let rolesDeny = 0n;

  for (const roleId of memberRoleIds) {
    const roleOverwrite = activeOverwrites.find(
      (ow) => ow.type === "role" && ow.id === roleId
    );
    if (roleOverwrite) {
      rolesAllow |= permissionsToBitfield(roleOverwrite.allow);
      rolesDeny |= permissionsToBitfield(roleOverwrite.deny);
    }
  }

  permissions = (permissions & ~rolesDeny) | rolesAllow;

  // C. Member-specific overwrite (highest specificity)
  if (memberId) {
    const memberOverwrite = activeOverwrites.find(
      (ow) => ow.type === "member" && ow.id === memberId
    );
    if (memberOverwrite) {
      const memDeny = permissionsToBitfield(memberOverwrite.deny);
      const memAllow = permissionsToBitfield(memberOverwrite.allow);
      permissions = (permissions & ~memDeny) | memAllow;
    }
  }

  // Voice/Stage implicit constraint: If VIEW_CHANNEL is not granted, CONNECT is void
  if (channel.type === "voice" || channel.type === "stage") {
    if ((permissions & DISCORD_PERMISSIONS.VIEW_CHANNEL) !== DISCORD_PERMISSIONS.VIEW_CHANNEL) {
      permissions &= ~DISCORD_PERMISSIONS.CONNECT;
    }
  }

  return {
    bitfield: permissions,
    permissions: bitfieldToPermissions(permissions),
    isAdmin: false,
    isOwner: false,
  };
}

// ── Private Audience Inference Helper ──────────

export function inferPrivateAudience(
  channelName: string,
  categoryName?: string | null,
  rolesWithAccess: string[] = []
): string {
  const meaningfulRoles = rolesWithAccess.filter((r) => r.toLowerCase() !== "@everyone");
  if (meaningfulRoles.length > 0) {
    if (meaningfulRoles.length <= 2) {
      return `Restricted to @${meaningfulRoles.join(", @")}`;
    }
    return `Restricted to @${meaningfulRoles[0]} +${meaningfulRoles.length - 1} roles`;
  }

  const combined = `${categoryName || ""} ${channelName}`.toLowerCase();

  if (/admin|executive|owner|founder|management|directors|leads/i.test(combined)) {
    return "Server Administration Only";
  }
  if (/staff|mod|moderator|guard|security|warden|tribunal/i.test(combined)) {
    return "Staff & Moderation Team";
  }
  if (/log|audit|bot|webhook|system|terminal|github|git|alerts/i.test(combined)) {
    return "Bot Logs & System Audits";
  }
  if (/vip|booster|donor|supporter|premium|patron|sponsor/i.test(combined)) {
    return "Server Boosters & VIP";
  }
  if (/dev|developer|coder|engineering|code|tech|testing|staging|qa/i.test(combined)) {
    return "Developers & Tech Staff";
  }
  if (/archive|legacy|deprecated|old|read-only/i.test(combined)) {
    return "Archived / Read-Only";
  }
  if (/meeting|scrim|private-voice|huddle|office/i.test(combined)) {
    return "Private Voice & Meetings";
  }

  return "Private / Role-Restricted";
}

// ── Category Synchronization Check ────────────

/**
 * Determines whether a channel's permissions match its category's permissions.
 */
export function checkCategorySync(
  channel: Channel,
  parentCategory?: Category | null
): boolean {
  if (!channel.parentId || !parentCategory) {
    return true; // Root channels are considered synced with themselves
  }

  const channelOverwrites = channel.permissions || [];
  // If no explicit channel overrides are defined, channel is synchronized
  if (channelOverwrites.length === 0) {
    return true;
  }

  // If channel has overrides but category has none, it's desynced
  return false;
}

// ── Channel Visibility Assessment ──────────────

/**
 * Performs deep visibility analysis for a channel.
 * Evaluates @everyone baseline, role overwrites, member overrides, and administrator roles.
 */
export function evaluateChannelVisibility(
  channel: Channel,
  parentCategory: Category | null | undefined,
  guildRoles: Role[],
  currentUserRoleIds?: string[]
): ChannelVisibilityAnalysis {
  const overwrites = channel.permissions || [];
  const isCategorySynced = checkCategorySync(channel, parentCategory);
  const hasChannelOverrides = overwrites.length > 0;

  // Find @everyone role
  const everyoneRole =
    guildRoles.find((r) => r.name.toLowerCase() === "@everyone") ||
    guildRoles.find((r) => r.position === 0) ||
    guildRoles[guildRoles.length - 1];

  // Base @everyone permission
  const everyoneBase = permissionsToBitfield(everyoneRole?.permissions);
  const everyoneBaseCanView =
    hasPermission(everyoneBase, "VIEW_CHANNEL") ||
    // In Discord, @everyone can view channels by default unless explicitly denied
    (!everyoneRole?.permissions || everyoneRole.permissions.length === 0);

  // Check channel overwrite for @everyone
  const everyoneOw = overwrites.find(
    (ow) => ow.type === "role" && (ow.id === everyoneRole?.id || ow.id.toLowerCase().includes("everyone"))
  );

  let everyoneCanView = everyoneBaseCanView;
  if (everyoneOw) {
    const deny = permissionsToBitfield(everyoneOw.deny);
    const allow = permissionsToBitfield(everyoneOw.allow);
    if ((deny & DISCORD_PERMISSIONS.VIEW_CHANNEL) === DISCORD_PERMISSIONS.VIEW_CHANNEL) {
      everyoneCanView = false;
    } else if ((allow & DISCORD_PERMISSIONS.VIEW_CHANNEL) === DISCORD_PERMISSIONS.VIEW_CHANNEL) {
      everyoneCanView = true;
    }
  }

  // Find roles with explicit VIEW_CHANNEL allow overwrites or Admin roles
  const rolesWithAccess: string[] = [];
  const rolesWithDeny: string[] = [];

  for (const role of guildRoles) {
    // Administrator roles always have access
    const roleBaseBits = permissionsToBitfield(role.permissions);
    if (hasPermission(roleBaseBits, "ADMINISTRATOR")) {
      rolesWithAccess.push(role.name);
      continue;
    }

    const ow = overwrites.find((o) => o.type === "role" && (o.id === role.id || o.id.includes(role.name.toLowerCase())));
    if (ow) {
      const allow = permissionsToBitfield(ow.allow);
      const deny = permissionsToBitfield(ow.deny);
      if (hasPermission(allow, "VIEW_CHANNEL")) {
        rolesWithAccess.push(role.name);
      } else if (hasPermission(deny, "VIEW_CHANNEL")) {
        rolesWithDeny.push(role.name);
      }
    } else if (everyoneCanView && !hasPermission(roleBaseBits, "VIEW_CHANNEL") === false) {
      // Inherits everyone allow
      rolesWithAccess.push(role.name);
    }
  }

  // Member-specific overwrites
  const memberOverwrites = overwrites.filter((o) => o.type === "member");
  const hasMemberOverwrites = memberOverwrites.length > 0;

  // Determine classification
  let classification: VisibilityClassification = "unknown";
  let reason = "";
  const isExplicitlyPrivate = Boolean(channel.isPrivate || parentCategory?.isPrivate);

  if (overwrites.length === 0 && guildRoles.length === 0) {
    if (isExplicitlyPrivate) {
      classification = "role-restricted";
      const aud = channel.privateAudience || inferPrivateAudience(channel.name, parentCategory?.name, rolesWithAccess);
      reason = `Private channel (lock icon detected in Discord): ${aud}.`;
    } else {
      classification = "broadly-accessible";
      reason = "No permission restrictions detected; assumed public by default.";
    }
  } else if (everyoneCanView && rolesWithAccess.length === 0 && !hasMemberOverwrites) {
    if (isExplicitlyPrivate) {
      classification = "role-restricted";
      const aud = channel.privateAudience || inferPrivateAudience(channel.name, parentCategory?.name, rolesWithAccess);
      reason = `Private channel: ${aud}.`;
    } else {
      classification = "broadly-accessible";
      reason = "Broadly accessible to all community members through @everyone permissions.";
    }
  } else if (!everyoneCanView && rolesWithAccess.length > 0) {
    classification = "role-restricted";
    const roleNamesList = rolesWithAccess.slice(0, 3).join(", ");
    const more = rolesWithAccess.length > 3 ? ` (+${rolesWithAccess.length - 3} more)` : "";
    const aud = channel.privateAudience || inferPrivateAudience(channel.name, parentCategory?.name, rolesWithAccess);
    reason = `Restricted channel (${aud}): @everyone is denied. Accessible only to roles: ${roleNamesList}${more}.`;
  } else if (!everyoneCanView && hasMemberOverwrites && rolesWithAccess.length === 0) {
    classification = "member-restricted";
    reason = "Private channel: @everyone and standard roles are denied. Accessible only to specific designated members.";
  } else if (everyoneCanView && rolesWithDeny.length > 0) {
    classification = "broadly-accessible";
    reason = `Public to most members; explicitly hidden from ${rolesWithDeny.slice(0, 2).join(", ")}.`;
  } else if (!everyoneCanView && rolesWithAccess.length === 0 && !hasMemberOverwrites) {
    classification = "user-inaccessible";
    reason = "Channel permissions deny view access to all evaluated standard roles and @everyone.";
  } else if (isExplicitlyPrivate) {
    classification = "role-restricted";
    const aud = channel.privateAudience || inferPrivateAudience(channel.name, parentCategory?.name, rolesWithAccess);
    reason = `Private channel: ${aud}.`;
  } else {
    classification = "broadly-accessible";
    reason = "Accessible based on evaluated server hierarchy.";
  }

  // Current user evaluation if role IDs are provided
  let currentUserCanAccess: boolean | null = null;
  if (currentUserRoleIds && currentUserRoleIds.length > 0) {
    const userEffective = computeEffectivePermissions({
      channel,
      parentCategory,
      guildRoles,
      memberRoleIds: currentUserRoleIds,
    });
    currentUserCanAccess = hasPermission(userEffective.bitfield, "VIEW_CHANNEL");
  } else if (channel.visibility.accessibleToUser) {
    currentUserCanAccess = true;
  }

  return {
    classification,
    everyoneCanView,
    rolesWithAccess,
    isCategorySynced,
    hasChannelOverrides,
    currentUserCanAccess,
    reason,
  };
}

