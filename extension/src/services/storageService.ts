/* ─────────────────────────────────────────────
 *  Storage Service
 *
 *  Typed wrapper around chrome.storage.local
 *  for persisting blueprints and snapshots.
 * ───────────────────────────────────────────── */

import type {
  ServerBlueprint,
  BlueprintSnapshot,
  ServerInfo,
} from "@mapmyserver/shared";

// ── Storage Keys ───────────────────────────────

const KEYS = {
  blueprint: (serverId: string) => `blueprint:${serverId}`,
  snapshots: (serverId: string) => `snapshots:${serverId}`,
  serverList: "server-list",
} as const;

// ── Blueprint Storage ──────────────────────────

export async function saveBlueprint(
  serverId: string,
  blueprint: ServerBlueprint
): Promise<void> {
  const key = KEYS.blueprint(serverId);
  await chrome.storage.local.set({ [key]: blueprint });

  // Update server list
  await addToServerList(blueprint.server);
}

export async function loadBlueprint(
  serverId: string
): Promise<ServerBlueprint | null> {
  const key = KEYS.blueprint(serverId);
  const result = await chrome.storage.local.get(key);
  return (result[key] as ServerBlueprint) ?? null;
}

export async function deleteBlueprint(serverId: string): Promise<void> {
  const key = KEYS.blueprint(serverId);
  await chrome.storage.local.remove(key);
}

// ── Snapshot Storage ───────────────────────────

export async function saveSnapshot(
  serverId: string,
  snapshot: BlueprintSnapshot
): Promise<void> {
  const key = KEYS.snapshots(serverId);
  const existing = await loadSnapshots(serverId);
  existing.push(snapshot);
  await chrome.storage.local.set({ [key]: existing });
}

export async function loadSnapshots(
  serverId: string
): Promise<BlueprintSnapshot[]> {
  const key = KEYS.snapshots(serverId);
  const result = await chrome.storage.local.get(key);
  return (result[key] as BlueprintSnapshot[]) ?? [];
}

export async function deleteSnapshot(
  serverId: string,
  snapshotId: string
): Promise<void> {
  const key = KEYS.snapshots(serverId);
  const existing = await loadSnapshots(serverId);
  const filtered = existing.filter((s) => s.id !== snapshotId);
  await chrome.storage.local.set({ [key]: filtered });
}

// ── Server List ────────────────────────────────

interface StoredServerInfo {
  id: string;
  name: string;
  icon?: string;
  lastAnalyzed: string;
}

async function addToServerList(server: ServerInfo): Promise<void> {
  const list = await listServers();
  const existing = list.findIndex((s) => s.id === server.id);
  const entry: StoredServerInfo = {
    id: server.id,
    name: server.name,
    icon: server.icon,
    lastAnalyzed: new Date().toISOString(),
  };

  if (existing >= 0) {
    list[existing] = entry;
  } else {
    list.push(entry);
  }

  await chrome.storage.local.set({ [KEYS.serverList]: list });
}

export async function listServers(): Promise<StoredServerInfo[]> {
  const result = await chrome.storage.local.get(KEYS.serverList);
  return (result[KEYS.serverList] as StoredServerInfo[]) ?? [];
}

// ── Utilities ──────────────────────────────────

export function generateSnapshotId(): string {
  return `snap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function getStorageUsage(): Promise<{
  bytesInUse: number;
  quota: number;
}> {
  const bytesInUse = await chrome.storage.local.getBytesInUse(null);
  return {
    bytesInUse,
    quota: chrome.storage.local.QUOTA_BYTES ?? 10_485_760, // 10MB default
  };
}
