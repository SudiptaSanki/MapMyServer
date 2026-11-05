/* ─────────────────────────────────────────────
 *  Role Parser
 *
 *  Extracts roles from the Discord Settings -> Roles page.
 *  Generates stable deterministic IDs to avoid churn on repeated scans.
 * ───────────────────────────────────────────── */

import type { Role, VisibilityInfo } from "@mapmyserver/shared";

function makeVisibility(): VisibilityInfo {
  return {
    source: "page-visible",
    accessibleToUser: true,
    observedAt: new Date().toISOString(),
  };
}

function generateStableRoleId(roleName: string, element?: Element): string {
  // If Discord has data-list-item-id or id containing numbers
  if (element) {
    const dataId = element.getAttribute("data-list-item-id") || element.id;
    if (dataId) {
      const numMatch = dataId.match(/\d{15,22}/);
      if (numMatch) return numMatch[0];
    }
  }

  const cleanSlug = roleName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `role_${cleanSlug || "unnamed"}`;
}

/**
 * Extracts roles from current DOM rows using accessible attributes.
 */
export async function parseRolesAsync(): Promise<Role[]> {
  const roles: Role[] = [];
  const processedNames = new Set<string>();

  const roleRows = document.querySelectorAll('[role="row"], tr, [class*="roleRow"]');
  let positionCounter = 1;

  for (const row of roleRows) {
    const textContent = row.textContent || "";
    if (!textContent.trim()) continue;

    // Look for role name inside headers, strong, or specific divs
    const nameEl = row.querySelector('h3, h2, strong, [class*="name"]');
    const roleName = nameEl?.textContent?.trim() || "";

    if (
      roleName &&
      roleName.toLowerCase() !== "name" &&
      roleName.toLowerCase() !== "members" &&
      roleName.toLowerCase() !== "roles"
    ) {
      const normKey = roleName.toLowerCase();
      if (processedNames.has(normKey)) continue;
      processedNames.add(normKey);

      // Try to find member count
      let memberCount = 0;
      const countMatch = textContent.match(/(\d+)\s*Members?/i);
      if (countMatch && countMatch[1]) {
        memberCount = parseInt(countMatch[1], 10);
      }

      // Try to find color
      let color: string | undefined = undefined;
      const colorIcon = row.querySelector('[style*="background-color"]') as HTMLElement;
      if (colorIcon) {
        color = colorIcon.style.backgroundColor;
      }

      const id = generateStableRoleId(roleName, row);

      roles.push({
        id,
        name: roleName,
        color,
        position: roleName.toLowerCase() === "@everyone" ? 0 : positionCounter++,
        memberCount,
        visibility: makeVisibility(),
      });
    }
  }

  // Fallback: aria-labels
  if (roles.length === 0) {
    const roleElements = document.querySelectorAll('[aria-label^="Role"], [aria-label*=" role"]');
    for (const el of roleElements) {
      const label = el.getAttribute("aria-label") || "";
      if (label.toLowerCase().includes("role")) {
        const parts = label.split(",");
        const name = parts[1]?.trim() || label.replace(/role/i, "").trim();

        const normKey = name.toLowerCase();
        if (name && !processedNames.has(normKey)) {
          processedNames.add(normKey);
          roles.push({
            id: generateStableRoleId(name, el),
            name,
            position: name.toLowerCase() === "@everyone" ? 0 : positionCounter++,
            visibility: makeVisibility(),
          });
        }
      }
    }
  }

  return roles;
}
