/* ─────────────────────────────────────────────
 *  Discord Server Blueprint — Security Audit Engine
 *
 *  Deterministic, evidence-based security analyzer and
 *  server health evaluation engine across 9 core rules.
 * ───────────────────────────────────────────── */

import type {
  ServerBlueprint,
  Channel,
  Role,
  Category,
  ScanQualityReport,
} from "./index";
import {
  DISCORD_PERMISSIONS,
  hasPermission,
  permissionsToBitfield,
} from "./permissionEngine";

// ── Types ──────────────────────────────────────

export type FindingSeverity = "critical" | "high" | "medium" | "low" | "informational";
export type FindingConfidence = "high" | "medium" | "low";
export type FindingStatus = "confirmed" | "needs-review" | "insufficient-data";
export type FindingCategory =
  | "administrator"
  | "visibility"
  | "staff-exposure"
  | "consistency"
  | "roles"
  | "organization"
  | "voice"
  | "data-quality";

export interface AuditEvidence {
  field: string;
  actualValue: string;
  expectedValue?: string;
  explanation: string;
}

export interface SecurityFinding {
  id: string;
  ruleId: string;
  title: string;
  description: string;
  severity: FindingSeverity;
  category: FindingCategory;
  affectedResourceIds: string[];
  affectedResourceNames: string[];
  evidence: AuditEvidence[];
  recommendation: string;
  confidence: FindingConfidence;
  status: FindingStatus;
  detectedAt: number;
}

export interface SecurityAuditReport {
  serverId: string;
  serverName: string;
  generatedAt: number;
  score: number; // 0 - 100
  grade: "A" | "B" | "C" | "D" | "F";
  summary: {
    totalFindings: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    informational: number;
    confirmed: number;
    needsReview: number;
    insufficientData: number;
  };
  findings: SecurityFinding[];
  scanQuality: ScanQualityReport | null;
}

// ── Staff Keyword Signals ──────────────────────
const STAFF_KEYWORDS = [
  "admin",
  "administrator",
  "staff",
  "mod",
  "moderator",
  "moderation",
  "lead",
  "leadership",
  "officer",
  "audit",
  "audit-log",
  "audit-logs",
  "mod-log",
  "mod-logs",
  "server-log",
  "server-logs",
  "incident",
  "tickets",
  "ticket-transcripts",
  "secret",
  "private-staff",
  "internal",
  "exec",
  "executive",
];

function matchesStaffKeyword(name: string): boolean {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, " ");
  const tokens = normalized.split(/\s+/).filter(Boolean);
  return tokens.some((token) => STAFF_KEYWORDS.includes(token));
}

// ── Main Audit Function ────────────────────────

export function runSecurityAudit(blueprint: ServerBlueprint): SecurityAuditReport {
  const findings: SecurityFinding[] = [];
  const detectedAt = Date.now();
  const scanQuality = blueprint.scanQuality || null;
  const isPartialScan = !scanQuality || scanQuality.permissionDataQuality !== "full";

  // RULE A: Administrator Permissions
  auditAdministratorPermissions(blueprint, findings, detectedAt, isPartialScan);

  // RULE B: Channel Visibility Exposure
  auditChannelVisibility(blueprint, findings, detectedAt, isPartialScan);

  // RULE C: Staff and Moderation Area Review
  auditStaffChannels(blueprint, findings, detectedAt, isPartialScan);

  // RULE D: Permission Inconsistencies & Category Inheritance
  auditPermissionInconsistencies(blueprint, findings, detectedAt, isPartialScan);

  // RULE E: Role Configuration & Hierarchy
  auditRoleConfiguration(blueprint, findings, detectedAt, isPartialScan);

  // RULE F: Uncategorized Channels
  auditUncategorizedChannels(blueprint, findings, detectedAt);

  // RULE G: Naming and Structure
  auditNamingAndStructure(blueprint, findings, detectedAt);

  // RULE H: Voice Channel Access
  auditVoiceChannels(blueprint, findings, detectedAt, isPartialScan);

  // RULE I: Scan Quality & Completeness
  auditScanQuality(scanQuality, findings, detectedAt);

  // Calculate Health Score & Grade
  const score = calculateHealthScore(findings, isPartialScan);
  const grade = calculateGrade(score);

  // Compute Summary Statistics
  const summary = {
    totalFindings: findings.length,
    critical: findings.filter((f) => f.severity === "critical").length,
    high: findings.filter((f) => f.severity === "high").length,
    medium: findings.filter((f) => f.severity === "medium").length,
    low: findings.filter((f) => f.severity === "low").length,
    informational: findings.filter((f) => f.severity === "informational").length,
    confirmed: findings.filter((f) => f.status === "confirmed").length,
    needsReview: findings.filter((f) => f.status === "needs-review").length,
    insufficientData: findings.filter((f) => f.status === "insufficient-data").length,
  };

  return {
    serverId: blueprint.server.id,
    serverName: blueprint.server.name,
    generatedAt: detectedAt,
    score,
    grade,
    summary,
    findings,
    scanQuality,
  };
}

