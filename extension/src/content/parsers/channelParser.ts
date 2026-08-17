/* ─────────────────────────────────────────────
 *  Channel Parser (with Virtual Scroller Support)
 *
 *  Extracts categories, channels, and threads
 *  from Discord's channel sidebar DOM.
 *
 *  Supports large servers with virtualized DOM
 *  scrollers by performing automated sweep scans.
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
 * Parses the channel sidebar, handling virtualized scrolling for large servers.
 */
export async function parseChannelSidebarAsync(): Promise<ParsedChannelStructure> {
  const categories: Category[] = [];
  const channels: Channel[] = [];
  const threads: Thread[] = [];

  const processedIds = new Set<string>();
  const state = {
    currentCategory: null as Category | null,
    categoryPosition: 0,
    channelPosition: 0,
  };

  const channelNav = findChannelContainer();
  const scroller = findScrollerElement();

  if (channelNav) {
    // Initial slice parse
    parseVisibleSlice(channelNav, categories, channels, threads, processedIds, state);

    // If the sidebar is virtualized and scrollable, perform a fast scan sweep
    if (scroller && scroller.scrollHeight > scroller.clientHeight + 50) {
      const initialScrollTop = scroller.scrollTop;
      const step = Math.max(Math.floor(scroller.clientHeight * 0.75), 250);
      const maxScroll = scroller.scrollHeight - scroller.clientHeight;

      for (let pos = 0; pos <= maxScroll; pos += step) {
        scroller.scrollTop = pos;
        await delay(45);
        parseVisibleSlice(channelNav, categories, channels, threads, processedIds, state);
      }

      // Bottom-most slice
      scroller.scrollTop = maxScroll;
      await delay(45);
      parseVisibleSlice(channelNav, categories, channels, threads, processedIds, state);

      // Restore user's scroll position
      scroller.scrollTop = initialScrollTop;
    }
  }

  // Fallback: Find all direct channel links on the page
  const channelLinks = Array.from(
    document.querySelectorAll('a[href*="/channels/"]')
  ).filter((a) => {
    const href = a.getAttribute("href") ?? "";
    return /\/channels\/\d+\/\d+/.test(href);
  });

  if (channelLinks.length > 0) {
    for (const link of channelLinks) {
      const href = link.getAttribute("href") ?? "";
      const idMatch = href.match(/\/channels\/\d+\/(\d+)/);
      const name = cleanChannelName(link.textContent?.trim() ?? "");
      if (!name) continue;

      const chanId = idMatch?.[1] ?? `ch_${state.channelPosition}_${slugify(name)}`;
      if (channels.some((c) => c.id === chanId || c.name.toLowerCase() === name.toLowerCase())) {
        continue;
      }

      const type = inferChannelTypeFromElement(link);
      channels.push({
        id: chanId,
        name,
        type,
        parentId: null,
        position: state.channelPosition++,
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
      const activeChan = channels.find((c) => c.id === activeChanMatch[1]);
      if (activeChan) {
        activeChan.topic = activeTopic;
      }
    }
  }

  return { categories, channels, threads };
}

/**
 * Synchronous sidebar parser for fast checks.
 */
export function parseChannelSidebar(): ParsedChannelStructure {
  const categories: Category[] = [];
  const channels: Channel[] = [];
  const threads: Thread[] = [];

  const processedIds = new Set<string>();
  const state = {
    currentCategory: null as Category | null,
    categoryPosition: 0,
    channelPosition: 0,
  };

  const channelNav = findChannelContainer();
  if (channelNav) {
    parseVisibleSlice(channelNav, categories, channels, threads, processedIds, state);
  }

  return { categories, channels, threads };
}

// ── Slice Parsing Helper ───────────────────────

function parseVisibleSlice(
  channelNav: Element,
  categories: Category[],
  channels: Channel[],
  threads: Thread[],
  processedIds: Set<string>,
  state: {
    currentCategory: Category | null;
    categoryPosition: number;
    channelPosition: number;
  }
) {
  const allElements = channelNav.querySelectorAll("*");

  for (const el of allElements) {
    if (!(el instanceof HTMLElement)) continue;

    const elId = getElementIdentifier(el);
    if (elId && processedIds.has(elId)) continue;

    // ── Category Detection ─────────────────────
    if (isCategoryElement(el)) {
      const categoryName = extractCategoryName(el);
      if (categoryName) {
        const normalizedName = normalizeCategoryName(categoryName);

        // Check if this category was already detected
        const existingCat = categories.find(
          (c) => normalizeCategoryName(c.name) === normalizedName
        );

        if (existingCat) {
          state.currentCategory = existingCat;
        } else {
          const catId = `cat_${state.categoryPosition}_${slugify(categoryName)}`;
          state.currentCategory = {
            id: catId,
            name: categoryName,
            position: state.categoryPosition++,
            channelIds: [],
            visibility: makeVisibility(),
          };
          categories.push(state.currentCategory);
        }

        if (elId) processedIds.add(elId);
      }
      continue;
    }

    // ── Channel Detection ──────────────────────
    const channelInfo = extractChannelInfo(el);
    if (channelInfo && channelInfo.name) {
      const chanId =
        channelInfo.id ??
        `ch_${state.channelPosition}_${slugify(channelInfo.name)}`;

      // Prevent duplicate channel additions
      const isDuplicate = channels.some(
        (c) =>
          c.id === chanId ||
          (c.name.toLowerCase() === channelInfo.name.toLowerCase() &&
            c.parentId === (state.currentCategory?.id ?? null))
      );

      if (isDuplicate) {
        if (elId) processedIds.add(elId);
        continue;
      }

      const channel: Channel = {
        id: chanId,
        name: channelInfo.name,
        type: channelInfo.type,
        parentId: state.currentCategory?.id ?? null,
        position: state.channelPosition++,
        topic: channelInfo.topic,
        visibility: makeVisibility(),
      };
      channels.push(channel);

      if (
        state.currentCategory &&
        !state.currentCategory.channelIds.includes(channel.id)
      ) {
        state.currentCategory.channelIds.push(channel.id);
      }

      if (elId) processedIds.add(elId);
      continue;
    }

    // ── Thread Detection ───────────────────────
    const threadInfo = extractThreadInfo(el);
    if (threadInfo && threadInfo.name) {
      const lastChannel = channels[channels.length - 1];
      const threadId =
        threadInfo.id ??
        `thread_${threads.length}_${slugify(threadInfo.name)}`;

      if (!threads.some((t) => t.id === threadId)) {
        const thread: Thread = {
          id: threadId,
          name: threadInfo.name,
          parentId: lastChannel?.id ?? "__unknown__",
          archived: false,
          visibility: makeVisibility(),
        };
        threads.push(thread);
      }
      if (elId) processedIds.add(elId);
    }
  }
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

// ── Container & Scroller Detection ─────────────

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

  const sidebar = document.querySelector(
    '[class*="sidebar"] [class*="scroller"]'
  );
  if (sidebar) return sidebar;

  return null;
}

function findScrollerElement(): HTMLElement | null {
  const scrollerSelectors = [
    '[class*="sidebar"] [class*="scrollerBase"]',
    '[class*="sidebar"] [class*="scroller"]',
    'nav[aria-label*="channel" i] [class*="scroller"]',
    'div[class*="channels"] [class*="scroller"]',
  ];

  for (const sel of scrollerSelectors) {
    const el = document.querySelector<HTMLElement>(sel);
    if (el) return el;
  }

  const nav = findChannelContainer();
  return (nav?.closest('[class*="scroller"]') as HTMLElement) || null;
}

// ── Category Detection Helpers ─────────────────

function normalizeCategoryName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^[\s─—·•►▸▹▾▿▼▽◆◇○●■□]+/, "")
    .replace(/[\s─—·•►▸▹▾▿▼▽◆◇○●■□]+$/, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function isCategoryElement(el: HTMLElement): boolean {
  if (
    el.tagName === "A" ||
    el.closest("a") ||
    el.getAttribute("role") === "link"
  ) {
    return false;
  }

  const ariaLabel = el.getAttribute("aria-label") ?? "";
  const ariaExpanded = el.getAttribute("aria-expanded");
  const text = el.textContent?.trim() ?? "";
  const className = typeof el.className === "string" ? el.className : "";

  if (ariaLabel.toLowerCase().includes("category")) return true;

  if (
    (ariaExpanded !== null ||
      className.includes("category") ||
      className.includes("Category")) &&
    text.length > 0 &&
    text.length < 60 &&
    !text.includes("#") &&
    isUpperCaseText(text)
  ) {
    return true;
  }

  if (
    el.tagName === "H3" &&
    isUpperCaseText(text) &&
    text.length < 60 &&
    !text.includes("#")
  ) {
    return true;
  }

  return false;
}

function extractCategoryName(el: HTMLElement): string | null {
  const ariaLabel = el.getAttribute("aria-label") ?? "";
  if (ariaLabel.toLowerCase().includes("category")) {
    const cleaned = ariaLabel
      .replace(/\s*\(collapsed category\)/i, "")
      .replace(/\s*\(category\)/i, "")
      .replace(/,\s*category/i, "")
      .trim();
    if (cleaned) return cleaned;
  }

  let name = el.textContent?.trim() ?? "";
  name = name.replace(/^[\s─—·•►▸▹▾▿▼▽◆◇○●■□]+/, "");
  name = name.replace(/[\s─—·•►▸▹▾▿▼▽◆◇○●■□]+$/, "");
  name = name.trim();
  if (name.length === 0 || name.length > 100) return null;
  return name;
}

// ── Channel Detection Helpers ──────────────────

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

// ── Thread Detection Helpers ───────────────────

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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
