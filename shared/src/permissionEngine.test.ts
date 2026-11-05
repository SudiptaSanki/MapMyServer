import { describe, it, expect } from "vitest";
import {
  DISCORD_PERMISSIONS,
  permissionsToBitfield,
  bitfieldToPermissions,
  hasPermission,
  computeEffectivePermissions,
  evaluateChannelVisibility,
  checkCategorySync,
} from "./permissionEngine";
import type { Channel, Category, Role } from "./index";

describe("Discord Permission Engine", () => {
  const dummyVisibility = {
    source: "discord-api" as const,
    accessibleToUser: true,
    observedAt: new Date().toISOString(),
  };

  const createRole = (id: string, name: string, permissions: string[], position: number): Role => ({
    id,
    name,
    position,
    permissions,
    visibility: dummyVisibility,
  });

  const createChannel = (id: string, name: string, parentId: string | null = null): Channel => ({
    id,
    name,
    type: "text",
    parentId,
    position: 0,
    visibility: dummyVisibility,
  });

  it("converts permission names to bitfields and back correctly", () => {
    const perms = ["VIEW_CHANNEL", "SEND_MESSAGES", "CONNECT"];
    const bitfield = permissionsToBitfield(perms);

    expect(hasPermission(bitfield, "VIEW_CHANNEL")).toBe(true);
    expect(hasPermission(bitfield, "SEND_MESSAGES")).toBe(true);
    expect(hasPermission(bitfield, "CONNECT")).toBe(true);
    expect(hasPermission(bitfield, "ADMINISTRATOR")).toBe(false);

    const names = bitfieldToPermissions(bitfield);
    expect(names).toContain("VIEW_CHANNEL");
    expect(names).toContain("SEND_MESSAGES");
    expect(names).toContain("CONNECT");
    expect(names).not.toContain("ADMINISTRATOR");
  });

  it("grants all permissions unconditionally if member has ADMINISTRATOR", () => {
    const adminRole = createRole("r_admin", "Admin", ["ADMINISTRATOR"], 10);
    const everyoneRole = createRole("r_everyone", "@everyone", ["VIEW_CHANNEL"], 0);

    const channel = createChannel("c1", "secret-room");
    // Channel explicitly denies VIEW_CHANNEL to @everyone and to Admin role
    channel.permissions = [
      { id: "r_everyone", type: "role", allow: [], deny: ["VIEW_CHANNEL"] },
      { id: "r_admin", type: "role", allow: [], deny: ["VIEW_CHANNEL"] },
    ];

    const result = computeEffectivePermissions({
      channel,
      guildRoles: [adminRole, everyoneRole],
      memberRoleIds: ["r_admin"],
    });

    expect(result.isAdmin).toBe(true);
    expect(hasPermission(result.bitfield, "VIEW_CHANNEL")).toBe(true);
    expect(hasPermission(result.bitfield, "MANAGE_CHANNELS")).toBe(true);
  });

  it("grants all permissions unconditionally to the guild owner", () => {
    const channel = createChannel("c1", "lockdown");
    channel.permissions = [
      { id: "r_everyone", type: "role", allow: [], deny: ["VIEW_CHANNEL"] },
    ];

    const result = computeEffectivePermissions({
      channel,
      guildRoles: [],
      memberRoleIds: [],
      isGuildOwner: true,
    });

    expect(result.isOwner).toBe(true);
    expect(result.isAdmin).toBe(true);
    expect(hasPermission(result.bitfield, "VIEW_CHANNEL")).toBe(true);
  });

  it("evaluates @everyone overwrites correctly", () => {
    const everyoneRole = createRole("r_everyone", "@everyone", ["VIEW_CHANNEL", "SEND_MESSAGES"], 0);
    const channel = createChannel("c1", "announcements");

    // Deny SEND_MESSAGES to @everyone
    channel.permissions = [
      { id: "r_everyone", type: "role", allow: [], deny: ["SEND_MESSAGES"] },
    ];

    const result = computeEffectivePermissions({
      channel,
      guildRoles: [everyoneRole],
      memberRoleIds: [],
    });

    expect(hasPermission(result.bitfield, "VIEW_CHANNEL")).toBe(true);
    expect(hasPermission(result.bitfield, "SEND_MESSAGES")).toBe(false);
  });

  it("aggregates role overwrites (Allow overrides Deny across different roles)", () => {
    const everyoneRole = createRole("r_everyone", "@everyone", ["VIEW_CHANNEL"], 0);
    const mutedRole = createRole("r_muted", "Muted", [], 1);
    const vipRole = createRole("r_vip", "VIP", [], 2);

    const channel = createChannel("c1", "vip-chat");
    channel.permissions = [
      { id: "r_muted", type: "role", allow: [], deny: ["SEND_MESSAGES"] },
      { id: "r_vip", type: "role", allow: ["SEND_MESSAGES"], deny: [] },
    ];

    // Member has both Muted and VIP roles. In Discord, role allows take precedence over role denies!
    const result = computeEffectivePermissions({
      channel,
      guildRoles: [everyoneRole, mutedRole, vipRole],
      memberRoleIds: ["r_muted", "r_vip"],
    });

    expect(hasPermission(result.bitfield, "SEND_MESSAGES")).toBe(true);
  });

  it("applies member-specific overwrites with highest priority", () => {
    const everyoneRole = createRole("r_everyone", "@everyone", ["VIEW_CHANNEL"], 0);
    const modRole = createRole("r_mod", "Moderator", ["VIEW_CHANNEL"], 2);

    const channel = createChannel("c1", "mod-council");
    channel.permissions = [
      // Mod role allows SEND_MESSAGES
      { id: "r_mod", type: "role", allow: ["SEND_MESSAGES"], deny: [] },
      // Specific member 'u123' has SEND_MESSAGES explicitly denied
      { id: "u123", type: "member", allow: [], deny: ["SEND_MESSAGES"] },
    ];

    const result = computeEffectivePermissions({
      channel,
      guildRoles: [everyoneRole, modRole],
      memberRoleIds: ["r_mod"],
      memberId: "u123",
    });

    // Member-specific deny overrides role allow
    expect(hasPermission(result.bitfield, "SEND_MESSAGES")).toBe(false);
  });

  it("correctly identifies channel visibility classification", () => {
    const everyone = createRole("r_everyone", "@everyone", ["VIEW_CHANNEL"], 0);
    const mod = createRole("r_mod", "Moderator", [], 2);

    // 1. Broadly accessible channel
    const publicChan = createChannel("c1", "general");
    const pubAnalysis = evaluateChannelVisibility(publicChan, null, [everyone, mod]);
    expect(pubAnalysis.classification).toBe("broadly-accessible");
    expect(pubAnalysis.everyoneCanView).toBe(true);

    // 2. Role-restricted channel
    const privateChan = createChannel("c2", "staff-lounge");
    privateChan.permissions = [
      { id: "r_everyone", type: "role", allow: [], deny: ["VIEW_CHANNEL"] },
      { id: "r_mod", type: "role", allow: ["VIEW_CHANNEL"], deny: [] },
    ];
    const privAnalysis = evaluateChannelVisibility(privateChan, null, [everyone, mod]);
    expect(privAnalysis.classification).toBe("role-restricted");
    expect(privAnalysis.everyoneCanView).toBe(false);
    expect(privAnalysis.rolesWithAccess).toContain("Moderator");

    // 3. Member-restricted channel
    const userChan = createChannel("c3", "ticket-001");
    userChan.permissions = [
      { id: "r_everyone", type: "role", allow: [], deny: ["VIEW_CHANNEL"] },
      { id: "u999", type: "member", allow: ["VIEW_CHANNEL"], deny: [] },
    ];
    const userAnalysis = evaluateChannelVisibility(userChan, null, [everyone, mod]);
    expect(userAnalysis.classification).toBe("member-restricted");
    expect(userAnalysis.everyoneCanView).toBe(false);
  });

  it("checks category permission synchronization correctly", () => {
    const category: Category = {
      id: "cat_1",
      name: "Community",
      position: 0,
      channelIds: ["c1"],
      visibility: dummyVisibility,
    };

    const syncedChannel = createChannel("c1", "welcome", "cat_1");
    syncedChannel.permissions = []; // no overrides = synced
    expect(checkCategorySync(syncedChannel, category)).toBe(true);

    const desyncedChannel = createChannel("c2", "private-chat", "cat_1");
    desyncedChannel.permissions = [
      { id: "r_everyone", type: "role", allow: [], deny: ["VIEW_CHANNEL"] },
    ];
    expect(checkCategorySync(desyncedChannel, category)).toBe(false);
  });
});

