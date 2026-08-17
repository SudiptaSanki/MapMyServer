import { useState } from "react";
import { useServerStore } from "@/store/serverStore";
import { useUIStore } from "@/store/uiStore";
import { generateAIPrompt } from "@/services/aiPromptGenerator";
import AnalysisProgress from "./AnalysisProgress";
import {
  Folder,
  Hash,
  Volume2,
  Mic,
  MessageSquare,
  Megaphone,
  MessageCircle,
  Users,
  FileText,
  Server,
  Search,
  Camera,
  Hammer,
  AlertTriangle,
  Sparkles,
  Check,
  Copy
} from "lucide-react";

const STAT_ITEMS = [
  { key: "categories", label: "Categories", icon: <Folder className="w-4 h-4" />, color: "text-text-primary" },
  { key: "textChannels", label: "Text Channels", icon: <Hash className="w-4 h-4" />, color: "text-channel-text" },
  { key: "voiceChannels", label: "Voice Channels", icon: <Volume2 className="w-4 h-4" />, color: "text-channel-voice" },
  { key: "stageChannels", label: "Stage Channels", icon: <Mic className="w-4 h-4" />, color: "text-channel-stage" },
  { key: "forumChannels", label: "Forum Channels", icon: <MessageSquare className="w-4 h-4" />, color: "text-channel-forum" },
  { key: "announcementChannels", label: "Announcements", icon: <Megaphone className="w-4 h-4" />, color: "text-channel-announcement" },
  { key: "threads", label: "Threads", icon: <MessageCircle className="w-4 h-4" />, color: "text-text-secondary" },
  { key: "roles", label: "Roles", icon: <Users className="w-4 h-4" />, color: "text-discord-fuchsia" },
  { key: "channelsWithTopics", label: "With Topics", icon: <MessageCircle className="w-4 h-4" />, color: "text-emerald-400" },
  { key: "channelsWithContent", label: "With Instructions", icon: <FileText className="w-4 h-4" />, color: "text-amber-400" },
] as const;