// ── Rule Implementations ───────────────────────

/**
 * RULE A: Administrator Permissions
 */
function auditAdministratorPermissions(
  blueprint: ServerBlueprint,
  findings: SecurityFinding[],
  detectedAt: number,
  isPartialScan: boolean
) {
  const adminRoles: Role[] = [];
  let everyoneRoleHasAdmin = false;

  for (const role of blueprint.roles) {
    const bitfield = permissionsToBitfield(role.permissions);
    if (hasPermission(bitfield, "ADMINISTRATOR")) {
      adminRoles.push(role);
      if (role.name.toLowerCase() === "@everyone" || role.position === 0) {
        everyoneRoleHasAdmin = true;
      }
    }
  }

  // A1: Critical check - @everyone has ADMINISTRATOR
  if (everyoneRoleHasAdmin) {
    findings.push({
      id: "sec-admin-everyone",
      ruleId: "RULE_A_ADMIN_EVERYONE",
      title: "@everyone Role Has Full Administrator Privileges",
      description:
        "The baseline @everyone role has been granted the ADMINISTRATOR permission. Every member who joins immediately gains complete, unrestricted control over the entire server.",
      severity: "critical",
      category: "administrator",
      affectedResourceIds: ["@everyone"],
      affectedResourceNames: ["@everyone"],
      evidence: [
        {
          field: "role.permissions",
          actualValue: "ADMINISTRATOR included in @everyone permissions",
          expectedValue: "ADMINISTRATOR revoked",
          explanation: "The default role must never hold administrative authority.",
        },
      ],
      recommendation:
        "Immediately remove ADMINISTRATOR from the @everyone role in Server Settings > Roles.",
      confidence: "high",
      status: "confirmed",
      detectedAt,
    });
  }

  // A2: Multiple Administrator Roles (> 2 admin roles increases attack surface)
  if (adminRoles.length > 2) {
    findings.push({
      id: `sec-admin-multiple-${adminRoles.map((r) => r.id).sort().join("-")}`,
      ruleId: "RULE_A_MULTIPLE_ADMIN_ROLES",
      title: `Multiple Administrator Roles Configured (${adminRoles.length} roles)`,
      description: `Detected ${adminRoles.length} separate roles with the ADMINISTRATOR permission (${adminRoles.map((r) => r.name).join(", ")}). Multiple administrative tiers expand the attack surface and increase credential theft risk.`,
      severity: "medium",
      category: "administrator",
      affectedResourceIds: adminRoles.map((r) => r.id),
      affectedResourceNames: adminRoles.map((r) => r.name),
      evidence: [
        {
          field: "roles.filter(hasAdmin).length",
          actualValue: `${adminRoles.length} roles`,
          expectedValue: "1 or 2 dedicated roles",
          explanation: "Best practice is a single high-security Administrator role and targeted granular roles for other staff.",
        },
      ],
      recommendation:
        "Audit administrator roles and consolidate where possible. Replace ADMINISTRATOR with specific granular permissions (e.g. MANAGE_CHANNELS, MANAGE_MESSAGES) for non-owner staff.",
      confidence: isPartialScan ? "medium" : "high",
      status: isPartialScan ? "needs-review" : "confirmed",
      detectedAt,
    });
  } else if (adminRoles.length > 0 && !everyoneRoleHasAdmin) {
    // Informational record of legitimate admin roles
    findings.push({
      id: `sec-admin-info-${adminRoles.map((r) => r.id).sort().join("-")}`,
      ruleId: "RULE_A_ADMIN_ROLES_DETECTED",
      title: `Administrator Access Confirmed (${adminRoles.map((r) => r.name).join(", ")})`,
      description: `Administrator privileges are assigned to ${adminRoles.length} role(s): ${adminRoles.map((r) => r.name).join(", ")}.`,
      severity: "informational",
      category: "administrator",
      affectedResourceIds: adminRoles.map((r) => r.id),
      affectedResourceNames: adminRoles.map((r) => r.name),
      evidence: [
        {
          field: "roles.permissions",
          actualValue: adminRoles.map((r) => r.name).join(", "),
          explanation: "Verified administrative authority assignments.",
        },
      ],
      recommendation: "Ensure all members holding these roles utilize 2-Factor Authentication (2FA).",
      confidence: "high",
      status: "confirmed",
      detectedAt,
    });
  }
}

