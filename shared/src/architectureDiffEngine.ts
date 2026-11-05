/* ─────────────────────────────────────────────
 *  Architecture Diff Engine
 *
 *  Compares a live ServerBlueprint with a proposed architecture
 *  to compute structural additions, removals, moves, and modifications.
 * ───────────────────────────────────────────── */

import type {
  ServerBlueprint,
  Category,
  Channel,
} from "./index";
import type {
  ArchitectureProposal,
  ArchitectureDiff,
  ProposedCategory,
  ProposedChannel,
} from "./aiTypes";

export function computeArchitectureDiff(
  current: ServerBlueprint,
  proposal: ArchitectureProposal
): ArchitectureDiff {
  const currentCategories = current.categories;
  const currentChannels = current.channels.filter((c) => c.type !== "category");

  const currentCatMap = new Map<string, Category>();
  const currentCatByName = new Map<string, Category>();
  for (const cat of currentCategories) {
    currentCatMap.set(cat.id, cat);
    currentCatByName.set(cat.name.trim().toLowerCase(), cat);
  }

  const propCatMap = new Map<string, ProposedCategory>();
  const propCatByName = new Map<string, ProposedCategory>();
  for (const pCat of proposal.categories) {
    propCatMap.set(pCat.id, pCat);
    propCatByName.set(pCat.name.trim().toLowerCase(), pCat);
  }

  // 1. Added Categories (in proposal, not in current by name or id)
  const addedCategories: ProposedCategory[] = [];
  for (const pCat of proposal.categories) {
    const norm = pCat.name.trim().toLowerCase();
    if (!currentCatMap.has(pCat.id) && !currentCatByName.has(norm)) {
      addedCategories.push(pCat);
    }
  }

  // 2. Removed Categories (in current, not in proposal)
  const removedCategories: Category[] = [];
  for (const cCat of currentCategories) {
    const norm = cCat.name.trim().toLowerCase();
    if (!propCatMap.has(cCat.id) && !propCatByName.has(norm)) {
      removedCategories.push(cCat);
    }
  }

  // 3. Channels Diff
  const currentChanMap = new Map<string, Channel>();
  const currentChanByName = new Map<string, Channel>();
  for (const ch of currentChannels) {
    currentChanMap.set(ch.id, ch);
    currentChanByName.set(ch.name.trim().toLowerCase(), ch);
  }

  const propChanMap = new Map<string, ProposedChannel>();
  const propChanByName = new Map<string, ProposedChannel>();
  for (const pch of proposal.channels) {
    propChanMap.set(pch.id, pch);
    propChanByName.set(pch.name.trim().toLowerCase(), pch);
  }

  // Added Channels
  const addedChannels: ProposedChannel[] = [];
  for (const pch of proposal.channels) {
    const norm = pch.name.trim().toLowerCase();
    if (!currentChanMap.has(pch.id) && !currentChanByName.has(norm)) {
      addedChannels.push(pch);
    }
  }

  // Removed Channels
  const removedChannels: Channel[] = [];
  for (const cch of currentChannels) {
    const norm = cch.name.trim().toLowerCase();
    if (!propChanMap.has(cch.id) && !propChanByName.has(norm)) {
      removedChannels.push(cch);
    }
  }

  // Modified Channels (matches existing channel by id or name, but attributes differ)
  const modifiedChannels: ArchitectureDiff["modifiedChannels"] = [];
  for (const pch of proposal.channels) {
    const norm = pch.name.trim().toLowerCase();
    const existing = currentChanMap.get(pch.id) || currentChanByName.get(norm);
    if (!existing) continue;

    const differences: string[] = [];

    // Type change
    if (existing.type !== pch.type) {
      differences.push(`Type changed from "${existing.type}" to "${pch.type}"`);
    }

    // Category move
    const existingCat = existing.parentId ? currentCatMap.get(existing.parentId) : null;
    const propCat = pch.categoryId ? propCatMap.get(pch.categoryId) : null;
    if (existingCat?.name.toLowerCase() !== propCat?.name.toLowerCase()) {
      const fromName = existingCat ? `"${existingCat.name}"` : "(No Category)";
      const toName = propCat ? `"${propCat.name}"` : "(No Category)";
      differences.push(`Moved from ${fromName} to ${toName}`);
    }

    // Topic / Description change
    if (pch.topic && pch.topic !== existing.topic) {
      differences.push(`Topic updated: "${pch.topic}"`);
    }

    // Visibility change
    if (
      pch.suggestedVisibility &&
      existing.visibilityAnalysis?.classification !== pch.suggestedVisibility
    ) {
      differences.push(
        `Visibility changed to "${pch.suggestedVisibility}" (currently: "${
          existing.visibilityAnalysis?.classification || "unknown"
        }")`
      );
    }

    if (differences.length > 0) {
      modifiedChannels.push({
        current: existing,
        proposed: pch,
        differences,
      });
    }
  }

  const totalChanges =
    addedCategories.length +
    removedCategories.length +
    addedChannels.length +
    removedChannels.length +
    modifiedChannels.length;

  return {
    addedCategories,
    removedCategories,
    addedChannels,
    removedChannels,
    modifiedChannels,
    totalChanges,
  };
}

