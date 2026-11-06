import { useState, useMemo } from "react";
import { useServerStore } from "@/store/serverStore";
import { useUIStore } from "@/store/uiStore";
import { generateAIPrompt } from "@/services/aiPromptGenerator";
import { runSecurityAudit, detectCaptureMode } from "@mapmyserver/shared";
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
  Copy,
  Compass,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Lock,
  HelpCircle,
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
  const { setSelectedChannelId, setActiveTab } = useUIStore();
  const [copiedAI, setCopiedAI] = useState(false);
  const [copiedTree, setCopiedTree] = useState(false);

  const auditReport = useMemo(() => (blueprint ? runSecurityAudit(blueprint) : null), [blueprint]);
  const captureModeInfo = useMemo(() => (blueprint ? detectCaptureMode(blueprint) : null), [blueprint]);

  const rolesCount = useMemo(() => {
    return blueprint?.roles.filter((r) => r.name.toLowerCase() !== "@everyone").length || 0;
  }, [blueprint]);

  const privateChannelsCount = useMemo(() => {
    return (
      blueprint?.channels.filter(
        (c) =>
          c.isPrivate ||
          c.visibilityAnalysis?.classification === "role-restricted" ||
          c.visibilityAnalysis?.classification === "member-restricted"
      ).length || 0
    );
  }, [blueprint]);

  const channelsWithOverrides = useMemo(() => {
    return blueprint?.channels.filter((c) => c.permissions && c.permissions.length > 0) || [];
  }, [blueprint]);

  const hasAllPrivateOverrides =
    privateChannelsCount === 0 || channelsWithOverrides.length >= privateChannelsCount;

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
      treeStr += `[Category] ${cat.name}\n`;
      const catChannels = blueprint.channels.filter((c) => c.parentId === cat.id);
      for (const ch of catChannels) {
        const vis = ch.visibilityAnalysis?.classification === "role-restricted" ? " [Restricted]" : "";
        treeStr += `  └── #${ch.name} (${ch.type}${vis})\n`;
      }
    }
    await navigator.clipboard.writeText(treeStr);
    setCopiedTree(true);
    setTimeout(() => setCopiedTree(false), 2000);
  };

  if (isAnalyzing) {
    return <AnalysisProgress />;
  }

  const scan = blueprint?.scanQuality;

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

      {/* Architecture Scope & Capture Mode Banner (Section 3) */}
      {blueprint && captureModeInfo && (
        <div
          className={`glass-card p-3 border space-y-2 ${
            captureModeInfo.mode === "full-admin"
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-amber-500/30 bg-amber-500/5"
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-bold">
              {captureModeInfo.mode === "full-admin" ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300">Full Administrator Architecture Capture</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-300">Accessible Member Architecture Capture</span>
                </>
              )}
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                captureModeInfo.mode === "full-admin"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-amber-500/20 text-amber-300"
              }`}
            >
              {captureModeInfo.mode === "full-admin" ? "Mode A: Admin" : "Mode B: Member"}
            </span>
          </div>

          <p className="text-[11px] text-text-secondary leading-relaxed">
            {captureModeInfo.description}
          </p>

          {captureModeInfo.notice && (
            <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300 leading-snug flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{captureModeInfo.notice}</span>
            </div>
          )}
        </div>
      )}

      {/* Deep Architecture Scraping & In-Discord Settings Guide */}
      {blueprint && (
        <div className="glass-card p-3 border-discord-blurple/30 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-bold text-text-primary">
              <Compass className="w-4 h-4 text-discord-blurple" />
              <span>Deep Architecture Scraping Guide</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
              Live Real-Time
            </span>
          </div>
          <p className="text-[11px] text-text-secondary leading-snug">
            Open these settings in your Discord tab. MapMyServer's watcher will automatically scrape and verify the data without page reloads.
          </p>

          <div className="space-y-2 pt-1 text-xs">
            {/* Step 1: Channels & Privacy */}
            <div className="p-2.5 rounded bg-surface-900 border border-surface-500/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-text-primary flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Channels & Categories</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  {blueprint.channels.length} Channels Captured
                </span>
              </div>
              <div className="text-[10px] text-text-muted flex items-center gap-2 pt-0.5">
                <span className="text-emerald-300">
                  {blueprint.channels.length - privateChannelsCount} Common / Public
                </span>
                <span>•</span>
                <span className="text-amber-300 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  {privateChannelsCount} Private / Restricted
                </span>
              </div>
            </div>

            {/* Step 2: Server Roles & Hierarchy */}
            <div
              className={`p-2.5 rounded border space-y-1 ${
                rolesCount > 0 ? "bg-surface-900 border-surface-500/20" : "bg-amber-500/5 border-amber-500/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-text-primary flex items-center gap-1.5 text-xs">
                  {rolesCount > 0 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span>Server Roles & Order</span>
                </span>
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    rolesCount > 0 ? "text-emerald-400 bg-emerald-500/10" : "text-amber-300 bg-amber-500/10"
                  }`}
                >
                  {rolesCount > 0 ? `${rolesCount} Roles Captured` : "Action Needed"}
                </span>
              </div>
              {rolesCount === 0 ? (
                <div className="text-[10px] text-amber-200/90 leading-relaxed bg-amber-500/10 p-2 rounded border border-amber-500/20">
                  <strong>How to capture:</strong> In your Discord tab, click your server title (top-left) ➔{" "}
                  <strong>Server Settings ➔ Roles</strong>. Our watcher will auto-capture all role positions, colors, and permissions!
                </div>
              ) : (
                <div className="text-[10px] text-text-muted">
                  Full role hierarchy and colors captured. Viewable in the <strong>Roles</strong> tab.
                </div>
              )}
            </div>

            {/* Step 3: Exact Permission Overwrites for Private Channels */}
            <div
              className={`p-2.5 rounded border space-y-1 ${
                hasAllPrivateOverrides
                  ? "bg-surface-900 border-surface-500/20"
                  : "bg-discord-blurple/5 border-discord-blurple/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-text-primary flex items-center gap-1.5 text-xs">
                  {hasAllPrivateOverrides ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-discord-blurple" />
                  )}
                  <span>Private Channel Permissions</span>
                </span>
                <span className="text-[10px] font-mono text-discord-blurple bg-discord-blurple/10 px-1.5 py-0.5 rounded font-bold">
                  {channelsWithOverrides.length} Channels with Overwrites
                </span>
              </div>
              <div className="text-[10px] text-text-secondary leading-relaxed">
                {hasAllPrivateOverrides ? (
                  <span className="text-emerald-300">
                    All private channels have exact allow/deny bitfield overrides captured.
                  </span>
                ) : (
                  <span>
                    To capture exact allow/deny rules: In Discord, right-click any private channel ➔{" "}
                    <strong>Edit Channel ➔ Permissions</strong>. MapMyServer will auto-detect and sync the bitfields.
                  </span>
                )}
              </div>
            </div>

            {/* Step 4: Server Community Overview */}
            <div className="p-2.5 rounded bg-surface-900 border border-surface-500/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-text-primary flex items-center gap-1.5 text-xs">
                  {blueprint.server.description ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <HelpCircle className="w-3.5 h-3.5 text-text-muted" />
                  )}
                  <span>Server Description & Guidelines</span>
                </span>
                <span className="text-[10px] font-mono text-text-muted">
                  {blueprint.server.description ? "Captured" : "Server Settings ➔ Overview"}
                </span>
              </div>
              {!blueprint.server.description && (
                <div className="text-[10px] text-text-muted">
                  Tip: Open <strong>Server Settings ➔ Overview</strong> in Discord to capture server description.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scan Quality & Reliability Report (Part 7) */}
      {blueprint && scan && (
        <div className="glass-card p-3 border-discord-blurple/30 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-bold text-text-primary">
              <ShieldCheck className="w-4 h-4 text-discord-blurple" />
              <span>Scan Completeness & Reliability</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">
              {scan.completenessScore}% Complete
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-surface-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                scan.completenessScore > 80
                  ? "bg-emerald-400"
                  : scan.completenessScore > 50
                  ? "bg-amber-400"
                  : "bg-rose-400"
              }`}
              style={{ width: `${scan.completenessScore}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-[10px] pt-1">
            <div className="bg-surface-800/80 p-1.5 rounded border border-surface-500/20">
              <span className="text-text-muted block">Source</span>
              <span className="font-semibold text-text-primary capitalize">{scan.source}</span>
            </div>
            <div className="bg-surface-800/80 p-1.5 rounded border border-surface-500/20">
              <span className="text-text-muted block">Duration</span>
              <span className="font-mono text-text-primary">{scan.durationMs}ms</span>
            </div>
            <div className="bg-surface-800/80 p-1.5 rounded border border-surface-500/20">
              <span className="text-text-muted block">Parsed / Disc.</span>
              <span className="font-mono text-text-primary">
                {scan.resourcesParsed.channels}/{scan.resourcesDiscovered.channels}
              </span>
            </div>
          </div>

          {scan.missingDataWarnings.length > 0 && (
            <div className="space-y-1 pt-1">
              {scan.missingDataWarnings.map((warn, i) => (
                <div key={i} className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 p-1.5 rounded flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.2" />
                  <span>{warn}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Security Health Posture Quick Card */}
      {blueprint && auditReport && (
        <div className="glass-card p-3 border-discord-blurple/30 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm border ${
                  auditReport.score >= 90
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : auditReport.score >= 75
                    ? "bg-sky-500/10 text-sky-400 border-sky-500/30"
                    : auditReport.score >= 50
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                }`}
              >
                {auditReport.grade}
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
                  <ShieldAlert className="w-3.5 h-3.5 text-discord-blurple" />
                  <span>Security & Health Audit</span>
                </div>
                <div className="text-[10px] text-text-muted">
                  Score: {auditReport.score}/100 • {auditReport.summary.totalFindings} findings
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveTab("audit")}
              className="btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1 text-text-primary hover:text-white"
            >
              <span>Audit Center</span>
              <ArrowRight className="w-3 h-3 text-discord-blurple" />
            </button>
          </div>
        </div>
      )}

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
              title="Copy simple text tree"
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

      {/* Deep Mapping Guide */}
      {blueprint && (
        <div className="glass-card p-3 border-discord-fuchsia/30 bg-gradient-to-br from-surface-900 to-discord-fuchsia/5">
          <div className="flex items-center gap-2 mb-2 font-bold text-xs text-text-primary">
            <Compass className="w-4 h-4 text-discord-fuchsia" />
            <span>Deep Mapping Guide</span>
          </div>
          <div className="space-y-2 text-xs text-text-secondary">
            {blueprint.roles.length === 0 ? (
              <div className="flex items-start gap-2 p-2 bg-surface-800/80 rounded border border-discord-red/20">
                <div className="w-1.5 h-1.5 rounded-full bg-discord-red mt-1 flex-shrink-0" />
                <div>
                  <span className="text-text-primary font-semibold block mb-0.5">Missing Roles</span>
                  Open <strong>Server Settings ➔ Roles</strong> in Discord to collect role data.
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-400">
                <Check className="w-4 h-4" /> Collected {blueprint.roles.length} roles
              </div>
            )}
            
            <div className="flex items-start gap-2 p-2 bg-surface-800/80 rounded border border-discord-blurple/20">
              <div className="w-1.5 h-1.5 rounded-full bg-discord-blurple mt-1 flex-shrink-0" />
              <div>
                <span className="text-text-primary font-semibold block mb-0.5">Channel Permissions</span>
                <span className="block mb-1">
                  {blueprint.channels.filter(c => c.permissions && c.permissions.length > 0).length} channels mapped.
                </span>
                Open <strong>Edit Channel ➔ Permissions</strong> for any private channel to collect its access rules.
              </div>
            </div>
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