/**
 * RULE B: Channel Visibility Exposure
 */
function auditChannelVisibility(
  blueprint: ServerBlueprint,
  findings: SecurityFinding[],
  detectedAt: number,
  _isPartialScan: boolean
) {
  for (const channel of blueprint.channels) {
    if (channel.type === "category") continue;
    const vis = channel.visibilityAnalysis;

    // Check for incomplete visibility information
    if (!vis || vis.classification === "unknown") {
      findings.push({
        id: `sec-vis-unknown-${channel.id}`,
        ruleId: "RULE_B_UNKNOWN_VISIBILITY",
        title: `Incomplete Visibility Data for #${channel.name}`,
        description: `Channel #${channel.name} could not be fully analyzed for access permissions due to missing permission overwrite records.`,
        severity: "low",
        category: "visibility",
        affectedResourceIds: [channel.id],
        affectedResourceNames: [`#${channel.name}`],
        evidence: [
          {
            field: "channel.visibilityAnalysis.classification",
            actualValue: "unknown",
            expectedValue: "broadly-accessible | role-restricted | member-restricted",
            explanation: "Permission data was omitted or could not be verified.",
          },
        ],
        recommendation: "Run a full server scan or inspect this channel's permission settings manually.",
        confidence: "low",
        status: "insufficient-data",
        detectedAt,
      });
      continue;
    }

    // Check if public channel exposes MENTION_EVERYONE to @everyone
    if (vis.everyoneCanView && channel.permissions) {
      const everyoneOw = channel.permissions.find(
        (o) => o.id === "@everyone" || o.id === blueprint.server.id
      );
      if (everyoneOw && everyoneOw.allow.some((p) => p.toUpperCase().includes("MENTION_EVERYONE"))) {
        findings.push({
          id: `sec-vis-mention-${channel.id}`,
          ruleId: "RULE_B_PUBLIC_MENTION_EVERYONE",
          title: `Public Channel #${channel.name} Allows @everyone Mass Mentions`,
          description: `Channel #${channel.name} explicitly grants MENTION_EVERYONE to the @everyone role. Any server member can notify all users, creating a significant spam and griefing vulnerability.`,
          severity: "high",
          category: "visibility",
          affectedResourceIds: [channel.id],
          affectedResourceNames: [`#${channel.name}`],
          evidence: [
            {
              field: "permission_overwrites.@everyone.allow",
              actualValue: "MENTION_EVERYONE",
              expectedValue: "DENY or INHERIT",
              explanation: "Mass pings should be restricted to moderators and administrators.",
            },
          ],
          recommendation: "Deny 'Mention @everyone, @here, and All Roles' for @everyone in this channel's settings.",
          confidence: "high",
          status: "confirmed",
          detectedAt,
        });
      }
    }
  }
}

