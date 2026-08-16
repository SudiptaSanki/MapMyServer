/* ─────────────────────────────────────────────
 *  Server Parser
 *
 *  Extracts server-level metadata from the
 *  Discord page DOM using ARIA attributes
 *  and semantic structure.
 * ───────────────────────────────────────────── */

import type { ServerInfo, VisibilityInfo } from "@mapmyserver/shared";

function makeVisibility(): VisibilityInfo {
  return {
    source: "page-visible",
    accessibleToUser: true,
    observedAt: new Date().toISOString(),
  };
}

/**
 * Extract the guild (server) ID from the current URL.
 * URL pattern: discord.com/channels/{guildId}/{channelId}
 */
export function extractGuildIdFromUrl(url: string): string | null {
  const match = url.match(
    /discord(?:app)?\.com\/channels\/(\d{17,20})/
  );
  return match?.[1] ?? null;
}

/**
 * Extract the channel ID from the current URL.
 */
export function extractChannelIdFromUrl(url: string): string | null {
  const match = url.match(
    /discord(?:app)?\.com\/channels\/\d{17,20}\/(\d{17,20})/
  );
  return match?.[1] ?? null;
}

/**
 * Check if the current page is a Discord server page (not DMs).
 */
export function isOnDiscordServer(url: string): boolean {
  const guildId = extractGuildIdFromUrl(url);
  return guildId !== null && guildId !== "@me";
}

/**
 * Try to extract the server name from the DOM.
 * Discord renders the server name in a header element in the sidebar.
 */
export function extractServerName(): string | null {
  // Strategy 1: Look for the server header button/element
  // Discord typically has a header with the server name at the top of the sidebar
  const headerSelectors = [
    // The server name is often in a clickable header at the top of the channel sidebar
    'h2[class*="name"]',
    '[class*="headerContent"] [class*="name"]',
    'header[class*="header"] [class*="name"]',
  ];

  for (const selector of headerSelectors) {
    const el = document.querySelector(selector);
    if (el?.textContent?.trim()) {
      return el.textContent.trim();
    }
  }

  // Strategy 2: Look for the server name via ARIA
  const buttons = document.querySelectorAll('button[aria-label]');
  for (const button of buttons) {
    const label = button.getAttribute("aria-label") ?? "";
    // Discord server dropdowns often have aria-label matching the server name
    if (
      button.closest('[class*="sidebar"]') &&
      label.length > 0 &&
      label.length < 100 &&
      !label.toLowerCase().includes("channel") &&
      !label.toLowerCase().includes("thread")
    ) {
      // Check if this is in the header area (top of sidebar)
      const rect = button.getBoundingClientRect();
      if (rect.top < 80) {
        return label;
      }
    }
  }

  // Strategy 3: Look for the guild name in the document title
  // Discord's title is often "Server Name - Channel Name"
  const title = document.title;
  if (title.includes(" | Discord")) {
    // "Discord | Server" or "#channel | Server | Discord"
    const parts = title.split(" | ");
    if (parts.length >= 3) {
      return parts[parts.length - 2]?.trim() ?? null;
    }
  }

  // Strategy 4: Look for a heading in the guild sidebar header area
  const sidebar = document.querySelector('nav[aria-label="Servers sidebar"]');
  if (sidebar) {
    const selectedServer = sidebar.querySelector('[aria-selected="true"]');
    if (selectedServer) {
      const label = selectedServer.getAttribute("aria-label");
      if (label) {
        // Often "ServerName (server)" pattern
        return label.replace(/\s*\(server\)\s*$/i, "").trim();
      }
    }
  }

  return null;
}

/**
 * Try to extract the server icon URL.
 */
export function extractServerIcon(): string | undefined {
  // Look for the selected server icon in the server list
  const serverList = document.querySelector('nav[aria-label="Servers sidebar"]');
  if (serverList) {
    const selected = serverList.querySelector('[aria-selected="true"] img');
    if (selected instanceof HTMLImageElement) {
      return selected.src;
    }
  }
  return undefined;
}

/**
 * Build a ServerInfo object from the current page.
 */
export function parseServerInfo(url: string): ServerInfo | null {
  const guildId = extractGuildIdFromUrl(url);
  if (!guildId) return null;

  const name = extractServerName() ?? `Server ${guildId}`;
  const icon = extractServerIcon();

  return {
    id: guildId,
    name,
    icon,
    visibility: makeVisibility(),
  };
}
