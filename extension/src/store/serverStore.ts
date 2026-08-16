/* ─────────────────────────────────────────────
 *  Server Store (Zustand)
 *
 *  Manages server blueprint data, analysis
 *  state, and snapshot history.
 * ───────────────────────────────────────────── */

import { create } from "zustand";
import type {
  ServerBlueprint,
  BlueprintSnapshot,
  AnalysisStep,
  TreeNode,
} from "@mapmyserver/shared";
import type {
  ExtensionMessage,
} from "@/types/messages";
import { buildTree } from "@/services/blueprintBuilder";

// ── Store Shape ────────────────────────────────

interface ServerState {
  // Current server info
  currentServer: {
    guildId: string | null;
    name: string | null;
    onDiscord: boolean;
  };

  // Blueprint data
  blueprint: ServerBlueprint | null;
  tree: TreeNode | null;

  // Analysis state
  isAnalyzing: boolean;
  analysisSteps: AnalysisStep[];
  analysisError: string | null;

  // Snapshots
  snapshots: BlueprintSnapshot[];

  // Phase 2: Backend Auth & API
  backendToken: string | null;
  authorizedServers: any[];
  isLoadingServers: boolean;

  // Actions
  setCurrentServer: (guildId: string | null, name: string | null, onDiscord: boolean) => void;
  setBlueprint: (blueprint: ServerBlueprint) => void;
  clearBlueprint: () => void;
  startAnalysis: () => void;
  updateAnalysisStep: (step: AnalysisStep) => void;
  setAnalysisError: (error: string) => void;
  setSnapshots: (snapshots: BlueprintSnapshot[]) => void;
  addSnapshot: (snapshot: BlueprintSnapshot) => void;

  // Backend API Actions
  setBackendToken: (token: string) => void;
  fetchAuthorizedServers: () => Promise<void>;
  fetchBlueprintFromApi: (serverId: string) => Promise<void>;

  // Message handling
  handleMessage: (message: ExtensionMessage) => void;

  // Chrome messaging actions
  requestAnalysis: () => Promise<void>;
  requestBlueprint: (serverId: string) => Promise<void>;
  saveSnapshot: (label?: string) => Promise<void>;
  loadSnapshots: () => Promise<void>;
  loadMockServer: () => void;
}

// ── Store ──────────────────────────────────────

