/* ─────────────────────────────────────────────
 *  Channel Parser
 *
 *  Extracts categories, channels, and threads
 *  from Discord's channel sidebar DOM.
 *
 *  Uses ARIA attributes, direct links, and
 *  semantic structure.
 * ───────────────────────────────────────────── */

import type {
  Category,
  Channel,
  Thread,
  ChannelType,
  VisibilityInfo,
} from "@mapmyserver/shared";

function makeVisibility(): VisibilityInfo {
  return {
    source: "page-visible",
    accessibleToUser: true,
    observedAt: new Date().toISOString(),
  };
}

export interface ParsedChannelStructure {
  categories: Category[];
  channels: Channel[];
  threads: Thread[];
}

/**
 * Parse the entire channel sidebar and return structured data.
 */
export function parseChannelSidebar(): ParsedChannelStructure {
  const categories: Category[] = [];
  const channels: Channel[] = [];
  const threads: Thread[] = [];

  // Strategy 1: Find all channel links (a[href*="/channels/"]) on the page
  const channelLinks = Array.from(
    document.querySelectorAll('a[href*="/channels/"]')
  ).filter((a) => {
    const href = a.getAttribute("href") ?? "";
    // Match /channels/{guildId}/{channelId}
    return /\/channels\/\d+\/\d+/.test(href);
  });

  // Find the channel sidebar container
  const channelNav = findChannelContainer();
  
  let currentCategory: Category | null = null;
  let categoryPosition = 0;
  let channelPosition = 0;
  const processedIds = new Set<string>();

  if (channelNav) {
    // Walk container elements in DOM order
    const allElements = channelNav.querySelectorAll("*");

    for (const el of allElements) {
      if (!(el instanceof HTMLElement)) continue;

      const elId = getElementIdentifier(el);
      if (elId && processedIds.has(elId)) continue;

      // ── Category Detection ─────────────────────
      if (isCategoryElement(el)) {
        const categoryName = extractCategoryName(el);
        if (categoryName) {
          const catId = `cat_${categoryPosition}_${slugify(categoryName)}`;
          currentCategory = {
            id: catId,
            name: categoryName,
            position: categoryPosition++,
            channelIds: [],
            visibility: makeVisibility(),
          };
          categories.push(currentCategory);
          if (elId) processedIds.add(elId);
        }
        continue;
      }

      // ── Channel Detection ──────────────────────
      const channelInfo = extractChannelInfo(el);
      if (channelInfo && channelInfo.name) {
        const chanId = channelInfo.id ?? `ch_${channelPosition}_${slugify(channelInfo.name)}`;
        
        // Prevent duplicate channel additions
        if (channels.some(c => c.id === chanId || (c.name === channelInfo.name && c.parentId === (currentCategory?.id ?? null)))) {
          continue;
        }

        const channel: Channel = {
          id: chanId,
          name: channelInfo.name,
          type: channelInfo.type,
          parentId: currentCategory?.id ?? null,
          position: channelPosition++,
          topic: channelInfo.topic,
          visibility: makeVisibility(),
        };
        channels.push(channel);

        if (currentCategory) {
          currentCategory.channelIds.push(channel.id);
        }

        if (elId) processedIds.add(elId);
        continue;
      }

      // ── Thread Detection ───────────────────────
      const threadInfo = extractThreadInfo(el);
      if (threadInfo && threadInfo.name) {
        const lastChannel = channels[channels.length - 1];
        const threadId = threadInfo.id ?? `thread_${threads.length}_${slugify(threadInfo.name)}`;
        
        if (!threads.some(t => t.id === threadId)) {
          const thread: Thread = {
            id: threadId,
            name: threadInfo.name,
            parentId: lastChannel?.id ?? "__unknown__",
            archived: false,
            visibility: makeVisibility(),
          };
          threads.push(thread);
          if (elId) processedIds.add(elId);
        }
      }
    }
  }

  // Fallback: If channels list is empty or sparse, parse all <a> channel links directly
  if (channels.length === 0 && channelLinks.length > 0) {
    for (const link of channelLinks) {
      const href = link.getAttribute("href") ?? "";
      const idMatch = href.match(/\/channels\/\d+\/(\d+)/);
      const name = cleanChannelName(link.textContent?.trim() ?? "");
      if (!name) continue;

      const chanId = idMatch?.[1] ?? `ch_${channelPosition}_${slugify(name)}`;
      if (channels.some(c => c.id === chanId)) continue;

      const type = inferChannelTypeFromElement(link);
      channels.push({
        id: chanId,
        name,
        type,
        parentId: null,
        position: channelPosition++,
        visibility: makeVisibility(),
      });
    }
  }

  // Extract active channel topic from header if viewing a channel
  const activeTopic = extractActiveChannelTopic();
  if (activeTopic && channels.length > 0) {
    const activeUrl = window.location.href;
    const activeChanMatch = activeUrl.match(/\/channels\/\d+\/(\d+)/);
    if (activeChanMatch?.[1]) {
      const activeChan = channels.find(c => c.id === activeChanMatch[1]);
      if (activeChan) {
        activeChan.topic = activeTopic;
      }
    }
  }

  return { categories, channels, threads };
}

