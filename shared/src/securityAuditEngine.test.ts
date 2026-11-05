import { describe, it, expect } from "vitest";
import { runSecurityAudit } from "./securityAuditEngine";
import type { ServerBlueprint, Role, Channel, Category } from "./index";

function createMockBlueprint(overrides?: Partial<ServerBlueprint>): ServerBlueprint {
  const defaultServer = {
    id: "guild-123456",
    name: "Test Community Server",
    icon: undefined,
    memberCount: 500,
    visibility: {
      source: "discord-api" as const,
      accessibleToUser: true,
      observedAt: new Date().toISOString(),
    },
  };

  const defaultCategory: Category = {
    id: "cat-general",
    name: "General Discussions",
    position: 0,
    channelIds: ["chan-general", "chan-rules"],
    visibility: {
      source: "discord-api",
      accessibleToUser: true,
      observedAt: new Date().toISOString(),
    },
  };

  const defaultChannels: Channel[] = [
    {
      id: "chan-general",
      name: "general",
      type: "text",
      parentId: "cat-general",
      position: 0,
      visibility: {
        source: "discord-api",
        accessibleToUser: true,
        observedAt: new Date().toISOString(),
      },
      visibilityAnalysis: {
        classification: "broadly-accessible",
        everyoneCanView: true,
        rolesWithAccess: ["Member"],
        isCategorySynced: true,
        hasChannelOverrides: false,
        currentUserCanAccess: true,
        reason: "Broadly accessible to all members.",
      },
    },
    {
      id: "chan-rules",
      name: "rules",
      type: "text",
      parentId: "cat-general",
      position: 1,
      visibility: {
        source: "discord-api",
        accessibleToUser: true,
        observedAt: new Date().toISOString(),
      },
      visibilityAnalysis: {
        classification: "broadly-accessible",
        everyoneCanView: true,
        rolesWithAccess: ["Member"],
        isCategorySynced: true,
        hasChannelOverrides: false,
        currentUserCanAccess: true,
        reason: "Public announcement channel.",
      },
    },
  ];

  const defaultRoles: Role[] = [
    {
      id: "role-everyone",
      name: "@everyone",
      position: 0,
      permissions: ["VIEW_CHANNEL", "SEND_MESSAGES", "READ_MESSAGE_HISTORY"],
      visibility: {
        source: "discord-api",
        accessibleToUser: true,
        observedAt: new Date().toISOString(),
      },
    },
    {
      id: "role-admin",
      name: "Server Admin",
      position: 10,
      permissions: ["ADMINISTRATOR"],
      visibility: {
        source: "discord-api",
        accessibleToUser: true,
        observedAt: new Date().toISOString(),
      },
    },
  ];

  return {
    server: defaultServer,
    categories: [defaultCategory],
    channels: defaultChannels,
    threads: [],
    roles: defaultRoles,
    statistics: {
      categories: 1,
      textChannels: 2,
      voiceChannels: 0,
      stageChannels: 0,
      forumChannels: 0,
      announcementChannels: 0,
      mediaChannels: 0,
      threads: 0,
      activeThreads: 0,
      archivedThreads: 0,
      roles: 2,
      totalChannels: 2,
      channelsPerCategory: { "cat-general": 2 },
      channelsWithTopics: 0,
      channelsWithContent: 0,
      channelsWithPurpose: 0,
      purposeDistribution: {
        ONBOARDING: 0,
        GOVERNANCE: 0,
        INFORMATION: 0,
        COMMUNITY: 0,
        SUPPORT: 0,
        KNOWLEDGE: 0,
        EVENTS: 0,
        TEAM: 0,
        INTERNAL: 0,
        SHOWCASE: 0,
        FEEDBACK: 0,
        OTHER: 0,
      },
    },
    scanQuality: {
      scanStartTime: new Date().toISOString(),
      scanEndTime: new Date().toISOString(),
      durationMs: 500,
      source: "discord-api",
      resourcesDiscovered: { categories: 1, channels: 2, roles: 2, threads: 0 },
      resourcesParsed: { categories: 1, channels: 2, roles: 2, threads: 0 },
      resourcesSkipped: 0,
      permissionDataQuality: "full",
      completenessScore: 100,
      missingDataWarnings: [],
    },
    collectedAt: new Date().toISOString(),
    version: 1,
    ...overrides,
  };
}

