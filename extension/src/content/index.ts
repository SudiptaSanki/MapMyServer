/* ─────────────────────────────────────────────
 *  Content Script — Discord Page Observer
 *
 *  Injected into discord.com/* pages.
 *  Detects the current server, parses visible
 *  channel structure, and communicates with
 *  the background service worker.
 *
 *  Features:
 *  - Auto Live Reload / Mutation Observer
 *  - Virtual Scroller Sweeping for Large Servers
 *  - Instant server-switch auto analysis
 * ───────────────────────────────────────────── */

import {
  extractGuildIdFromUrl,
  isOnDiscordServer,
  parseServerInfo,
} from "./parsers/serverParser";

import { parseChannelSidebarAsync } from "./parsers/channelParser";

import type {
  ServerDetectedMessage,
  NavigationChangedMessage,
  StructureCollectedMessage,
  CollectionProgressMessage,
  CollectionErrorMessage,
  CollectStructureMessage,
} from "@/types/messages";

import type { AnalysisStep } from "@mapmyserver/shared";

// ── State ──────────────────────────────────────

let lastGuildId: string | null = null;
let isCollecting = false;
let sidebarObserver: MutationObserver | null = null;
let mutationDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// ── Initialization ─────────────────────────────

function init() {
  console.log("[MapMyServer] Content script initialized");

  // Detect current server on load
  detectCurrentServer();

  // Watch for SPA navigation (Discord doesn't reload pages)
  setupNavigationWatcher();

  // Watch for DOM sidebar changes (Auto Live Reload on channel/category edits)
  setupSidebarWatcher();

  // Listen for messages from background
  chrome.runtime.onMessage.addListener(handleMessage);
}

// ── Server Detection & Auto Sync ───────────────

function detectCurrentServer() {
  const url = window.location.href;

  if (!isOnDiscordServer(url)) {
    if (lastGuildId !== null) {
      lastGuildId = null;
      sendNavigationChanged(null, null, url);
    }
    return;
  }

  const guildId = extractGuildIdFromUrl(url);
  if (!guildId) return;

  if (guildId !== lastGuildId) {
    lastGuildId = guildId;

    const serverInfo = parseServerInfo(url);
    if (serverInfo) {
      const msg: ServerDetectedMessage = {
        type: "SERVER_DETECTED",
        payload: {
          guildId: serverInfo.id,
          name: serverInfo.name,
          icon: serverInfo.icon,
        },
      };
      chrome.runtime.sendMessage(msg).catch(() => {});

      // Auto-collect structure on server switch!
      setTimeout(() => {
        collectStructure();
      }, 500);
    }

    // Re-attach sidebar observer for new server
    setTimeout(setupSidebarWatcher, 1000);
  }
}

// ── Navigation Watcher ─────────────────────────

function setupNavigationWatcher() {
  let currentUrl = window.location.href;

  const titleObserver = new MutationObserver(() => {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      detectCurrentServer();
    }
  });

  const titleEl = document.querySelector("title");
  if (titleEl) {
    titleObserver.observe(titleEl, { childList: true });
  }

  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    setTimeout(detectCurrentServer, 100);
  };

  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    setTimeout(detectCurrentServer, 100);
  };

  window.addEventListener("popstate", () => {
    setTimeout(detectCurrentServer, 100);
  });

  setInterval(() => {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      detectCurrentServer();
    }
  }, 1500);
}

// ── Auto Live Reload / Mutation Observer ───────