// ── Active Channel Topic Helper ────────────────

function extractActiveChannelTopic(): string | null {
  const topicSelectors = [
    '[class*="topic"]',
    '[aria-label*="Topic" i]',
    'div[data-testid*="channel-topic"]',
  ];

  for (const sel of topicSelectors) {
    const el = document.querySelector(sel);
    if (el?.textContent?.trim()) {
      return el.textContent.trim();
    }
  }
  return null;
}

// ── Container Detection ────────────────────────

function findChannelContainer(): Element | null {
  const selectors = [
    'nav[aria-label="Channels"]',
    'nav[aria-label*="channel" i]',
    'ul[aria-label*="Channels" i]',
    'div[class*="sidebar"] nav',
    'div[class*="channels"]',
    'nav[class*="container"]',
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) return el;
  }

  // Strategy 2: Look for sidebar with channel list items
  const sidebar = document.querySelector('[class*="sidebar"] [class*="scroller"]');
  if (sidebar) return sidebar;

  return null;
}

// ── Category Detection ─────────────────────────

function isCategoryElement(el: HTMLElement): boolean {
  const ariaLabel = el.getAttribute("aria-label") ?? "";
  const ariaExpanded = el.getAttribute("aria-expanded");
  const text = el.textContent?.trim() ?? "";
  const className = typeof el.className === "string" ? el.className : "";

  if (
    (ariaExpanded !== null || className.includes("category") || className.includes("Category")) &&
    text.length > 0 &&
    text.length < 50 &&
    !text.includes("#") &&
    isUpperCaseText(text)
  ) {
    return true;
  }

  if (ariaLabel.toLowerCase().includes("category")) return true;

  if (el.tagName === "H3" && isUpperCaseText(text) && text.length < 50) return true;

  return false;
}

function extractCategoryName(el: HTMLElement): string | null {
  let name = el.textContent?.trim() ?? "";
  name = name.replace(/^[\s─—·•►▸▹▾▿▼▽◆◇○●■□]+/, "");
  name = name.replace(/[\s─—·•►▸▹▾▿▼▽◆◇○●■□]+$/, "");
  name = name.trim();
  if (name.length === 0 || name.length > 100) return null;
  return name;
}

// ── Channel Detection ──────────────────────────

interface ChannelInfo {
  name: string;
  type: ChannelType;
  id?: string;
  topic?: string;
}

