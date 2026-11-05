/* ─────────────────────────────────────────────
 *  Discord Server Architecture Documentation Generator
 *
 *  Exports server blueprints and security models into Markdown,
 *  HTML, JSON, and CSV for Developers, Moderators, or Members.
 * ───────────────────────────────────────────── */

import type { ServerBlueprint } from "./index";
import type { SecurityAuditReport } from "./securityAuditEngine";

export type DocFormat = "markdown" | "html" | "json" | "csv";
export type DocAudience = "developer" | "moderator" | "member";

export function generateServerDocumentation(
  blueprint: ServerBlueprint,
  auditReport: SecurityAuditReport | null,
  format: DocFormat = "markdown",
  audience: DocAudience = "developer"
): string {
  switch (format) {
    case "json":
      return JSON.stringify(
        {
          server: blueprint.server,
          audience,
          generatedAt: new Date().toISOString(),
          categories: blueprint.categories,
          channels: blueprint.channels,
          roles: audience !== "member" ? blueprint.roles : undefined,
          audit: audience !== "member" ? auditReport : undefined,
          statistics: blueprint.statistics,
        },
        null,
        2
      );

    case "csv":
      return generateCSVDocumentation(blueprint, audience);

    case "html":
      return generateHTMLDocumentation(blueprint, auditReport, audience);

    case "markdown":
    default:
      return generateMarkdownDocumentation(blueprint, auditReport, audience);
  }
}

// ── Markdown Generator ─────────────────────────

function generateMarkdownDocumentation(
  blueprint: ServerBlueprint,
  auditReport: SecurityAuditReport | null,
  audience: DocAudience
): string {
  const server = blueprint.server;
  let md = `# ${server.name} — Server Architecture Documentation\n\n`;
  md += `> **Target Audience**: ${audience.toUpperCase()} | Generated on ${new Date().toLocaleDateString()}\n\n`;

  if (server.description) {
    md += `**Description**: ${server.description}\n\n`;
  }

  // Audience Introduction
  if (audience === "developer") {
    md += `## 1. Technical Overview\n`;
    md += `- **Guild ID**: \`${server.id}\`\n`;
    md += `- **Total Channels**: ${blueprint.statistics?.totalChannels || blueprint.channels.length}\n`;
    md += `- **Total Roles**: ${blueprint.roles.length}\n`;
    md += `- **Source Verification**: ${blueprint.scanQuality?.source || "page-visible"}\n\n`;
  } else if (audience === "moderator") {
    md += `## 1. Moderation & Governance Overview\n`;
    md += `- **Guild ID**: \`${server.id}\`\n`;
    md += `- **Estimated Members**: ${server.memberCount || "N/A"}\n`;
    if (auditReport) {
      md += `- **Security Posture Grade**: **${auditReport.grade}** (${auditReport.score}/100)\n`;
      md += `- **Active Security Findings**: ${auditReport.summary.totalFindings} (${auditReport.summary.critical} Critical, ${auditReport.summary.high} High)\n`;
    }
    md += `\n`;
  } else {
    md += `## Welcome to ${server.name}!\n`;
    md += `Here is an organized directory of all community categories and discussion channels.\n\n`;
  }

  // 2. Channel Directory by Category
  md += `## ${audience === "member" ? "Channel Directory" : "2. Architecture & Channel Inventory"}\n\n`;

  const categoryMap = new Map<string, typeof blueprint.categories[0]>();
  for (const cat of blueprint.categories) {
    categoryMap.set(cat.id, cat);
    const catChannels = blueprint.channels.filter((c) => c.parentId === cat.id);

    md += `### 📁 ${cat.name.toUpperCase()}\n`;
    if (catChannels.length === 0) {
      md += `*(Empty Category)*\n\n`;
      continue;
    }

    for (const ch of catChannels) {
      const vis = ch.visibilityAnalysis?.classification;
      const isRestricted = vis === "role-restricted" || vis === "member-restricted";

      // Hide internal staff channels from public member guide
      if (audience === "member" && isRestricted) {
        continue;
      }

      md += `- **#${ch.name}** (\`${ch.type}\`)`;
      if (audience !== "member" && vis) {
        md += ` — *[${vis.toUpperCase()}]*`;
        if (ch.visibilityAnalysis?.rolesWithAccess?.length) {
          md += ` (Roles: ${ch.visibilityAnalysis.rolesWithAccess.join(", ")})`;
        }
      }
      md += `\n`;

      if (ch.topic) {
        md += `  > ${ch.topic}\n`;
      }
    }
    md += `\n`;
  }

  // 3. Role Hierarchy (Developer & Moderator only)
  if (audience !== "member" && blueprint.roles.length > 0) {
    md += `## 3. Role Hierarchy & Access Control\n\n`;
    md += `| Position | Role Name | Key Permissions | Managed |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;
    const sorted = [...blueprint.roles].sort((a, b) => b.position - a.position);
    for (const r of sorted) {
      const perms = (r.permissions || []).slice(0, 5).join(", ") || "Standard";
      md += `| ${r.position} | **${r.name}** | ${perms} | ${r.managed ? "Yes (Bot)" : "No"} |\n`;
    }
    md += `\n`;
  }

  // 4. Security Findings (Moderator only)
  if (audience === "moderator" && auditReport && auditReport.findings.length > 0) {
    md += `## 4. Key Security & Moderation Action Items\n\n`;
    for (const f of auditReport.findings.slice(0, 8)) {
      md += `- **[${f.severity.toUpperCase()}] ${f.title}**\n`;
      md += `  - *Action*: ${f.recommendation}\n`;
      if (f.affectedResourceNames.length > 0) {
        md += `  - *Targets*: ${f.affectedResourceNames.join(", ")}\n`;
      }
    }
    md += `\n`;
  }

  return md;
}

