/* ─────────────────────────────────────────────
 *  Content Script — Discord Page Observer
 *
 *  Injected into discord.com/* pages.
 *  Detects the current server, parses visible
 *  channel structure, and communicates with
 *  the background service worker.
 *
 *  Security boundary:
 *  - Reads only DOM that is visible to the user
 *  - Does NOT extract tokens or cookies
 *  - Does NOT intercept XHR/fetch requests
 *  - Does NOT use self-bot patterns
 *  - All data tagged as source: "page-visible"
 * ───────────────────────────────────────────── */

import {
  extractGuildIdFromUrl,
  isOnDiscordServer,
  parseServerInfo,
} from "./parsers/serverParser";

import { parseChannelSidebar } from "./parsers/channelParser";

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

// ── Initialization ─────────────────────────────

function init() {
  console.log("[Blueprint] Content script initialized");

  // Detect current server on load
  detectCurrentServer();

  // Watch for SPA navigation (Discord doesn't reload pages)
  setupNavigationWatcher();

  // Listen for messages from background
  chrome.runtime.onMessage.addListener(handleMessage);
}

// ── Server Detection ───────────────────────────

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
      chrome.runtime.sendMessage(msg);
    }
  }


}

// ── Navigation Watcher ─────────────────────────

function setupNavigationWatcher() {
  // Watch for URL changes (Discord uses History API)
  let currentUrl = window.location.href;

  // Use MutationObserver on the title element as a proxy for navigation
  const titleObserver = new MutationObserver(() => {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      detectCurrentServer();
    }
  });

  // Observe document title changes
  const titleEl = document.querySelector("title");
  if (titleEl) {
    titleObserver.observe(titleEl, { childList: true });
  }

  // Also hook into history state changes
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

  // Periodic check as a fallback (every 2 seconds)
  setInterval(() => {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      detectCurrentServer();
    }
  }, 2000);
}

// ── Structure Collection ───────────────────────

async function collectStructure() {
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
      return;
    }

    sendProgress({
      id: "server",
      label: "Server identified",
      status: "done",
      detail: serverInfo.name,
    });

    // Small delay to let the DOM settle
    await delay(500);

    // Step 2: Parse channel sidebar
    sendProgress({
      id: "categories",
      label: "Categories detected",
      status: "running",
    });

    const structure = parseChannelSidebar();

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

    chrome.runtime.sendMessage(msg);
  } catch (err) {
    console.error("[Blueprint] Collection error:", err);
    sendError(
      err instanceof Error ? err.message : "Unknown collection error"
    );
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

  // Return true to indicate async response
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
  chrome.runtime.sendMessage(msg).catch(() => {
    // Side panel/popup might not be open
  });
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

// ── Utilities ──────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Bootstrap ──────────────────────────────────

// Wait for the page to be interactive before initializing
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  // Give Discord's React a moment to mount
  setTimeout(init, 1000);
}
