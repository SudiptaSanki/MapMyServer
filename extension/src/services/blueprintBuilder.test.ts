import { describe, it, expect } from "vitest";
import { buildBlueprint, buildTree } from "./blueprintBuilder";
import type { ServerInfo, Category, Channel, Role } from "@mapmyserver/shared";

describe("Blueprint Builder & Quality Evaluator", () => {
  const vis = {
    source: "page-visible" as const,
    accessibleToUser: true,
    observedAt: new Date().toISOString(),
  };

  const dummyServer: ServerInfo = {
    id: "guild-123456",
    name: "Engineering Hub",
    visibility: vis,
  };

  it("deduplicates categories with duplicate normalized names", () => {
    const categories: Category[] = [
      { id: "cat-1", name: "GENERAL CHANNELS", position: 0, channelIds: [], visibility: vis },
      { id: "cat-2", name: "General Channels", position: 1, channelIds: [], visibility: vis },
      { id: "cat-3", name: "── general channels ──", position: 2, channelIds: [], visibility: vis },
    ];

    const channels: Channel[] = [
      { id: "ch-1", name: "welcome", type: "text", parentId: "cat-1", position: 0, visibility: vis },
      { id: "ch-2", name: "announcements", type: "text", parentId: "cat-2", position: 1, visibility: vis },
      { id: "ch-3", name: "chat", type: "text", parentId: "cat-3", position: 2, visibility: vis },
    ];

    const blueprint = buildBlueprint({
      server: dummyServer,
      categories,
      channels,
      threads: [],
    });

    // Categories should be merged into 1 canonical category
    expect(blueprint.categories.length).toBe(1);
    expect(blueprint.categories[0].channelIds.length).toBe(3);
    // Channels should all have canonical parentId
    expect(blueprint.channels.every((c) => c.parentId === blueprint.categories[0].id)).toBe(true);
  });

  it("calculates scan completeness score accurately", () => {
    // 1. Partial scan without roles
    const partialBp = buildBlueprint({
      server: dummyServer,
      categories: [{ id: "cat-1", name: "Info", position: 0, channelIds: [], visibility: vis }],
      channels: [{ id: "ch-1", name: "general", type: "text", parentId: "cat-1", position: 0, visibility: vis }],
      threads: [],
    });

    expect(partialBp.scanQuality).toBeDefined();
    expect(partialBp.scanQuality?.completenessScore).toBeLessThan(100);
    expect(partialBp.scanQuality?.missingDataWarnings.length).toBeGreaterThan(0);

    // 2. Full scan with roles
    const fullBp = buildBlueprint({
      server: dummyServer,
      categories: [{ id: "cat-1", name: "Info", position: 0, channelIds: [], visibility: vis }],
      channels: [{ id: "ch-1", name: "general", type: "text", parentId: "cat-1", position: 0, visibility: vis }],
      threads: [],
      roles: [{ id: "r-admin", name: "Admin", position: 1, permissions: ["ADMINISTRATOR"], visibility: vis }],
    });

    expect(fullBp.scanQuality?.completenessScore).toBe(100);
  });

  it("attaches visibility analysis to all mapped channels", () => {
    const roles: Role[] = [
      { id: "role-everyone", name: "@everyone", position: 0, permissions: ["VIEW_CHANNEL"], visibility: vis },
      { id: "role-staff", name: "Staff", position: 1, permissions: [], visibility: vis },
    ];

    const channels: Channel[] = [
      {
        id: "ch-pub",
        name: "public-lounge",
        type: "text",
        parentId: null,
        position: 0,
        visibility: vis,
      },
      {
        id: "ch-priv",
        name: "staff-only",
        type: "text",
        parentId: null,
        position: 1,
        permissions: [
          { id: "@everyone", type: "role", allow: [], deny: ["VIEW_CHANNEL"] },
          { id: "role-staff", type: "role", allow: ["VIEW_CHANNEL"], deny: [] },
        ],
        visibility: vis,
      },
    ];

    const bp = buildBlueprint({
      server: dummyServer,
      categories: [],
      channels,
      threads: [],
      roles,
    });

    const pubChan = bp.channels.find((c) => c.id === "ch-pub");
    const privChan = bp.channels.find((c) => c.id === "ch-priv");

    expect(pubChan?.visibilityAnalysis?.classification).toBe("broadly-accessible");
    expect(privChan?.visibilityAnalysis?.classification).toBe("role-restricted");
    expect(privChan?.visibilityAnalysis?.rolesWithAccess).toContain("Staff");
  });

  it("builds TreeNode structure with visibility and metadata", () => {
    const bp = buildBlueprint({
      server: dummyServer,
      categories: [{ id: "cat-1", name: "General", position: 0, channelIds: [], visibility: vis }],
      channels: [{ id: "ch-1", name: "welcome", type: "text", parentId: "cat-1", position: 0, visibility: vis }],
      threads: [{ id: "th-1", name: "Introduce yourself", parentId: "ch-1", archived: false, visibility: vis }],
    });

    const tree = buildTree(bp);
    expect(tree.type).toBe("server");
    expect(tree.children.length).toBe(1); // 1 category
    expect(tree.children[0].type).toBe("category");
    expect(tree.children[0].children.length).toBe(1); // 1 channel
    expect(tree.children[0].children[0].type).toBe("text");
    expect(tree.children[0].children[0].children.length).toBe(1); // 1 thread
  });
});
