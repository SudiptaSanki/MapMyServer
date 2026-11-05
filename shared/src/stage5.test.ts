import { describe, it, expect } from "vitest";
import {
  blueprintToTemplate,
  validateTemplate,
  CURATED_TEMPLATES,
  generateDiscordJsScript,
  generateDiscordPyScript,
  generateChangeExecutionPlan,
  detectArchitectureChanges,
  type ServerBlueprint,
  type BlueprintSnapshot,
  type Category,
  type Channel,
  type Role,
} from "./index";

function createMockBlueprint(overrides?: Partial<ServerBlueprint>): ServerBlueprint {
  const defaultCategory: Category = {
    id: "cat-public",
    name: "General Community",
    position: 0,
    channelIds: ["ch-welcome"],
    visibility: {
      source: "discord-api",
      accessibleToUser: true,
      observedAt: new Date().toISOString(),
    },
  };

  const staffCategory: Category = {
    id: "cat-staff",
    name: "Staff Confidential",
    position: 1,
    channelIds: ["ch-secret"],
    visibility: {
      source: "discord-api",
      accessibleToUser: false,
      observedAt: new Date().toISOString(),
    },
  };

  const defaultChannels: Channel[] = [
    {
      id: "ch-welcome",
      name: "welcome-and-rules",
      type: "text",
      position: 0,
      parentId: "cat-public",
      topic: "Welcome rules",
      visibility: {
        source: "discord-api",
        accessibleToUser: true,
        observedAt: new Date().toISOString(),
      },
      visibilityAnalysis: {
        classification: "broadly-accessible",
        everyoneCanView: true,
        rolesWithAccess: ["@everyone", "Member"],
        isCategorySynced: true,
        hasChannelOverrides: false,
        currentUserCanAccess: true,
        reason: "Public channel",
      },
    },
    {
      id: "ch-secret",
      name: "admin-hq",
      type: "text",
      position: 1,
      parentId: "cat-staff",
      topic: "Confidential strategy",
      visibility: {
        source: "discord-api",
        accessibleToUser: false,
        observedAt: new Date().toISOString(),
      },
      visibilityAnalysis: {
        classification: "role-restricted",
        everyoneCanView: false,
        rolesWithAccess: ["Admin"],
        isCategorySynced: true,
        hasChannelOverrides: true,
        currentUserCanAccess: false,
        reason: "Restricted to Admin",
      },
    },
  ];

  const defaultRoles: Role[] = [
    {
      id: "role-0",
      name: "@everyone",
      position: 0,
      permissions: ["VIEW_CHANNEL", "SEND_MESSAGES"],
      mentionable: false,
      hoist: false,
      visibility: {
        source: "discord-api",
        accessibleToUser: true,
        observedAt: new Date().toISOString(),
      },
    },
    {
      id: "role-admin",
      name: "Admin",
      position: 10,
      color: "#ff0000",
      permissions: ["ADMINISTRATOR"],
      mentionable: true,
      hoist: true,
      visibility: {
        source: "discord-api",
        accessibleToUser: true,
        observedAt: new Date().toISOString(),
      },
    },
  ];

  return {
    version: 1,
    server: {
      id: "guild-123456",
      name: "Acme Engineering",
      description: "Engineering team server",
      memberCount: 42,
      visibility: {
        source: "discord-api",
        accessibleToUser: true,
        observedAt: new Date().toISOString(),
      },
    },
    categories: [defaultCategory, staffCategory],
    channels: defaultChannels,
    threads: [],
    roles: defaultRoles,
    statistics: {
      categories: 2,
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
      channelsPerCategory: { "cat-public": 1, "cat-staff": 1 },
      channelsWithTopics: 2,
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
      resourcesDiscovered: { categories: 2, channels: 2, roles: 2, threads: 0 },
      resourcesParsed: { categories: 2, channels: 2, roles: 2, threads: 0 },
      resourcesSkipped: 0,
      permissionDataQuality: "full",
      completenessScore: 100,
      missingDataWarnings: [],
    },
    collectedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("Stage 5: Template Models & Converter", () => {
  it("converts a server blueprint to a template including all channels by default", () => {
    const bp = createMockBlueprint();
    const template = blueprintToTemplate(bp);

    expect(template.name).toBe("Acme Engineering Template");
    expect(template.categories.length).toBe(2);
    expect(template.roles.length).toBe(1); // Excludes @everyone
    expect(template.roles[0].name).toBe("Admin");

    const validation = validateTemplate(template);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it("sanitizes private/staff channels when excludePrivateStaff is true", () => {
    const bp = createMockBlueprint();
    const sanitized = blueprintToTemplate(bp, { excludePrivateStaff: true });

    // cat-staff was marked accessibleToUser: false
    expect(sanitized.categories.some((c) => c.name === "Staff Confidential")).toBe(false);
    // Only public channel remains
    const allChannels = sanitized.categories.flatMap((c) => c.channels);
    expect(allChannels.some((c) => c.name === "admin-hq")).toBe(false);
    expect(allChannels.some((c) => c.name === "welcome-and-rules")).toBe(true);
  });

  it("validates template schema and flags malformed data", () => {
    expect(validateTemplate(null).valid).toBe(false);
    expect(validateTemplate({}).valid).toBe(false);
    expect(validateTemplate({ name: "", category: "gaming", categories: [] }).valid).toBe(false);
    expect(
      validateTemplate({
        name: "My Server",
        category: "gaming",
        categories: [{ name: "Cat1", position: 0, channels: "not-an-array" as any }],
      }).valid
    ).toBe(false);
  });
});

describe("Stage 5: Curated Template Gallery", () => {
  it("ships all 9 core server templates across distinct domains", () => {
    expect(CURATED_TEMPLATES).toHaveLength(9);

    const categories = new Set(CURATED_TEMPLATES.map((t) => t.category));
    expect(categories.has("developer")).toBe(true);
    expect(categories.has("opensource")).toBe(true);
    expect(categories.has("gaming")).toBe(true);
    expect(categories.has("creator")).toBe(true);
    expect(categories.has("startup")).toBe(true);
    expect(categories.has("support")).toBe(true);
    expect(categories.has("education")).toBe(true);
    expect(categories.has("organization")).toBe(true);
    expect(categories.has("community")).toBe(true);
  });

  it("ensures every curated template passes strict schema validation", () => {
    for (const template of CURATED_TEMPLATES) {
      const result = validateTemplate(template);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(template.categories.length).toBeGreaterThan(0);
    }
  });
});

describe("Stage 5: Discord Automation Script Generator", () => {
  it("generates production discord.js v14 script with dry-run and idempotency", () => {
    const bp = createMockBlueprint();
    const script = generateDiscordJsScript(bp, { dryRun: true });

    expect(script).toContain("const { Client, GatewayIntentBits");
    expect(script).toContain("process.env.DISCORD_BOT_TOKEN");
    expect(script).toContain("IS_DRY_RUN");
    expect(script).toContain("guild.channels.cache.find");
    expect(script).toContain("sleep(");
  });

  it("generates production discord.py v2 script with dry-run and idempotency", () => {
    const bp = createMockBlueprint();
    const script = generateDiscordPyScript(bp, { dryRun: false });

    expect(script).toContain("import discord");
    expect(script).toContain("os.getenv(\"DISCORD_BOT_TOKEN\")");
    expect(script).toContain("\"--dry-run\" in sys.argv");
    expect(script).toContain("discord.utils.get(guild.channels");
    expect(script).toContain("asyncio.sleep");
  });
});

describe("Stage 5: Safe Change Application Planner", () => {
  it("produces an ordered atomic execution plan with dependencies and safeguards", () => {
    const current = createMockBlueprint();
    const targetTemplate = CURATED_TEMPLATES[0]; // Developer community template

    const plan = generateChangeExecutionPlan(current, targetTemplate);

    expect(plan.totalOperations).toBeGreaterThan(0);
    expect(plan.requiredBotPermissions).toContain("MANAGE_CHANNELS");

    // Verify category operations have no channel dependencies
    const categoryOps = plan.operations.filter((op) => op.type === "CREATE_CATEGORY");
    for (const catOp of categoryOps) {
      expect(catOp.dependencies).toHaveLength(0);
    }

    // Verify channel creation ops depend on their category
    const channelOps = plan.operations.filter((op) => op.type === "CREATE_CHANNEL" && op.categoryName);
    for (const chOp of channelOps) {
      if (chOp.categoryName) {
        const matchingCatOp = categoryOps.find((c) => c.resourceName === chOp.categoryName);
        if (matchingCatOp) {
          expect(chOp.dependencies).toContain(matchingCatOp.id);
        }
      }
    }
  });
});

describe("Stage 5: Architecture Change Monitor", () => {
  it("returns empty array when previous snapshot is not provided", () => {
    const current = createMockBlueprint();
    const changes = detectArchitectureChanges(current, null);
    expect(changes).toEqual([]);
  });

  it("detects channel additions and classifies confidence properly", () => {
    const prev = createMockBlueprint();
    const snapshot: BlueprintSnapshot = {
      id: "snap-1",
      serverId: prev.server.id,
      createdAt: new Date().toISOString(),
      label: "Initial",
      blueprint: prev,
    };

    // New blueprint with an extra channel
    const current = createMockBlueprint();
    current.channels.push({
      id: "ch-announcements",
      name: "announcements",
      type: "announcement",
      position: 2,
      parentId: "cat-public",
      visibility: {
        source: "discord-api",
        accessibleToUser: true,
        observedAt: new Date().toISOString(),
      },
      visibilityAnalysis: {
        classification: "broadly-accessible",
        everyoneCanView: true,
        rolesWithAccess: ["@everyone"],
        isCategorySynced: true,
        hasChannelOverrides: false,
        currentUserCanAccess: true,
        reason: "Public announcement channel",
      },
    });

    const changes = detectArchitectureChanges(current, snapshot);
    expect(changes.length).toBeGreaterThan(0);
    const addedChan = changes.find((c) => c.resourceName === "#announcements");
    expect(addedChan).toBeDefined();
    expect(addedChan?.changeType).toBe("channel-added");
    expect(addedChan?.confidence).toBe("confirmed");
  });

  it("flags missing channels in partial scans as possible-incomplete-scan confidence", () => {
    const prev = createMockBlueprint();
    const snapshot: BlueprintSnapshot = {
      id: "snap-1",
      serverId: prev.server.id,
      createdAt: new Date().toISOString(),
      label: "Initial",
      blueprint: prev,
    };

    // Blueprint missing 'welcome-and-rules' with poor scan quality
    const partialCurrent = createMockBlueprint({
      scanQuality: {
        scanStartTime: new Date().toISOString(),
        scanEndTime: new Date().toISOString(),
        durationMs: 500,
        source: "discord-api",
        resourcesDiscovered: { categories: 1, channels: 1, roles: 2, threads: 0 },
        resourcesParsed: { categories: 1, channels: 1, roles: 2, threads: 0 },
        resourcesSkipped: 0,
        permissionDataQuality: "partial",
        completenessScore: 40,
        missingDataWarnings: ["Partial scan"],
      },
    });
    partialCurrent.channels = partialCurrent.channels.filter((c) => c.id !== "ch-welcome");

    const changes = detectArchitectureChanges(partialCurrent, snapshot);
    const event = changes.find((c) => c.resourceName === "#welcome-and-rules");
    expect(event?.changeType).toBe("channel-removed");
    expect(event?.confidence).toBe("possible-incomplete-scan");
  });
});
