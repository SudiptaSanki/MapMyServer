/* ─────────────────────────────────────────────
 *  Channel Parser
 *
 *  Extracts categories, channels, and threads
 *  from Discord's channel sidebar DOM.
 *
 *  Uses ARIA attributes and semantic structure
 *  rather than fragile CSS class names.
 *
 *  This is the module most likely to need
 *  maintenance when Discord updates its UI.
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

// ── Parsed Result ──────────────────────────────

export interface ParsedChannelStructure {
  categories: Category[];
  channels: Channel[];
  threads: Thread[];
}

// ── Main Parser ────────────────────────────────

/**
 * Parse the entire channel sidebar and return structured data.
 * This function finds the channel list and walks its elements
 * to identify categories, channels, and threads.
 */
export function parseChannelSidebar(): ParsedChannelStructure {
  const categories: Category[] = [];
  const channels: Channel[] = [];
  const threads: Thread[] = [];

  // Find the channel list container
  const channelNav = findChannelContainer();
  if (!channelNav) {
    console.warn("[Blueprint] Could not find channel sidebar");
    return { categories, channels, threads };
  }

  // Walk the channel list
  // Discord typically renders:
  //   - Category headers as collapsible sections
  //   - Channels as list items under categories
  //   - Threads nested under channels or in separate sections

  let currentCategory: Category | null = null;
  let categoryPosition = 0;
  let channelPosition = 0;

  // Find all elements in the channel list
  const allElements = channelNav.querySelectorAll("*");

  const processedIds = new Set<string>();

  for (const el of allElements) {
    if (!(el instanceof HTMLElement)) continue;

    // Skip already-processed elements
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
    if (channelInfo) {
      const channel: Channel = {
        id: channelInfo.id ?? `ch_${channelPosition}_${slugify(channelInfo.name)}`,
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
    if (threadInfo) {
      const lastChannel = channels[channels.length - 1];
      const thread: Thread = {
        id: threadInfo.id ?? `thread_${threads.length}_${slugify(threadInfo.name)}`,
        name: threadInfo.name,
        parentId: lastChannel?.id ?? "__unknown__",
        archived: false,
        visibility: makeVisibility(),
      };
      threads.push(thread);
      if (elId) processedIds.add(elId);
    }
  }

  return { categories, channels, threads };
}

// ── Container Detection ────────────────────────

function findChannelContainer(): Element | null {
  // Strategy 1: ARIA label
  const ariaNav = document.querySelector(
    'nav[aria-label="Channels"], nav[aria-label*="channel" i]'
  );
  if (ariaNav) return ariaNav;

  // Strategy 2: Role navigation with channel-related content
  const navs = document.querySelectorAll('nav, [role="navigation"]');
  for (const nav of navs) {
    const text = nav.textContent ?? "";
    // Check if this nav contains typical channel indicators
    if (
      text.includes("#") &&
      (nav.querySelectorAll('[class*="channel"]').length > 0 ||
        nav.querySelectorAll("li").length > 3)
    ) {
      return nav;
    }
  }

  // Strategy 3: Look for the sidebar by class patterns
  const sidebar = document.querySelector(
    '[class*="sidebar"] [class*="scroller"], [class*="channelList"]'
  );
  if (sidebar) return sidebar;

  // Strategy 4: Broader search — find tree or list with many items
  const trees = document.querySelectorAll('[role="tree"], [role="list"]');
  for (const tree of trees) {
    const items = tree.querySelectorAll(
      '[role="treeitem"], [role="listitem"], li'
    );
    if (items.length > 3) {
      return tree;
    }
  }

  return null;
}

// ── Category Detection ─────────────────────────

function isCategoryElement(el: HTMLElement): boolean {
  // Category headers are typically:
  // - Elements with role="button" that toggle a section
  // - ALL CAPS text
  // - Have a collapse/expand icon

  const ariaLabel = el.getAttribute("aria-label") ?? "";
  const ariaExpanded = el.getAttribute("aria-expanded");
  const text = el.textContent?.trim() ?? "";

  // Check for category-like patterns
  if (
    ariaExpanded !== null &&
    text.length > 0 &&
    text.length < 50 &&
    isUpperCaseText(text)
  ) {
    return true;
  }

  // Check class-based hints
  const className = el.className ?? "";
  if (
    typeof className === "string" &&
    (className.includes("category") || className.includes("Category")) &&
    text.length > 0
  ) {
    return true;
  }

  // Check for category ARIA pattern
  if (
    ariaLabel.toLowerCase().includes("category") ||
    (el.tagName === "H3" && isUpperCaseText(text) && text.length < 50)
  ) {
    return true;
  }

  return false;
}

function extractCategoryName(el: HTMLElement): string | null {
  // Get text content, stripping any icon characters
  let name = el.textContent?.trim() ?? "";

  // Remove leading/trailing decorations
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
  // Channels are typically:
  // - <a> or interactive elements with channel names
  // - Have aria-label like "general, text channel" or "voice, voice channel"
  // - Have a link/clickable element

  const ariaLabel = el.getAttribute("aria-label") ?? "";
  const text = el.textContent?.trim() ?? "";

  // Strategy 1: ARIA label with channel type indicator
  if (ariaLabel.length > 0) {
    const channelType = detectChannelTypeFromAria(ariaLabel);
    if (channelType) {
      // Extract name from aria-label (usually "name, type")
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

  // Strategy 2: Link elements with # prefix or channel patterns
  if (
    (el.tagName === "A" || el.getAttribute("role") === "link") &&
    text.length > 0 &&
    text.length < 100
  ) {
    const href = el.getAttribute("href") ?? "";
    if (href.includes("/channels/")) {
      const type = inferChannelTypeFromElement(el);
      return {
        name: cleanChannelName(text),
        type,
        id: extractDiscordId(el) ?? extractChannelIdFromHref(href),
      };
    }
  }

  // Strategy 3: Class-based detection
  const className = typeof el.className === "string" ? el.className : "";
  if (
    className.includes("channel") &&
    !className.includes("category") &&
    text.length > 0 &&
    text.length < 100 &&
    !isUpperCaseText(text)
  ) {
    // Make sure this isn't a category
    const type = inferChannelTypeFromElement(el);
    const name = cleanChannelName(text);
    if (name.length > 0) {
      return {
        name,
        type,
        id: extractDiscordId(el),
      };
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

  // Threads typically have aria-label containing "thread"
  if (ariaLabel.toLowerCase().includes("thread") && text.length > 0) {
    const name = ariaLabel.split(",")[0]?.trim() ?? text;
    return {
      name: cleanChannelName(name),
      id: extractDiscordId(el),
    };
  }

  // Class-based thread detection
  const className = typeof el.className === "string" ? el.className : "";
  if (
    className.includes("thread") &&
    text.length > 0 &&
    text.length < 100
  ) {
    return {
      name: cleanChannelName(text),
      id: extractDiscordId(el),
    };
  }

  return null;
}

// ── Type Detection Helpers ─────────────────────

function detectChannelTypeFromAria(ariaLabel: string): ChannelType | null {
  const lower = ariaLabel.toLowerCase();

  if (lower.includes("voice channel")) return "voice";
  if (lower.includes("stage channel")) return "stage";
  if (lower.includes("forum channel")) return "forum";
  if (lower.includes("announcement channel")) return "announcement";
  if (lower.includes("media channel")) return "media";
  if (lower.includes("text channel")) return "text";

  // Shortened patterns
  if (lower.includes(", voice")) return "voice";
  if (lower.includes(", stage")) return "stage";
  if (lower.includes(", forum")) return "forum";

  return null;
}

function inferChannelTypeFromElement(el: HTMLElement): ChannelType {
  // Check for voice/stage indicators
  // Check for channel type indicators via class names

  // Voice channels typically have a speaker icon
  if (el.querySelector('[class*="voice"], [class*="Voice"]')) return "voice";
  if (el.querySelector('[class*="stage"], [class*="Stage"]')) return "stage";
  if (el.querySelector('[class*="forum"], [class*="Forum"]')) return "forum";

  // Check parent for type hints
  const parent = el.closest('[class*="voice"], [class*="stage"], [class*="forum"]');
  if (parent) {
    const parentClass = typeof parent.className === "string" ? parent.className : "";
    if (parentClass.includes("voice")) return "voice";
    if (parentClass.includes("stage")) return "stage";
    if (parentClass.includes("forum")) return "forum";
  }

  // Default to text
  return "text";
}

// ── Utility Helpers ────────────────────────────

function cleanChannelName(name: string): string {
  // Remove common prefixes/indicators
  return name
    .replace(/^[#🔊🎤📋📢🖼️💬]\s*/, "")
    .replace(/\s*\(.*?\)\s*$/, "")
    .trim();
}

function isUpperCaseText(text: string): boolean {
  // Check if the text is mostly uppercase (category indicator)
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
  // Try to find a Discord snowflake ID in data attributes or href
  const dataId = el.getAttribute("data-list-item-id");
  if (dataId && /^\d{17,20}$/.test(dataId)) return dataId;

  // Check href
  const link = el.closest("a") ?? el.querySelector("a");
  if (link) {
    const id = extractChannelIdFromHref(link.getAttribute("href") ?? "");
    if (id) return id;
  }

  // Check data-dnd-name or similar
  for (const attr of el.attributes) {
    if (/^\d{17,20}$/.test(attr.value)) return attr.value;
  }

  return undefined;
}

function extractChannelIdFromHref(href: string): string | undefined {
  const match = href.match(/\/channels\/\d+\/(\d{17,20})/);
  return match?.[1];
}

function getElementIdentifier(el: HTMLElement): string | null {
  const id = el.id || el.getAttribute("data-list-item-id");
  if (id) return id;

  // Generate a pseudo-identifier from tag + text + position
  const text = el.textContent?.trim().slice(0, 30);
  if (text) return `${el.tagName}_${text}`;

  return null;
}
