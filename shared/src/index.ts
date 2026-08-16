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
  };
}
