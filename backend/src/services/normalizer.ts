import type {
  ServerBlueprint,
  Category,
  Channel,
  Thread,
  Role,
  ChannelType,
  VisibilityInfo,
  ChannelPurpose,
  PurposeClassification,
  ServerRules,
  ExtractedContent,
} from "@mapmyserver/shared";

// Discord Channel Types
// 0 = GUILD_TEXT
// 2 = GUILD_VOICE
// 4 = GUILD_CATEGORY
// 5 = GUILD_ANNOUNCEMENT
// 10 = ANNOUNCEMENT_THREAD
// 11 = PUBLIC_THREAD
// 12 = PRIVATE_THREAD
// 13 = GUILD_STAGE_VOICE
// 15 = GUILD_FORUM
// 16 = GUILD_MEDIA

const mapChannelType = (type: number): ChannelType | "category" | "thread" | "unknown" => {
  switch (type) {
    case 0: return "text";
    case 2: return "voice";
    case 4: return "category";
    case 5: return "announcement";
    case 10:
    case 11:
    case 12: return "thread";
    case 13: return "stage";
    case 15: return "forum";
    case 16: return "media";
    default: return "unknown";
  }
};

/**
 * Basic heuristic purpose classification based on channel names and topics.
 * Phase 4 will augment this with AI classification.
 */
function inferChannelPurpose(name: string, topic?: string): PurposeClassification | undefined {
  const clean = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const topicClean = (topic || "").toLowerCase();

  if (clean.includes("intro") || clean.includes("welcome") || clean.includes("gettingstarted") || clean.includes("start")) {
    return { purpose: "ONBOARDING", confidence: 0.9, source: "metadata" };
  }
  if (clean.includes("rule") || clean.includes("guideline") || clean.includes("conduct") || clean.includes("policy")) {
    return { purpose: "GOVERNANCE", confidence: 0.95, source: "metadata" };
  }
  if (clean.includes("announce") || clean.includes("news") || clean.includes("update") || clean.includes("changelog")) {
    return { purpose: "INFORMATION", confidence: 0.9, source: "metadata" };
  }
  if (clean.includes("help") || clean.includes("support") || clean.includes("ask") || clean.includes("question") || clean.includes("faq")) {
    return { purpose: "SUPPORT", confidence: 0.85, source: "metadata" };
  }
  if (clean.includes("resource") || clean.includes("link") || clean.includes("book") || clean.includes("guide") || clean.includes("tutorial")) {
    return { purpose: "KNOWLEDGE", confidence: 0.85, source: "metadata" };
  }
  if (clean.includes("event") || clean.includes("meetup") || clean.includes("stage") || clean.includes("calendar")) {
    return { purpose: "EVENTS", confidence: 0.85, source: "metadata" };
  }
  if (clean.includes("showcase") || clean.includes("share") || clean.includes("project") || clean.includes("demo") || clean.includes("built")) {
    return { purpose: "SHOWCASE", confidence: 0.85, source: "metadata" };
  }
  if (clean.includes("feedback") || clean.includes("suggestion") || clean.includes("ideas")) {
    return { purpose: "FEEDBACK", confidence: 0.85, source: "metadata" };
  }
  if (clean.includes("team") || clean.includes("dev") || clean.includes("design") || clean.includes("frontend") || clean.includes("backend")) {
    return { purpose: "TEAM", confidence: 0.75, source: "metadata" };
  }
  if (clean.includes("admin") || clean.includes("mod") || clean.includes("staff") || clean.includes("private") || clean.includes("lead")) {
    return { purpose: "INTERNAL", confidence: 0.8, source: "metadata" };
  }
  if (clean.includes("general") || clean.includes("chat") || clean.includes("lounge") || clean.includes("hangout") || clean.includes("random")) {
    return { purpose: "COMMUNITY", confidence: 0.8, source: "metadata" };
  }

  // Check topic if name didn't match
  if (topicClean.includes("welcome") || topicClean.includes("introduce")) {
    return { purpose: "ONBOARDING", confidence: 0.7, source: "metadata" };
  }

  return undefined;
}

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

