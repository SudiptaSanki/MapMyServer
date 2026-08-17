/* ─────────────────────────────────────────────
 *  Content Script — Discord Page Observer
 *
 *  Injected into discord.com/* pages.
 *  Detects the current server, parses visible
 *  channel structure, and communicates with
 *  the background service worker.
 *
 *  Architecture:
 *  - Triggered on Server Navigation & User Request
 *  - Accumulative multi-slice parsing
 *  - Zero jitter: Scrolling in Discord will not
 *    trigger unwanted re-renders or data loss
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

// ── Initialization ─────────────────────────────

function init() {
  console.log("[MapMyServer] Content script initialized");

  // Detect current server on load
  detectCurrentServer();

  // Watch for SPA navigation (switching servers or channels)
  setupNavigationWatcher();

  // Listen for messages from background & popup/sidepanel
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

      // Auto-scan new server structure on first visit
      setTimeout(() => {
        collectStructure();
      }, 400);
    }
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

    // Step 2: Parse channel sidebar
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

    // Send structure to background for persistent merging
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
