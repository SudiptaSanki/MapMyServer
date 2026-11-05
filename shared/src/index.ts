/* ─────────────────────────────────────────────
 *  Discord Server Blueprint — Core Types
 *  Expanded Community Architecture Model
 * ───────────────────────────────────────────── */

// ── Channel Types ──────────────────────────────

export type ChannelType =
  | "text"
  | "voice"
  | "category"
  | "announcement"
  | "stage"
  | "forum"
  | "media";

// ── Data Provenance & Source Tracking ──────────

export type DataSource =
  | "discord-api"
  | "authorized-bot"
  | "page-visible"
  | "user-provided";

export interface VisibilityInfo {
  source: DataSource;
  accessibleToUser: boolean;
  observedAt: string;
}

export type ContentSourceType =
  | "channel-topic"
  | "message"
  | "pinned-message"
  | "welcome-message"
  | "system-message"
  | "channel-description";

export interface ContentSource {
  type: ContentSourceType;
  channelId: string;
  messageId?: string;
  authorId?: string;
  authorName?: string;
  collectedAt: string;
  visibility: VisibilityInfo;
}

export interface ExtractedContent {
  text: string;
  source: ContentSource;
}

// ── Channel Purpose Classification ─────────────

export type ChannelPurpose =
  | "ONBOARDING"
  | "GOVERNANCE"
  | "INFORMATION"
  | "COMMUNITY"
  | "SUPPORT"
  | "KNOWLEDGE"
  | "EVENTS"
  | "TEAM"
  | "INTERNAL"
  | "SHOWCASE"
  | "FEEDBACK"
  | "OTHER";

export interface PurposeClassification {
  purpose: ChannelPurpose;
  confidence: number; // 0.0 - 1.0
  source: "metadata" | "ai";
}

// ── Channel Structured Content ─────────────────

export interface ChannelContent {
  pinnedMessages?: ExtractedContent[];
  welcomeMessage?: ExtractedContent;
  rules?: ExtractedContent[];
  instructions?: ExtractedContent[];
  template?: ExtractedContent;
}

// ── Server Rules (First-Class Feature) ─────────

export interface ServerRules {
  rules: ExtractedContent[];
  sourceChannelId?: string;
  sourceChannelName?: string;
}

// ── Server Info ────────────────────────────────

export interface ServerInfo {
  id: string;
  name: string;
  icon?: string;
  memberCount?: number;
  description?: string;
  features?: string[];
  boostLevel?: number;
  vanityUrl?: string;
  ownerId?: string;
  visibility: VisibilityInfo;
}

// ── Category ───────────────────────────────────

export interface Category {
  id: string;
  name: string;
  position: number;
  channelIds: string[];
  visibility: VisibilityInfo;
}

// ── Channel Metadata ───────────────────────────

export interface ChannelMetadata {
  slowMode?: number;
  userLimit?: number;
  bitrate?: number;
  nsfw?: boolean;
}

// ── Permission Overwrite ───────────────────────

export interface PermissionOverwrite {
  id: string;
  type: "role" | "member";
  allow: string[];
  deny: string[];
}

// ── Channel Visibility & Permission Analysis ─────────

export type VisibilityClassification =
  | "broadly-accessible"
  | "role-restricted"
  | "member-restricted"
  | "user-inaccessible"
  | "unknown";

export type PermissionFlagName =
  | "CREATE_INSTANT_INVITE"
  | "KICK_MEMBERS"
  | "BAN_MEMBERS"
  | "ADMINISTRATOR"
  | "MANAGE_CHANNELS"
  | "MANAGE_GUILD"
  | "ADD_REACTIONS"
  | "VIEW_AUDIT_LOG"
  | "PRIORITY_SPEAKER"
  | "STREAM"
  | "VIEW_CHANNEL"
  | "SEND_MESSAGES"
  | "SEND_TTS_MESSAGES"
  | "MANAGE_MESSAGES"
  | "EMBED_LINKS"
  | "ATTACH_FILES"
  | "READ_MESSAGE_HISTORY"
  | "MENTION_EVERYONE"
  | "USE_EXTERNAL_EMOJIS"
  | "VIEW_GUILD_INSIGHTS"
  | "CONNECT"
  | "SPEAK"
  | "MUTE_MEMBERS"
  | "DEAFEN_MEMBERS"
  | "MOVE_MEMBERS"
  | "USE_VAD"
  | "CHANGE_NICKNAME"
  | "MANAGE_NICKNAMES"
  | "MANAGE_ROLES"
  | "MANAGE_WEBHOOKS"
  | "MANAGE_GUILD_EXPRESSIONS"
  | "USE_APPLICATION_COMMANDS"
  | "REQUEST_TO_SPEAK"
  | "MANAGE_EVENTS"
  | "MANAGE_THREADS"
  | "CREATE_PUBLIC_THREADS"
  | "CREATE_PRIVATE_THREADS"
  | "USE_EXTERNAL_STICKERS"
  | "SEND_MESSAGES_IN_THREADS"
  | "USE_EMBEDDED_ACTIVITIES"
  | "MODERATE_MEMBERS"
  | "VIEW_CREATOR_MONETIZATION_ANALYTICS"
  | "USE_SOUNDBOARD"
  | "USE_EXTERNAL_SOUNDS"
  | "SEND_VOICE_MESSAGES";