/**
 * RULE C: Staff and Moderation Area Review
 */
function auditStaffChannels(
  blueprint: ServerBlueprint,
  findings: SecurityFinding[],
  detectedAt: number,
  _isPartialScan: boolean
) {
  for (const channel of blueprint.channels) {
    if (channel.type === "category") continue;
    const isStaffNamed = matchesStaffKeyword(channel.name);
    if (!isStaffNamed) continue;

    const vis = channel.visibilityAnalysis;

    // Subcase C1: Potential staff channel is publicly accessible
    if (vis && (vis.classification === "broadly-accessible" || vis.everyoneCanView)) {
      findings.push({
        id: `sec-staff-exposed-${channel.id}`,
        ruleId: "RULE_C_STAFF_CHANNEL_EXPOSED",
        title: `Potential Staff/Moderation Channel #${channel.name} is Publicly Accessible`,
        description: `The channel name #${channel.name} indicates an internal, staff, or moderation function, but permission analysis indicates it is broadly visible to regular community members (@everyone).`,
        severity: "critical",
        category: "staff-exposure",
        affectedResourceIds: [channel.id],
        affectedResourceNames: [`#${channel.name}`],
        evidence: [
          {
            field: "channel.name",
            actualValue: channel.name,
            explanation: "Matches staff/moderation keyword pattern.",
          },
          {
            field: "channel.visibilityAnalysis.everyoneCanView",
            actualValue: "true",
            expectedValue: "false",
            explanation: "Staff channels must deny VIEW_CHANNEL to @everyone.",
          },
        ],
        recommendation:
          "Change channel permissions to private immediately by denying VIEW_CHANNEL to @everyone and explicitly allowing only verified staff/moderator roles.",
        confidence: "high",
        status: "confirmed",
        detectedAt,
      });
    } else if (!vis || vis.classification === "unknown") {
      // Subcase C2: Name matches staff keyword, but permissions could not be fully confirmed
      findings.push({
        id: `sec-staff-unconfirmed-${channel.id}`,
        ruleId: "RULE_C_STAFF_CHANNEL_UNCONFIRMED",
        title: `Verify Access Permissions for Staff Channel #${channel.name}`,
        description: `Channel #${channel.name} appears to be designated for staff or moderation activities, but access permissions could not be completely verified during scanning.`,
        severity: "medium",
        category: "staff-exposure",
        affectedResourceIds: [channel.id],
        affectedResourceNames: [`#${channel.name}`],
        evidence: [
          {
            field: "channel.name",
            actualValue: channel.name,
            explanation: "Staff keyword match with unverified permission state.",
          },
        ],
        recommendation:
          "Confirm that this channel is restricted to staff roles only in Discord channel settings.",
        confidence: "low",
        status: "needs-review",
        detectedAt,
      });
    } else if (vis.classification === "role-restricted" || vis.classification === "member-restricted") {
      // Subcase C3: Properly restricted staff channel (informational)
      findings.push({
        id: `sec-staff-protected-${channel.id}`,
        ruleId: "RULE_C_STAFF_CHANNEL_PROTECTED",
        title: `Staff Channel #${channel.name} is Properly Restricted`,
        description: `Channel #${channel.name} is correctly restricted to authorized roles (${vis.rolesWithAccess.join(", ") || "designated roles"}).`,
        severity: "informational",
        category: "staff-exposure",
        affectedResourceIds: [channel.id],
        affectedResourceNames: [`#${channel.name}`],
        evidence: [
          {
            field: "channel.visibilityAnalysis.classification",
            actualValue: vis.classification,
            explanation: "Access is limited to designated roles/members only.",
          },
        ],
        recommendation: "Maintain current role-restricted configuration.",
        confidence: "high",
        status: "confirmed",
        detectedAt,
      });
    }
  }
}

/**
 * RULE D: Permission Inconsistencies & Category Synchronization
 */
