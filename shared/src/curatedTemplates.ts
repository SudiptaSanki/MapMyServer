/* ─────────────────────────────────────────────
 *  Curated Server Architecture Templates
 *
 *  9 professional, structured blueprints covering:
 *  Developer, Open-Source, Gaming, Creator, Startup,
 *  Organization, Support, Education, and General Community.
 * ───────────────────────────────────────────── */

import type { ServerTemplate } from "./templateTypes";

export const CURATED_TEMPLATES: ServerTemplate[] = [
  {
    id: "template-developer-community",
    name: "Developer & Tech Community",
    description: "Production-grade Discord architecture optimized for software engineers, code reviews, tech stacks, and team collaboration.",
    category: "developer",
    version: "1.0.0",
    tags: ["developer", "tech", "coding", "software", "popular"],
    categories: [
      {
        name: "WELCOME & GUIDELINES",
        position: 0,
        channels: [
          { name: "rules-and-faq", type: "text", position: 0, topic: "Community rules, code of conduct, and FAQ", purpose: "GOVERNANCE", visibility: "broadly-accessible" },
          { name: "announcements", type: "announcement", position: 1, topic: "Important community updates and releases", purpose: "INFORMATION", visibility: "broadly-accessible" },
          { name: "introduce-yourself", type: "text", position: 2, topic: "Introduce your tech stack and current projects", purpose: "ONBOARDING", visibility: "broadly-accessible" },
        ],
      },
      {
        name: "CORE DISCUSSIONS",
        position: 1,
        channels: [
          { name: "general-tech", type: "text", position: 0, topic: "General programming and tech discussions", purpose: "COMMUNITY", visibility: "broadly-accessible" },
          { name: "frontend", type: "text", position: 1, topic: "React, Vue, Tailwind, CSS, UI/UX architecture", purpose: "KNOWLEDGE", visibility: "broadly-accessible" },
          { name: "backend-and-cloud", type: "text", position: 2, topic: "Node.js, Go, Rust, Python, Docker, Kubernetes, AWS", purpose: "KNOWLEDGE", visibility: "broadly-accessible" },
          { name: "ai-and-ml", type: "text", position: 3, topic: "LLMs, PyTorch, model deployments, agent frameworks", purpose: "KNOWLEDGE", visibility: "broadly-accessible" },
          { name: "code-help", type: "forum", position: 4, topic: "Ask debugging questions, post snippets, get help", purpose: "SUPPORT", visibility: "broadly-accessible" },
        ],
      },
      {
        name: "SHOWCASE & OPPORTUNITIES",
        position: 2,
        channels: [
          { name: "project-showcase", type: "forum", position: 0, topic: "Share your side projects and open source repos", purpose: "SHOWCASE", visibility: "broadly-accessible" },
          { name: "jobs-and-gigs", type: "text", position: 1, topic: "Job postings, freelance contracts, hiring inquiries", purpose: "INFORMATION", visibility: "broadly-accessible" },
        ],
      },
      {
        name: "VOICE LOUNGES",
        position: 3,
        channels: [
          { name: "Pair Programming 1", type: "voice", position: 0, purpose: "TEAM", visibility: "broadly-accessible" },
          { name: "Pair Programming 2", type: "voice", position: 1, purpose: "TEAM", visibility: "broadly-accessible" },
          { name: "Tech Talk Lounge", type: "voice", position: 2, purpose: "COMMUNITY", visibility: "broadly-accessible" },
        ],
      },
      {
        name: "STAFF & MODERATION",
        position: 4,
        isStaffOnly: true,
        channels: [
          { name: "mod-chat", type: "text", position: 0, topic: "Staff internal coordination", purpose: "INTERNAL", visibility: "role-restricted", suggestedRolesWithAccess: ["Moderator", "Admin"], isStaffOnly: true },
          { name: "audit-logs", type: "text", position: 1, topic: "Automated moderation bot action log", purpose: "GOVERNANCE", visibility: "role-restricted", suggestedRolesWithAccess: ["Moderator", "Admin"], isStaffOnly: true },
        ],
      },
    ],
    roles: [
      { name: "Admin", position: 10, color: "#e74c3c", permissions: ["ADMINISTRATOR"], hoist: true },
      { name: "Moderator", position: 9, color: "#2ecc71", permissions: ["MANAGE_MESSAGES", "KICK_MEMBERS", "BAN_MEMBERS", "MUTE_MEMBERS", "VIEW_AUDIT_LOG"], hoist: true },
      { name: "Core Contributor", position: 8, color: "#3498db", permissions: ["ATTACH_FILES", "EMBED_LINKS", "USE_EXTERNAL_EMOJIS"], hoist: true },
      { name: "Member", position: 1, color: "#95a5a6", permissions: ["VIEW_CHANNEL", "SEND_MESSAGES", "READ_MESSAGE_HISTORY", "CONNECT", "SPEAK"] },
    ],
    securityConfig: {
      requireTwoFactorForModerators: true,
      verificationLevel: "medium",
      defaultNotifications: "only_mentions",
      recommendedModeratorRoles: ["Admin", "Moderator"],
    },
    onboardingSuggestions: [
      "Use #rules-and-faq with Discord onboarding prompt to auto-assign tech stack roles",
      "Configure #code-help as a Forum channel with tags for JS, Python, Rust, Cloud",
    ],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },

  {
    id: "template-open-source-project",
    name: "Open-Source Project",
    description: "Designed for open-source repositories, contributor triage, RFC discussions, and maintainer workflow.",
    category: "opensource",
    version: "1.0.0",
    tags: ["opensource", "github", "contributing", "rfc"],
    categories: [
      {
        name: "WELCOME & COMMUNITY",
        position: 0,
        channels: [
          { name: "readme", type: "text", position: 0, topic: "Project mission, repository links, documentation", purpose: "INFORMATION", visibility: "broadly-accessible" },
          { name: "announcements", type: "announcement", position: 1, topic: "Releases, changelogs, roadmaps", purpose: "INFORMATION", visibility: "broadly-accessible" },
          { name: "general", type: "text", position: 2, topic: "General community chatter", purpose: "COMMUNITY", visibility: "broadly-accessible" },
        ],
      },
      {
        name: "DEVELOPMENT & RFC",
        position: 1,
        channels: [
          { name: "github-activity", type: "text", position: 0, topic: "Automated webhook feeds for PRs and issues", purpose: "INFORMATION", visibility: "broadly-accessible" },
          { name: "rfc-proposals", type: "forum", position: 1, topic: "Architectural RFCs, spec discussions, and new features", purpose: "KNOWLEDGE", visibility: "broadly-accessible" },
          { name: "triage-help", type: "text", position: 2, topic: "Good first issues and contributor onboarding", purpose: "SUPPORT", visibility: "broadly-accessible" },
        ],
      },
      {
        name: "MAINTAINERS ONLY",
        position: 2,
        isStaffOnly: true,
        channels: [
          { name: "maintainers-discussion", type: "text", position: 0, topic: "Internal release planning and security patches", purpose: "INTERNAL", visibility: "role-restricted", suggestedRolesWithAccess: ["Maintainer"], isStaffOnly: true },
          { name: "security-incident-reports", type: "text", position: 1, topic: "Private CVE and vulnerability reports", purpose: "INTERNAL", visibility: "role-restricted", suggestedRolesWithAccess: ["Maintainer"], isStaffOnly: true },
        ],
      },
    ],
    roles: [
      { name: "Lead Maintainer", position: 10, color: "#9b59b6", permissions: ["ADMINISTRATOR"], hoist: true },
      { name: "Maintainer", position: 9, color: "#e67e22", permissions: ["MANAGE_CHANNELS", "MANAGE_MESSAGES", "MUTE_MEMBERS"], hoist: true },
      { name: "Contributor", position: 5, color: "#1abc9c", permissions: ["ATTACH_FILES", "EMBED_LINKS"], hoist: true },
      { name: "Community", position: 1, color: "#bdc3c7", permissions: ["VIEW_CHANNEL", "SEND_MESSAGES", "READ_MESSAGE_HISTORY"] },
    ],
    securityConfig: {
      requireTwoFactorForModerators: true,
      verificationLevel: "high",
      defaultNotifications: "only_mentions",
    },
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },

  {
    id: "template-gaming-community",
    name: "Gaming Community & Esports Guild",
    description: "Squad voice rooms, LFG (Looking for Group) channels, clip highlights, and tournament organization.",
    category: "gaming",
    version: "1.0.0",
    tags: ["gaming", "esports", "lfg", "squads", "voice"],
    categories: [
      {
        name: "INFO & COMMUNITY",
        position: 0,
        channels: [
          { name: "rules", type: "text", position: 0, topic: "Server rules and fair play guidelines", purpose: "GOVERNANCE", visibility: "broadly-accessible" },
          { name: "announcements", type: "announcement", position: 1, topic: "Server tournaments and community game nights", purpose: "INFORMATION", visibility: "broadly-accessible" },
          { name: "general-chat", type: "text", position: 2, topic: "Hang out and talk games", purpose: "COMMUNITY", visibility: "broadly-accessible" },
          { name: "clips-and-highlights", type: "text", position: 3, topic: "Post your game clips and screenshots", purpose: "SHOWCASE", visibility: "broadly-accessible" },
        ],
      },
      {
        name: "LOOKING FOR GROUP",
        position: 1,
        channels: [
          { name: "lfg-casual", type: "text", position: 0, topic: "Drop your gamertag and find squadmates", purpose: "COMMUNITY", visibility: "broadly-accessible" },
          { name: "lfg-competitive", type: "text", position: 1, topic: "Ranked grind and scrim finder", purpose: "COMMUNITY", visibility: "broadly-accessible" },
        ],
      },
      {
        name: "SQUAD VOICE ROOMS",
        position: 2,
        channels: [
          { name: "Squad Alpha (Duos)", type: "voice", position: 0, purpose: "TEAM", visibility: "broadly-accessible" },
          { name: "Squad Bravo (Trios)", type: "voice", position: 1, purpose: "TEAM", visibility: "broadly-accessible" },
          { name: "Squad Charlie (Full Stack)", type: "voice", position: 2, purpose: "TEAM", visibility: "broadly-accessible" },
          { name: "Community Lounge", type: "voice", position: 3, purpose: "COMMUNITY", visibility: "broadly-accessible" },
        ],
      },
      {
        name: "MODERATION",
        position: 3,
        isStaffOnly: true,
        channels: [
          { name: "mod-logs", type: "text", position: 0, topic: "Anti-cheat and moderation reports", purpose: "INTERNAL", visibility: "role-restricted", suggestedRolesWithAccess: ["Moderator", "Guild Master"], isStaffOnly: true },
        ],
      },
    ],
    roles: [
      { name: "Guild Master", position: 10, color: "#f1c40f", permissions: ["ADMINISTRATOR"], hoist: true },
      { name: "Moderator", position: 8, color: "#2ecc71", permissions: ["KICK_MEMBERS", "BAN_MEMBERS", "MANAGE_MESSAGES", "MUTE_MEMBERS", "MOVE_MEMBERS"], hoist: true },
      { name: "Competitive Player", position: 5, color: "#e74c3c", permissions: ["PRIORITY_SPEAKER"], hoist: true },
      { name: "Member", position: 1, color: "#95a5a6", permissions: ["VIEW_CHANNEL", "SEND_MESSAGES", "CONNECT", "SPEAK"] },
    ],
    securityConfig: {
      verificationLevel: "low",
      defaultNotifications: "only_mentions",
    },
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },

  {
    id: "template-creator-streamer",
    name: "Creator & Streamer Community",
    description: "Built for streamers, YouTubers, and content creators with live alerts, fan art, and VIP community tiers.",
    category: "creator",
    version: "1.0.0",
    tags: ["creator", "youtube", "twitch", "streamer", "fan"],
    categories: [
      {
        name: "CREATOR NOTIFICATIONS",
        position: 0,
        channels: [
          { name: "stream-alerts", type: "announcement", position: 0, topic: "Automated Twitch/YouTube live notifications", purpose: "INFORMATION", visibility: "broadly-accessible" },
          { name: "creator-announcements", type: "announcement", position: 1, topic: "Video uploads, schedule updates, merch drops", purpose: "INFORMATION", visibility: "broadly-accessible" },
        ],
      },
      {
        name: "COMMUNITY CORNER",
        position: 1,
        channels: [
          { name: "general", type: "text", position: 0, topic: "Chat with fellow community members", purpose: "COMMUNITY", visibility: "broadly-accessible" },
          { name: "fan-art-and-memes", type: "text", position: 1, topic: "Share creations, memes, and fanart", purpose: "SHOWCASE", visibility: "broadly-accessible" },
          { name: "video-suggestions", type: "forum", position: 2, topic: "Suggest ideas for upcoming content", purpose: "FEEDBACK", visibility: "broadly-accessible" },
        ],
      },
      {
        name: "VIP & SUPPORTER LOUNGE",
        position: 2,
        channels: [
          { name: "subscriber-chat", type: "text", position: 0, topic: "Exclusive chat for Patrons, Twitch subs, and boosters", purpose: "COMMUNITY", visibility: "role-restricted", suggestedRolesWithAccess: ["Subscribers", "Supporters"] },
          { name: "Sub Voice Hangout", type: "voice", position: 1, purpose: "COMMUNITY", visibility: "role-restricted", suggestedRolesWithAccess: ["Subscribers", "Supporters"] },
        ],
      },
    ],
    roles: [
      { name: "Creator", position: 10, color: "#e91e63", permissions: ["ADMINISTRATOR"], hoist: true },
      { name: "Moderator", position: 8, color: "#00bcd4", permissions: ["MANAGE_MESSAGES", "MUTE_MEMBERS", "KICK_MEMBERS"], hoist: true },
      { name: "Subscribers", position: 5, color: "#9c27b0", permissions: ["ATTACH_FILES", "EMBED_LINKS", "USE_EXTERNAL_EMOJIS"], hoist: true },
      { name: "Follower", position: 1, color: "#95a5a6", permissions: ["VIEW_CHANNEL", "SEND_MESSAGES", "READ_MESSAGE_HISTORY"] },
    ],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },

  {
    id: "template-startup-business",
    name: "Startup & Remote Business Team",
    description: "Structured internal workspace for company operations, product engineering, design, and executive channels.",
    category: "startup",
    version: "1.0.0",
    tags: ["startup", "business", "remote", "company", "team"],
    categories: [
      {
        name: "COMPANY ALL-HANDS",
        position: 0,
        channels: [
          { name: "all-hands-announcements", type: "announcement", position: 0, topic: "Company-wide updates, milestones, and announcements", purpose: "INFORMATION", visibility: "broadly-accessible" },
          { name: "watercooler", type: "text", position: 1, topic: "Casual social chat and team shoutouts", purpose: "COMMUNITY", visibility: "broadly-accessible" },
        ],
      },
      {
        name: "PRODUCT & TECH",
        position: 1,
        channels: [
          { name: "product-roadmap", type: "text", position: 0, topic: "Sprint planning and roadmap updates", purpose: "TEAM", visibility: "broadly-accessible" },
          { name: "engineering", type: "text", position: 1, topic: "Architecture, PRs, and infrastructure discussions", purpose: "TEAM", visibility: "broadly-accessible" },
          { name: "design-and-ux", type: "text", position: 2, topic: "Figma designs, prototypes, and user research", purpose: "TEAM", visibility: "broadly-accessible" },
        ],
      },
      {
        name: "BUSINESS OPS",
        position: 2,
        channels: [
          { name: "marketing-and-growth", type: "text", position: 0, topic: "Campaigns, content strategy, analytics", purpose: "TEAM", visibility: "broadly-accessible" },
          { name: "sales-and-customers", type: "text", position: 1, topic: "Lead pipeline, customer feedback, and demos", purpose: "TEAM", visibility: "broadly-accessible" },
        ],
      },
      {
        name: "EXECUTIVE & LEADERSHIP",
        position: 3,
        isStaffOnly: true,
        channels: [
          { name: "leadership-sync", type: "text", position: 0, topic: "Exec sync, finance, and confidential operations", purpose: "INTERNAL", visibility: "role-restricted", suggestedRolesWithAccess: ["Founder", "Executive"], isStaffOnly: true },
        ],
      },
    ],
    roles: [
      { name: "Founder", position: 10, color: "#f39c12", permissions: ["ADMINISTRATOR"], hoist: true },
      { name: "Team Lead", position: 8, color: "#3498db", permissions: ["MANAGE_CHANNELS", "MANAGE_MESSAGES"], hoist: true },
      { name: "Team Member", position: 5, color: "#2ecc71", permissions: ["VIEW_CHANNEL", "SEND_MESSAGES", "ATTACH_FILES", "CONNECT", "SPEAK"], hoist: true },
    ],
    securityConfig: {
      requireTwoFactorForModerators: true,
      verificationLevel: "highest",
      defaultNotifications: "all_messages",
    },
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },

  {
    id: "template-customer-support",
    name: "Customer Support & Product Hub",
    description: "Public documentation, ticket triage, customer Q&A, and service status updates.",
    category: "support",
    version: "1.0.0",
    tags: ["support", "tickets", "faq", "customer-service"],
    categories: [
      {
        name: "GETTING STARTED",
        position: 0,
        channels: [
          { name: "knowledge-base", type: "text", position: 0, topic: "Documentation links, quick start guides, and FAQs", purpose: "KNOWLEDGE", visibility: "broadly-accessible" },
          { name: "service-status", type: "announcement", position: 1, topic: "Downtime alerts and operational health status", purpose: "INFORMATION", visibility: "broadly-accessible" },
        ],
      },
      {
        name: "SUPPORT CHANNELS",
        position: 1,
        channels: [
          { name: "ask-the-community", type: "forum", position: 0, topic: "Peer-to-peer troubleshooting and usage help", purpose: "SUPPORT", visibility: "broadly-accessible" },
          { name: "feature-requests", type: "forum", position: 1, topic: "Submit and upvote product enhancements", purpose: "FEEDBACK", visibility: "broadly-accessible" },
          { name: "bug-reports", type: "forum", position: 2, topic: "Structured issue reporting and reproductions", purpose: "SUPPORT", visibility: "broadly-accessible" },
        ],
      },
      {
        name: "SUPPORT STAFF",
        position: 2,
        isStaffOnly: true,
        channels: [
          { name: "support-queue", type: "text", position: 0, topic: "Internal agent ticket assignments", purpose: "INTERNAL", visibility: "role-restricted", suggestedRolesWithAccess: ["Support Agent", "Admin"], isStaffOnly: true },
        ],
      },
    ],
    roles: [
      { name: "Support Admin", position: 10, color: "#e74c3c", permissions: ["ADMINISTRATOR"], hoist: true },
      { name: "Support Agent", position: 8, color: "#3498db", permissions: ["MANAGE_MESSAGES", "MUTE_MEMBERS"], hoist: true },
      { name: "Verified Customer", position: 2, color: "#2ecc71", permissions: ["VIEW_CHANNEL", "SEND_MESSAGES", "ATTACH_FILES"], hoist: true },
    ],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },

  {
    id: "template-education-study",
    name: "Education & Study Group",
    description: "Ideal for university courses, bootcamps, and study clubs with lecture notes, TA hours, and study rooms.",
    category: "education",
    version: "1.0.0",
    tags: ["education", "school", "study", "lecture", "student"],
    categories: [
      {
        name: "COURSE INFORMATION",
        position: 0,
        channels: [
          { name: "syllabus-and-schedule", type: "text", position: 0, topic: "Course outline, dates, textbook references", purpose: "INFORMATION", visibility: "broadly-accessible" },
          { name: "class-announcements", type: "announcement", position: 1, topic: "Exam reminders and assignment drops", purpose: "INFORMATION", visibility: "broadly-accessible" },
        ],
      },
      {
        name: "SUBJECTS & DISCUSSIONS",
        position: 1,
        channels: [
          { name: "lecture-questions", type: "forum", position: 0, topic: "Ask questions related to recent lectures", purpose: "KNOWLEDGE", visibility: "broadly-accessible" },
          { name: "assignment-collab", type: "text", position: 1, topic: "Discuss problem sets and project guidelines", purpose: "SUPPORT", visibility: "broadly-accessible" },
          { name: "resources-and-notes", type: "text", position: 2, topic: "Share study guides, slides, and cheat-sheets", purpose: "KNOWLEDGE", visibility: "broadly-accessible" },
        ],
      },
      {
        name: "VIRTUAL STUDY ROOMS",
        position: 2,
        channels: [
          { name: "Silent Study Lounge", type: "voice", position: 0, purpose: "COMMUNITY", visibility: "broadly-accessible" },
          { name: "Group Discussion Room", type: "voice", position: 1, purpose: "TEAM", visibility: "broadly-accessible" },
          { name: "Office Hours (TA)", type: "voice", position: 2, purpose: "SUPPORT", visibility: "broadly-accessible" },
        ],
      },
    ],
    roles: [
      { name: "Instructor", position: 10, color: "#8e44ad", permissions: ["ADMINISTRATOR"], hoist: true },
      { name: "Teaching Assistant", position: 8, color: "#2980b9", permissions: ["MANAGE_CHANNELS", "MANAGE_MESSAGES", "MUTE_MEMBERS"], hoist: true },
      { name: "Student", position: 2, color: "#27ae60", permissions: ["VIEW_CHANNEL", "SEND_MESSAGES", "CONNECT", "SPEAK"] },
    ],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },

  {
    id: "template-private-org",
    name: "Private Organization & Governance",
    description: "Strictly partitioned internal hierarchy for operations, security monitoring, and leadership.",
    category: "organization",
    version: "1.0.0",
    tags: ["organization", "internal", "governance", "private"],
    categories: [
      {
        name: "OPERATIONS",
        position: 0,
        channels: [
          { name: "briefings", type: "announcement", position: 0, topic: "Daily operational briefings and bulletins", purpose: "INFORMATION", visibility: "broadly-accessible" },
          { name: "ops-desk", type: "text", position: 1, topic: "Operations monitoring and ticket handling", purpose: "TEAM", visibility: "broadly-accessible" },
        ],
      },
      {
        name: "LEADERSHIP & AUDIT",
        position: 1,
        isStaffOnly: true,
        channels: [
          { name: "executive-council", type: "text", position: 0, topic: "Executive decisions and voting", purpose: "INTERNAL", visibility: "role-restricted", suggestedRolesWithAccess: ["Council Member", "Director"], isStaffOnly: true },
          { name: "security-audit-stream", type: "text", position: 1, topic: "Internal audit tracking and incident responses", purpose: "GOVERNANCE", visibility: "role-restricted", suggestedRolesWithAccess: ["Security Lead", "Director"], isStaffOnly: true },
        ],
      },
    ],
    roles: [
      { name: "Director", position: 10, color: "#2c3e50", permissions: ["ADMINISTRATOR"], hoist: true },
      { name: "Council Member", position: 8, color: "#c0392b", permissions: ["MANAGE_CHANNELS", "MANAGE_ROLES"], hoist: true },
      { name: "Operator", position: 3, color: "#7f8c8d", permissions: ["VIEW_CHANNEL", "SEND_MESSAGES", "CONNECT"] },
    ],
    securityConfig: {
      requireTwoFactorForModerators: true,
      verificationLevel: "highest",
      defaultNotifications: "only_mentions",
    },
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },

  {
    id: "template-general-community",
    name: "General Community & Social Hub",
    description: "A balanced, welcoming layout for hobbies, gaming, creative chat, and casual hangout.",
    category: "community",
    version: "1.0.0",
    tags: ["community", "social", "chat", "hangout", "popular"],
    categories: [
      {
        name: "WELCOME & RULES",
        position: 0,
        channels: [
          { name: "welcome-and-rules", type: "text", position: 0, topic: "Welcome to the server! Read our basic rules", purpose: "ONBOARDING", visibility: "broadly-accessible" },
          { name: "announcements", type: "announcement", position: 1, topic: "Server news, events, and updates", purpose: "INFORMATION", visibility: "broadly-accessible" },
        ],
      },
      {
        name: "GENERAL CHAT",
        position: 1,
        channels: [
          { name: "general", type: "text", position: 0, topic: "Main lounge for chatting about anything", purpose: "COMMUNITY", visibility: "broadly-accessible" },
          { name: "media-and-memes", type: "text", position: 1, topic: "Share funny memes, images, and clips", purpose: "SHOWCASE", visibility: "broadly-accessible" },
          { name: "bot-playground", type: "text", position: 2, topic: "Music bots, mini-games, and slash commands", purpose: "COMMUNITY", visibility: "broadly-accessible" },
        ],
      },
      {
        name: "VOICE CHANNELS",
        position: 2,
        channels: [
          { name: "General Voice 1", type: "voice", position: 0, purpose: "COMMUNITY", visibility: "broadly-accessible" },
          { name: "General Voice 2", type: "voice", position: 1, purpose: "COMMUNITY", visibility: "broadly-accessible" },
        ],
      },
    ],
    roles: [
      { name: "Owner", position: 10, color: "#f39c12", permissions: ["ADMINISTRATOR"], hoist: true },
      { name: "Moderator", position: 8, color: "#2ecc71", permissions: ["KICK_MEMBERS", "BAN_MEMBERS", "MANAGE_MESSAGES", "MUTE_MEMBERS"], hoist: true },
      { name: "Member", position: 1, color: "#95a5a6", permissions: ["VIEW_CHANNEL", "SEND_MESSAGES", "CONNECT", "SPEAK"] },
    ],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
];
