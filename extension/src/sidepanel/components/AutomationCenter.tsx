/* ─────────────────────────────────────────────
 *  Discord Automation Script Generator & Safe Change Planner
 *
 *  Produces production-grade discord.js (v14) and discord.py (v2)
 *  automation scripts with dry-run support, idempotency, and
 *  structured safe change execution plans.
 * ───────────────────────────────────────────── */

import { useState, useMemo } from "react";
import { useServerStore } from "@/store/serverStore";
import {
  generateDiscordJsScript,
  generateDiscordPyScript,
  generateChangeExecutionPlan,
  type ChangeExecutionPlan,
  CURATED_TEMPLATES,
} from "@mapmyserver/shared";
import {
  Terminal,
  Copy,
  Check,
  Download,
  ShieldAlert,
  Eye,
} from "lucide-react";

type ScriptLang = "discordjs" | "discordpy" | "plan";

export default function AutomationCenter() {
  const { blueprint } = useServerStore();

  const [lang, setLang] = useState<ScriptLang>("discordjs");
  const [targetType, setTargetType] = useState<"live" | "template">("live");
  const [selectedTemplateId, setSelectedTemplateId] = useState(CURATED_TEMPLATES[0].id);
  const [dryRun, setDryRun] = useState(false);
  const [copied, setCopied] = useState(false);

  const selectedTemplate = useMemo(() => {
    return CURATED_TEMPLATES.find((t) => t.id === selectedTemplateId) || CURATED_TEMPLATES[0];
  }, [selectedTemplateId]);

  const activeSource = targetType === "live" ? blueprint : selectedTemplate;

  // Generate Scripts
  const generatedScript = useMemo(() => {
    if (!activeSource) return "";
    if (lang === "discordjs") {
      return generateDiscordJsScript(activeSource, { dryRun });
    }
    if (lang === "discordpy") {
      return generateDiscordPyScript(activeSource, { dryRun });
    }
    return "";
  }, [activeSource, lang, dryRun]);

  // Generate Safe Change Execution Plan (compares current blueprint against target template/proposal)
  const executionPlan: ChangeExecutionPlan | null = useMemo(() => {
    if (!blueprint) return null;
    return generateChangeExecutionPlan(blueprint, selectedTemplate);
  }, [blueprint, selectedTemplate]);

  const handleCopy = async () => {
    if (!generatedScript) return;
    await navigator.clipboard.writeText(generatedScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!generatedScript) return;
    const ext = lang === "discordpy" ? "py" : "js";
    const filename = `apply-discord-architecture.${ext}`;
    const blob = new Blob([generatedScript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!blueprint) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-text-muted">
        <Terminal className="w-10 h-10 mb-3 text-discord-blurple/60" />
        <p className="text-sm">No server blueprint loaded.</p>
        <p className="text-xs mt-1">Scan a Discord server to generate automation scripts.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-fade-in pb-4">
      {/* ── Top Controls ── */}
      <div className="glass-card p-4 space-y-3 mb-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-discord-blurple/20 flex items-center justify-center text-discord-blurple">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">Architecture Automation</h2>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Generate production bot scripts to replicate or apply server layouts safely.
              </p>
            </div>
          </div>
        </div>

        {/* Source & Language Selectors */}
        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-semibold text-text-muted">Architecture Source</label>
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as "live" | "template")}
              className="w-full bg-surface-900 border border-surface-500/30 rounded-lg p-1.5 text-xs text-text-primary focus:outline-none focus:border-discord-blurple"
            >
              <option value="live">Live Server ({blueprint.server.name})</option>
              <option value="template">Selected Template Layout</option>
            </select>
          </div>

          {targetType === "template" && (
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-semibold text-text-muted">Template</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full bg-surface-900 border border-surface-500/30 rounded-lg p-1.5 text-xs text-text-primary focus:outline-none focus:border-discord-blurple truncate"
              >
                {CURATED_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-semibold text-text-muted">Mode / Language</label>
            <div className="flex rounded-lg bg-surface-900 p-0.5 border border-surface-500/30">
              <button
                onClick={() => setLang("discordjs")}
                className={`flex-1 py-1 rounded text-[11px] font-semibold transition-colors ${
                  lang === "discordjs" ? "bg-discord-blurple text-white" : "text-text-muted hover:text-white"
                }`}
              >
                discord.js
              </button>
              <button
                onClick={() => setLang("discordpy")}
                className={`flex-1 py-1 rounded text-[11px] font-semibold transition-colors ${
                  lang === "discordpy" ? "bg-discord-blurple text-white" : "text-text-muted hover:text-white"
                }`}
              >
                discord.py
              </button>
              <button
                onClick={() => setLang("plan")}
                className={`flex-1 py-1 rounded text-[11px] font-semibold transition-colors ${
                  lang === "plan" ? "bg-discord-blurple text-white" : "text-text-muted hover:text-white"
                }`}
              >
                Safe Plan
              </button>
            </div>
          </div>
        </div>

        {/* Dry Run Toggle */}
        {lang !== "plan" && (
          <div className="flex items-center justify-between p-2 rounded bg-surface-900 border border-surface-500/20 text-[11px]">
            <div className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-discord-blurple" />
              <span>Dry-Run Simulation Mode (--dry-run)</span>
            </div>
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="rounded border-surface-500 text-discord-blurple focus:ring-0 cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* ── Mode A: Code Generator View (discord.js / discord.py) ── */}
      {lang !== "plan" && (
        <div className="flex-1 flex flex-col min-h-0 glass-card p-3 space-y-2">
          <div className="flex items-center justify-between border-b border-surface-500/20 pb-2 text-xs">
            <div className="flex items-center gap-1.5 text-text-primary font-mono text-[11px]">
              <span>apply-architecture.{lang === "discordpy" ? "py" : "js"}</span>
              {dryRun && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30">
                  Dry-Run Active
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopy}
                className="btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy Code"}</span>
              </button>

              <button
                onClick={handleDownload}
                className="btn-primary text-[11px] py-1 px-2.5 flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>

          {/* Syntax Code Container */}
          <div className="flex-1 overflow-y-auto bg-surface-900 p-3 rounded-lg border border-surface-500/30 font-mono text-[10px] text-text-secondary leading-relaxed whitespace-pre-wrap select-text">
            {generatedScript}
          </div>
        </div>
      )}

      {/* ── Mode B: Safe Change Application Planner ── */}
      {lang === "plan" && executionPlan && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          {/* Plan Summary Card */}
          <div className="glass-card p-3 space-y-2.5 border-discord-blurple/30">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-text-primary text-xs">
                  Execution Plan: {executionPlan.targetTitle}
                </h3>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  Ordered atomic operations required to transition live server to target layout.
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-discord-blurple/20 text-discord-blurple font-bold">
                {executionPlan.totalOperations} Operations
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
              <div className="bg-surface-900 p-1.5 rounded border border-surface-500/20">
                <span className="text-text-muted block">Duration (Throttled)</span>
                <span className="font-mono text-text-primary font-bold">
                  {(executionPlan.estimatedDurationMs / 1000).toFixed(1)}s
                </span>
              </div>

              <div className="bg-surface-900 p-1.5 rounded border border-surface-500/20">
                <span className="text-text-muted block">Destructive Risks</span>
                <span
                  className={`font-mono font-bold ${
                    executionPlan.destructiveOperationsCount > 0 ? "text-rose-400" : "text-emerald-400"
                  }`}
                >
                  {executionPlan.destructiveOperationsCount} Destructive
                </span>
              </div>

              <div className="bg-surface-900 p-1.5 rounded border border-surface-500/20">
                <span className="text-text-muted block">Required Bot Permissions</span>
                <span className="font-mono text-text-primary truncate block">
                  {executionPlan.requiredBotPermissions.join(", ")}
                </span>
              </div>
            </div>

            {executionPlan.destructiveOperationsCount > 0 && (
              <div className="p-2 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Destructive Safeguard: </span>
                  Plan includes channel deletion or permission reductions. Deletions cannot be undone and require manual operator confirmation.
                </div>
              </div>
            )}
          </div>

          {/* Operations Table */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-semibold text-text-muted px-1">
              Ordered Atomic Execution Steps
            </span>

            {executionPlan.operations.length === 0 ? (
              <div className="glass-card p-6 text-center text-text-muted">
                No structural modifications required. Server already matches this layout!
              </div>
            ) : (
              executionPlan.operations.map((op, i) => (
                <div
                  key={op.id}
                  className={`glass-card p-2.5 border text-[11px] space-y-1 ${
                    op.isDestructive
                      ? "border-rose-500/30 bg-rose-500/5"
                      : "border-surface-500/20 bg-surface-900/60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-text-muted text-[10px]">#{i + 1}</span>
                      <span
                        className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded ${
                          op.type === "CREATE_CATEGORY" || op.type === "CREATE_CHANNEL"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : op.type === "DELETE_CHANNEL" || op.type === "DELETE_CATEGORY"
                            ? "bg-rose-500/20 text-rose-300"
                            : "bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        {op.type.replace(/_/g, " ")}
                      </span>
                      <span className="font-bold text-text-primary font-mono">{op.resourceName}</span>
                    </div>

                    {op.isDestructive && (
                      <span className="text-[9px] text-rose-400 font-bold uppercase">
                        Requires Confirmation
                      </span>
                    )}
                  </div>

                  <p className="text-text-secondary text-[10px] pl-4">{op.details}</p>

                  {op.dependencies.length > 0 && (
                    <div className="text-[9px] font-mono text-text-muted pl-4">
                      Depends on: {op.dependencies.join(", ")}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
