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
    /discord(?:app)?\.com\/channels\/(\d{15,22})/
  );
  if (match?.[1]) return match[1];

  // Fallback for general numeric ID in channels path
  const fallbackMatch = url.match(/\/channels\/(\d+)/);
  return fallbackMatch?.[1] ?? null;
}

/**
 * Extract the channel ID from the current URL.
 */
export function extractChannelIdFromUrl(url: string): string | null {
  const match = url.match(
    /discord(?:app)?\.com\/channels\/\d+\/(\d{15,22})/
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
  const headerSelectors = [
    'h2[class*="name"]',
    '[class*="headerContent"] [class*="name"]',
    'header[class*="header"] [class*="name"]',
    'header h1',
    'header h2',
    '[class*="guildName"]',
    '[data-testid*="server-name"]',
  ];

  for (const selector of headerSelectors) {
    const el = document.querySelector(selector);
    if (el?.textContent?.trim()) {
      return el.textContent.trim();
    }
  }

  // Strategy 2: Look for the server name via ARIA
  const buttons = document.querySelectorAll('button[aria-label], div[aria-label]');
  for (const button of buttons) {
    const label = button.getAttribute("aria-label") ?? "";
    if (
      button.closest('[class*="sidebar"]') &&
      label.length > 0 &&
      label.length < 100 &&
      !label.toLowerCase().includes("channel") &&
      !label.toLowerCase().includes("thread") &&
      !label.toLowerCase().includes("mute") &&
      !label.toLowerCase().includes("deafen")
    ) {
      const rect = button.getBoundingClientRect();
      if (rect.top < 100) {
        return label;
      }
    }
  }

  // Strategy 3: Look for the guild name in the document title
  const title = document.title;
  if (title.includes(" | Discord")) {
    const parts = title.split(" | ");
    if (parts.length >= 3) {
      return parts[parts.length - 2]?.trim() ?? null;
    } else if (parts.length === 2 && parts[0] && !parts[0].startsWith("#")) {
      return parts[0].trim();
    }
  }
  if (title.includes(" - Discord")) {
    const parts = title.split(" - ");
    if (parts[0]) return parts[0].trim();
  }

  // Strategy 4: Look for a heading in the guild sidebar header area
  const sidebar = document.querySelector('nav[aria-label*="Servers" i], nav[aria-label*="Guilds" i]');
  if (sidebar) {
    const selectedServer = sidebar.querySelector('[aria-selected="true"], [class*="selected"]');
    if (selectedServer) {
      const label = selectedServer.getAttribute("aria-label");
      if (label) {
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
  const serverList = document.querySelector('nav[aria-label*="Servers" i], nav[aria-label*="Guilds" i]');
  if (serverList) {
    const selected = serverList.querySelector('[aria-selected="true"] img, [class*="selected"] img');
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

  const name = extractServerName() ?? `Discord Server (${guildId.slice(0, 8)}…)`;
  const icon = extractServerIcon();

  return {
    id: guildId,
    name,
    icon,
    visibility: makeVisibility(),
  };
}
