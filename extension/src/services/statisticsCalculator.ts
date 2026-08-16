/* ─────────────────────────────────────────────
 *  Statistics Calculator
 *
 *  Computes all statistical metrics from
 *  a ServerBlueprint, including content and
 *  purpose distribution metrics.
 * ───────────────────────────────────────────── */

import type {
  ServerBlueprint,
  ServerStatistics,
  Channel,
  ChannelPurpose,
} from "@mapmyserver/shared";

const ALL_PURPOSES: ChannelPurpose[] = [
  "ONBOARDING",
  "GOVERNANCE",
  "INFORMATION",
  "COMMUNITY",
  "SUPPORT",
  "KNOWLEDGE",
  "EVENTS",
  "TEAM",
  "INTERNAL",
  "SHOWCASE",
  "FEEDBACK",
  "OTHER",
];

export function calculateStatistics(
  blueprint: Pick<ServerBlueprint, "categories" | "channels" | "threads" | "roles">
): ServerStatistics {
  const channels = blueprint.channels;
  const threads = blueprint.threads;

  const textChannels = countByType(channels, "text");
  const voiceChannels = countByType(channels, "voice");
  const stageChannels = countByType(channels, "stage");
  const forumChannels = countByType(channels, "forum");
  const announcementChannels = countByType(channels, "announcement");
  const mediaChannels = countByType(channels, "media");

  const totalChannels =
    textChannels +
    voiceChannels +
    stageChannels +
    forumChannels +
    announcementChannels +
    mediaChannels;

  const activeThreads = threads.filter((t) => !t.archived).length;
  const archivedThreads = threads.filter((t) => t.archived).length;

  // Channels per category
  const channelsPerCategory: Record<string, number> = {};
  for (const category of blueprint.categories) {
    channelsPerCategory[category.id] = channels.filter(
      (c) => c.parentId === category.id
    ).length;
  }

  // Uncategorized channels
  const uncategorized = channels.filter(
    (c) => c.parentId === null && c.type !== "category"
  ).length;
  if (uncategorized > 0) {
    channelsPerCategory["__uncategorized__"] = uncategorized;
  }

  // Content & Purpose metrics
  const channelsWithTopics = channels.filter((c) => !!c.topic && c.topic.trim().length > 0).length;
  const channelsWithContent = channels.filter((c) => {
    if (!c.content) return false;
    return (
      (c.content.instructions && c.content.instructions.length > 0) ||
      (c.content.rules && c.content.rules.length > 0) ||
      (c.content.pinnedMessages && c.content.pinnedMessages.length > 0) ||
      !!c.content.welcomeMessage ||
      !!c.content.template
    );
  }).length;

  const channelsWithPurpose = channels.filter((c) => !!c.purpose).length;

  const purposeDistribution: Record<ChannelPurpose, number> = ALL_PURPOSES.reduce((acc, p) => {
    acc[p] = 0;
    return acc;
  }, {} as Record<ChannelPurpose, number>);

  for (const c of channels) {
    if (c.purpose?.purpose) {
      purposeDistribution[c.purpose.purpose] = (purposeDistribution[c.purpose.purpose] || 0) + 1;
    }
  }

  return {
    categories: blueprint.categories.length,
    textChannels,
    voiceChannels,
    stageChannels,
    forumChannels,
    announcementChannels,
    mediaChannels,
    threads: threads.length,
    activeThreads,
    archivedThreads,
    roles: blueprint.roles.length,
    totalChannels,
    channelsPerCategory,
    channelsWithTopics,
    channelsWithContent,
    channelsWithPurpose,
    purposeDistribution,
  };
}

function countByType(channels: Channel[], type: Channel["type"]): number {
  return channels.filter((c) => c.type === type).length;
}

// ── Derived Stats ──────────────────────────────

export interface DerivedStatistics {
  avgChannelsPerCategory: number;
  largestCategory: { name: string; count: number } | null;
  smallestCategory: { name: string; count: number } | null;
  threadDensity: number; // threads per text channel
  channelTypeDistribution: { type: string; count: number; percentage: number }[];
  contentCoveragePercent: number;
  purposeCoveragePercent: number;
}

export function calculateDerivedStats(
  blueprint: ServerBlueprint
): DerivedStatistics {
  const { statistics, categories } = blueprint;

  // Avg channels per category
  const avgChannelsPerCategory =
    categories.length > 0
      ? statistics.totalChannels / categories.length
      : 0;

  // Largest & smallest categories
  let largestCategory: DerivedStatistics["largestCategory"] = null;
  let smallestCategory: DerivedStatistics["smallestCategory"] = null;

  if (categories.length > 0) {
    let maxCount = -1;
    let minCount = Infinity;

    for (const cat of categories) {
      const count = statistics.channelsPerCategory[cat.id] ?? 0;
      if (count > maxCount) {
        maxCount = count;
        largestCategory = { name: cat.name, count };
      }
      if (count < minCount) {
        minCount = count;
        smallestCategory = { name: cat.name, count };
      }
    }
  }

  // Thread density
  const threadDensity =
    statistics.textChannels > 0
      ? statistics.threads / statistics.textChannels
      : 0;

  // Channel type distribution
  const types = [
    { type: "Text", count: statistics.textChannels },
    { type: "Voice", count: statistics.voiceChannels },
    { type: "Stage", count: statistics.stageChannels },
    { type: "Forum", count: statistics.forumChannels },
    { type: "Announcement", count: statistics.announcementChannels },
    { type: "Media", count: statistics.mediaChannels },
  ].filter((t) => t.count > 0);

  const total = types.reduce((sum, t) => sum + t.count, 0);
  const channelTypeDistribution = types.map((t) => ({
    ...t,
    percentage: total > 0 ? Math.round((t.count / total) * 100) : 0,
  }));

  const contentCoveragePercent =
    statistics.totalChannels > 0
      ? Math.round((statistics.channelsWithContent / statistics.totalChannels) * 100)
      : 0;

  const purposeCoveragePercent =
    statistics.totalChannels > 0
      ? Math.round((statistics.channelsWithPurpose / statistics.totalChannels) * 100)
      : 0;

  return {
    avgChannelsPerCategory: Math.round(avgChannelsPerCategory * 10) / 10,
    largestCategory,
    smallestCategory,
    threadDensity: Math.round(threadDensity * 10) / 10,
    channelTypeDistribution,
    contentCoveragePercent,
    purposeCoveragePercent,
  };
}