export const normalizeServerData = (
  guild: any,
  channels: any[],
  roles: any[]
): ServerBlueprint => {
  const vis: VisibilityInfo = {
    source: "discord-api",
    accessibleToUser: true,
    observedAt: new Date().toISOString(),
  };

  const categories: Category[] = [];
  const normalizedChannels: Channel[] = [];
  const threads: Thread[] = [];

  // 1. First pass: Find categories
  const categoryMap = new Map<string, Category>();

  channels.forEach((c) => {
    const type = mapChannelType(c.type);
    if (type === "category") {
      const cat: Category = {
        id: c.id,
        name: c.name,
        position: c.position || 0,
        channelIds: [],
        visibility: vis,
      };
      categories.push(cat);
      categoryMap.set(c.id, cat);
    }
  });

  // Sort categories by position
  categories.sort((a, b) => a.position - b.position);

  // 2. Second pass: Find channels and map to categories
  channels.forEach((c) => {
    const type = mapChannelType(c.type);

    if (type === "category" || type === "unknown") return;

    if (type === "thread") {
      threads.push({
        id: c.id,
        name: c.name,
        parentId: c.parent_id,
        archived: c.thread_metadata?.archived || false,
        locked: c.thread_metadata?.locked || false,
        messageCount: c.message_count,
        autoArchiveDuration: c.thread_metadata?.auto_archive_duration,
        visibility: vis,
      });
      return;
    }

    const purpose = inferChannelPurpose(c.name, c.topic);

    const chan: Channel = {
      id: c.id,
      name: c.name,
      type: type as ChannelType,
      parentId: c.parent_id,
      position: c.position || 0,
      topic: c.topic,
      threadIds: [],
      purpose,
      visibility: vis,
      metadata: {
        nsfw: c.nsfw,
        bitrate: c.bitrate,
        userLimit: c.user_limit,
        slowMode: c.rate_limit_per_user,
      },
    };

    normalizedChannels.push(chan);

    if (c.parent_id && categoryMap.has(c.parent_id)) {
      categoryMap.get(c.parent_id)!.channelIds.push(c.id);
    }
  });

  // Sort channels by position
  normalizedChannels.sort((a, b) => a.position - b.position);

  // 3. Link threads to channels
  threads.forEach((t) => {
    const parent = normalizedChannels.find((c) => c.id === t.parentId);
    if (parent) {
      if (!parent.threadIds) parent.threadIds = [];
      parent.threadIds.push(t.id);
    }
  });

  // 4. Map roles
  const normalizedRoles: Role[] = (roles || [])
    .map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color ? `#${r.color.toString(16).padStart(6, "0")}` : undefined,
      position: r.position,
      permissions: r.permissions ? [r.permissions] : undefined,
      managed: r.managed,
      mentionable: r.mentionable,
      hoist: r.hoist,
      visibility: vis,
    }))
    .sort((a, b) => b.position - a.position);

  // 5. Purpose distribution
  const purposeDistribution: Record<ChannelPurpose, number> = ALL_PURPOSES.reduce((acc, p) => {
    acc[p] = 0;
    return acc;
  }, {} as Record<ChannelPurpose, number>);

  for (const c of normalizedChannels) {
    if (c.purpose?.purpose) {
      purposeDistribution[c.purpose.purpose] = (purposeDistribution[c.purpose.purpose] || 0) + 1;
    }
  }

  // 6. Calculate statistics
  const stats = {
    categories: categories.length,
    textChannels: normalizedChannels.filter((c) => c.type === "text").length,
    voiceChannels: normalizedChannels.filter((c) => c.type === "voice").length,
    stageChannels: normalizedChannels.filter((c) => c.type === "stage").length,
    forumChannels: normalizedChannels.filter((c) => c.type === "forum").length,
    announcementChannels: normalizedChannels.filter((c) => c.type === "announcement").length,
    mediaChannels: normalizedChannels.filter((c) => c.type === "media").length,
    totalChannels: normalizedChannels.length,
    threads: threads.length,
    activeThreads: threads.filter((t) => !t.archived).length,
    archivedThreads: threads.filter((t) => t.archived).length,
    roles: normalizedRoles.length,
    channelsPerCategory: categories.reduce((acc, cat) => {
      acc[cat.id] = cat.channelIds.length;
      return acc;
    }, {} as Record<string, number>),
    channelsWithTopics: normalizedChannels.filter((c) => !!c.topic).length,
    channelsWithContent: 0,
    channelsWithPurpose: normalizedChannels.filter((c) => !!c.purpose).length,
    purposeDistribution,
  };

  return {
    server: {
      id: guild.id,
      name: guild.name,
      icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : undefined,
      description: guild.description,
      features: guild.features,
      boostLevel: guild.premium_tier,
      vanityUrl: guild.vanity_url_code,
      ownerId: guild.owner_id,
      visibility: vis,
    },
    categories,
    channels: normalizedChannels,
    threads,
    roles: normalizedRoles,
    statistics: stats,
    collectedAt: new Date().toISOString(),
    version: 2,
  };
};
