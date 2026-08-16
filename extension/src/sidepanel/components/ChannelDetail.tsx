import { useState } from "react";
import { useServerStore } from "@/store/serverStore";
import { useUIStore } from "@/store/uiStore";
import { getChannelIcon } from "@/services/blueprintBuilder";
import type { Channel, ExtractedContent, ChannelPurpose } from "@mapmyserver/shared";

const PURPOSE_COLORS: Record<ChannelPurpose, { bg: string; text: string; border: string }> = {
  ONBOARDING: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  GOVERNANCE: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  INFORMATION: { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/30" },
  COMMUNITY: { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/30" },
  SUPPORT: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/30" },
  KNOWLEDGE: { bg: "bg-teal-500/10", text: "text-teal-400", border: "border-teal-500/30" },
  EVENTS: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
  TEAM: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  INTERNAL: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/30" },
  SHOWCASE: { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/30" },
  FEEDBACK: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30" },
  OTHER: { bg: "bg-zinc-500/10", text: "text-zinc-400", border: "border-zinc-500/30" },
};

export default function ChannelDetail() {
  const { blueprint } = useServerStore();
  const { selectedChannelId, setSelectedChannelId } = useUIStore();
  const [activeProvenance, setActiveProvenance] = useState<ExtractedContent["source"] | null>(null);

  if (!blueprint || !selectedChannelId) return null;

  const channel: Channel | undefined = blueprint.channels.find(
    (c) => c.id === selectedChannelId
  );

  if (!channel) return null;

  const parentCategory = blueprint.categories.find(
    (cat) => cat.id === channel.parentId
  );

  const channelThreads = blueprint.threads.filter(
    (t) => t.parentId === channel.id
  );

  const purposeStyle = channel.purpose?.purpose
    ? PURPOSE_COLORS[channel.purpose.purpose]
    : PURPOSE_COLORS.OTHER;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-fade-in">
      <div className="w-full max-w-md h-full bg-surface-900 border-l border-surface-500/40 shadow-2xl flex flex-col overflow-hidden animate-slide-in">
        {/* Header */}
        <div className="p-4 border-b border-surface-500/30 bg-surface-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl flex-shrink-0">
              {getChannelIcon(channel.type)}
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-text-primary truncate">
                #{channel.name}
              </h2>
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span>{parentCategory?.name || "Uncategorized"}</span>
                <span>•</span>
                <span className="capitalize">{channel.type} Channel</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setSelectedChannelId(null)}
            className="w-8 h-8 rounded-lg bg-surface-700/60 hover:bg-surface-600 text-text-muted hover:text-text-primary flex items-center justify-center transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
          {/* Purpose Badge */}
          {channel.purpose && (
            <div
              className={`p-3 rounded-lg border flex items-center justify-between ${purposeStyle.bg} ${purposeStyle.border}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">🎯</span>
                <div>
                  <div className="text-[10px] font-semibold tracking-wider uppercase text-text-muted">
                    Channel Purpose
                  </div>
                  <div className={`font-bold ${purposeStyle.text}`}>
                    {channel.purpose.purpose}
                  </div>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-800 text-text-muted border border-surface-500/40 font-mono">
                {Math.round(channel.purpose.confidence * 100)}% ({channel.purpose.source})
              </span>
            </div>
          )}

          {/* Topic */}
          {channel.topic && (
            <div className="glass-card p-3">
              <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <span>💬</span> Channel Topic
              </div>
              <p className="text-text-primary text-xs leading-relaxed bg-surface-800/80 p-2.5 rounded border border-surface-500/30">
                {channel.topic}
              </p>
            </div>
          )}

          {/* Welcome Message */}
          {channel.content?.welcomeMessage && (
            <div className="glass-card p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <span>👋</span> Welcome Message
                </span>
                <button
                  onClick={() =>
                    setActiveProvenance(channel.content!.welcomeMessage!.source)
                  }
                  className="text-[10px] text-discord-blurple hover:underline font-mono"
                >
                  [Provenance]
                </button>
              </div>
              <div className="text-text-primary text-xs leading-relaxed bg-surface-800/80 p-2.5 rounded border border-surface-500/30 whitespace-pre-wrap">
                {channel.content.welcomeMessage.text}
              </div>
            </div>
          )}

          {/* Channel Instructions */}
          {channel.content?.instructions && channel.content.instructions.length > 0 && (
            <div className="glass-card p-3">
              <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>📜</span> Channel Instructions
              </div>
              <ul className="space-y-1.5">
                {channel.content.instructions.map((inst, i) => (
                  <li
                    key={i}
                    className="flex items-start justify-between gap-2 text-xs bg-surface-800/60 p-2 rounded border border-surface-500/20"
                  >
                    <span className="text-text-primary">
                      • {inst.text}
                    </span>
                    <button
                      onClick={() => setActiveProvenance(inst.source)}
                      className="text-[9px] text-text-muted hover:text-discord-blurple flex-shrink-0 font-mono"
                    >
                      [src]
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggested Template */}
          {channel.content?.template && (
            <div className="glass-card p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <span>📋</span> Suggested Template
                </span>
                <button
                  onClick={() =>
                    setActiveProvenance(channel.content!.template!.source)
                  }
                  className="text-[10px] text-discord-blurple hover:underline font-mono"
                >
                  [Provenance]
                </button>
              </div>
              <pre className="text-xs bg-surface-950 p-2.5 rounded border border-surface-500/40 text-emerald-400 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {channel.content.template.text}
              </pre>
            </div>
          )}

          {/* Rules (if rules channel) */}
          {channel.content?.rules && channel.content.rules.length > 0 && (
            <div className="glass-card p-3">
              <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>⚖️</span> Channel & Server Rules
              </div>
              <div className="space-y-2">
                {channel.content.rules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="text-xs bg-surface-800/80 p-2 rounded border border-surface-500/30 flex justify-between items-start gap-2"
                  >
                    <span className="text-text-primary leading-relaxed">
                      {rule.text}
                    </span>
                    <button
                      onClick={() => setActiveProvenance(rule.source)}
                      className="text-[9px] text-text-muted hover:text-discord-blurple flex-shrink-0 font-mono"
                    >
                      [src]
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pinned Messages */}
          {channel.content?.pinnedMessages && channel.content.pinnedMessages.length > 0 && (
            <div className="glass-card p-3">
              <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>📌</span> Pinned Content
              </div>
              <div className="space-y-2">
                {channel.content.pinnedMessages.map((pinned, idx) => (
                  <div
                    key={idx}
                    className="text-xs bg-surface-800/80 p-2 rounded border border-surface-500/30 flex justify-between items-start gap-2"
                  >
                    <span className="text-text-primary leading-relaxed">
                      {pinned.text}
                    </span>
                    <button
                      onClick={() => setActiveProvenance(pinned.source)}
                      className="text-[9px] text-text-muted hover:text-discord-blurple flex-shrink-0 font-mono"
                    >
                      [src]
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Threads in this channel */}
          {channelThreads.length > 0 && (
            <div className="glass-card p-3">
              <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>💬</span> Active Threads ({channelThreads.length})
              </div>
              <div className="space-y-1.5">
                {channelThreads.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-2 rounded bg-surface-800/60 text-xs border border-surface-500/20"
                  >
                    <span className="text-text-secondary truncate">{t.name}</span>
                    {t.messageCount !== undefined && (
                      <span className="text-[10px] text-text-muted font-mono">
                        {t.messageCount} msgs
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata & Permissions Summary */}
          <div className="grid grid-cols-2 gap-2">
            <div className="metric-card">
              <span className="metric-label">Threads</span>
              <span className="metric-value text-sm text-text-primary">
                {channelThreads.length}
              </span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Slowmode</span>
              <span className="metric-value text-sm text-text-primary">
                {channel.metadata?.slowMode ? `${channel.metadata.slowMode}s` : "Off"}
              </span>
            </div>
          </div>
        </div>

        {/* Source Tracking / Provenance Modal */}
        {activeProvenance && (
          <div className="p-3 bg-surface-950 border-t border-surface-500/40 text-xs animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-discord-blurple uppercase tracking-wider text-[10px]">
                🛡️ Data Provenance & Source
              </span>
              <button
                onClick={() => setActiveProvenance(null)}
                className="text-[10px] text-text-muted hover:text-text-primary"
              >
                Close ✕
              </button>
            </div>
            <div className="space-y-1 font-mono text-[11px] text-text-muted bg-surface-900 p-2 rounded border border-surface-500/30">
              <div>
                <span className="text-text-secondary">Source Type:</span>{" "}
                <span className="text-amber-400">{activeProvenance.type}</span>
              </div>
              <div>
                <span className="text-text-secondary">Channel ID:</span>{" "}
                {activeProvenance.channelId}
              </div>
              {activeProvenance.messageId && (
                <div>
                  <span className="text-text-secondary">Message ID:</span>{" "}
                  {activeProvenance.messageId}
                </div>
              )}
              {activeProvenance.authorName && (
                <div>
                  <span className="text-text-secondary">Author:</span>{" "}
                  {activeProvenance.authorName}
                </div>
              )}
              <div>
                <span className="text-text-secondary">Access Provenance:</span>{" "}
                <span className="text-emerald-400">
                  {activeProvenance.visibility.source} (authorized)
                </span>
              </div>
              <div>
                <span className="text-text-secondary">Observed At:</span>{" "}
                {new Date(activeProvenance.collectedAt).toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