// ── CSV Generator ──────────────────────────────

function generateCSVDocumentation(blueprint: ServerBlueprint, audience: DocAudience): string {
  const headers = ["Channel ID", "Channel Name", "Type", "Category", "Visibility", "Topic"];
  if (audience !== "member") {
    headers.push("Roles With Access", "Is Synced");
  }

  const categoryMap = new Map<string, string>();
  for (const cat of blueprint.categories) {
    categoryMap.set(cat.id, cat.name);
  }

  const rows: string[] = [headers.join(",")];

  for (const ch of blueprint.channels) {
    if (ch.type === "category") continue;
    const catName = ch.parentId ? categoryMap.get(ch.parentId) || "Uncategorized" : "Uncategorized";
    const vis = ch.visibilityAnalysis?.classification || "unknown";

    if (audience === "member" && (vis === "role-restricted" || vis === "member-restricted")) {
      continue;
    }

    const row = [
      `"${ch.id}"`,
      `"${ch.name}"`,
      `"${ch.type}"`,
      `"${catName}"`,
      `"${vis}"`,
      `"${(ch.topic || "").replace(/"/g, '""')}"`,
    ];

    if (audience !== "member") {
      row.push(
        `"${(ch.visibilityAnalysis?.rolesWithAccess || []).join("; ")}"`,
        `"${ch.visibilityAnalysis?.isCategorySynced ? "Yes" : "No"}"`
      );
    }

    rows.push(row.join(","));
  }

  return rows.join("\n");
}

// ── HTML Generator ─────────────────────────────

function generateHTMLDocumentation(
  blueprint: ServerBlueprint,
  auditReport: SecurityAuditReport | null,
  audience: DocAudience
): string {
  const md = generateMarkdownDocumentation(blueprint, auditReport, audience);
  // Basic HTML styling wrapper for standalone browser inspection or PDF export
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${blueprint.server.name} Architecture</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; max-width: 900px; margin: 40px auto; padding: 0 20px; color: #2d3748; background: #f7fafc; }
    h1, h2, h3 { color: #1a202c; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; background: white; }
    th, td { border: 1px solid #cbd5e0; padding: 8px 12px; text-align: left; }
    th { background: #edf2f7; }
    blockquote { border-left: 4px solid #4a5568; margin: 0; padding-left: 16px; color: #718096; }
    code { background: #edf2f7; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
    pre { background: #2d3748; color: #edf2f7; padding: 16px; border-radius: 8px; overflow-x: auto; white-space: pre-wrap; }
  </style>
</head>
<body>
  <pre>${escapeHTML(md)}</pre>
</body>
</html>`;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

