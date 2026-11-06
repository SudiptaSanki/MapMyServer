import { useState } from "react";
import { useServerStore } from "@/store/serverStore";
import { useUIStore } from "@/store/uiStore";
import type { Channel, ExtractedContent, ChannelPurpose } from "@mapmyserver/shared";
import {
  X,
  Target,
  MessageCircle,
  Hand,
  FileText,
  ClipboardList,
  Scale,
  ShieldCheck,
  Hash,
  Volume2,
  Mic,
  MessageSquare,
  Megaphone,
  Image as ImageIcon,
  Lock,
  Eye,
  ChevronDown,
  ChevronUp,
  FolderSync,
  Info,
} from "lucide-react";

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

function getChannelIcon(type: string) {
  const className = "w-5 h-5";
  switch (type) {
    case "text":
      return <Hash className={`${className} text-channel-text`} />;
    case "voice":
      return <Volume2 className={`${className} text-channel-voice`} />;
    case "stage":
      return <Mic className={`${className} text-channel-stage`} />;
    case "forum":
      return <MessageSquare className={`${className} text-channel-forum`} />;
    case "announcement":
      return <Megaphone className={`${className} text-channel-announcement`} />;
    case "media":
      return <ImageIcon className={`${className} text-channel-text`} />;
    default:
      return <Hash className={`${className} text-text-muted`} />;
  }
}