export const useServerStore = create<ServerState>((set, get) => ({
  // Initial state
  currentServer: {
    guildId: null,
    name: null,
    onDiscord: false,
  },
  blueprint: null,
  tree: null,
  isAnalyzing: false,
  analysisSteps: [],
  analysisError: null,
  snapshots: [],
  backendToken: typeof window !== 'undefined' ? localStorage.getItem("backend_token") : null,
  authorizedServers: [],
  isLoadingServers: false,

  // ── State Setters ────────────────────────────

  setCurrentServer: (guildId, name, onDiscord) => {
    set({
      currentServer: { guildId, name, onDiscord },
    });

    // Auto-load blueprint if available
    if (guildId) {
      get().requestBlueprint(guildId);
      get().loadSnapshots();
    }
  },

  setBlueprint: (blueprint) => {
    const tree = buildTree(blueprint);
    set({
      blueprint,
      tree,
      isAnalyzing: false,
      analysisError: null,
    });
  },

  clearBlueprint: () => {
    set({
      blueprint: null,
      tree: null,
      analysisSteps: [],
      analysisError: null,
    });
  },

  startAnalysis: () => {
    set({
      isAnalyzing: true,
      analysisSteps: [
        { id: "server", label: "Server identified", status: "pending" },
        { id: "categories", label: "Categories detected", status: "pending" },
        { id: "channels", label: "Channels detected", status: "pending" },
        { id: "types", label: "Channel types detected", status: "pending" },
        { id: "threads", label: "Threads detected", status: "pending" },
        { id: "metadata", label: "Server metadata detected", status: "pending" },
      ],
      analysisError: null,
    });
  },

  updateAnalysisStep: (step) => {
    set((state) => {
      const steps = state.analysisSteps.map((s) =>
        s.id === step.id ? step : s
      );
      // If step isn't in the list, add it
      if (!steps.find((s) => s.id === step.id)) {
        steps.push(step);
      }
      return { analysisSteps: steps };
    });
  },

  setAnalysisError: (error) => {
    set({
      isAnalyzing: false,
      analysisError: error,
    });
  },

  setSnapshots: (snapshots) => {
    set({ snapshots });
  },

  addSnapshot: (snapshot) => {
    set((state) => ({
      snapshots: [...state.snapshots, snapshot],
    }));
  },

  // ── Message Handler ──────────────────────────

  handleMessage: (message) => {
    const state = get();

    switch (message.type) {
      case "CURRENT_SERVER":
        state.setCurrentServer(
          message.payload.guildId,
          message.payload.name,
          message.payload.onDiscord
        );
        break;

      case "BLUEPRINT_READY":
        state.setBlueprint(message.payload);
        break;

      case "ANALYSIS_PROGRESS":
        state.updateAnalysisStep(message.payload);
        break;

      case "ANALYSIS_ERROR":
        state.setAnalysisError(message.payload.message);
        break;
    }
  },

  // ── Chrome Messaging ─────────────────────────

  requestAnalysis: async () => {
    const state = get();
    state.startAnalysis();

    try {
      await chrome.runtime.sendMessage({ type: "REQUEST_ANALYSIS" });
    } catch (err) {
      state.setAnalysisError("Failed to start analysis");
    }
  },

  requestBlueprint: async (serverId: string) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "REQUEST_BLUEPRINT",
        payload: { serverId },
      });

      if (response?.blueprint) {
        get().setBlueprint(response.blueprint);
      }
    } catch {
      // Background might not be ready yet
    }
  },

  saveSnapshot: async (label?: string) => {
    const { currentServer } = get();
    if (!currentServer.guildId) return;

    try {
      const response = await chrome.runtime.sendMessage({
        type: "SAVE_SNAPSHOT",
        payload: {
          serverId: currentServer.guildId,
          label,
        },
      });

      if (response?.snapshot) {
        get().addSnapshot(response.snapshot);
      }
    } catch {
      console.error("[Blueprint] Failed to save snapshot");
    }
  },

  loadSnapshots: async () => {
    const { currentServer } = get();
    if (!currentServer.guildId) return;

    try {
      const response = await chrome.runtime.sendMessage({
        type: "REQUEST_SNAPSHOTS",
        payload: { serverId: currentServer.guildId },
      });

      if (response?.snapshots) {
        get().setSnapshots(response.snapshots);
      }
    } catch {
      // Background might not be ready yet
    }
  },

  loadMockServer: async () => {
    // Dynamic import to avoid bundling mock data in the main thread unless requested
    const { MOCK_SERVER } = await import("@/services/mockServer");
    const state = get();
    state.setCurrentServer(MOCK_SERVER.server.id, MOCK_SERVER.server.name, true);
    state.setBlueprint(MOCK_SERVER);
  },

  setBackendToken: (token) => {
    if (typeof window !== 'undefined') localStorage.setItem("backend_token", token);
    set({ backendToken: token });
  },

  fetchAuthorizedServers: async () => {
    const { backendToken } = get();
    if (!backendToken) return;

    set({ isLoadingServers: true });
    try {
      const res = await fetch("http://localhost:3000/api/servers", {
        headers: { Authorization: `Bearer ${backendToken}` }
      });
      if (!res.ok) throw new Error("Failed to fetch servers");
      const servers = await res.json();
      set({ authorizedServers: servers, isLoadingServers: false });
    } catch (e: any) {
      set({ analysisError: e.message, isLoadingServers: false });
    }
  },

  fetchBlueprintFromApi: async (serverId) => {
    const { backendToken } = get();
    if (!backendToken) return;

    set({ isAnalyzing: true, analysisError: null, analysisSteps: [] });
    try {
      const res = await fetch(`http://localhost:3000/api/servers/${serverId}/blueprint`, {
        headers: { Authorization: `Bearer ${backendToken}` }
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to fetch blueprint");
      }
      
      const blueprint = await res.json();
      get().setBlueprint(blueprint);
    } catch (e: any) {
      set({ analysisError: e.message, isAnalyzing: false });
    }
  },
}));

// ── Message Listener (called from React init) ──

export function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
    useServerStore.getState().handleMessage(message);
  });
}
