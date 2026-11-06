/* ─────────────────────────────────────────────
 *  MapMyServer — Active Server Roadmap Storage Service
 *
 *  Persists adopted server architecture plans in local storage
 *  so users can track implementation progress across browser sessions.
 * ───────────────────────────────────────────── */

import type { ActiveServerPlan } from "@mapmyserver/shared";

const STORAGE_KEY_PREFIX = "mapmyserver_active_plan:";

export async function saveActiveServerPlan(
  planOrServerId: string | ActiveServerPlan,
  maybePlan?: ActiveServerPlan
): Promise<void> {
  let serverId: string;
  let plan: ActiveServerPlan;
  if (typeof planOrServerId === "string") {
    serverId = planOrServerId;
    plan = maybePlan!;
  } else {
    serverId = planOrServerId.serverId;
    plan = planOrServerId;
  }
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    const key = `${STORAGE_KEY_PREFIX}${serverId}`;
    await chrome.storage.local.set({ [key]: plan });
  }
}

export async function loadActiveServerPlan(
  serverId: string
): Promise<ActiveServerPlan | null> {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    const key = `${STORAGE_KEY_PREFIX}${serverId}`;
    const result = await chrome.storage.local.get(key);
    return (result[key] as ActiveServerPlan) || null;
  }
  return null;
}

export async function deleteActiveServerPlan(serverId: string): Promise<void> {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    const key = `${STORAGE_KEY_PREFIX}${serverId}`;
    await chrome.storage.local.remove(key);
  }
}

export async function listActiveServerPlans(): Promise<Record<string, ActiveServerPlan>> {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    const all = await chrome.storage.local.get(null);
    const plans: Record<string, ActiveServerPlan> = {};
    for (const [key, value] of Object.entries(all)) {
      if (key.startsWith(STORAGE_KEY_PREFIX)) {
        const sId = key.replace(STORAGE_KEY_PREFIX, "");
        plans[sId] = value as ActiveServerPlan;
      }
    }
    return plans;
  }
  return {};
}
