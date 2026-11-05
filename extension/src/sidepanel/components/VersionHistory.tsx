/* ─────────────────────────────────────────────
 *  Version History, Snapshot Timeline & Change Monitor
 *
 *  Manage manual snapshots, view chronological change feeds,
 *  and compare historical server versions.
 * ───────────────────────────────────────────── */

import { useState, useEffect, useMemo } from "react";
import { useServerStore } from "@/store/serverStore";
import {
  type BlueprintSnapshot,
  type ArchitectureChangeEvent,
  type ArchitectureDiff,
  detectArchitectureChanges,
  computeArchitectureDiff,
} from "@mapmyserver/shared";
import {
  saveSnapshot,
  loadSnapshots,
  deleteSnapshot,
} from "../../services/storageService";
import {
  History,
  Camera,
  GitCompare,
  Trash2,
  Clock,
  AlertTriangle,
  FolderPlus,
  FilePlus,
  Lock,
} from "lucide-react";

export default function VersionHistory() {
  const { blueprint } = useServerStore();

  const [snapshots, setSnapshots] = useState<BlueprintSnapshot[]>([]);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const [snapshotNotes, setSnapshotNotes] = useState("");

  // Diff comparison between two snapshots
  const [compareSnapshotAId, setCompareSnapshotAId] = useState<string>("");
  const [compareSnapshotBId, setCompareSnapshotBId] = useState<string>("");
  const [isComparing, setIsComparing] = useState(false);

  const loadAllSnapshots = async () => {
    if (!blueprint) return;
    const list = await loadSnapshots(blueprint.server.id);
    setSnapshots(list);
    if (list.length >= 2 && !compareSnapshotAId) {
      setCompareSnapshotAId(list[1].id);
      setCompareSnapshotBId(list[0].id);
    }
  };

  useEffect(() => {
    loadAllSnapshots();
  }, [blueprint]);

  // Live Change Detection against most recent snapshot
  const recentChanges: ArchitectureChangeEvent[] = useMemo(() => {
    if (!blueprint || snapshots.length === 0) return [];
    const latestSnapshot = snapshots[0];
    return detectArchitectureChanges(blueprint, latestSnapshot);
  }, [blueprint, snapshots]);

  // Snapshot Comparison Diff
  const snapshotDiff: ArchitectureDiff | null = useMemo(() => {
    if (!compareSnapshotAId || !compareSnapshotBId) return null;
    const snapA = snapshots.find((s) => s.id === compareSnapshotAId);
    const snapB = snapshots.find((s) => s.id === compareSnapshotBId);
    if (!snapA || !snapB) return null;

    // Convert snapB into proposal shape
    return computeArchitectureDiff(snapA.blueprint, {
      id: "comp",
      serverId: snapB.serverId,
      title: snapB.label || "Snapshot B",
      description: "",
      targetAudienceOrPurpose: "",
      categories: snapB.blueprint.categories.map((c) => ({ id: c.id, name: c.name, position: c.position })),
      channels: snapB.blueprint.channels.map((ch) => ({
        id: ch.id,
        name: ch.name,
        type: ch.type,
        categoryId: ch.parentId,
        position: ch.position,
        topic: ch.topic,
        suggestedVisibility: ch.visibilityAnalysis?.classification,
      })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }, [compareSnapshotAId, compareSnapshotBId, snapshots]);

  // Create Manual Snapshot Handler
  const handleCreateSnapshot = async () => {
    if (!blueprint) return;
    const now = new Date().toISOString();
    const newSnap: BlueprintSnapshot = {
      id: `snap-${blueprint.server.id}-${Date.now()}`,
      serverId: blueprint.server.id,
      blueprint: JSON.parse(JSON.stringify(blueprint)), // Deep clone
      createdAt: now,
      label: snapshotLabel.trim() || `Manual Snapshot (${new Date().toLocaleDateString()})`,
      notes: snapshotNotes.trim() || undefined,
      architectureVersion: (snapshots[0]?.architectureVersion || 0) + 1,
    };

    await saveSnapshot(blueprint.server.id, newSnap);
    await loadAllSnapshots();
    setIsCreatingSnapshot(false);
    setSnapshotLabel("");
    setSnapshotNotes("");
  };

  const handleDeleteSnapshot = async (id: string) => {
    if (!blueprint) return;
    if (confirm("Delete this architecture snapshot?")) {
      await deleteSnapshot(blueprint.server.id, id);
      await loadAllSnapshots();
    }
  };

  if (!blueprint) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-text-muted">
        <History className="w-10 h-10 mb-3 text-discord-blurple/60" />
        <p className="text-sm">No server blueprint loaded.</p>
        <p className="text-xs mt-1">Scan a Discord server to view version history and track changes.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 animate-fade-in pb-8">
      {/* ── Top Header ── */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-discord-blurple/20 flex items-center justify-center text-discord-blurple">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">Version Control & Snapshots</h2>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Track historical states, monitor channel drift, and compare server architectures over time.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => setIsCreatingSnapshot(true)}
            className="btn-primary flex-1 py-1.5 px-3 text-xs flex items-center justify-center gap-1.5"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Create Architecture Snapshot</span>
          </button>

          {snapshots.length >= 2 && (
            <button
              onClick={() => setIsComparing(!isComparing)}
              className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5"
            >
              <GitCompare className="w-3.5 h-3.5 text-discord-blurple" />
              <span>{isComparing ? "Hide Diff" : "Compare Versions"}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Snapshot Comparison View (Feature C) ── */}
      {isComparing && snapshots.length >= 2 && (
        <div className="glass-card p-3 space-y-3 border-discord-blurple/40 animate-fade-in">
          <div className="flex items-center justify-between border-b border-surface-500/20 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-xs text-text-primary">
              <GitCompare className="w-4 h-4 text-discord-blurple" />
              <span>Snapshot Diff Inspector</span>
            </div>
            <span className="text-[10px] font-mono text-discord-blurple font-bold">
              {snapshotDiff ? `${snapshotDiff.totalChanges} changes` : "Identical"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-text-muted">Base (Older Version)</label>
              <select
                value={compareSnapshotAId}
                onChange={(e) => setCompareSnapshotAId(e.target.value)}
                className="w-full bg-surface-900 border border-surface-500/30 rounded-lg p-1.5 text-xs text-text-primary focus:outline-none focus:border-discord-blurple truncate"
              >
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label || "Snapshot"} ({new Date(s.createdAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-text-muted">Target (Newer Version)</label>
              <select
                value={compareSnapshotBId}
                onChange={(e) => setCompareSnapshotBId(e.target.value)}
                className="w-full bg-surface-900 border border-surface-500/30 rounded-lg p-1.5 text-xs text-text-primary focus:outline-none focus:border-discord-blurple truncate"
              >
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label || "Snapshot"} ({new Date(s.createdAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {snapshotDiff && snapshotDiff.totalChanges > 0 ? (
            <div className="space-y-2 pt-1 text-xs">
              {snapshotDiff.addedChannels.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase">Added Channels</span>
                  <div className="flex flex-wrap gap-1">
                    {snapshotDiff.addedChannels.map((c) => (
                      <span key={c.id} className="text-[10px] font-mono bg-emerald-500/10 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        + #{c.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {snapshotDiff.removedChannels.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-rose-400 font-bold uppercase">Removed Channels</span>
                  <div className="flex flex-wrap gap-1">
                    {snapshotDiff.removedChannels.map((c) => (
                      <span key={c.id} className="text-[10px] font-mono bg-rose-500/10 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/20">
                        - #{c.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {snapshotDiff.modifiedChannels.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-amber-400 font-bold uppercase">Modified Channels</span>
                  <div className="space-y-1">
                    {snapshotDiff.modifiedChannels.map((m, i) => (
                      <div key={i} className="p-1.5 rounded bg-surface-900 border border-surface-500/20 text-[10px] font-mono text-amber-300">
                        #{m.current.name}: {m.differences.join(", ")}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-[11px] text-text-muted text-center py-2">
              No structural differences detected between these two snapshots.
            </div>
          )}
        </div>
      )}

      {/* ── Feature E: Live Change Activity Feed ── */}
      {recentChanges.length > 0 && (
        <div className="glass-card p-3 space-y-2 border-amber-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
              <Clock className="w-3.5 h-3.5" />
              <span>Detected Changes Since Last Snapshot</span>
            </div>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded font-bold">
              {recentChanges.length} Changes
            </span>
          </div>

          <div className="space-y-1.5 pt-1">
            {recentChanges.map((ch) => (
              <div
                key={ch.id}
                className="p-2 rounded bg-surface-900 border border-surface-500/20 text-xs flex items-start gap-2"
              >
                {ch.changeType === "channel-added" ? (
                  <FilePlus className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : ch.changeType === "category-added" ? (
                  <FolderPlus className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : ch.changeType === "permission-changed" ? (
                  <Lock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-text-primary text-[11px]">{ch.resourceName}</span>
                    <span
                      className={`text-[9px] font-mono px-1 rounded ${
                        ch.confidence === "confirmed"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-amber-500/10 text-amber-300"
                      }`}
                    >
                      {ch.confidence}
                    </span>
                  </div>
                  <p className="text-[10px] text-text-secondary mt-0.5">{ch.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Feature D: Snapshot Timeline ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-text-muted px-1">
          <span>Saved Snapshots ({snapshots.length} / 25)</span>
        </div>

        {snapshots.length === 0 ? (
          <div className="glass-card p-6 text-center text-text-muted space-y-2">
            <Camera className="w-8 h-8 text-discord-blurple/60 mx-auto" />
            <div className="text-xs font-semibold text-text-primary">No Snapshots Saved Yet</div>
            <p className="text-[11px] max-w-xs mx-auto">
              Save a baseline snapshot to track future server renovations, role revisions, and channel edits.
            </p>
          </div>
        ) : (
          snapshots.map((snap) => {
            const dateStr = new Date(snap.createdAt).toLocaleString();
            const chanCount = snap.blueprint.channels.length;
            const catCount = snap.blueprint.categories.length;

            return (
              <div
                key={snap.id}
                className="glass-card p-3 border border-surface-500/20 hover:border-surface-500/40 transition-all space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-text-primary text-xs">{snap.label}</h4>
                    <span className="text-[10px] text-text-muted font-mono">{dateStr}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-900 text-text-secondary border border-surface-500/20">
                      {catCount} Cats • {chanCount} Chans
                    </span>
                    <button
                      onClick={() => handleDeleteSnapshot(snap.id)}
                      className="p-1 rounded hover:bg-rose-500/20 text-text-muted hover:text-rose-400"
                      title="Delete snapshot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {snap.notes && (
                  <p className="text-[11px] text-text-secondary bg-surface-900/60 p-2 rounded border border-surface-500/20 leading-relaxed">
                    {snap.notes}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Create Snapshot Modal ── */}
      {isCreatingSnapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-800 border border-surface-500/40 rounded-xl w-full max-w-md shadow-2xl p-4 space-y-3.5 text-xs">
            <div className="flex items-center justify-between border-b border-surface-500/20 pb-2">
              <h3 className="font-bold text-text-primary text-sm">Save Architecture Snapshot</h3>
              <button onClick={() => setIsCreatingSnapshot(false)} className="text-text-muted hover:text-white">✕</button>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-text-primary">Snapshot Name / Label</label>
              <input
                type="text"
                value={snapshotLabel}
                onChange={(e) => setSnapshotLabel(e.target.value)}
                placeholder="e.g. Pre-Launch Revamp v2"
                className="w-full bg-surface-900 border border-surface-500/30 rounded-lg p-2 text-xs text-text-primary focus:outline-none focus:border-discord-blurple"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-text-primary">Notes (Optional)</label>
              <textarea
                value={snapshotNotes}
                onChange={(e) => setSnapshotNotes(e.target.value)}
                rows={2}
                placeholder="What major changes or events occurred before this snapshot?"
                className="w-full bg-surface-900 border border-surface-500/30 rounded-lg p-2 text-xs text-text-primary focus:outline-none focus:border-discord-blurple resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-500/20">
              <button onClick={() => setIsCreatingSnapshot(false)} className="btn-secondary px-3 py-1.5 text-xs">
                Cancel
              </button>
              <button onClick={handleCreateSnapshot} className="btn-primary px-3.5 py-1.5 text-xs">
                Save Snapshot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
