import type { ServerBlueprint } from "@mapmyserver/shared";

/**
 * Generates an optimized Markdown prompt ready to be pasted into ChatGPT, Claude, Gemini,
 * or any AI to review and suggest upgrades for Discord server roles, channels, and architecture.
 */
export function generateAIPrompt(blueprint: ServerBlueprint): string {
  const { server, categories, channels, threads, roles, rules, statistics } = blueprint;

  // Build tree text
  let treeText = "";
  for (const cat of categories) {
    treeText += `\n### 📁 ${cat.name}\n`;
    const catChannels = channels.filter((c) => c.parentId === cat.id);
    if (catChannels.length === 0) {
      treeText += `  *(No channels detected)*\n`;
    }
    for (const chan of catChannels) {
      const purposeTag = chan.purpose ? ` [Purpose: ${chan.purpose.purpose}]` : "";
      const topicText = chan.topic ? ` - Topic: "${chan.topic}"` : "";
      treeText += `- #${chan.name} (${chan.type}${purposeTag})${topicText}\n`;

      const chanThreads = threads.filter((t) => t.parentId === chan.id);
      for (const thr of chanThreads) {
        treeText += `  └── 💬 Thread: "${thr.name}"\n`;
      }
    }
  }

  // Uncategorized channels
  const uncat = channels.filter((c) => !c.parentId && c.type !== "category");
  if (uncat.length > 0) {
    treeText += `\n### 📁 Uncategorized\n`;
    for (const chan of uncat) {
      const purposeTag = chan.purpose ? ` [Purpose: ${chan.purpose.purpose}]` : "";
      const topicText = chan.topic ? ` - Topic: "${chan.topic}"` : "";
      treeText += `- #${chan.name} (${chan.type}${purposeTag})${topicText}\n`;
    }
  }

  // Rules text
  let rulesText = "No specific rules extracted from sidebar.";
  if (rules && rules.rules.length > 0) {
    rulesText = rules.rules.map((r, i) => `${i + 1}. ${r.text}`).join("\n");
  }

  // Roles text (if any)
  let rolesText = "Standard role hierarchy.";
  if (roles && roles.length > 0) {
    rolesText = roles
      .map(
        (r) =>
          `- **${r.name}** (Position: ${r.position}${
            r.memberCount !== undefined ? `, Members: ${r.memberCount}` : ""
          })`
      )
      .join("\n");
  }

  return `# 🏛️ Discord Community Architecture & Role Optimization Request

I have extracted the current structural blueprint of my Discord server **"${server.name}"** using MapMyServer.
Please act as an **expert Discord Community Architect, Systems Designer, and Moderation Consultant**.

Analyze my current hierarchy, channel structure, roles, and guidelines below, and provide a comprehensive upgrade and optimization plan covering:

1. **Category & Channel Restructuring**:
   - Identify redundant, confusing, or underutilized channels.
   - Suggest missing standard channels (e.g. onboarding funnels, community showcase, governance, specialized forums).
   - Provide a clean "Recommended After" category and channel tree layout.

2. **Complete Role & Permission Hierarchy**:
   - Design a professional role hierarchy (Leadership, Moderation, Staff, VIP/Contributors, Member tiers, Ping/Notification roles).
   - Specify recommended channel permissions (read/write/embed/voice/manage) for each role tier.

3. **Onboarding & Retention Funnel**:
   - How to optimize #rules, #welcome, and self-assignable role selection to maximize retention.
   - Suggested channel descriptions, starter post templates, and rules enhancements.

4. **Growth & Engagement Routine**:
   - Recommended bots, event ideas, and weekly routines tailored for this community.

---

## 📊 Current Server Overview
- **Server Name**: ${server.name}
- **Server ID**: ${server.id}
${server.description ? `- **Description**: ${server.description}` : ""}
${server.memberCount ? `- **Member Count**: ${server.memberCount.toLocaleString()}` : ""}
- **Total Categories**: ${statistics.categories}
- **Total Channels**: ${statistics.totalChannels} (${statistics.textChannels} Text, ${statistics.voiceChannels} Voice, ${statistics.stageChannels} Stage, ${statistics.forumChannels} Forum, ${statistics.announcementChannels} Announcements)
- **Active Threads**: ${statistics.threads}

---

## 🌳 Current Server Tree Hierarchy
${treeText.trim()}

---

## 📜 Current Server Rules
${rulesText}

---

## 👥 Detected Roles
${rolesText}

---

Please provide your detailed, actionable recommendations organized by:
1. Category & Channel Reorganization (Clean proposed layout)
2. Complete Role Hierarchy & Permissions Matrix
3. Engagement & Onboarding System Improvements
4. Growth & Moderation Recommendations
`;
}