function auditPermissionInconsistencies(
  blueprint: ServerBlueprint,
  findings: SecurityFinding[],
  detectedAt: number,
  isPartialScan: boolean
) {
  const categoryMap = new Map<string, Category>();
  for (const cat of blueprint.categories) {
    categoryMap.set(cat.id, cat);
  }

  for (const channel of blueprint.channels) {
    if (channel.type === "category" || !channel.parentId) continue;
    const parent = categoryMap.get(channel.parentId);
    if (!parent) continue;

    const vis = channel.visibilityAnalysis;
    if (!vis) continue;

    // Subcase D1: Category Leak
    // Parent category is private/restricted, but child channel overrides VIEW_CHANNEL to ALLOW for @everyone
    if (parent.visibility && !parent.visibility.accessibleToUser && vis.everyoneCanView) {
      findings.push({
        id: `sec-cat-leak-${channel.id}`,
        ruleId: "RULE_D_CATEGORY_LEAK",
        title: `Channel #${channel.name} Leaks Public View Inside Private Category "${parent.name}"`,
        description: `The parent category "${parent.name}" is restricted, but #${channel.name} has a channel-specific override that allows @everyone to view the channel, exposing internal conversations.`,
        severity: "high",
        category: "consistency",
        affectedResourceIds: [channel.id, parent.id],
        affectedResourceNames: [`#${channel.name}`, parent.name],
        evidence: [
          {
            field: "category.visibility.accessibleToUser",
            actualValue: "false",
            explanation: "Parent category is configured as restricted.",
          },
          {
            field: "channel.visibilityAnalysis.everyoneCanView",
            actualValue: "true",
            expectedValue: "false",
            explanation: "Channel override negates the category restriction.",
          },
        ],
        recommendation: `Sync permissions of #${channel.name} with "${parent.name}" or remove the VIEW_CHANNEL allow override for @everyone.`,
        confidence: "high",
        status: "confirmed",
        detectedAt,
      });
    } else if (vis.isCategorySynced === false && vis.hasChannelOverrides) {
      // Subcase D2: Unsynchronized category (Informational / Needs Review)
      findings.push({
        id: `sec-cat-unsynced-${channel.id}`,
        ruleId: "RULE_D_CATEGORY_UNSYNCED",
        title: `Channel #${channel.name} Permissions Differ from Category "${parent.name}"`,
        description: `Channel #${channel.name} has custom permission overrides and is not synchronized with its parent category "${parent.name}".`,
        severity: "low",
        category: "consistency",
        affectedResourceIds: [channel.id, parent.id],
        affectedResourceNames: [`#${channel.name}`, parent.name],
        evidence: [
          {
            field: "channel.visibilityAnalysis.isCategorySynced",
            actualValue: "false",
            expectedValue: "true",
            explanation: "Channel permissions diverge from the parent category defaults.",
          },
        ],
        recommendation: "Ensure this permission divergence is intentional. If not, click 'Sync Permissions' in Discord channel settings.",
        confidence: isPartialScan ? "medium" : "high",
        status: "needs-review",
        detectedAt,
      });
    }
  }
}

/**
 * RULE E: Role Configuration & Hierarchy
 */
