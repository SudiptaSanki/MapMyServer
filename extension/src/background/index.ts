/* ─────────────────────────────────────────────
 *  Background Service Worker
 *
 *  Orchestrates communication between:
 *  - Content script (on Discord page)
 *  - Side panel (React dashboard)
 *  - Popup (quick overview)
 *
 *  Manages blueprint persistence and active tab tracking.
 * ───────────────────────────────────────────── */

import type {
  ExtensionMessage,
  BlueprintReadyMessage,
  AnalysisProgressMessage,
  AnalysisErrorMessage,
} from "@/types/messages";

import type { BlueprintSnapshot } from "@mapmyserver/shared";
import { buildBlueprint } from "@/services/blueprintBuilder";
import { 
  saveBlueprint, 
  loadBlueprint, 
  saveSnapshot, 
  loadSnapshots, 
  generateSnapshotId,
  listServers 
} from "@/services/storageService";

// ── State ──────────────────────────────────────

let currentGuildId: string | null = null;
let currentServerName: string | null = null;

// ── Initialization ─────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  console.log("[Blueprint] Extension installed");

  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(console.error);
});

// Enable side panel on Discord
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const url = tab?.url || changeInfo?.url;
  if (!url) return;

  const isDiscord =
    url.includes("discord.com/channels") ||
    url.includes("discordapp.com/channels");

  if (isDiscord) {
    const guildMatch = url.match(/\/channels\/(\d{15,22})/);
    if (guildMatch?.[1]) {
      currentGuildId = guildMatch[1];
      broadcastToUI({
        type: "CURRENT_SERVER",
        payload: {
          guildId: currentGuildId,
          name: currentServerName || `Server ${currentGuildId.slice(0, 8)}…`,
          onDiscord: true,
        },
      });
    }
  }

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

// Watch tab activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url?.includes("discord.com/channels")) {
      const guildMatch = tab.url.match(/\/channels\/(\d{15,22})/);
      if (guildMatch?.[1]) {
        currentGuildId = guildMatch[1];
        broadcastToUI({
          type: "CURRENT_SERVER",
          payload: {
            guildId: currentGuildId,
            name: currentServerName || `Server ${currentGuildId.slice(0, 8)}…`,
            onDiscord: true,
          },
        });
      }
    }
  } catch {
    // Ignore error
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
    // ── Check Active Tab (called when Sidepanel opens) ─
    case "CHECK_ACTIVE_TAB": {
      // Find active tab in current window or any Discord tab
      let targetTab: chrome.tabs.Tab | undefined;

      const [activeTab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });

      if (activeTab?.url?.includes("discord.com/channels")) {
        targetTab = activeTab;
      } else {
        const discordTabs = await chrome.tabs.query({
          url: ["https://discord.com/channels/*", "https://*.discord.com/channels/*"],
        });
        targetTab = discordTabs[0];
      }

      if (targetTab && targetTab.url) {
        const guildMatch = targetTab.url.match(/\/channels\/(\d{15,22})/);
        if (guildMatch?.[1]) {
          currentGuildId = guildMatch[1];
          const onDiscord = true;
          const name = currentServerName || `Server ${currentGuildId.slice(0, 8)}…`;

          broadcastToUI({
            type: "CURRENT_SERVER",
            payload: {
              guildId: currentGuildId,
              name,
              onDiscord,
            },
          });

          sendResponse({
            onDiscord: true,
            guildId: currentGuildId,
            name,
            tabId: targetTab.id,
          });
          break;
        }
      }

      sendResponse({ onDiscord: false, guildId: null });
      break;
    }

    // ── From Content Script ────────────────────

    case "SERVER_DETECTED": {
      currentGuildId = message.payload.guildId;
      currentServerName = message.payload.name;

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
      const blueprint = buildBlueprint({
        server: message.payload.server,
        categories: message.payload.categories,
        channels: message.payload.channels,
        threads: message.payload.threads,
      });

      await saveBlueprint(blueprint.server.id, blueprint);

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
      // Find the Discord tab
      let targetTabId: number | undefined;

      const [activeTab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });

      if (activeTab?.id && activeTab.url?.includes("discord.com/channels")) {
        targetTabId = activeTab.id;
      } else {
        const discordTabs = await chrome.tabs.query({
          url: ["https://discord.com/channels/*", "https://*.discord.com/channels/*"],
        });
        targetTabId = discordTabs[0]?.id;
      }

      if (targetTabId) {
        try {
          await chrome.tabs.sendMessage(targetTabId, {
            type: "COLLECT_STRUCTURE",
          });
          sendResponse({ status: "analyzing" });
        } catch {
          // Content script may need dynamic injection
          try {
            const manifest = chrome.runtime.getManifest();
            const contentScripts = manifest.content_scripts?.[0]?.js;
            if (contentScripts && contentScripts.length > 0) {
              await chrome.scripting.executeScript({
                target: { tabId: targetTabId },
                files: contentScripts,
              });
            }
            setTimeout(async () => {
              try {
                await chrome.tabs.sendMessage(targetTabId!, {
                  type: "COLLECT_STRUCTURE",
                });
              } catch {}
            }, 300);
            sendResponse({ status: "analyzing" });
          } catch (e: any) {
            sendResponse({ status: "error", message: "Please refresh your Discord tab and try again." });
          }
        }
      } else {
        sendResponse({ status: "error", message: "No active Discord tab found. Please open Discord in a tab." });
      }
      break;
    }

    case "REQUEST_BLUEPRINT": {
      const blueprint = await loadBlueprint(message.payload.serverId);
      sendResponse({ blueprint });
      break;
    }

    case "SAVE_SNAPSHOT": {
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
      const snapshots = await loadSnapshots(message.payload.serverId);
      sendResponse({ snapshots });
      break;
    }

    case "REQUEST_SERVER_LIST": {
      const servers = await listServers();
      sendResponse({ servers });
      break;
    }

    case "OPEN_SIDE_PANEL": {
      const [tab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true,
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
  chrome.runtime.sendMessage(message).catch(() => {});
}
