import { describe, it, expect } from "vitest";
import { calculateStatistics, calculateDerivedStats } from "./statisticsCalculator";
import { buildBlueprint } from "./blueprintBuilder";
import type { Channel, Category } from "@mapmyserver/shared";

describe("Statistics Calculator", () => {
  const vis = {
    source: "page-visible" as const,
    accessibleToUser: true,
    observedAt: new Date().toISOString(),
  };

  const categories: Category[] = [
    { id: "cat-1", name: "Info", position: 0, channelIds: ["c1"], visibility: vis },
    { id: "cat-2", name: "Voice", position: 1, channelIds: ["c2"], visibility: vis },
  ];

  const channels: Channel[] = [
    {
      id: "c1",
      name: "rules",
      type: "text",
      parentId: "cat-1",
      position: 0,
      topic: "Server guidelines",
      purpose: { purpose: "GOVERNANCE", confidence: 1.0, source: "metadata" },
      content: {
        rules: [{ text: "Be kind", source: { type: "message", channelId: "c1", collectedAt: "", visibility: vis } }],
      },
      visibility: vis,
    },
    {
      id: "c2",
      name: "General Voice",
      type: "voice",
      parentId: "cat-2",
      position: 1,
      visibility: vis,
    },
  ];

  it("calculates basic and purpose distribution statistics", () => {
    const stats = calculateStatistics({
      categories,
      channels,
      threads: [],
      roles: [],
    });

    expect(stats.categories).toBe(2);
    expect(stats.textChannels).toBe(1);
    expect(stats.voiceChannels).toBe(1);
    expect(stats.totalChannels).toBe(2);
    expect(stats.channelsWithTopics).toBe(1);
    expect(stats.channelsWithContent).toBe(1);
    expect(stats.channelsWithPurpose).toBe(1);
    expect(stats.purposeDistribution.GOVERNANCE).toBe(1);
  });

  it("calculates derived coverage percentages", () => {
    const bp = buildBlueprint({
      server: { id: "g1", name: "Test Server", visibility: vis },
      categories,
      channels,
      threads: [],
    });

    const derived = calculateDerivedStats(bp);
    expect(derived.contentCoveragePercent).toBe(50); // 1 out of 2 has content
    expect(derived.purposeCoveragePercent).toBe(50); // 1 out of 2 has purpose
    expect(derived.channelTypeDistribution.length).toBeGreaterThan(0);
  });
});

