import type {
  ServerBlueprint,
  VisibilityInfo,
  ExtractedContent,
  Role,
} from "@mapmyserver/shared";

const vis: VisibilityInfo = {
  source: "discord-api",
  accessibleToUser: true,
  observedAt: new Date().toISOString(),
};

function createContent(
  text: string,
  channelId: string,
  type: ExtractedContent["source"]["type"] = "message",
  messageId?: string
): ExtractedContent {
  return {
    text,
    source: {
      type,
      channelId,
      messageId: messageId || `msg-${Math.random().toString(36).slice(2, 9)}`,
      authorName: "Server Bot",
      collectedAt: new Date().toISOString(),
      visibility: vis,
    },
  };
}

// ── Server Rules ───────────────────────────────

const rulesList: ExtractedContent[] = [
  createContent("1. Treat all members with respect and courtesy. Harassment, hate speech, or personal attacks will result in an immediate ban.", "chan-rules", "message", "rule-1"),
  createContent("2. No spam, unsolicited advertisements, or unauthorized self-promotion outside of designated channels.", "chan-rules", "message", "rule-2"),
  createContent("3. Keep discussions in their relevant topic channels. Use #help-and-support for technical issues.", "chan-rules", "message", "rule-3"),
  createContent("4. Respect community privacy and confidentiality. Do not share proprietary code or private member communications.", "chan-rules", "message", "rule-4"),
  createContent("5. Follow Discord Community Guidelines and comply with Moderator directions at all times.", "chan-rules", "message", "rule-5"),
];

// ── Roles ──────────────────────────────────────

const mockRoles: Role[] = [
  { id: "role-admin", name: "Administrator", color: "#e74c3c", position: 5, memberCount: 3, hoist: true, mentionable: false, visibility: vis, permissions: ["ADMINISTRATOR"] },
  { id: "role-mod", name: "Community Lead / Mod", color: "#e67e22", position: 4, memberCount: 8, hoist: true, mentionable: true, visibility: vis, permissions: ["MANAGE_MESSAGES", "KICK_MEMBERS", "BAN_MEMBERS"] },
  { id: "role-speaker", name: "Guest Speaker", color: "#9b59b6", position: 3, memberCount: 15, hoist: true, mentionable: true, visibility: vis, permissions: ["PRIORITY_SPEAKER"] },
  { id: "role-dev", name: "Developer", color: "#3498db", position: 2, memberCount: 240, hoist: false, mentionable: true, visibility: vis },
  { id: "role-member", name: "Community Member", color: "#2ecc71", position: 1, memberCount: 1250, hoist: false, mentionable: false, visibility: vis },
];

