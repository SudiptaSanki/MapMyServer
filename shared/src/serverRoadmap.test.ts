import { describe, it, expect } from "vitest";
import {
  evaluateRoadmapProgress,
  proposalToActivePlan,
  inferPrivateAudience,
  evaluateChannelVisibility,
  type ServerBlueprint,
  type ArchitectureProposal,
  type ActiveServerPlan,
  type Channel,
  type Category,
} from "./index";

describe("Server Roadmap & Implementation Tracker", () => {
  const dummyVisibility = {
    source: "page-visible" as const,
    accessibleToUser: true,
    observedAt: new Date().toISOString(),
  };

  const createChannel = (id: string, name: string, parentId: string | null = null): Channel => ({
    id,
    name,
    type: "text",
    parentId,
    position: 0,
    visibility: dummyVisibility,
    permissions: [],
  });

  const createCategory = (id: string, name: string, position: number): Category => ({
    id,
    name,
    position,
    channelIds: [],
    visibility: dummyVisibility,
  });

  const mockBlueprint: ServerBlueprint = {
    server: {
      id: "srv-123",
      name: "Acme Community",
      icon: undefined,
      description: "Acme official server",
      visibility: dummyVisibility,
    },
    categories: [
      {
        ...createCategory("cat-welcome", "WELCOME & INFO", 0),
        channelIds: ["chan-welcome", "chan-rules"],
        isPrivate: false,
      },
      {
        ...createCategory("cat-staff", "STAFF ONLY", 1),
        channelIds: ["chan-staff-chat"],
        isPrivate: true,
        privateAudience: "Staff & Moderation Team",
      },
    ],
    channels: [
      createChannel("chan-welcome", "welcome", "cat-welcome"),
      createChannel("chan-rules", "rules", "cat-welcome"),
      {
        ...createChannel("chan-staff-chat", "staff-chat", "cat-staff"),
        isPrivate: true,
        privateAudience: "Staff & Moderation Team",
      },
    ],
    threads: [],
    roles: [
      {
        id: "role-admin",
        name: "Admin",
        color: "#ff0000",
        position: 10,
        permissions: ["ADMINISTRATOR"],
        memberCount: 2,
        hoist: true,
        mentionable: true,
        managed: false,
        visibility: dummyVisibility,
      },
    ],
    statistics: {
      categories: 2,
      textChannels: 3,
      voiceChannels: 0,
      stageChannels: 0,
      forumChannels: 0,
      announcementChannels: 0,
      mediaChannels: 0,
      threads: 0,
      activeThreads: 0,
      archivedThreads: 0,
      roles: 1,
      totalChannels: 3,
      channelsPerCategory: {},
      channelsWithTopics: 0,
      channelsWithContent: 0,
      channelsWithPurpose: 0,
      purposeDistribution: {} as any,
    },
    collectedAt: new Date().toISOString(),
    version: 3,
  };

  it("should infer private audience based on channel name, category name and roles", () => {
    expect(inferPrivateAudience("mod-logs", "Staff")).toContain("Staff & Moderation");
    expect(inferPrivateAudience("admin-hq", "Administration")).toContain("Administration");
    expect(inferPrivateAudience("vip-lounge", "Supporters")).toContain("VIP");
    expect(inferPrivateAudience("bot-commands", "Logs & Automation")).toContain("Bot Logs");
    expect(inferPrivateAudience("dev-chat", "Engineering")).toContain("Tech");
  });

  it("should convert an ArchitectureProposal into an ActiveServerPlan with audience mapping", () => {
    const proposal: ArchitectureProposal = {
      id: "prop-99",
      serverId: "srv-123",
      title: "Optimized Community Plan",
      description: "Clean layout with protected staff area",
      targetAudienceOrPurpose: "Developers",
      categories: [
        { id: "p-cat-1", name: "WELCOME & INFO", position: 0 },
        { id: "p-cat-2", name: "STAFF ONLY", position: 1 },
      ],
      channels: [
        {
          id: "p-ch-1",
          name: "welcome",
          type: "text",
          categoryId: "p-cat-1",
          position: 0,
          suggestedVisibility: "broadly-accessible",
        },
        {
          id: "p-ch-2",
          name: "staff-chat",
          type: "text",
          categoryId: "p-cat-2",
          position: 0,
          suggestedVisibility: "role-restricted",
          suggestedRolesWithAccess: ["Moderator", "Admin"],
        },
        {
          id: "p-ch-3",
          name: "dev-discussion",
          type: "text",
          categoryId: "p-cat-1",
          position: 2,
          suggestedVisibility: "broadly-accessible",
        },
      ],
      createdAt: 1000,
      updatedAt: 1000,
    };

    const plan = proposalToActivePlan(proposal, "Acme Community");
    expect(plan.id).toBe("plan_prop-99");
    expect(plan.categories).toHaveLength(2);
    expect(plan.channels).toHaveLength(3);

    const staffChan = plan.channels.find((c) => c.name === "staff-chat");
    expect(staffChan?.isPrivate).toBe(true);
    expect(staffChan?.privateAudience).toContain("Moderator, Admin");
  });

  it("should evaluate roadmap progress and compute green lights for completed items", () => {
    const plan: ActiveServerPlan = {
      id: "plan-1",
      serverId: "srv-123",
      serverName: "Acme Community",
      title: "Test Plan",
      description: "Verifying live matching",
      adoptedAt: Date.now(),
      categories: [
        { id: "c-1", name: "WELCOME & INFO", position: 0 },
        { id: "c-2", name: "STAFF ONLY", position: 1, isPrivate: true },
        { id: "c-3", name: "UPCOMING EVENTS", position: 2 }, // Pending
      ],
      channels: [
        { id: "ch-1", name: "welcome", type: "text", categoryName: "WELCOME & INFO", position: 0 },
        { id: "ch-2", name: "rules", type: "text", categoryName: "WELCOME & INFO", position: 1 },
        { id: "ch-3", name: "staff-chat", type: "text", categoryName: "STAFF ONLY", position: 0, isPrivate: true },
        { id: "ch-4", name: "event-announcements", type: "announcement", categoryName: "UPCOMING EVENTS", position: 0 }, // Pending
      ],
    };

    const report = evaluateRoadmapProgress(mockBlueprint, plan);

    expect(report.totalItems).toBe(7); // 3 categories + 4 channels
    expect(report.completedItems).toBe(5); // 2 categories + 3 channels completed
    expect(report.pendingCategoriesCount).toBe(1);
    expect(report.pendingChannelsCount).toBe(1);
    expect(report.percentCompleted).toBe(71); // 5/7 = 71%

    // Category 1 & 2 verified
    expect(report.categoryProgress[0].isCompleted).toBe(true);
    expect(report.categoryProgress[1].isCompleted).toBe(true);
    expect(report.categoryProgress[2].isCompleted).toBe(false);

    // Channels verified
    expect(report.channelProgress.find((c) => c.planned.name === "welcome")?.isCompleted).toBe(true);
    expect(report.channelProgress.find((c) => c.planned.name === "staff-chat")?.isCompleted).toBe(true);
    expect(report.channelProgress.find((c) => c.planned.name === "event-announcements")?.isCompleted).toBe(false);
  });

  it("should classify channel visibility as role-restricted when padlock/isPrivate is present", () => {
    const privateChannel: Channel = {
      ...createChannel("ch-secret", "secret-ops"),
      isPrivate: true,
      privateAudience: "Server Administration Only",
    };

    const vis = evaluateChannelVisibility(privateChannel, null, []);
    expect(vis.classification).toBe("role-restricted");
    expect(vis.reason).toContain("Private channel");
    expect(vis.reason).toContain("Server Administration Only");
  });
});
