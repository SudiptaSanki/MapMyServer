/* ─────────────────────────────────────────────
 *  Reference Server Comparison Hub
 *
 *  Core Feature (Section 8):
 *  Compare an inspected/reference server against a target server,
 *  template, or snapshot to identify missing categories, channels,
 *  type diffs, placement moves, role hierarchies, and permission drift.
 * ───────────────────────────────────────────── */

import { useState, useEffect, useMemo } from "react";
import { useServerStore } from "@/store/serverStore";
import { useUIStore } from "@/store/uiStore";
import {
  type ServerBlueprint,
  type ServerComparisonResult,
  compareServerBlueprints,
  templateToBlueprint,
  CURATED_TEMPLATES,
} from "@mapmyserver/shared";
import { listServers, loadBlueprint } from "@/services/storageService";
import { MOCK_SERVER } from "@/services/mockServer";
import {
  GitCompare,
  Layers,
  Shield,
  CheckCircle2,
  ArrowRight,
  Download,
  Copy,
  Check,
  LayoutTemplate,
  Sparkles,
  Folder,
  Hash,
  Volume2,
  MessageSquare,
  Radio,
} from "lucide-react";

type DiffFilter = "all" | "missing" | "extra" | "modified" | "identical";

export default function ServerComparison() {
  const { blueprint: liveBlueprint } = useServerStore();
  const { setActiveTab } = useUIStore();

  // Saved servers list
  const [savedServers, setSavedServers] = useState<Array<{ id: string; name: string }>>([]);

  // Selected source IDs
  // Prefix: "live:", "template:<id>", "saved:<id>", "mock"
  const [refSourceId, setRefSourceId] = useState<string>(`template:${CURATED_TEMPLATES[0].id}`);
  const [targetSourceId, setTargetSourceId] = useState<string>("live");

  // Loaded blueprints
  const [referenceBlueprint, setReferenceBlueprint] = useState<ServerBlueprint | null>(null);
  const [targetBlueprint, setTargetBlueprint] = useState<ServerBlueprint | null>(null);

  // Active view tab
  const [activeSubTab, setActiveSubTab] = useState<"diff" | "sidebyside" | "roles" | "recommendations">("diff");
  const [diffFilter, setDiffFilter] = useState<DiffFilter>("all");
  const [copied, setCopied] = useState(false);

  // Fetch saved servers on mount
  useEffect(() => {
    listServers().then((list) => {
      setSavedServers(list.map((s) => ({ id: s.id, name: s.name })));
    });
  }, []);

  // Resolve Blueprint from Source ID
  const resolveBlueprint = async (sourceId: string): Promise<ServerBlueprint | null> => {
    if (sourceId === "live") {
      return liveBlueprint || null;
    }
    if (sourceId === "mock") {
      return MOCK_SERVER;
    }
    if (sourceId.startsWith("template:")) {
      const templateId = sourceId.replace("template:", "");
      const tmpl = CURATED_TEMPLATES.find((t) => t.id === templateId);
      if (tmpl) return templateToBlueprint(tmpl);
    }
    if (sourceId.startsWith("saved:")) {
      const serverId = sourceId.replace("saved:", "");
      return await loadBlueprint(serverId);
    }
    return null;
  };

  // Update Reference Blueprint
  useEffect(() => {
    resolveBlueprint(refSourceId).then((bp) => setReferenceBlueprint(bp));
  }, [refSourceId, liveBlueprint]);

  // Update Target Blueprint
  useEffect(() => {
    resolveBlueprint(targetSourceId).then((bp) => setTargetBlueprint(bp));
  }, [targetSourceId, liveBlueprint]);

  // Compute Comparison
  const comparison: ServerComparisonResult | null = useMemo(() => {
    if (!referenceBlueprint || !targetBlueprint) return null;
    return compareServerBlueprints(referenceBlueprint, targetBlueprint);
  }, [referenceBlueprint, targetBlueprint]);

  // Channel type icon helper
  const getChannelIcon = (type: string) => {
    switch (type) {
      case "voice":
        return <Volume2 className="w-3.5 h-3.5 text-discord-green" />;
      case "forum":
        return <MessageSquare className="w-3.5 h-3.5 text-discord-blurple" />;
      case "stage":
        return <Radio className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Hash className="w-3.5 h-3.5 text-text-muted" />;
    }
  };

  // Copy Markdown Report
  const handleCopyReport = () => {
    if (!comparison) return;

    let md = `# Architecture Comparison: ${comparison.referenceServer.name} vs ${comparison.targetServer.name}\n\n`;
    md += `**Overall Structural Alignment**: ${comparison.metrics.overallStructuralAlignment}%\n`;
    md += `- Category Alignment: ${comparison.metrics.categoryAlignmentScore}%\n`;
    md += `- Channel Alignment: ${comparison.metrics.channelAlignmentScore}%\n`;
    md += `- Role Alignment: ${comparison.metrics.roleAlignmentScore}%\n\n`;

    md += `## Summary Metrics\n`;
    md += `- Missing Channels in Target: ${comparison.metrics.totalMissingChannels}\n`;
    md += `- Extra Channels in Target: ${comparison.metrics.totalExtraChannels}\n`;
    md += `- Modified Channels: ${comparison.metrics.totalModifiedChannels}\n`;
    md += `- Missing Categories: ${comparison.metrics.totalMissingCategories}\n`;
    md += `- Missing Roles: ${comparison.metrics.totalMissingRoles}\n\n`;

    md += `## Recommendations\n`;
    for (const rec of comparison.recommendations) {
      md += `- **[${rec.priority.toUpperCase()}] ${rec.title}**: ${rec.description}\n`;
    }

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export JSON Diff
  const handleExportJson = () => {
    if (!comparison) return;
    const blob = new Blob([JSON.stringify(comparison, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `architecture-diff-${comparison.referenceServer.name.toLowerCase().replace(/\s+/g, "-")}-vs-${comparison.targetServer.name.toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-3 animate-fade-in pb-10">
      {/* ── Top Header ── */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-discord-blurple/20 flex items-center justify-center text-discord-blurple">
              <GitCompare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">Reference Server Comparison</h2>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Compare a reference server or template against your target server to identify architectural gaps.
              </p>
            </div>
          </div>
        </div>

        {/* ── Source Selectors ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
          {/* Reference Server (Source / Model) */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-discord-blurple uppercase tracking-wider block">
              Reference Architecture (Model)
            </label>
            <select
              value={refSourceId}
              onChange={(e) => setRefSourceId(e.target.value)}
              className="w-full bg-surface-900 border border-surface-500/30 rounded-lg p-2 text-xs text-text-primary focus:outline-none focus:border-discord-blurple"
            >
              <optgroup label="Curated Industry Templates">
                {CURATED_TEMPLATES.map((t) => (
                  <option key={t.id} value={`template:${t.id}`}>
                    Template: {t.name} ({t.category})
                  </option>
                ))}
              </optgroup>

              {liveBlueprint && (
                <optgroup label="Active Discord Server">
                  <option value="live">Current Server: {liveBlueprint.server.name}</option>
                </optgroup>
              )}

              {savedServers.length > 0 && (
                <optgroup label="Scanned / Saved Servers">
                  {savedServers.map((s) => (
                    <option key={s.id} value={`saved:${s.id}`}>
                      Saved: {s.name}
                    </option>
                  ))}
                </optgroup>
              )}

              <optgroup label="Demo Fixtures">
                <option value="mock">GDG Community (Rich Mock)</option>
              </optgroup>
            </select>
          </div>

          {/* Target Server (Your Server) */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
              Target Server (Your Discord)
            </label>
            <select
              value={targetSourceId}
              onChange={(e) => setTargetSourceId(e.target.value)}
              className="w-full bg-surface-900 border border-surface-500/30 rounded-lg p-2 text-xs text-text-primary focus:outline-none focus:border-discord-blurple"
            >
              {liveBlueprint ? (
                <option value="live">Current Server: {liveBlueprint.server.name}</option>
              ) : (
                <option value="mock">GDG Community (Mock Target)</option>
              )}

              {savedServers.length > 0 && (
                <optgroup label="Scanned / Saved Servers">
                  {savedServers.map((s) => (
                    <option key={s.id} value={`saved:${s.id}`}>
                      Saved: {s.name}
                    </option>
                  ))}
                </optgroup>
              )}

              <optgroup label="Curated Templates (Target Benchmark)">
                {CURATED_TEMPLATES.map((t) => (
                  <option key={t.id} value={`template:${t.id}`}>
                    Template: {t.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      {/* ── Comparison Metrics Banner ── */}
      {comparison && (
        <div className="glass-card p-3 space-y-3 border-discord-blurple/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-text-primary">Structural Alignment</span>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  comparison.metrics.overallStructuralAlignment >= 80
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : comparison.metrics.overallStructuralAlignment >= 50
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                }`}
              >
                {comparison.metrics.overallStructuralAlignment}%
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopyReport}
                className="btn-secondary py-1 px-2.5 text-[11px] flex items-center gap-1"
                title="Copy comparison summary to clipboard"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
              <button
                onClick={handleExportJson}
                className="btn-secondary py-1 px-2.5 text-[11px] flex items-center gap-1"
                title="Export diff as JSON"
              >
                <Download className="w-3 h-3" />
                <span>JSON</span>
              </button>
            </div>
          </div>

          {/* Sub-Scores */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded bg-surface-900 border border-surface-500/20">
              <span className="text-[10px] text-text-muted block">Channels</span>
              <span className="text-xs font-mono font-bold text-text-primary">
                {comparison.metrics.channelAlignmentScore}%
              </span>
            </div>
            <div className="p-2 rounded bg-surface-900 border border-surface-500/20">
              <span className="text-[10px] text-text-muted block">Categories</span>
              <span className="text-xs font-mono font-bold text-text-primary">
                {comparison.metrics.categoryAlignmentScore}%
              </span>
            </div>
            <div className="p-2 rounded bg-surface-900 border border-surface-500/20">
              <span className="text-[10px] text-text-muted block">Roles</span>
              <span className="text-xs font-mono font-bold text-text-primary">
                {comparison.metrics.roleAlignmentScore}%
              </span>
            </div>
          </div>

          {/* Diff Counts Badges */}
          <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-surface-500/20 flex-wrap gap-2">
            <span className="text-rose-400">-{comparison.metrics.totalMissingChannels} Missing Chans</span>
            <span className="text-emerald-400">+{comparison.metrics.totalExtraChannels} Extra Chans</span>
            <span className="text-amber-400">~{comparison.metrics.totalModifiedChannels} Modified</span>
            <span className="text-text-muted">={comparison.metrics.totalIdenticalChannels} Matched</span>
          </div>
        </div>
      )}

      {/* ── Sub Navigation Tabs ── */}
      <div className="flex gap-1 p-1 bg-surface-900/60 rounded-lg text-xs overflow-x-auto">
        <button
          onClick={() => setActiveSubTab("diff")}
          className={`py-1 px-3 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === "diff" ? "bg-discord-blurple text-white font-semibold" : "text-text-muted hover:text-white"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Structure Breakdown</span>
        </button>

        <button
          onClick={() => setActiveSubTab("sidebyside")}
          className={`py-1 px-3 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === "sidebyside" ? "bg-discord-blurple text-white font-semibold" : "text-text-muted hover:text-white"
          }`}
        >
          <GitCompare className="w-3.5 h-3.5" />
          <span>Side-by-Side</span>
        </button>

        <button
          onClick={() => setActiveSubTab("roles")}
          className={`py-1 px-3 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === "roles" ? "bg-discord-blurple text-white font-semibold" : "text-text-muted hover:text-white"
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Roles ({comparison?.roles.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("recommendations")}
          className={`py-1 px-3 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === "recommendations" ? "bg-discord-blurple text-white font-semibold" : "text-text-muted hover:text-white"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Recommendations ({comparison?.recommendations.length || 0})</span>
        </button>
      </div>

      {/* ── SubTab 1: Structure Breakdown ── */}
      {activeSubTab === "diff" && comparison && (
        <div className="space-y-3">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 text-[11px] overflow-x-auto pb-1">
            {(["all", "missing", "extra", "modified", "identical"] as DiffFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setDiffFilter(f)}
                className={`px-2 py-0.5 rounded-full capitalize transition-all ${
                  diffFilter === f
                    ? "bg-surface-600 text-white font-semibold"
                    : "bg-surface-900 text-text-muted hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Categories and Channels List */}
          <div className="space-y-2.5">
            {comparison.categories.map((cat, i) => {
              const filteredChannels = cat.channelsDiff.filter((ch) => {
                if (diffFilter === "all") return true;
                if (diffFilter === "missing") return ch.status === "missing-in-target";
                if (diffFilter === "extra") return ch.status === "extra-in-target";
                if (diffFilter === "modified") return ch.status === "modified";
                if (diffFilter === "identical") return ch.status === "identical";
                return true;
              });

              if (filteredChannels.length === 0 && diffFilter !== "all") return null;

              return (
                <div key={i} className="glass-card p-3 border border-surface-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-text-primary">
                      <Folder className="w-3.5 h-3.5 text-discord-blurple" />
                      <span>{cat.categoryName}</span>
                    </div>

                    <span
                      className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded font-bold ${
                        cat.status === "missing-in-target"
                          ? "bg-rose-500/20 text-rose-300"
                          : cat.status === "extra-in-target"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : cat.status === "modified"
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-surface-700 text-text-muted"
                      }`}
                    >
                      {cat.status.replace(/-/g, " ")}
                    </span>
                  </div>

                  {/* Channels within Category */}
                  <div className="space-y-1.5 pl-2 border-l border-surface-500/20">
                    {filteredChannels.length === 0 ? (
                      <div className="text-[10px] text-text-muted italic py-1">No channels in this view.</div>
                    ) : (
                      filteredChannels.map((ch, j) => (
                        <div
                          key={j}
                          className={`p-2 rounded text-xs space-y-1 border ${
                            ch.status === "missing-in-target"
                              ? "bg-rose-500/5 border-rose-500/20"
                              : ch.status === "extra-in-target"
                              ? "bg-emerald-500/5 border-emerald-500/20"
                              : ch.status === "modified"
                              ? "bg-amber-500/5 border-amber-500/20"
                              : "bg-surface-900/60 border-surface-500/20"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              {getChannelIcon(ch.referenceChannel?.type || ch.targetChannel?.type || "text")}
                              <span className="font-semibold text-text-primary text-[11px]">
                                {ch.channelName}
                              </span>
                            </div>

                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                                ch.status === "missing-in-target"
                                  ? "text-rose-400 font-bold"
                                  : ch.status === "extra-in-target"
                                  ? "text-emerald-400 font-bold"
                                  : ch.status === "modified"
                                  ? "text-amber-300 font-bold"
                                  : "text-text-muted"
                              }`}
                            >
                              {ch.status === "missing-in-target"
                                ? "Missing"
                                : ch.status === "extra-in-target"
                                ? "Extra"
                                : ch.status === "modified"
                                ? "Modified"
                                : "Matched"}
                            </span>
                          </div>

                          {ch.differences.length > 0 && (
                            <div className="text-[10px] text-text-secondary pl-5 space-y-0.5">
                              {ch.differences.map((d, k) => (
                                <p key={k}>• {d}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SubTab 2: Side-by-Side Tree View ── */}
      {activeSubTab === "sidebyside" && referenceBlueprint && targetBlueprint && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Reference Column */}
          <div className="glass-card p-3 space-y-2 border-discord-blurple/30">
            <div className="border-b border-surface-500/20 pb-1.5">
              <span className="font-bold text-discord-blurple block truncate">
                {referenceBlueprint.server.name}
              </span>
              <span className="text-[10px] text-text-muted">
                {referenceBlueprint.categories.length} Cats • {referenceBlueprint.channels.length} Chans
              </span>
            </div>

            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
              {referenceBlueprint.categories.map((cat) => (
                <div key={cat.id} className="space-y-1">
                  <div className="flex items-center gap-1 font-semibold text-[11px] text-text-primary">
                    <Folder className="w-3 h-3 text-discord-blurple" />
                    <span className="truncate">{cat.name}</span>
                  </div>
                  <div className="pl-3 space-y-0.5 border-l border-surface-500/20">
                    {referenceBlueprint.channels
                      .filter((c) => c.parentId === cat.id)
                      .map((ch) => (
                        <div key={ch.id} className="flex items-center gap-1 text-[10px] text-text-secondary truncate">
                          {getChannelIcon(ch.type)}
                          <span className="truncate">{ch.name}</span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Target Column */}
          <div className="glass-card p-3 space-y-2 border-emerald-500/30">
            <div className="border-b border-surface-500/20 pb-1.5">
              <span className="font-bold text-emerald-400 block truncate">
                {targetBlueprint.server.name}
              </span>
              <span className="text-[10px] text-text-muted">
                {targetBlueprint.categories.length} Cats • {targetBlueprint.channels.length} Chans
              </span>
            </div>

            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
              {targetBlueprint.categories.map((cat) => (
                <div key={cat.id} className="space-y-1">
                  <div className="flex items-center gap-1 font-semibold text-[11px] text-text-primary">
                    <Folder className="w-3 h-3 text-emerald-400" />
                    <span className="truncate">{cat.name}</span>
                  </div>
                  <div className="pl-3 space-y-0.5 border-l border-surface-500/20">
                    {targetBlueprint.channels
                      .filter((c) => c.parentId === cat.id)
                      .map((ch) => (
                        <div key={ch.id} className="flex items-center gap-1 text-[10px] text-text-secondary truncate">
                          {getChannelIcon(ch.type)}
                          <span className="truncate">{ch.name}</span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SubTab 3: Roles Comparison ── */}
      {activeSubTab === "roles" && comparison && (
        <div className="space-y-2">
          {comparison.roles.length === 0 ? (
            <div className="text-center py-6 text-text-muted text-xs">No custom roles to compare.</div>
          ) : (
            comparison.roles.map((r, i) => (
              <div
                key={i}
                className={`glass-card p-2.5 border text-xs space-y-1 ${
                  r.status === "missing-in-target"
                    ? "border-rose-500/30 bg-rose-500/5"
                    : r.status === "extra-in-target"
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : r.status === "modified"
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-surface-500/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-text-primary">
                    <Shield className="w-3.5 h-3.5 text-discord-blurple" />
                    <span>@{r.roleName}</span>
                  </div>
                  <span
                    className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded ${
                      r.status === "missing-in-target"
                        ? "text-rose-400 font-bold"
                        : r.status === "extra-in-target"
                        ? "text-emerald-400 font-bold"
                        : r.status === "modified"
                        ? "text-amber-300 font-bold"
                        : "text-text-muted"
                    }`}
                  >
                    {r.status.replace(/-/g, " ")}
                  </span>
                </div>

                {r.differences.length > 0 && (
                  <div className="text-[10px] text-text-secondary pl-5 space-y-0.5">
                    {r.differences.map((d, j) => (
                      <p key={j}>• {d}</p>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── SubTab 4: Actionable Recommendations ── */}
      {activeSubTab === "recommendations" && comparison && (
        <div className="space-y-2">
          {comparison.recommendations.length === 0 ? (
            <div className="glass-card p-6 text-center text-text-muted space-y-1">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <div className="font-semibold text-text-primary text-xs">Architectures Perfectly Aligned</div>
              <p className="text-[11px]">No structural discrepancies detected between these two servers.</p>
            </div>
          ) : (
            comparison.recommendations.map((rec, i) => (
              <div key={i} className="glass-card p-3 border border-surface-500/20 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-text-primary">{rec.title}</span>
                  <span
                    className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded font-bold ${
                      rec.priority === "high"
                        ? "bg-rose-500/20 text-rose-300"
                        : rec.priority === "medium"
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-surface-700 text-text-muted"
                    }`}
                  >
                    {rec.priority}
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary leading-relaxed">{rec.description}</p>
              </div>
            ))
          )}

          {/* Quick Actions at bottom */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => setActiveTab("automation")}
              className="btn-primary flex-1 py-1.5 px-3 text-xs flex items-center justify-center gap-1.5"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>Generate Automation Plan</span>
            </button>

            <button
              onClick={() => setActiveTab("templates")}
              className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5"
            >
              <LayoutTemplate className="w-3.5 h-3.5 text-discord-blurple" />
              <span>Template Builder</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