export interface ChannelVisibilityAnalysis {
  classification: VisibilityClassification;
  everyoneCanView: boolean;
  rolesWithAccess: string[];
  isCategorySynced: boolean;
  hasChannelOverrides: boolean;
  currentUserCanAccess: boolean | null;
  reason: string;
}

// ── Scan Quality & Completeness Report ──────────

export interface ScanQualityReport {
  scanStartTime: string;
  scanEndTime: string;
  durationMs: number;
  source: DataSource;
  resourcesDiscovered: {
    categories: number;
    channels: number;
    roles: number;
    threads: number;
  };
  resourcesParsed: {
    categories: number;
    channels: number;
    roles: number;
    threads: number;
  };
  resourcesSkipped: number;
  permissionDataQuality: "none" | "partial" | "full";
  completenessScore: number;
  missingDataWarnings: string[];
}

// ── Channel ────────────────────────────────────

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  parentId: string | null;
  position: number;
  topic?: string;
  description?: string;
  threadIds?: string[];
  permissions?: PermissionOverwrite[];
  visibilityAnalysis?: ChannelVisibilityAnalysis;
  metadata?: ChannelMetadata;
  content?: ChannelContent;
  purpose?: PurposeClassification;
  visibility: VisibilityInfo;
}

// ── Thread ─────────────────────────────────────

export interface Thread {
  id: string;
  name: string;
  parentId: string;
  archived: boolean;
  locked?: boolean;
  messageCount?: number;
  autoArchiveDuration?: number;
  visibility: VisibilityInfo;
}

// ── Role ───────────────────────────────────────

export interface Role {
  id: string;
  name: string;
  color?: string;
  position: number;
  permissions?: string[];
  memberCount?: number;
  managed?: boolean;
  mentionable?: boolean;
  hoist?: boolean;
  visibility: VisibilityInfo;
}

// ── Statistics ─────────────────────────────────

export interface ServerStatistics {
  categories: number;
  textChannels: number;
  voiceChannels: number;
  stageChannels: number;
  forumChannels: number;
  announcementChannels: number;
  mediaChannels: number;
  threads: number;
  activeThreads: number;
  archivedThreads: number;
  roles: number;
  totalChannels: number;
  channelsPerCategory: Record<string, number>;
  channelsWithTopics: number;
  channelsWithContent: number;
  channelsWithPurpose: number;
  purposeDistribution: Record<ChannelPurpose, number>;
}

// ── Blueprint ──────────────────────────────────

export interface ServerBlueprint {
  server: ServerInfo;
  categories: Category[];
  channels: Channel[];
  threads: Thread[];
  roles: Role[];
  rules?: ServerRules;
  statistics: ServerStatistics;
  scanQuality?: ScanQualityReport;
  collectedAt: string;
  version: number;
}

// ── Snapshot ───────────────────────────────────

export interface BlueprintSnapshot {
  id: string;
  serverId: string;
  blueprint: ServerBlueprint;
  createdAt: string;
  label?: string;
  notes?: string;
  architectureVersion?: number;
}

// ── Analysis Progress ──────────────────────────

export type AnalysisStepStatus = "pending" | "running" | "done" | "error";

export interface AnalysisStep {
  id: string;
  label: string;
  status: AnalysisStepStatus;
  detail?: string;
}

// ── Tree Node (for rendering) ──────────────────

export interface TreeNode {
  id: string;
  name: string;
  type: "server" | "category" | ChannelType | "thread";
  children: TreeNode[];
  depth: number;
  metadata?: {
    channelCount?: number;
    threadCount?: number;
    position?: number;
    topic?: string;
    description?: string;
    purpose?: PurposeClassification;
    hasContent?: boolean;
    visibilityAnalysis?: ChannelVisibilityAnalysis;
  };
}

// ── Permission Engine Exports ──────────────────
export * from "./permissionEngine";

// ── Security Audit Engine Exports ──────────────
export * from "./securityAuditEngine";

// ── AI & Architecture Planning Exports ─────────
export * from "./aiTypes";
export * from "./architectureDiffEngine";
export * from "./aiContextBuilder";
export * from "./documentationGenerator";
export * from "./templateTypes";
export * from "./curatedTemplates";
export * from "./scriptGenerator";
export * from "./changePlannerTypes";
export * from "./changeMonitor";
export * from "./serverClonerEngine";