function auditRoleConfiguration(
  blueprint: ServerBlueprint,
  findings: SecurityFinding[],
  detectedAt: number,
  isPartialScan: boolean
) {
  const roles = blueprint.roles;

  // E1: Roles with dangerous management permissions (MANAGE_GUILD, MANAGE_ROLES, BAN_MEMBERS, etc.)
  const MANAGEMENT_FLAGS: (keyof typeof DISCORD_PERMISSIONS)[] = [
    "MANAGE_GUILD",
    "MANAGE_ROLES",
    "MANAGE_CHANNELS",
    "BAN_MEMBERS",
    "MANAGE_WEBHOOKS",
  ];

  for (const role of roles) {
    if (role.name.toLowerCase() === "@everyone" || role.position === 0) continue;
    const bitfield = permissionsToBitfield(role.permissions);

    // If @everyone has any high-impact management permission
    // (Checked separately if @everyone has them)
    const dangerousPerms = MANAGEMENT_FLAGS.filter((flag) => hasPermission(bitfield, flag));

    // If a low-position role has 3 or more management permissions
    if (dangerousPerms.length >= 3 && !hasPermission(bitfield, "ADMINISTRATOR")) {
      findings.push({
        id: `sec-role-broad-mgmt-${role.id}`,
        ruleId: "RULE_E_BROAD_ROLE_PERMISSIONS",
        title: `Broad Management Permissions on Role "${role.name}"`,
        description: `Role "${role.name}" possesses multiple high-impact management permissions (${dangerousPerms.join(", ")}).`,
        severity: "medium",
        category: "roles",
        affectedResourceIds: [role.id],
        affectedResourceNames: [role.name],
        evidence: [
          {
            field: "role.permissions",
            actualValue: dangerousPerms.join(", "),
            explanation: "Role grants extensive server management capabilities without Administrator tag.",
          },
        ],
        recommendation: "Review whether all members holding this role require full channel/role/webhook management authority.",
        confidence: isPartialScan ? "medium" : "high",
        status: "needs-review",
        detectedAt,
      });
    }
  }

  // E2: Duplicate-looking Role Names
  const seenNames = new Map<string, Role[]>();
  for (const role of roles) {
    const norm = role.name.trim().toLowerCase();
    if (!seenNames.has(norm)) seenNames.set(norm, []);
    seenNames.get(norm)!.push(role);
  }

  for (const [normName, matchingRoles] of seenNames.entries()) {
    if (matchingRoles.length > 1) {
      findings.push({
        id: `sec-role-dup-name-${matchingRoles.map((r) => r.id).sort().join("-")}`,
        ruleId: "RULE_E_DUPLICATE_ROLE_NAMES",
        title: `Duplicate Role Names Detected ("${normName}")`,
        description: `Found ${matchingRoles.length} roles with identical or near-identical names: ${matchingRoles.map((r) => `"${r.name}" (pos: ${r.position})`).join(", ")}. Duplicate role names create confusion during moderation and permission audits.`,
        severity: "medium",
        category: "roles",
        affectedResourceIds: matchingRoles.map((r) => r.id),
        affectedResourceNames: matchingRoles.map((r) => r.name),
        evidence: [
          {
            field: "roles.filter(name === normName)",
            actualValue: `${matchingRoles.length} roles found`,
            expectedValue: "1 unique role name",
            explanation: "Multiple roles share the same name.",
          },
        ],
        recommendation: "Rename or merge the duplicate roles in Server Settings > Roles.",
        confidence: "high",
        status: "confirmed",
        detectedAt,
      });
    }
  }
}

/**
 * RULE F: Uncategorized Channels
 */
function auditUncategorizedChannels(
  blueprint: ServerBlueprint,
  findings: SecurityFinding[],
  detectedAt: number
) {
  const uncategorized = blueprint.channels.filter(
    (c) => c.type !== "category" && (!c.parentId || c.parentId.trim() === "")
  );

  if (uncategorized.length > 0) {
    findings.push({
      id: `sec-org-uncat-${uncategorized.map((c) => c.id).slice(0, 5).join("-")}`,
      ruleId: "RULE_F_UNCATEGORIZED_CHANNELS",
      title: `${uncategorized.length} Channel(s) Outside Category Hierarchy`,
      description: `Detected ${uncategorized.length} channel(s) that do not belong to any category (${uncategorized.slice(0, 4).map((c) => `#${c.name}`).join(", ")}${uncategorized.length > 4 ? ` +${uncategorized.length - 4} more` : ""}). Channels without categories do not inherit standardized permissions and can lead to accidental exposure.`,
      severity: "low",
      category: "organization",
      affectedResourceIds: uncategorized.map((c) => c.id),
      affectedResourceNames: uncategorized.map((c) => `#${c.name}`),
      evidence: [
        {
          field: "channels.filter(parentId == null).length",
          actualValue: `${uncategorized.length} channel(s)`,
          expectedValue: "0 uncategorized channels",
          explanation: "All channels should belong to a designated category for consistent permissions.",
        },
      ],
      recommendation: "Group these channels into relevant categories to ensure consistent permission inheritance.",
      confidence: "high",
      status: "confirmed",
      detectedAt,
    });
  }
}

