/* ─────────────────────────────────────────────
 *  Blueprint Builder
 *
 *  Takes raw collected data from the content
 *  script or API and normalizes it into a clean
 *  ServerBlueprint with computed statistics,
 *  visibility analysis, and scan quality reports.
 * ───────────────────────────────────────────── */

import {
  type ServerBlueprint,
  type ServerInfo,
  type Category,
  type Channel,
  type Thread,
  type Role,
  type ServerRules,
  type TreeNode,
  type ChannelType,
  type ScanQualityReport,
  evaluateChannelVisibility,
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
  scanStartTime?: string;
}

export function buildBlueprint(data: RawCollectedData): ServerBlueprint {
  const startTime = data.scanStartTime || new Date().toISOString();
  const roles = data.roles ? [...data.roles].sort((a, b) => b.position - a.position) : [];

  // Deduplicate categories by normalized name
  const categoryMap = new Map<string, Category>();
  const idRemap = new Map<string, string>(); // oldId -> canonicalId

  for (const cat of data.categories) {
    const normName = cat.name
      .toLowerCase()
      .replace(/^[\s─—·•►▸▹▾▿▼▽◆◇○●■□]+/, "")
      .replace(/[\s─—·•►▸▹▾▿▼▽◆◇○●■□]+$/, "")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();

    if (!categoryMap.has(normName)) {
      categoryMap.set(normName, { ...cat, channelIds: [] });
      idRemap.set(cat.id, cat.id);
    } else {
      const canonical = categoryMap.get(normName)!;
      idRemap.set(cat.id, canonical.id);
    }
  }

  // Sort categories by position
  const categories = Array.from(categoryMap.values()).sort(
    (a, b) => a.position - b.position
  );

  // Remap channel parentId if pointing to a duplicate category & compute visibility
  const mappedChannels = data.channels.map((ch) => {
    const parentId = ch.parentId && idRemap.has(ch.parentId) ? idRemap.get(ch.parentId)! : ch.parentId;
    const parentCat = categories.find((c) => c.id === parentId);

    // Compute visibility assessment using shared permission engine
    const visibilityAnalysis = evaluateChannelVisibility(
      { ...ch, parentId },
      parentCat,
      roles
    );

    return {
      ...ch,
      parentId,
      visibilityAnalysis,
    };
  });

  // Sort channels by position within categories
  const channels = [...mappedChannels].sort((a, b) => {
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
  const partial = { categories, channels, threads, roles };
  const statistics = calculateStatistics(partial);

  // ── Compute Scan Quality Report ───────────────
  const endTime = new Date().toISOString();
  const durationMs = Math.max(new Date(endTime).getTime() - new Date(startTime).getTime(), 100);

  const missingDataWarnings: string[] = [];
  if (roles.length === 0) {
    missingDataWarnings.push("Roles not scanned. Open Server Settings -> Roles to map role hierarchy.");
  }
  const unmappedOverrides = channels.filter((c) => !c.permissions || c.permissions.length === 0).length;
  if (unmappedOverrides > 0 && channels.length > 0) {
    missingDataWarnings.push(
      `${unmappedOverrides} channel(s) evaluated with default visibility rules. Open Edit Channel -> Permissions for private channels.`
    );
  }

  let completenessScore = 100;
  if (roles.length === 0) completenessScore -= 25;
  if (channels.length === 0) completenessScore -= 50;
  if (categories.length === 0) completenessScore -= 15;
  completenessScore = Math.max(completenessScore, 10);

  const scanQuality: ScanQualityReport = {
    scanStartTime: startTime,
    scanEndTime: endTime,
    durationMs,
    source: data.server.visibility.source,
    resourcesDiscovered: {
      categories: data.categories.length,
      channels: data.channels.length,
      roles: roles.length,
      threads: data.threads.length,
    },
    resourcesParsed: {
      categories: categories.length,
      channels: channels.length,
      roles: roles.length,
      threads: threads.length,
    },
    resourcesSkipped: Math.max(data.channels.length - channels.length, 0),
    permissionDataQuality: roles.length > 0 ? "partial" : "none",
    completenessScore,
    missingDataWarnings,
  };

  return {
    server: data.server,
    categories,
    channels,
    threads,
    roles,
    rules: data.rules,
    statistics,
    scanQuality,
    collectedAt: endTime,
    version: 3,
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
      visibilityAnalysis: channel.visibilityAnalysis,
    },
  };

  return node;
}

// ── Clean Channel Prefixes (No Raw Emojis) ────

export function getChannelPrefix(type: ChannelType): string {
  switch (type) {
    case "text":
      return "#";
    case "voice":
      return "Vol:";
    case "stage":
      return "Stage:";
    case "forum":
      return "Forum:";
    case "announcement":
      return "Announce:";
    case "media":
      return "Media:";
    default:
      return "#";
  }
}
