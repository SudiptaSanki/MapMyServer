/* ─────────────────────────────────────────────
 *  Message Types — Chrome runtime messaging
 *
 *  Content Script ↔ Background ↔ Side Panel/Popup
 * ───────────────────────────────────────────── */

import type { ServerInfo, Channel, Category, Thread, ServerBlueprint, AnalysisStep } from "@mapmyserver/shared";

// ── Content Script → Background ────────────────

export interface ServerDetectedMessage {
  type: "SERVER_DETECTED";
  payload: {
    guildId: string;
    name: string;
    icon?: string;
  };
}

export interface NavigationChangedMessage {
  type: "NAVIGATION_CHANGED";
  payload: {
    guildId: string | null;
    channelId: string | null;
    url: string;
  };
}

export interface StructureCollectedMessage {
  type: "STRUCTURE_COLLECTED";
  payload: {
    server: ServerInfo;
    categories: Category[];
    channels: Channel[];
    threads: Thread[];
  };
}

export interface CollectionProgressMessage {
  type: "COLLECTION_PROGRESS";
  payload: AnalysisStep;
}

export interface CollectionErrorMessage {
  type: "COLLECTION_ERROR";
  payload: {
    message: string;
    step?: string;
  };
}

// ── Background → Content Script ────────────────

export interface CollectStructureMessage {
  type: "COLLECT_STRUCTURE";
}

export interface PingMessage {
  type: "PING";
}

// ── Side Panel / Popup → Background ────────────

export interface RequestAnalysisMessage {
  type: "REQUEST_ANALYSIS";
  payload?: {
    tabId?: number;
  };
}

export interface CheckActiveTabMessage {
  type: "CHECK_ACTIVE_TAB";
}

export interface RequestBlueprintMessage {
  type: "REQUEST_BLUEPRINT";
  payload: {
    serverId: string;
  };
}

export interface SaveSnapshotMessage {
  type: "SAVE_SNAPSHOT";
  payload: {
    serverId: string;
    label?: string;
  };
}

export interface RequestSnapshotsMessage {
  type: "REQUEST_SNAPSHOTS";
  payload: {
    serverId: string;
  };
}

export interface RequestServerListMessage {
  type: "REQUEST_SERVER_LIST";
}

export interface OpenSidePanelMessage {
  type: "OPEN_SIDE_PANEL";
}

// ── Background → Side Panel / Popup ────────────

export interface BlueprintReadyMessage {
  type: "BLUEPRINT_READY";
  payload: ServerBlueprint;
}

export interface AnalysisProgressMessage {
  type: "ANALYSIS_PROGRESS";
  payload: AnalysisStep;
}

export interface AnalysisErrorMessage {
  type: "ANALYSIS_ERROR";
  payload: {
    message: string;
  };
}

export interface CurrentServerMessage {
  type: "CURRENT_SERVER";
  payload: {
    guildId: string | null;
    name: string | null;
    onDiscord: boolean;
  };
}

// ── Union Types ────────────────────────────────

export type ContentToBackgroundMessage =
  | ServerDetectedMessage
  | NavigationChangedMessage
  | StructureCollectedMessage
  | CollectionProgressMessage
  | CollectionErrorMessage;

export type BackgroundToContentMessage =
  | CollectStructureMessage
  | PingMessage;

export type UIToBackgroundMessage =
  | RequestAnalysisMessage
  | CheckActiveTabMessage
  | RequestBlueprintMessage
  | SaveSnapshotMessage
  | RequestSnapshotsMessage
  | RequestServerListMessage
  | OpenSidePanelMessage;

export type BackgroundToUIMessage =
  | BlueprintReadyMessage
  | AnalysisProgressMessage
  | AnalysisErrorMessage
  | CurrentServerMessage;

export type ExtensionMessage =
  | ContentToBackgroundMessage
  | BackgroundToContentMessage
  | UIToBackgroundMessage
  | BackgroundToUIMessage;