export default function ServerOverview() {
  const { currentServer, blueprint, isAnalyzing, analysisError, requestAnalysis } =
    useServerStore();
  const { setSelectedChannelId } = useUIStore();
  const [copiedAI, setCopiedAI] = useState(false);
  const [copiedTree, setCopiedTree] = useState(false);

  const handleCopyAIPrompt = async () => {
    if (!blueprint) return;
    const prompt = generateAIPrompt(blueprint);
    await navigator.clipboard.writeText(prompt);
    setCopiedAI(true);
    setTimeout(() => setCopiedAI(false), 2500);
  };

  const handleCopySimpleTree = async () => {
    if (!blueprint) return;
    let treeStr = `# ${blueprint.server.name}\n\n`;
    for (const cat of blueprint.categories) {
      treeStr += `📁 ${cat.name}\n`;
      const catChannels = blueprint.channels.filter((c) => c.parentId === cat.id);
      for (const ch of catChannels) {
        treeStr += `  └── #${ch.name} (${ch.type})\n`;
      }
    }
    await navigator.clipboard.writeText(treeStr);
    setCopiedTree(true);
    setTimeout(() => setCopiedTree(false), 2000);
  };

  if (isAnalyzing) {
    return <AnalysisProgress />;
  }

  return (
    <div className="flex flex-col gap-3 animate-fade-in pb-4">
      {/* Server Header */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-discord-blurple to-discord-fuchsia/60 flex items-center justify-center text-white shadow-lg shadow-discord-blurple/10">
            <Server className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-text-primary truncate">
              {blueprint?.server.name || currentServer.name || "Unknown Server"}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-text-muted font-mono">
                ID: {(blueprint?.server.id || currentServer.guildId)?.slice(0, 8)}…
              </span>
              <span className="visibility-page text-[10px]">
                {blueprint?.server.visibility.source || "page-visible"}
              </span>
              {blueprint?.server.memberCount && (
                <span className="text-[10px] text-text-muted font-mono flex items-center gap-1">
                  <Users className="w-3 h-3" /> {blueprint.server.memberCount.toLocaleString()} members
                </span>
              )}
            </div>
          </div>
        </div>

        {blueprint?.server.description && (
          <p className="text-xs text-text-secondary mt-3 p-2 rounded bg-surface-800/60 border border-surface-500/20 leading-relaxed">
            {blueprint.server.description}
          </p>
        )}

        {/* Action Button */}
        <button
          onClick={() => requestAnalysis()}
          disabled={isAnalyzing}
          className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
        >
          <Search className="w-4 h-4" />
          {blueprint ? "Re-scan / Refresh Server" : "Analyze Current Server"}
        </button>

        {analysisError && (
          <div className="mt-2 px-3 py-2 rounded-lg bg-discord-red/10 border border-discord-red/20 text-xs text-discord-red flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {analysisError}
          </div>
        )}
      </div>

      {/* AI Review Export Card */}
      {blueprint && (
        <div className="p-3 bg-gradient-to-r from-discord-blurple/20 via-surface-900 to-discord-fuchsia/10 border border-discord-blurple/40 rounded-xl shadow-lg flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-xs text-text-primary">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>AI Optimizer & Role Advisor</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-discord-blurple/30 text-discord-blurple font-semibold">
              ChatGPT / Claude / Gemini
            </span>
          </div>
          <p className="text-[11px] text-text-muted leading-relaxed">
            Copy the full blueprint prompt to ask AI for community architecture recommendations, role hierarchy, and onboarding improvements.
          </p>
          <div className="flex gap-2 mt-1">
            <button
              onClick={handleCopyAIPrompt}
              className="btn-primary text-xs py-2 px-3 flex-1 flex items-center justify-center gap-1.5 shadow-md shadow-brand-500/20"
            >
              {copiedAI ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
              <span>{copiedAI ? "Copied AI Prompt!" : "Copy for AI Optimizer"}</span>
            </button>
            <button
              onClick={handleCopySimpleTree}
              title="Copy simple Markdown tree"
              className="btn-secondary text-xs py-2 px-3 flex items-center justify-center gap-1"
            >
              {copiedTree ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedTree ? "Copied!" : "Copy Tree"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Server Rules (First-Class Feature) */}
      {blueprint?.rules && blueprint.rules.rules.length > 0 && (
        <div className="glass-card p-3 border-amber-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Server Rules ({blueprint.rules.rules.length})
            </span>
            {blueprint.rules.sourceChannelId && (
              <button
                onClick={() => setSelectedChannelId(blueprint.rules!.sourceChannelId!)}
                className="text-[10px] text-discord-blurple hover:underline font-mono"
              >
                #{blueprint.rules.sourceChannelName || "rules"} ➔
              </button>
            )}
          </div>
          <div className="space-y-1.5 text-xs">
            {blueprint.rules.rules.slice(0, 3).map((r, i) => (
              <div key={i} className="text-text-primary bg-surface-800/80 p-2 rounded border border-surface-500/20">
                {r.text}
              </div>
            ))}
            {blueprint.rules.rules.length > 3 && (
              <div className="text-[11px] text-text-muted text-center pt-1">
                + {blueprint.rules.rules.length - 3} more rules (click channel to view all)
              </div>
            )}
          </div>
        </div>
      )}

      {/* Statistics Grid */}
      {blueprint && (
        <>
          <div className="grid grid-cols-2 gap-2">
            {STAT_ITEMS.map((item) => {
              const value =
                blueprint.statistics[item.key as keyof typeof blueprint.statistics];
              if (typeof value !== "number" || value === 0) return null;

              return (
                <div key={item.key} className="metric-card flex flex-col p-2 bg-surface-900 border border-surface-500/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`${item.color}`}>{item.icon}</span>
                    <span className={`text-sm font-bold ${item.color}`}>{value}</span>
                  </div>
                  <span className="text-[10px] text-text-muted uppercase tracking-wider">{item.label}</span>
                </div>
              );
            })}
          </div>

          {/* Total & Timestamp */}
          <div className="glass-card p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Total Channels:</span>
              <span className="text-sm font-bold text-text-primary">
                {blueprint.statistics.totalChannels}
              </span>
            </div>
            <span className="text-[10px] text-text-muted/60">
              {new Date(blueprint.collectedAt).toLocaleString()}
            </span>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => useServerStore.getState().saveSnapshot()}
              className="btn-secondary flex-1 flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" /> Save Snapshot
            </button>
          </div>
        </>
      )}

      {/* Empty State */}
      {!blueprint && !isAnalyzing && (
        <div className="text-center py-8 flex flex-col items-center">
          <div className="text-discord-blurple mb-3">
            <Hammer className="w-8 h-8" />
          </div>
          <p className="text-sm text-text-muted max-w-[200px]">
            Click <strong>"Analyze Current Server"</strong> to generate a blueprint
            of the server structure visible to you.
          </p>
        </div>
      )}
    </div>
  );
}