function extractChannelInfo(el: HTMLElement): ChannelInfo | null {
  const ariaLabel = el.getAttribute("aria-label") ?? "";
  const text = el.textContent?.trim() ?? "";

  // Strategy 1: ARIA label
  if (ariaLabel.length > 0) {
    const channelType = detectChannelTypeFromAria(ariaLabel);
    if (channelType) {
      const name = ariaLabel.split(",")[0]?.trim() ?? text;
      if (name.length > 0 && name.length < 100) {
        return {
          name: cleanChannelName(name),
          type: channelType,
          id: extractDiscordId(el),
        };
      }
    }
  }

  // Strategy 2: Direct link to channel
  if (el.tagName === "A" || el.getAttribute("role") === "link") {
    const href = el.getAttribute("href") ?? "";
    if (href.includes("/channels/")) {
      const type = inferChannelTypeFromElement(el);
      const name = cleanChannelName(text);
      if (name.length > 0 && name.length < 100) {
        return {
          name,
          type,
          id: extractDiscordId(el) ?? extractChannelIdFromHref(href),
        };
      }
    }
  }

  return null;
}

// ── Thread Detection ───────────────────────────

interface ThreadInfo {
  name: string;
  id?: string;
}

function extractThreadInfo(el: HTMLElement): ThreadInfo | null {
  const ariaLabel = el.getAttribute("aria-label") ?? "";
  const text = el.textContent?.trim() ?? "";

  if (ariaLabel.toLowerCase().includes("thread") && text.length > 0) {
    const name = ariaLabel.split(",")[0]?.trim() ?? text;
    return {
      name: cleanChannelName(name),
      id: extractDiscordId(el),
    };
  }

  return null;
}

// ── Type Detection Helpers ─────────────────────

function detectChannelTypeFromAria(ariaLabel: string): ChannelType | null {
  const lower = ariaLabel.toLowerCase();
  if (lower.includes("voice channel") || lower.includes(", voice")) return "voice";
  if (lower.includes("stage channel") || lower.includes(", stage")) return "stage";
  if (lower.includes("forum channel") || lower.includes(", forum")) return "forum";
  if (lower.includes("announcement channel") || lower.includes(", announcement")) return "announcement";
  if (lower.includes("media channel")) return "media";
  if (lower.includes("text channel") || lower.includes(", text")) return "text";
  return null;
}

function inferChannelTypeFromElement(el: Element): ChannelType {
  const html = el.innerHTML.toLowerCase();
  const aria = (el.getAttribute("aria-label") ?? "").toLowerCase();

  if (aria.includes("voice") || html.includes("voice") || html.includes("speaker")) return "voice";
  if (aria.includes("stage") || html.includes("stage")) return "stage";
  if (aria.includes("forum") || html.includes("forum")) return "forum";
  if (aria.includes("announcement") || html.includes("announcement")) return "announcement";

  return "text";
}

// ── Utility Helpers ────────────────────────────

function cleanChannelName(name: string): string {
  return name
    .replace(/^[#🔊🎤📋📢🖼️💬]\s*/, "")
    .replace(/\s*\(.*?\)\s*$/, "")
    .trim();
}

function isUpperCaseText(text: string): boolean {
  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 2) return false;
  const upperCount = (text.match(/[A-Z]/g) ?? []).length;
  return upperCount / letters.length > 0.6;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function extractDiscordId(el: HTMLElement): string | undefined {
  const dataId = el.getAttribute("data-list-item-id");
  if (dataId) {
    const numMatch = dataId.match(/\d{15,22}/);
    if (numMatch) return numMatch[0];
  }

  const link = el.closest("a") ?? el.querySelector("a");
  if (link) {
    const id = extractChannelIdFromHref(link.getAttribute("href") ?? "");
    if (id) return id;
  }

  return undefined;
}

function extractChannelIdFromHref(href: string): string | undefined {
  const match = href.match(/\/channels\/\d+\/(\d{15,22})/);
  return match?.[1];
}

function getElementIdentifier(el: HTMLElement): string | null {
  const id = el.id || el.getAttribute("data-list-item-id");
  if (id) return id;
  const text = el.textContent?.trim().slice(0, 30);
  if (text) return `${el.tagName}_${text}`;
  return null;
}