/**
 * RULE G: Naming and Structure
 */
function auditNamingAndStructure(
  blueprint: ServerBlueprint,
  findings: SecurityFinding[],
  detectedAt: number
) {
  // G1: Empty Categories
  const categoryChannelCounts: Record<string, number> = {};
  for (const cat of blueprint.categories) {
    categoryChannelCounts[cat.id] = 0;
  }
  for (const channel of blueprint.channels) {
    if (channel.parentId && categoryChannelCounts[channel.parentId] !== undefined) {
      categoryChannelCounts[channel.parentId]++;
    }
  }

  for (const cat of blueprint.categories) {
    if (categoryChannelCounts[cat.id] === 0) {
      findings.push({
        id: `sec-struct-empty-cat-${cat.id}`,
        ruleId: "RULE_G_EMPTY_CATEGORY",
        title: `Empty Category "${cat.name}"`,
        description: `Category "${cat.name}" contains 0 active channels. Empty categories create visual clutter and navigational confusion for community members.`,
        severity: "informational",
        category: "organization",
        affectedResourceIds: [cat.id],
        affectedResourceNames: [cat.name],
        evidence: [
          {
            field: "category.channelCount",
            actualValue: "0",
            expectedValue: ">= 1 channel",
            explanation: "Categories should house at least one active channel.",
          },
        ],
        recommendation: "Populate this category with relevant channels or delete it if no longer needed.",
        confidence: "high",
        status: "confirmed",
        detectedAt,
      });
    }
  }

  // G2: Duplicate channel names within the same type & parent
  const channelPairs = new Map<string, Channel[]>();
  for (const channel of blueprint.channels) {
    if (channel.type === "category") continue;
    const key = `${channel.parentId || "root"}:${channel.type}:${channel.name.toLowerCase()}`;
    if (!channelPairs.has(key)) channelPairs.set(key, []);
    channelPairs.get(key)!.push(channel);
  }

  for (const [, duplicates] of channelPairs.entries()) {
    if (duplicates.length > 1) {
      const first = duplicates[0];
      findings.push({
        id: `sec-struct-dup-chan-${duplicates.map((c) => c.id).join("-")}`,
        ruleId: "RULE_G_DUPLICATE_CHANNEL_NAMES",
        title: `Duplicate Channel Name "#${first.name}" in Same Section`,
        description: `Found ${duplicates.length} channels named "#${first.name}" of the same type within the same section. This causes user confusion and misdirected messages.`,
        severity: "low",
        category: "organization",
        affectedResourceIds: duplicates.map((c) => c.id),
        affectedResourceNames: duplicates.map((c) => `#${c.name}`),
        evidence: [
          {
            field: "channels.filter(sameNameAndCategory)",
            actualValue: `${duplicates.length} duplicate channels`,
            expectedValue: "1 unique channel name",
            explanation: "Channels in the same category should have distinct names.",
          },
        ],
        recommendation: "Rename or merge duplicate channels.",
        confidence: "high",
        status: "confirmed",
        detectedAt,
      });
    }
  }
}

/**
 * RULE H: Voice Channel Access
 */