export default function ChannelDetail() {
  const { blueprint } = useServerStore();
  const { selectedChannelId, setSelectedChannelId } = useUIStore();
  const [activeProvenance, setActiveProvenance] = useState<ExtractedContent["source"] | null>(null);
  const [showPermExplanation, setShowPermExplanation] = useState(true);

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

  const vis = channel.visibilityAnalysis;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-fade-in">
      <div className="w-full max-w-md h-full bg-surface-900 border-l border-surface-500/40 shadow-2xl flex flex-col overflow-hidden animate-slide-in">
        {/* Header */}
        <div className="p-4 border-b border-surface-500/30 bg-surface-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex-shrink-0 flex items-center justify-center">
              {getChannelIcon(channel.type)}
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-text-primary truncate">
                {channel.name}
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
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
          {/* Visibility & Permission Assessment */}
          <div className="glass-card p-3 border-discord-blurple/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-discord-blurple" /> Access & Visibility Status
              </span>
              <div className="flex items-center gap-1">
                {channel.isPrivate && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold border bg-amber-500/15 text-amber-300 border-amber-500/40 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Private
                  </span>
                )}
                {vis && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                      vis.classification === "broadly-accessible"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : vis.classification === "role-restricted"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                    }`}
                  >
                    {vis.classification === "broadly-accessible"
                      ? "Common / Public"
                      : vis.classification === "role-restricted"
                      ? "Role Restricted"
                      : vis.classification === "member-restricted"
                      ? "Member Restricted"
                      : "Inaccessible"}
                  </span>
                )}
              </div>
            </div>

            {/* Audience Badge if Private */}
            {channel.privateAudience && (
              <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
                <span className="text-text-muted text-[11px]">Intended Purpose / Audience:</span>
                <span className="font-semibold text-amber-300 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-400" />
                  {channel.privateAudience}
                </span>
              </div>
            )}

            {/* Reason */}
            {vis && (
              <p className="text-xs text-text-secondary leading-relaxed bg-surface-800/80 p-2.5 rounded border border-surface-500/20">
                {vis.reason}
              </p>
            )}

            {/* Sync Status & Roles with Access */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-surface-800 border border-surface-500/20 text-text-muted">
                <FolderSync className="w-3 h-3 text-text-secondary" />
                <span>
                  Category Sync:{" "}
                  <strong className={vis?.isCategorySynced ? "text-emerald-400" : "text-amber-400"}>
                    {vis?.isCategorySynced ? "Synchronized" : "Custom Overrides"}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-surface-800 border border-surface-500/20 text-text-muted">
                <Eye className="w-3 h-3 text-text-secondary" />
                <span>
                  @everyone View:{" "}
                  <strong className={vis?.everyoneCanView ? "text-emerald-400" : "text-rose-400"}>
                    {vis?.everyoneCanView ? "Allowed" : "Denied"}
                  </strong>
                </span>
              </div>
            </div>

            {/* In-Discord Scraper Tip if Overwrites Not Scanned Yet */}
            {(!channel.permissions || channel.permissions.length === 0) && (
              <div className="p-2.5 rounded bg-discord-blurple/10 border border-discord-blurple/30 text-xs space-y-1.5 mt-2">
                <div className="flex items-center gap-1.5 font-semibold text-discord-blurple">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span>Scrape Exact Overwrite Rules</span>
                </div>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  As the server owner, view explicit role permissions by opening:
                </p>
                <div className="bg-surface-900/90 px-2 py-1 rounded text-[11px] font-mono text-text-primary border border-surface-500/30">
                  Right-click #{channel.name} ➔ Edit Channel ➔ Permissions
                </div>
                <p className="text-[10px] text-text-muted">
                  MapMyServer's real-time watcher will instantly scrap all role bitfield allowances & denials.
                </p>
              </div>
            )}

            {/* Roles with explicit access */}
            {vis && vis.rolesWithAccess.length > 0 && (
              <div className="pt-1.5">
                <span className="text-[10px] text-text-muted block mb-1">Roles Granted View Access:</span>
                <div className="flex flex-wrap gap-1">
                  {vis.rolesWithAccess.map((roleName) => (
                    <span
                      key={roleName}
                      className="text-[10px] px-2 py-0.5 rounded bg-discord-blurple/15 border border-discord-blurple/30 text-discord-blurple font-medium"
                    >
                      {roleName}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Expandable Permission Explanation Breakdown */}
          {channel.permissions && channel.permissions.length > 0 && (
            <div className="glass-card p-3">
              <button
                onClick={() => setShowPermExplanation(!showPermExplanation)}
                className="w-full flex items-center justify-between text-xs font-bold text-text-primary uppercase tracking-wider"
              >
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  Permission Overwrites ({channel.permissions.length})
                </span>
                {showPermExplanation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showPermExplanation && (
                <div className="mt-2.5 space-y-2">
                  {channel.permissions.map((ow) => (
                    <div
                      key={ow.id}
                      className="p-2.5 rounded bg-surface-800/80 border border-surface-500/20 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-text-primary">
                          {ow.type === "role" ? "Role: " : "Member: "}
                          {ow.id.replace(/^override-|^ow_/, "")}
                        </span>
                        <span className="text-[10px] text-text-muted uppercase font-mono">{ow.type}</span>
                      </div>

                      {ow.allow.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {ow.allow.map((perm) => (
                            <span
                              key={perm}
                              className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            >
                              ✓ {perm}
                            </span>
                          ))}
                        </div>
                      )}

                      {ow.deny.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {ow.deny.map((perm) => (
                            <span
                              key={perm}
                              className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30"
                            >
                              ✕ {perm}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Purpose Badge */}
          {channel.purpose && (
            <div
              className={`p-3 rounded-lg border flex items-center justify-between ${purposeStyle.bg} ${purposeStyle.border}`}
            >
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-current opacity-80" />
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
                <MessageCircle className="w-3.5 h-3.5" /> Channel Topic
              </div>
              <p className="text-text-primary text-xs leading-relaxed bg-surface-800/80 p-2.5 rounded border border-surface-500/30 whitespace-pre-wrap">
                {channel.topic}
              </p>
            </div>
          )}

          {/* Welcome Message */}
          {channel.content?.welcomeMessage && (
            <div className="glass-card p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Hand className="w-3.5 h-3.5" /> Welcome Message
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
                <FileText className="w-3.5 h-3.5" /> Channel Instructions
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
                  <ClipboardList className="w-3.5 h-3.5" /> Suggested Template
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
                <Scale className="w-3.5 h-3.5" /> Channel & Server Rules
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

          {/* Threads in this channel */}
          {channelThreads.length > 0 && (
            <div className="glass-card p-3">
              <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" /> Active Threads ({channelThreads.length})
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

          {/* Metadata & Channel Configuration */}
          <div className="glass-card p-3 space-y-2">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" /> Channel Configuration & Technical Specs
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-surface-800/80 p-2 rounded border border-surface-500/20">
                <span className="text-[10px] text-text-muted block">Channel ID</span>
                <span className="font-mono text-text-primary text-[11px]">{channel.id}</span>
              </div>
              <div className="bg-surface-800/80 p-2 rounded border border-surface-500/20">
                <span className="text-[10px] text-text-muted block">Position</span>
                <span className="font-mono text-text-primary">{channel.position}</span>
              </div>
              <div className="bg-surface-800/80 p-2 rounded border border-surface-500/20">
                <span className="text-[10px] text-text-muted block">Slowmode</span>
                <span className="font-mono text-text-primary">
                  {channel.metadata?.slowMode ? `${channel.metadata.slowMode}s` : "Disabled"}
                </span>
              </div>
              <div className="bg-surface-800/80 p-2 rounded border border-surface-500/20">
                <span className="text-[10px] text-text-muted block">NSFW Restricted</span>
                <span className="font-mono text-text-primary">
                  {channel.metadata?.nsfw ? "Yes (Age-Gated)" : "No"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Source Tracking / Provenance Modal */}
        {activeProvenance && (
          <div className="p-3 bg-surface-950 border-t border-surface-500/40 text-xs animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-discord-blurple uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Data Provenance & Source
              </span>
              <button
                onClick={() => setActiveProvenance(null)}
                className="text-[10px] text-text-muted hover:text-text-primary flex items-center gap-1"
              >
                Close <X className="w-3 h-3" />
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
