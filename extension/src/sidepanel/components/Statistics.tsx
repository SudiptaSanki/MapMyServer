import { useMemo } from "react";
import { useServerStore } from "@/store/serverStore";
import {
  calculateDerivedStats,
  type DerivedStatistics,
} from "@/services/statisticsCalculator";
import type { ChannelPurpose } from "@mapmyserver/shared";
import { LineChart } from "lucide-react";

const PURPOSE_COLORS: Record<ChannelPurpose, string> = {
  ONBOARDING: "#10b981",
  GOVERNANCE: "#f59e0b",
  INFORMATION: "#0ea5e9",
  COMMUNITY: "#6366f1",
  SUPPORT: "#f43f5e",
  KNOWLEDGE: "#14b8a6",
  EVENTS: "#a855f7",
  TEAM: "#3b82f6",
  INTERNAL: "#64748b",
  SHOWCASE: "#ec4899",
  FEEDBACK: "#f97316",
  OTHER: "#71717a",
};

export default function Statistics() {
  const { blueprint } = useServerStore();

  const derivedStats = useMemo(() => {
    if (!blueprint) return null;
    return calculateDerivedStats(blueprint);
  }, [blueprint]);

  if (!blueprint || !derivedStats) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
        <div className="text-discord-blurple">
          <LineChart className="w-8 h-8" />
        </div>
        <p className="text-sm text-text-muted">
          Analyze a server to see detailed statistics.
        </p>
      </div>
    );
  }

  const { statistics } = blueprint;

  const purposeList = Object.entries(statistics.purposeDistribution || {})
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-col gap-3 animate-fade-in pb-4">
      {/* Content & Purpose Coverage */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
          Architecture & Content Coverage
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <MetricItem
            label="Content Coverage"
            value={`${derivedStats.contentCoveragePercent}%`}
            detail={`${statistics.channelsWithContent} of ${statistics.totalChannels} channels`}
          />
          <MetricItem
            label="Purpose Coverage"
            value={`${derivedStats.purposeCoveragePercent}%`}
            detail={`${statistics.channelsWithPurpose} of ${statistics.totalChannels} classified`}
          />
          <MetricItem
            label="Channels with Topics"
            value={statistics.channelsWithTopics.toString()}
            detail={`${Math.round((statistics.channelsWithTopics / Math.max(statistics.totalChannels, 1)) * 100)}% of total`}
          />
          <MetricItem
            label="Server Rules Count"
            value={blueprint.rules ? blueprint.rules.rules.length.toString() : "0"}
            detail={blueprint.rules?.sourceChannelName ? `#${blueprint.rules.sourceChannelName}` : "Not detected"}
          />
        </div>
      </div>

      {/* Purpose Classification Distribution */}
      {purposeList.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
            Channel Purpose Distribution
          </h3>
          <div className="space-y-2">
            {purposeList.map(([purpose, count]) => {
              const pct = Math.round((count / Math.max(statistics.totalChannels, 1)) * 100);
              const color = PURPOSE_COLORS[purpose as ChannelPurpose] || "#71717a";

              return (
                <div key={purpose}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-1.5 font-medium text-text-primary">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span>{purpose}</span>
                    </div>
                    <span className="text-text-muted font-mono">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-500/30 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Channel Type Distribution */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
          Channel Type Breakdown
        </h3>
        <div className="flex items-center gap-4">
          <DonutChart data={derivedStats.channelTypeDistribution} />
          <div className="flex flex-col gap-1.5 flex-1">
            {derivedStats.channelTypeDistribution.map((item) => (
              <div key={item.type} className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: getTypeColor(item.type) }}
                />
                <span className="text-xs text-text-secondary flex-1">
                  {item.type}
                </span>
                <span className="text-xs font-medium text-text-primary">
                  {item.count}
                </span>
                <span className="text-[10px] text-text-muted w-8 text-right">
                  {item.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
          Structural Metrics
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <MetricItem
            label="Avg Channels/Category"
            value={derivedStats.avgChannelsPerCategory.toString()}
          />
          <MetricItem
            label="Thread Density"
            value={`${derivedStats.threadDensity}/ch`}
          />
          <MetricItem
            label="Total Categories"
            value={statistics.categories.toString()}
          />
          <MetricItem
            label="Active Threads"
            value={statistics.activeThreads.toString()}
          />
        </div>
      </div>

      {/* Category Breakdown Bar Chart */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
          Channels per Category
        </h3>
        <div className="flex flex-col gap-2">
          {blueprint.categories.map((cat) => {
            const count = statistics.channelsPerCategory[cat.id] ?? 0;
            const maxCount = Math.max(
              ...Object.values(statistics.channelsPerCategory).filter(
                (v): v is number => typeof v === "number"
              ),
              1
            );
            const pct = (count / maxCount) * 100;

            return (
              <div key={cat.id}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs text-text-secondary truncate max-w-[60%]">
                    {cat.name}
                  </span>
                  <span className="text-xs font-medium text-text-primary">
                    {count}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-surface-500/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-discord-blurple to-discord-blurple/60 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Metric Item ────────────────────────────────

function MetricItem({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="bg-surface-900/30 rounded-lg p-2.5 flex flex-col justify-between">
      <div>
        <div className="text-lg font-bold text-text-primary">{value}</div>
        <div className="text-[10px] text-text-muted uppercase tracking-wider">
          {label}
        </div>
      </div>
      {detail && (
        <div className="text-[10px] text-text-muted/70 mt-1 font-mono">
          {detail}
        </div>
      )}
    </div>
  );
}

// ── Donut Chart (pure CSS/SVG) ─────────────────

function DonutChart({
  data,
}: {
  data: DerivedStatistics["channelTypeDistribution"];
}) {
  const size = 80;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedOffset = 0;

  return (
    <svg width={size} height={size} className="flex-shrink-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#383a40"
        strokeWidth={strokeWidth}
      />
      {data.map((item) => {
        const segmentLength = (item.percentage / 100) * circumference;
        const offset = circumference - accumulatedOffset;
        accumulatedOffset += segmentLength;

        return (
          <circle
            key={item.type}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={getTypeColor(item.type)}
            strokeWidth={strokeWidth}
            strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
            strokeDashoffset={offset}
            className="donut-segment"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

function getTypeColor(type: string): string {
  switch (type.toLowerCase()) {
    case "text":
      return "#b5bac1";
    case "voice":
      return "#57f287";
    case "stage":
      return "#eb459e";
    case "forum":
      return "#fee75c";
    case "announcement":
      return "#f0b132";
    case "media":
      return "#5865f2";
    default:
      return "#949ba4";
  }
}
