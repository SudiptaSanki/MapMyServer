/* ─────────────────────────────────────────────
 *  Blueprint Builder
 *
 *  Takes raw collected data from the content
 *  script or API and normalizes it into a clean
 *  ServerBlueprint with computed statistics.
 * ───────────────────────────────────────────── */

import type {
  ServerBlueprint,
  ServerInfo,
  Category,
  Channel,
  Thread,
  Role,
  ServerRules,
  TreeNode,
  ChannelType,
} from "@mapmyserver/shared";

import { calculateStatistics } from "./statisticsCalculator";

// ── Build Blueprint ────────────────────────────

interface RawCollectedData {
  server: ServerInfo;
  categories: Category[];
  channels: Channel[];
  threads: Thread[];
  roles?: Role[];
  rules?: ServerRules;
}

export function buildBlueprint(data: RawCollectedData): ServerBlueprint {
  // Sort categories by position
  const categories = [...data.categories].sort(
    (a, b) => a.position - b.position
  );

  // Sort channels by position within categories
  const channels = [...data.channels].sort((a, b) => {
    if (a.parentId !== b.parentId) {
      const aCatPos = categories.findIndex((c) => c.id === a.parentId);
      const bCatPos = categories.findIndex((c) => c.id === b.parentId);
      return aCatPos - bCatPos;
    }
    return a.position - b.position;
  });

  // Link channel IDs to categories
  for (const category of categories) {
    category.channelIds = channels
      .filter((ch) => ch.parentId === category.id)
      .map((ch) => ch.id);
  }

  // Link thread IDs to channels
  for (const channel of channels) {
    channel.threadIds = data.threads
      .filter((t) => t.parentId === channel.id)
      .map((t) => t.id);
  }

  const threads = [...data.threads];
  const roles = data.roles ? [...data.roles].sort((a, b) => b.position - a.position) : [];

  const partial = { categories, channels, threads, roles };
  const statistics = calculateStatistics(partial);

  return {
    server: data.server,
    categories,
    channels,
    threads,
    roles,
    rules: data.rules,
    statistics,
    collectedAt: new Date().toISOString(),
    version: 2,
  };
}

// ── Build Tree ─────────────────────────────────

export function buildTree(blueprint: ServerBlueprint): TreeNode {
  const { server, categories, channels, threads } = blueprint;

  const root: TreeNode = {
    id: server.id,
    name: server.name,
    type: "server",
    depth: 0,
    children: [],
    metadata: {
      channelCount: channels.length,
      threadCount: threads.length,
    },
  };

  // Build category nodes
  for (const category of categories) {
    const categoryNode: TreeNode = {
      id: category.id,
      name: category.name,
      type: "category",
      depth: 1,
      children: [],
      metadata: {
        channelCount: category.channelIds.length,
        position: category.position,
      },
    };

    // Build channel nodes under this category
    const categoryChannels = channels.filter(
      (ch) => ch.parentId === category.id
    );

    for (const channel of categoryChannels) {
      const channelNode = buildChannelNode(channel, threads, 2);
      categoryNode.children.push(channelNode);
    }

    root.children.push(categoryNode);
  }

  // Uncategorized channels
  const uncategorized = channels.filter(
    (ch) => ch.parentId === null && ch.type !== "category"
  );
  if (uncategorized.length > 0) {
    const uncatNode: TreeNode = {
      id: "__uncategorized__",
      name: "Uncategorized",
      type: "category",
      depth: 1,
      children: uncategorized.map((ch) => buildChannelNode(ch, threads, 2)),
      metadata: {
        channelCount: uncategorized.length,
      },
    };
    root.children.unshift(uncatNode);
  }

  return root;
}

function buildChannelNode(
  channel: Channel,
  threads: Thread[],
  depth: number
): TreeNode {
  const channelThreads = threads.filter((t) => t.parentId === channel.id);
  const hasContent = !!(
    channel.content &&
    (channel.content.welcomeMessage ||
      (channel.content.instructions && channel.content.instructions.length > 0) ||
      (channel.content.rules && channel.content.rules.length > 0) ||
      (channel.content.pinnedMessages && channel.content.pinnedMessages.length > 0) ||
      channel.content.template)
  );

  const node: TreeNode = {
    id: channel.id,
    name: channel.name,
    type: channel.type,
    depth,
    children: channelThreads.map((thread) => ({
      id: thread.id,
      name: thread.name,
      type: "thread" as const,
      depth: depth + 1,
      children: [],
    })),
    metadata: {
      threadCount: channelThreads.length,
      position: channel.position,
      topic: channel.topic,
      description: channel.description,
      purpose: channel.purpose,
      hasContent,
    },
  };

  return node;
}

// ── Channel Type Icons ─────────────────────────

export function getChannelIcon(type: ChannelType | "thread" | "server" | "category"): string {
  switch (type) {
    case "text":
      return "📝";
    case "voice":
      return "🔊";
    case "stage":
      return "🎤";
    case "forum":
      return "📋";
    case "announcement":
      return "📢";
    case "media":
      return "🖼️";
    case "category":
      return "📁";
    case "thread":
      return "💬";
    case "server":
      return "🟣";
    default:
      return "#";
  }
}

export function getChannelPrefix(type: ChannelType): string {
  switch (type) {
    case "text":
      return "#";
    case "voice":
      return "🔊";
    case "stage":
      return "🎤";
    case "forum":
      return "📋";
    case "announcement":
      return "📢";
    case "media":
      return "🖼️";
    default:
      return "#";
  }
}