describe("SecurityAuditEngine", () => {
  it("detects when @everyone has ADMINISTRATOR (critical)", () => {
    const bp = createMockBlueprint({
      roles: [
        {
          id: "role-everyone",
          name: "@everyone",
          position: 0,
          permissions: ["ADMINISTRATOR"],
          visibility: { source: "discord-api", accessibleToUser: true, observedAt: "" },
        },
      ],
    });

    const report = runSecurityAudit(bp);
    const criticalAdmin = report.findings.find((f) => f.ruleId === "RULE_A_ADMIN_EVERYONE");
    expect(criticalAdmin).toBeDefined();
    expect(criticalAdmin?.severity).toBe("critical");
    expect(criticalAdmin?.status).toBe("confirmed");
    expect(report.score).toBeLessThanOrEqual(75);
  });

  it("flags multiple administrator roles as medium severity", () => {
    const bp = createMockBlueprint({
      roles: [
        { id: "r1", name: "Admin 1", position: 5, permissions: ["ADMINISTRATOR"], visibility: { source: "discord-api", accessibleToUser: true, observedAt: "" } },
        { id: "r2", name: "Admin 2", position: 6, permissions: ["ADMINISTRATOR"], visibility: { source: "discord-api", accessibleToUser: true, observedAt: "" } },
        { id: "r3", name: "Admin 3", position: 7, permissions: ["ADMINISTRATOR"], visibility: { source: "discord-api", accessibleToUser: true, observedAt: "" } },
      ],
    });

    const report = runSecurityAudit(bp);
    const multiAdmin = report.findings.find((f) => f.ruleId === "RULE_A_MULTIPLE_ADMIN_ROLES");
    expect(multiAdmin).toBeDefined();
    expect(multiAdmin?.severity).toBe("medium");
    expect(multiAdmin?.affectedResourceNames.length).toBe(3);
  });

  it("detects publicly exposed staff channels (critical)", () => {
    const bp = createMockBlueprint({
      channels: [
        {
          id: "chan-mod-chat",
          name: "mod-discussion",
          type: "text",
          parentId: "cat-general",
          position: 0,
          visibility: { source: "discord-api", accessibleToUser: true, observedAt: "" },
          visibilityAnalysis: {
            classification: "broadly-accessible",
            everyoneCanView: true,
            rolesWithAccess: ["@everyone"],
            isCategorySynced: true,
            hasChannelOverrides: false,
            currentUserCanAccess: true,
            reason: "Public access",
          },
        },
      ],
    });

    const report = runSecurityAudit(bp);
    const exposedStaff = report.findings.find((f) => f.ruleId === "RULE_C_STAFF_CHANNEL_EXPOSED");
    expect(exposedStaff).toBeDefined();
    expect(exposedStaff?.severity).toBe("critical");
    expect(exposedStaff?.affectedResourceNames).toContain("#mod-discussion");
  });

  it("marks properly restricted staff channels as informational", () => {
    const bp = createMockBlueprint({
      channels: [
        {
          id: "chan-admin-logs",
          name: "admin-logs",
          type: "text",
          parentId: "cat-general",
          position: 0,
          visibility: { source: "discord-api", accessibleToUser: true, observedAt: "" },
          visibilityAnalysis: {
            classification: "role-restricted",
            everyoneCanView: false,
            rolesWithAccess: ["Server Admin"],
            isCategorySynced: true,
            hasChannelOverrides: true,
            currentUserCanAccess: true,
            reason: "Staff only",
          },
        },
      ],
    });

    const report = runSecurityAudit(bp);
    const protectedStaff = report.findings.find((f) => f.ruleId === "RULE_C_STAFF_CHANNEL_PROTECTED");
    expect(protectedStaff).toBeDefined();
    expect(protectedStaff?.severity).toBe("informational");
  });

  it("detects category leak when a child channel overrides a private category to public", () => {
    const bp = createMockBlueprint({
      categories: [
        {
          id: "cat-staff",
          name: "Staff Area",
          position: 1,
          channelIds: ["chan-leak"],
          visibility: { source: "discord-api", accessibleToUser: false, observedAt: "" },
        },
      ],
      channels: [
        {
          id: "chan-leak",
          name: "internal-notes",
          type: "text",
          parentId: "cat-staff",
          position: 0,
          visibility: { source: "discord-api", accessibleToUser: true, observedAt: "" },
          visibilityAnalysis: {
            classification: "broadly-accessible",
            everyoneCanView: true,
            rolesWithAccess: ["@everyone"],
            isCategorySynced: false,
            hasChannelOverrides: true,
            currentUserCanAccess: true,
            reason: "Overridden to allow everyone",
          },
        },
      ],
    });

    const report = runSecurityAudit(bp);
    const leakFinding = report.findings.find((f) => f.ruleId === "RULE_D_CATEGORY_LEAK");
    expect(leakFinding).toBeDefined();
    expect(leakFinding?.severity).toBe("high");
  });

  it("flags uncategorized channels as organization findings", () => {
    const bp = createMockBlueprint({
      channels: [
        {
          id: "chan-loose",
          name: "unassigned-channel",
          type: "text",
          parentId: null,
          position: 0,
          visibility: { source: "discord-api", accessibleToUser: true, observedAt: "" },
        },
      ],
    });

    const report = runSecurityAudit(bp);
    const uncatFinding = report.findings.find((f) => f.ruleId === "RULE_F_UNCATEGORIZED_CHANNELS");
    expect(uncatFinding).toBeDefined();
    expect(uncatFinding?.category).toBe("organization");
    expect(uncatFinding?.severity).toBe("low");
  });

  it("detects empty categories and duplicate channel names", () => {
    const bp = createMockBlueprint({
      categories: [
        { id: "cat-empty", name: "Empty Category", position: 2, channelIds: [], visibility: { source: "discord-api", accessibleToUser: true, observedAt: "" } },
        { id: "cat-active", name: "Active Section", position: 3, channelIds: ["c1", "c2"], visibility: { source: "discord-api", accessibleToUser: true, observedAt: "" } },
      ],
      channels: [
        { id: "c1", name: "announcements", type: "text", parentId: "cat-active", position: 0, visibility: { source: "discord-api", accessibleToUser: true, observedAt: "" } },
        { id: "c2", name: "announcements", type: "text", parentId: "cat-active", position: 1, visibility: { source: "discord-api", accessibleToUser: true, observedAt: "" } },
      ],
    });

    const report = runSecurityAudit(bp);
    const emptyCat = report.findings.find((f) => f.ruleId === "RULE_G_EMPTY_CATEGORY");
    expect(emptyCat).toBeDefined();

    const dupChan = report.findings.find((f) => f.ruleId === "RULE_G_DUPLICATE_CHANNEL_NAMES");
    expect(dupChan).toBeDefined();
    expect(dupChan?.affectedResourceNames.length).toBe(2);
  });

  it("handles incomplete scan telemetry gracefully with needs-review status", () => {
    const bp = createMockBlueprint({
      scanQuality: {
        scanStartTime: "",
        scanEndTime: "",
        durationMs: 100,
        source: "page-visible",
        resourcesDiscovered: { categories: 1, channels: 2, roles: 1, threads: 0 },
        resourcesParsed: { categories: 1, channels: 1, roles: 1, threads: 0 },
        resourcesSkipped: 1,
        permissionDataQuality: "partial",
        completenessScore: 45,
        missingDataWarnings: ["DOM scroll incomplete"],
      },
    });

    const report = runSecurityAudit(bp);
    const incompleteScan = report.findings.find((f) => f.ruleId === "RULE_I_INCOMPLETE_SCAN");
    expect(incompleteScan).toBeDefined();
    expect(incompleteScan?.status).toBe("needs-review");
  });

  it("generates deterministic finding IDs across multiple runs", () => {
    const bp = createMockBlueprint();
    const run1 = runSecurityAudit(bp);
    const run2 = runSecurityAudit(bp);

    expect(run1.findings.map((f) => f.id)).toEqual(run2.findings.map((f) => f.id));
    expect(run1.score).toBe(run2.score);
    expect(run1.grade).toBe(run2.grade);
  });
});
