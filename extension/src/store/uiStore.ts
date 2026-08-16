/* ─────────────────────────────────────────────
 *  UI Store (Zustand)
 *
 *  Manages UI state: active tab, search,
 *  filter toggles, tree collapse state, selected channel.
 * ───────────────────────────────────────────── */

import { create } from "zustand";

// ── Tab Types ──────────────────────────────────

export type SidePanelTab = "overview" | "tree" | "graph" | "stats" | "history";

// ── Filter State ───────────────────────────────

export interface FilterState {
  showCategories: boolean;
  showText: boolean;
  showVoice: boolean;
  showStage: boolean;
  showForums: boolean;
  showAnnouncements: boolean;
  showThreads: boolean;
  collapseEmpty: boolean;
}

// ── Store Shape ────────────────────────────────

interface UIState {
  // Navigation
  activeTab: SidePanelTab;
  setActiveTab: (tab: SidePanelTab) => void;

  // Selected Channel for Detail Panel
  selectedChannelId: string | null;
  setSelectedChannelId: (channelId: string | null) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Filters
  filters: FilterState;
  toggleFilter: (key: keyof FilterState) => void;
  resetFilters: () => void;

  // Tree expand/collapse
  expandedNodes: Set<string>;
  toggleNode: (nodeId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;

  // Filter panel visibility
  showFilterPanel: boolean;
  toggleFilterPanel: () => void;
}

// ── Defaults ───────────────────────────────────

const defaultFilters: FilterState = {
  showCategories: true,
  showText: true,
  showVoice: true,
  showStage: true,
  showForums: true,
  showAnnouncements: true,
  showThreads: true,
  collapseEmpty: false,
};

// ── Store ──────────────────────────────────────

export const useUIStore = create<UIState>((set) => ({
  // Navigation
  activeTab: "overview",
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Selected Channel
  selectedChannelId: null,
  setSelectedChannelId: (channelId) => set({ selectedChannelId: channelId }),

  // Search
  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Filters
  filters: { ...defaultFilters },
  toggleFilter: (key) =>
    set((state) => ({
      filters: { ...state.filters, [key]: !state.filters[key] },
    })),
  resetFilters: () => set({ filters: { ...defaultFilters } }),

  // Tree expand/collapse
  expandedNodes: new Set<string>(),
  toggleNode: (nodeId) =>
    set((state) => {
      const next = new Set(state.expandedNodes);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return { expandedNodes: next };
    }),
  expandAll: () =>
    set({ expandedNodes: new Set(["__all__"]) }),
  collapseAll: () =>
    set({ expandedNodes: new Set() }),

  // Filter panel
  showFilterPanel: false,
  toggleFilterPanel: () =>
    set((state) => ({ showFilterPanel: !state.showFilterPanel })),
}));