function setupSidebarWatcher() {
  if (sidebarObserver) {
    sidebarObserver.disconnect();
    sidebarObserver = null;
  }

  const sidebarContainer =
    document.querySelector('nav[aria-label="Channels"]') ||
    document.querySelector('nav[aria-label*="channel" i]') ||
    document.querySelector('div[class*="sidebar"]') ||
    document.querySelector('div[class*="channels"]');

  if (!sidebarContainer) {
    // Retry finding the container in a second
    setTimeout(setupSidebarWatcher, 2000);
    return;
  }

  sidebarObserver = new MutationObserver(() => {
    if (isCollecting) return;

    if (mutationDebounceTimer) {
      clearTimeout(mutationDebounceTimer);
    }

    // Debounce live auto-update when user edits or adds channels/categories
    mutationDebounceTimer = setTimeout(() => {
      if (isOnDiscordServer(window.location.href)) {
        console.log("[MapMyServer] Sidebar mutation detected, auto-updating blueprint...");
        collectStructure();
      }
    }, 1200);
  });

  sidebarObserver.observe(sidebarContainer, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

// ── Structure Collection ───────────────────────

async function collectStructure() {
  if (isCollecting) return;
  isCollecting = true;

  try {
    const url = window.location.href;

    // Step 1: Server identification
    sendProgress({
      id: "server",
      label: "Server identified",
      status: "running",
    });

    const serverInfo = parseServerInfo(url);
    if (!serverInfo) {
      sendProgress({
        id: "server",
        label: "Server identified",
        status: "error",
        detail: "Could not identify server",
      });
      sendError("Could not identify the current Discord server");
      isCollecting = false;
      return;
    }

    sendProgress({
      id: "server",
      label: "Server identified",
      status: "done",
      detail: serverInfo.name,
    });

    // Step 2: Parse channel sidebar (with virtual scroller sweep)
    sendProgress({
      id: "categories",
      label: "Scanning channel sidebar...",
      status: "running",
    });

    const structure = await parseChannelSidebarAsync();

    sendProgress({
      id: "categories",
      label: "Categories detected",
      status: "done",
      detail: `${structure.categories.length} categories`,
    });

    sendProgress({
      id: "channels",
      label: "Channels detected",
      status: "done",
      detail: `${structure.channels.length} channels`,
    });

    // Step 3: Detect channel types
    sendProgress({
      id: "types",
      label: "Channel types detected",
      status: "done",
    });

    // Step 4: Threads
    sendProgress({
      id: "threads",
      label: "Threads detected",
      status: "done",
      detail: `${structure.threads.length} threads`,
    });

    // Step 5: Server metadata
    sendProgress({
      id: "metadata",
      label: "Server metadata detected",
      status: "done",
    });

    // Send the full structure
    const msg: StructureCollectedMessage = {
      type: "STRUCTURE_COLLECTED",
      payload: {
        server: serverInfo,
        categories: structure.categories,
        channels: structure.channels,
        threads: structure.threads,
      },
    };

    chrome.runtime.sendMessage(msg).catch(() => {});
  } catch (err) {
    console.error("[MapMyServer] Collection error:", err);
    sendError(
      err instanceof Error ? err.message : "Unknown collection error"
    );
  } finally {
    isCollecting = false;
  }
}

// ── Message Handling ───────────────────────────

function handleMessage(
  message: CollectStructureMessage | { type: string },
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
) {
  switch (message.type) {
    case "COLLECT_STRUCTURE":
      collectStructure();
      sendResponse({ status: "collecting" });
      break;

    case "PING":
      sendResponse({ status: "alive", guildId: lastGuildId });
      break;

    default:
      break;
  }

  return true;
}

// ── Message Senders ────────────────────────────

function sendNavigationChanged(
  guildId: string | null,
  channelId: string | null,
  url: string
) {
  const msg: NavigationChangedMessage = {
    type: "NAVIGATION_CHANGED",
    payload: { guildId, channelId, url },
  };
  chrome.runtime.sendMessage(msg).catch(() => {});
}

function sendProgress(step: AnalysisStep) {
  const msg: CollectionProgressMessage = {
    type: "COLLECTION_PROGRESS",
    payload: step,
  };
  chrome.runtime.sendMessage(msg).catch(() => {});
}

function sendError(message: string) {
  const msg: CollectionErrorMessage = {
    type: "COLLECTION_ERROR",
    payload: { message },
  };
  chrome.runtime.sendMessage(msg).catch(() => {});
}

// ── Bootstrap ──────────────────────────────────

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  setTimeout(init, 1000);
}