function auditVoiceChannels(
  blueprint: ServerBlueprint,
  findings: SecurityFinding[],
  detectedAt: number,
  _isPartialScan: boolean
) {
  for (const channel of blueprint.channels) {
    // Check stage channels for unrestricted SPEAK
    if (channel.type === "stage" && channel.permissions) {
      const everyoneOw = channel.permissions.find(
        (o) => o.id === "@everyone" || o.id === blueprint.server.id
      );
      if (everyoneOw && everyoneOw.allow.some((p) => p.toUpperCase().includes("SPEAK"))) {
        findings.push({
          id: `sec-voice-stage-speak-${channel.id}`,
          ruleId: "RULE_H_STAGE_PUBLIC_SPEAK",
          title: `Stage Channel #${channel.name} Allows @everyone to Speak Directly`,
          description: `Stage channel #${channel.name} has SPEAK granted directly to @everyone. Stage channels are designed for structured events where audience members must request to speak to prevent disruptive audio raids.`,
          severity: "medium",
          category: "voice",
          affectedResourceIds: [channel.id],
          affectedResourceNames: [`#${channel.name}`],
          evidence: [
            {
              field: "stage_channel.permissions.@everyone.allow",
              actualValue: "SPEAK",
              expectedValue: "DENY or REQUEST_TO_SPEAK",
              explanation: "Public stage channels should require speaker approval.",
            },
          ],
          recommendation: "Revoke SPEAK from @everyone in stage channel permissions.",
          confidence: "high",
          status: "confirmed",
          detectedAt,
        });
      }
    }
  }
}

/**
 * RULE I: Scan Quality & Completeness Integration
 */
function auditScanQuality(
  scanQuality: ScanQualityReport | null,
  findings: SecurityFinding[],
  detectedAt: number
) {
  if (!scanQuality) {
    findings.push({
      id: "sec-quality-missing",
      ruleId: "RULE_I_SCAN_QUALITY_MISSING",
      title: "Scan Reliability Report Unavailable",
      description: "No scan quality telemetry was attached to this blueprint. Findings should be reviewed manually.",
      severity: "low",
      category: "data-quality",
      affectedResourceIds: [],
      affectedResourceNames: [],
      evidence: [
        {
          field: "blueprint.scanQuality",
          actualValue: "null / undefined",
          expectedValue: "ScanQualityReport object",
          explanation: "Telemetry metadata helps establish audit confidence.",
        },
      ],
      recommendation: "Re-scan the server to generate a complete verification report.",
      confidence: "low",
      status: "insufficient-data",
      detectedAt,
    });
    return;
  }

  if (scanQuality.permissionDataQuality !== "full" || scanQuality.completenessScore < 60) {
    findings.push({
      id: "sec-quality-incomplete-permissions",
      ruleId: "RULE_I_INCOMPLETE_SCAN",
      title: `Scan Data Incomplete (${scanQuality.completenessScore}% Completeness)`,
      description: `The blueprint was collected via ${scanQuality.source} with ${scanQuality.permissionDataQuality} permission quality. Hidden channels, private thread overwrites, or internal staff settings may not be visible in DOM-only scans. An audit with 0 findings does not guarantee full security.`,
      severity: "medium",
      category: "data-quality",
      affectedResourceIds: [],
      affectedResourceNames: [],
      evidence: [
        {
          field: "scanQuality.permissionDataQuality",
          actualValue: scanQuality.permissionDataQuality,
          expectedValue: "full",
          explanation: "Full API permissions are required for guaranteed audit certainty.",
        },
        {
          field: "scanQuality.completenessScore",
          actualValue: `${scanQuality.completenessScore}%`,
          expectedValue: ">= 80%",
          explanation: "Lower completeness score reduces finding certainty.",
        },
      ],
      recommendation:
        "For critical security reviews, authenticate an authorized bot or admin account with full GUILD permissions.",
      confidence: "high",
      status: "needs-review",
      detectedAt,
    });
  }
}

// ── Health Score Calculation ───────────────────

function calculateHealthScore(findings: SecurityFinding[], isPartialScan: boolean): number {
  let score = 100;

  for (const f of findings) {
    switch (f.severity) {
      case "critical":
        score -= 25;
        break;
      case "high":
        score -= 12;
        break;
      case "medium":
        score -= 5;
        break;
      case "low":
        score -= 2;
        break;
      case "informational":
        // No penalty for informational findings
        break;
    }
  }

  // Slight penalty for incomplete scan baseline
  if (isPartialScan) {
    score -= 5;
  }

  return Math.max(0, Math.min(100, score));
}

function calculateGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 65) return "C";
  if (score >= 50) return "D";
  return "F";
}