export const MOCK_SERVER: ServerBlueprint = {
  server: {
    id: "mock-123456789",
    name: "GDG Community & Developer Hub",
    description: "Official Google Developer Group community for building modern web, mobile, and cloud software.",
    memberCount: 1520,
    features: ["COMMUNITY", "WELCOME_SCREEN_ENABLED", "FEATURABLE", "DISCOVERABLE"],
    boostLevel: 2,
    vanityUrl: "gdg-community-hub",
    ownerId: "user-gdg-organizer",
    visibility: vis,
  },
  categories: [
    { id: "cat-1", name: "📢 INFORMATION", position: 0, channelIds: ["chan-welcome", "chan-rules", "chan-announcements"], visibility: vis },
    { id: "cat-2", name: "👥 COMMUNITY & NETWORKING", position: 1, channelIds: ["chan-introductions", "chan-general", "chan-showcase"], visibility: vis },
    { id: "cat-3", name: "💻 ENGINEERING & DEV", position: 2, channelIds: ["chan-web", "chan-android", "chan-help"], visibility: vis },
    { id: "cat-4", name: "📚 KNOWLEDGE & EVENTS", position: 3, channelIds: ["chan-resources", "chan-events", "chan-stage", "chan-voice"], visibility: vis },
  ],
  channels: [
    // Information
    {
      id: "chan-welcome",
      name: "welcome",
      type: "text",
      parentId: "cat-1",
      position: 0,
      topic: "Welcome to GDG Community! Start here to find your way around.",
      purpose: { purpose: "ONBOARDING", confidence: 1.0, source: "metadata" },
      content: {
        welcomeMessage: createContent(
          "👋 Welcome to the GDG Community Hub! We're a global ecosystem of engineers, designers, and tech leaders.\n\nQuick steps to get started:\n1. Read our guidelines in #rules\n2. Introduce yourself in #introductions\n3. Select your developer roles in #roles-select",
          "chan-welcome",
          "welcome-message"
        ),
        instructions: [
          createContent("Read the community roadmap", "chan-welcome", "message"),
          createContent("Check out upcoming hackathons and DevFests in #events", "chan-welcome", "message"),
        ],
      },
      threadIds: [],
      visibility: vis,
    },
    {
      id: "chan-rules",
      name: "rules",
      type: "text",
      parentId: "cat-1",
      position: 1,
      topic: "Official community guidelines, code of conduct, and moderation policy.",
      purpose: { purpose: "GOVERNANCE", confidence: 1.0, source: "metadata" },
      content: {
        rules: rulesList,
        instructions: [
          createContent("Click ✅ on the verification prompt below to accept the server rules and gain full access.", "chan-rules", "system-message"),
        ],
      },
      threadIds: [],
      visibility: vis,
    },
    {
      id: "chan-announcements",
      name: "announcements",
      type: "announcement",
      parentId: "cat-1",
      position: 2,
      topic: "Important updates, event notifications, and partner announcements.",
      purpose: { purpose: "INFORMATION", confidence: 1.0, source: "metadata" },
      content: {
        pinnedMessages: [
          createContent("📢 GDG Annual DevFest 2026 Registration is now open! Early bird tickets available until Sept 1st.", "chan-announcements", "pinned-message"),
          createContent("🚀 Welcome to our new Discord architecture powered by MapMyServer analyzer!", "chan-announcements", "pinned-message"),
        ],
      },
      threadIds: [],
      visibility: vis,
    },

    // Community
    {
      id: "chan-introductions",
      name: "introductions",
      type: "text",
      parentId: "cat-2",
      position: 0,
      topic: "Say hello and connect with fellow developers, designers, and organizers!",
      purpose: { purpose: "ONBOARDING", confidence: 1.0, source: "metadata" },
      content: {
        welcomeMessage: createContent(
          "Hey everyone, welcome to the community! Take a moment to introduce yourself and meet your peers.",
          "chan-introductions",
          "welcome-message"
        ),
        instructions: [
          createContent("Introduce yourself with your background and goals", "chan-introductions", "message"),
          createContent("Describe what projects or tech stacks you are currently building", "chan-introductions", "message"),
          createContent("Mention who you are looking to connect with (collaborators, mentors, founders)", "chan-introductions", "message"),
        ],
        template: createContent(
          "- **Name / Handle**:\n- **Location / Timezone**:\n- **Current Role & Tech Stack** (e.g. React, Node, Android, Go):\n- **What you're building right now**:\n- **Who you'd like to connect with**:",
          "chan-introductions",
          "message"
        ),
      },
      threadIds: [],
      visibility: vis,
    },
    {
      id: "chan-general",
      name: "general-chat",
      type: "text",
      parentId: "cat-2",
      position: 1,
      topic: "General tech discussions, industry news, and casual conversation.",
      purpose: { purpose: "COMMUNITY", confidence: 0.95, source: "metadata" },
      threadIds: [],
      visibility: vis,
    },
    {
      id: "chan-showcase",
      name: "project-showcase",
      type: "text",
      parentId: "cat-2",
      position: 2,
      topic: "Show off what you built! Demos, open-source repos, and launch feedback.",
      purpose: { purpose: "SHOWCASE", confidence: 1.0, source: "metadata" },
      content: {
        instructions: [
          createContent("Share a brief overview of your product or library", "chan-showcase", "message"),
          createContent("Provide links to live demos or GitHub repositories", "chan-showcase", "message"),
          createContent("State specific feedback you are seeking from members", "chan-showcase", "message"),
        ],
        template: createContent(
          "**Project Name**:\n**Live Demo / Repo**:\n**Tech Stack**:\n**Feedback Requested**:",
          "chan-showcase",
          "message"
        ),
      },
      threadIds: [],
      visibility: vis,
    },

    // Engineering
    {
      id: "chan-web",
      name: "web-dev",
      type: "text",
      parentId: "cat-3",
      position: 0,
      topic: "Frontend & Fullstack: React, Vite, Next.js, Web Standards, CSS.",
      purpose: { purpose: "TEAM", confidence: 0.9, source: "metadata" },
      threadIds: ["thread-1", "thread-2"],
      visibility: vis,
    },
    {
      id: "chan-android",
      name: "android-dev",
      type: "text",
      parentId: "cat-3",
      position: 1,
      topic: "Kotlin, Jetpack Compose, Android SDK, and Cross-Platform.",
      purpose: { purpose: "TEAM", confidence: 0.9, source: "metadata" },
      threadIds: [],
      visibility: vis,
    },
    {
      id: "chan-help",
      name: "help-and-support",
      type: "text",
      parentId: "cat-3",
      position: 2,
      topic: "Stuck on a bug or design question? Ask the community here.",
      purpose: { purpose: "SUPPORT", confidence: 1.0, source: "metadata" },
      content: {
        instructions: [
          createContent("State the exact error message and steps to reproduce", "chan-help", "message"),
          createContent("Include relevant code snippets or minimal reproducible example", "chan-help", "message"),
          createContent("Create a thread if the discussion requires extensive debugging", "chan-help", "message"),
        ],
      },
      threadIds: [],
      visibility: vis,
    },

    // Knowledge & Events
    {
      id: "chan-resources",
      name: "curated-resources",
      type: "text",
      parentId: "cat-4",
      position: 0,
      topic: "Curated learning paths, architecture guides, and recommended tools.",
      purpose: { purpose: "KNOWLEDGE", confidence: 1.0, source: "metadata" },
      content: {
        pinnedMessages: [
          createContent("📚 Awesome System Design & Microservices Reference Guide: https://github.com/...", "chan-resources", "pinned-message"),
          createContent("🛠️ Chrome Extensions Architecture with Manifest V3 Cheat Sheet", "chan-resources", "pinned-message"),
        ],
      },
      threadIds: [],
      visibility: vis,
    },
    {
      id: "chan-events",
      name: "events-calendar",
      type: "text",
      parentId: "cat-4",
      position: 1,
      topic: "Upcoming live streams, workshops, meetups, and AMAs.",
      purpose: { purpose: "EVENTS", confidence: 1.0, source: "metadata" },
      threadIds: [],
      visibility: vis,
    },
    {
      id: "chan-stage",
      name: "Main Community Stage",
      type: "stage",
      parentId: "cat-4",
      position: 2,
      topic: "Weekly tech talks, speaker panels, and live podcast sessions.",
      purpose: { purpose: "EVENTS", confidence: 1.0, source: "metadata" },
      threadIds: [],
      visibility: vis,
    },
    {
      id: "chan-voice",
      name: "Collaborative Lounge",
      type: "voice",
      parentId: "cat-4",
      position: 3,
      purpose: { purpose: "COMMUNITY", confidence: 0.8, source: "metadata" },
      threadIds: [],
      visibility: vis,
    },
  ],
  threads: [
    {
      id: "thread-1",
      name: "React 19 Server Components Deep Dive",
      parentId: "chan-web",
      archived: false,
      locked: false,
      messageCount: 48,
      visibility: vis,
    },
    {
      id: "thread-2",
      name: "Tailwind CSS v4 Engine Migration Discussion",
      parentId: "chan-web",
      archived: false,
      locked: false,
      messageCount: 27,
      visibility: vis,
    },
  ],
  roles: mockRoles,
  rules: {
    rules: rulesList,
    sourceChannelId: "chan-rules",
    sourceChannelName: "rules",
  },
  statistics: {
    categories: 4,
    textChannels: 8,
    voiceChannels: 1,
    stageChannels: 1,
    forumChannels: 0,
    announcementChannels: 1,
    mediaChannels: 0,
    totalChannels: 10,
    threads: 2,
    activeThreads: 2,
    archivedThreads: 0,
    roles: 5,
    channelsPerCategory: {
      "cat-1": 3,
      "cat-2": 3,
      "cat-3": 3,
      "cat-4": 4,
    },
    channelsWithTopics: 10,
    channelsWithContent: 6,
    channelsWithPurpose: 12,
    purposeDistribution: {
      ONBOARDING: 2,
      GOVERNANCE: 1,
      INFORMATION: 1,
      COMMUNITY: 2,
      SUPPORT: 1,
      KNOWLEDGE: 1,
      EVENTS: 2,
      TEAM: 2,
      INTERNAL: 0,
      SHOWCASE: 1,
      FEEDBACK: 0,
      OTHER: 0,
    },
  },
  collectedAt: new Date().toISOString(),
  version: 2,
};
