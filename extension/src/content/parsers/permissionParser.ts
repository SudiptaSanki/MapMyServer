/* ─────────────────────────────────────────────
 *  Permission Parser
 *
 *  Extracts channel permission overrides from the
 *  Discord Edit Channel -> Permissions page.
 * ───────────────────────────────────────────── */

import type { PermissionOverwrite } from "@mapmyserver/shared";

/**
 * Extracts visible permission overrides from the current DOM modal.
 */
export async function parseChannelPermissionsAsync(): Promise<PermissionOverwrite[]> {
  const overrides: PermissionOverwrite[] = [];
  const processedNames = new Set<string>();

  // Look for role/member rows in the permissions left-hand list
  const roleRows = document.querySelectorAll('[role="row"], [role="tab"], [class*="roleRow"]');

  for (const row of roleRows) {
    const textContent = row.textContent || "";
    if (!textContent.trim() || textContent.toLowerCase().includes("roles/members")) continue;

    const nameEl = row.querySelector('[class*="roleName"], [class*="name"], span, div');
    const name = nameEl?.textContent?.trim() || textContent.trim();
    const cleanKey = name.toLowerCase();

    if (name && !processedNames.has(cleanKey)) {
      processedNames.add(cleanKey);

      const allow: string[] = [];
      const deny: string[] = [];

      // Check if this row is selected (or if switches are present)
      const isSelected =
        row.getAttribute("aria-selected") === "true" ||
        row.className.includes("selected");

      if (isSelected) {
        const switches = document.querySelectorAll('[role="switch"], [role="radiogroup"]');
        for (const sw of switches) {
          const permLabel =
            sw.closest("div")?.parentElement?.querySelector('h3, h2, div[class*="title"]')?.textContent?.trim() ||
            sw.getAttribute("aria-label") ||
            "";

          if (!permLabel) continue;

          const isAllow =
            sw.querySelector('svg[class*="check"]') ||
            sw.getAttribute("aria-checked") === "true";
          const isDeny =
            sw.querySelector('svg[class*="cross"]') ||
            sw.getAttribute("aria-checked") === "false";

          // Normalize permission label
          const normLabel = permLabel.toUpperCase().replace(/\s+/g, "_");

          if (isAllow) allow.push(normLabel);
          else if (isDeny) deny.push(normLabel);
        }
      }

      const slug = name.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
      overrides.push({
        id: `ow_${slug}`,
        type: name.includes("#") || name.startsWith("@") && name !== "@everyone" ? "member" : "role",
        allow,
        deny,
      });
    }
  }

  return overrides;
}
