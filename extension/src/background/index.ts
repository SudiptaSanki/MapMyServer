/* ─────────────────────────────────────────────
 *  Background Service Worker
 *
 *  Orchestrates communication between:
 *  - Content script (on Discord page)
 *  - Side panel (React dashboard)
 *  - Popup (quick overview)
 *
 *  Also manages blueprint persistence and
 *  snapshot storage.
 * ───────────────────────────────────────────── */

import type {
  ExtensionMessage,
  BlueprintReadyMessage,
  AnalysisProgressMessage,
  AnalysisErrorMessage,
} from "@/types/messages";

import type { BlueprintSnapshot } from "@mapmyserver/shared";

// ── State (service worker — use chrome.storage for persistence) ─

let currentGuildId: string | null = null;
let currentServerName: string | null = null;

// ── Initialization ─────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  console.log("[Blueprint] Extension installed");

  // Open side panel on extension icon click
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(console.error);
});

// Enable side panel only on Discord
chrome.tabs.onUpdated.addListener(async (tabId, _changeInfo, tab) => {
  if (!tab.url) return;

  const isDiscord =
    tab.url.includes("discord.com/channels") ||
    tab.url.includes("discordapp.com/channels");

  try {
    await chrome.sidePanel.setOptions({
      tabId,
      path: "sidepanel.html",
      enabled: isDiscord,
    });
  } catch {
    // Tab may have been closed
  }
});

// ── Message Router ─────────────────────────────

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    handleMessage(message, sendResponse);
    return true; // async response
  }
);

async function handleMessage(
  message: ExtensionMessage,
  sendResponse: (response?: unknown) => void
) {
  switch (message.type) {
    // ── From Content Script ────────────────────

    case "SERVER_DETECTED": {
      currentGuildId = message.payload.guildId;
      currentServerName = message.payload.name;

      // Relay to side panel / popup
      broadcastToUI({
        type: "CURRENT_SERVER",
        payload: {
          guildId: currentGuildId,
          name: currentServerName,
          onDiscord: true,
        },
      });

      sendResponse({ status: "ok" });
      break;
    }

    case "NAVIGATION_CHANGED": {
      currentGuildId = message.payload.guildId;

      broadcastToUI({
        type: "CURRENT_SERVER",
        payload: {
          guildId: currentGuildId,
          name: currentServerName,
          onDiscord: currentGuildId !== null,
        },
      });

      sendResponse({ status: "ok" });
      break;
    }

    case "STRUCTURE_COLLECTED": {
      // Build the blueprint
      // We import dynamically to keep the service worker lean
      const { buildBlueprint } = await import(
        "@/services/blueprintBuilder"
      );
      const { saveBlueprint } = await import(
        "@/services/storageService"
      );

      const blueprint = buildBlueprint({
        server: message.payload.server,
        categories: message.payload.categories,
        channels: message.payload.channels,
        threads: message.payload.threads,
      });

      // Persist
      await saveBlueprint(blueprint.server.id, blueprint);

      // Relay to side panel
      const readyMsg: BlueprintReadyMessage = {
        type: "BLUEPRINT_READY",
        payload: blueprint,
      };
      broadcastToUI(readyMsg);

      sendResponse({ status: "ok" });
      break;
    }

    case "COLLECTION_PROGRESS": {
      const progressMsg: AnalysisProgressMessage = {
        type: "ANALYSIS_PROGRESS",
        payload: message.payload,
      };
      broadcastToUI(progressMsg);
      sendResponse({ status: "ok" });
      break;
    }

    case "COLLECTION_ERROR": {
      const errorMsg: AnalysisErrorMessage = {
        type: "ANALYSIS_ERROR",
        payload: message.payload,
      };
      broadcastToUI(errorMsg);
      sendResponse({ status: "ok" });
      break;
    }

    // ── From Side Panel / Popup ────────────────

    case "REQUEST_ANALYSIS": {
      // Send COLLECT_STRUCTURE to the content script in the active Discord tab
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
        url: ["https://discord.com/*", "https://*.discord.com/*"],
      });

      if (tabs[0]?.id) {
        try {
          await chrome.tabs.sendMessage(tabs[0].id, {
            type: "COLLECT_STRUCTURE",
          });
          sendResponse({ status: "analyzing" });
        } catch {
          sendResponse({ status: "error", message: "Content script not ready" });
        }
      } else {
        sendResponse({ status: "error", message: "No Discord tab found" });
      }
      break;
    }

    case "REQUEST_BLUEPRINT": {
      const { loadBlueprint } = await import(
        "@/services/storageService"
      );
      const blueprint = await loadBlueprint(message.payload.serverId);
      sendResponse({ blueprint });
      break;
    }

    case "SAVE_SNAPSHOT": {
      const { loadBlueprint } = await import("@/services/storageService");
      const { saveSnapshot, generateSnapshotId } = await import(
        "@/services/storageService"
      );

      const bp = await loadBlueprint(message.payload.serverId);
      if (bp) {
        const snapshot: BlueprintSnapshot = {
          id: generateSnapshotId(),
          serverId: message.payload.serverId,
          blueprint: bp,
          createdAt: new Date().toISOString(),
          label: message.payload.label,
        };
        await saveSnapshot(message.payload.serverId, snapshot);
        sendResponse({ status: "ok", snapshot });
      } else {
        sendResponse({ status: "error", message: "No blueprint found" });
      }
      break;
    }

    case "REQUEST_SNAPSHOTS": {
      const { loadSnapshots } = await import(
        "@/services/storageService"
      );
      const snapshots = await loadSnapshots(message.payload.serverId);
      sendResponse({ snapshots });
      break;
    }

    case "REQUEST_SERVER_LIST": {
      const { listServers } = await import(
        "@/services/storageService"
      );
      const servers = await listServers();
      sendResponse({ servers });
      break;
    }

    case "OPEN_SIDE_PANEL": {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab?.id) {
        try {
          await chrome.sidePanel.open({ tabId: tab.id });
        } catch {
          // May fail if side panel is not available
        }
      }
      sendResponse({ status: "ok" });
      break;
    }

    default:
      sendResponse({ status: "unknown_message" });
  }
}

// ── Broadcast to UI ────────────────────────────

function broadcastToUI(message: ExtensionMessage) {
  // Send to all extension views (side panel, popup)
  chrome.runtime.sendMessage(message).catch(() => {
    // No listeners — side panel/popup might not be open
  });
}
