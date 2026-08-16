import { useServerStore } from "@/store/serverStore";
import type { BlueprintSnapshot } from "@mapmyserver/shared";

export default function ChangeHistory() {
  const { snapshots, blueprint, currentServer, saveSnapshot } =
    useServerStore();

  if (!currentServer.guildId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
        <div className="text-3xl">📜</div>
        <p className="text-sm text-text-muted">
          Navigate to a server to see its history.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      {/* Save Snapshot */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
          Snapshots
        </h3>
        <p className="text-xs text-text-muted mb-3">
          Save the current server structure to track changes over time.
        </p>
        <button
          onClick={() => saveSnapshot()}
          disabled={!blueprint}
          className="btn-primary w-full"
        >
          📸 Save Current Snapshot
        </button>
      </div>

      {/* Snapshot List */}
      {snapshots.length > 0 ? (
        <div className="flex flex-col gap-2">
          {[...snapshots].reverse().map((snapshot, index) => (
            <SnapshotCard
              key={snapshot.id}
              snapshot={snapshot}
              isLatest={index === 0}
              previousSnapshot={
                index < snapshots.length - 1
                  ? snapshots[snapshots.length - 1 - (index + 1)]
                  : undefined
              }
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <div className="text-2xl mb-2">📷</div>
          <p className="text-xs text-text-muted">
            No snapshots yet. Analyze and save to start tracking changes.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Snapshot Card ───────────────────────────────

function SnapshotCard({
  snapshot,
  isLatest,
  previousSnapshot,
}: {
  snapshot: BlueprintSnapshot;
  isLatest: boolean;
  previousSnapshot?: BlueprintSnapshot;
}) {
  const stats = snapshot.blueprint.statistics;
  const date = new Date(snapshot.createdAt);

  // Compute simple diff if previous snapshot exists
  const diff = previousSnapshot
    ? computeSimpleDiff(previousSnapshot, snapshot)
    : null;

  return (
    <div className="glass-card p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isLatest && (
            <span className="badge bg-discord-green/15 text-discord-green text-[10px]">
              Latest
            </span>
          )}
          <span className="text-xs font-medium text-text-primary">
            {date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
        <span className="text-[10px] text-text-muted">
          {date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {snapshot.label && (
        <p className="text-xs text-text-secondary mb-2 italic">
          {snapshot.label}
        </p>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <MiniStat label="Categories" value={stats.categories} />
        <MiniStat label="Channels" value={stats.totalChannels} />
        <MiniStat label="Threads" value={stats.threads} />
      </div>

      {/* Diff */}
      {diff && diff.length > 0 && (
        <div className="mt-2 pt-2 border-t border-surface-500/20">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
            Changes from previous
          </div>
          {diff.map((change, i) => (
            <div
              key={i}
              className={`text-xs ${
                change.direction === "up"
                  ? "text-discord-green"
                  : change.direction === "down"
                  ? "text-discord-red"
                  : "text-text-muted"
              }`}
            >
              {change.direction === "up" ? "↑" : change.direction === "down" ? "↓" : "="}{" "}
              {change.label}: {change.from} → {change.to}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface-900/30 rounded-md py-1.5">
      <div className="text-sm font-bold text-text-primary">{value}</div>
      <div className="text-[9px] text-text-muted uppercase">{label}</div>
    </div>
  );
}

// ── Simple Diff ────────────────────────────────

interface DiffItem {
  label: string;
  from: number;
  to: number;
  direction: "up" | "down" | "same";
}

function computeSimpleDiff(
  prev: BlueprintSnapshot,
  curr: BlueprintSnapshot
): DiffItem[] {
  const p = prev.blueprint.statistics;
  const c = curr.blueprint.statistics;

  const items: DiffItem[] = [];

  const compare = (label: string, from: number, to: number) => {
    if (from !== to) {
      items.push({
        label,
        from,
        to,
        direction: to > from ? "up" : "down",
      });
    }
  };

  compare("Categories", p.categories, c.categories);
  compare("Text Channels", p.textChannels, c.textChannels);
  compare("Voice Channels", p.voiceChannels, c.voiceChannels);
  compare("Stage Channels", p.stageChannels, c.stageChannels);
  compare("Forum Channels", p.forumChannels, c.forumChannels);
  compare("Threads", p.threads, c.threads);
  compare("Roles", p.roles, c.roles);

  return items;
}
