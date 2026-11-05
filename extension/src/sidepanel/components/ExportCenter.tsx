/* ─────────────────────────────────────────────
 *  Advanced Export Center
 *
 *  Multi-format, multi-audience export hub:
 *  JSON, CSV, Markdown, HTML, and Discord Automation Scripts.
 * ───────────────────────────────────────────── */

import { useState, useMemo } from "react";
import { useServerStore } from "@/store/serverStore";
import {
  type DocAudience,
  type ServerBlueprint,
  generateServerDocumentation,
  generateDiscordJsScript,
  generateDiscordPyScript,
  runSecurityAudit,
} from "@mapmyserver/shared";
import {
  Download,
  Copy,
  Check,
  FileCode,
  FileSpreadsheet,
  FileText,
  Globe,
  Terminal,
  Shield,
  Lock,
} from "lucide-react";

type ExportCategory = "blueprint" | "channels-csv" | "roles-csv" | "markdown" | "html" | "discordjs" | "discordpy";

export default function ExportCenter() {
  const { blueprint } = useServerStore();

  const [exportType, setExportType] = useState<ExportCategory>("markdown");
  const [audience, setAudience] = useState<DocAudience>("developer");
  const [copied, setCopied] = useState(false);

  // Compute live security audit
  const auditReport = useMemo(() => {
    return blueprint ? runSecurityAudit(blueprint) : null;
  }, [blueprint]);

  // Generate selected export content
  const exportContent = useMemo(() => {
    if (!blueprint) return "";

    switch (exportType) {
      case "blueprint":
        return JSON.stringify(blueprint, null, 2);

      case "channels-csv":
        return generateServerDocumentation(blueprint, auditReport, "csv", audience);

      case "roles-csv":
        return generateRolesCSV(blueprint);

      case "markdown":
        return generateServerDocumentation(blueprint, auditReport, "markdown", audience);

      case "html":
        return generateServerDocumentation(blueprint, auditReport, "html", audience);

      case "discordjs":
        return generateDiscordJsScript(blueprint);

      case "discordpy":
        return generateDiscordPyScript(blueprint);

      default:
        return "";
    }
  }, [blueprint, exportType, audience, auditReport]);

  const fileExtension = useMemo(() => {
    switch (exportType) {
      case "blueprint":
        return "json";
      case "channels-csv":
      case "roles-csv":
        return "csv";
      case "markdown":
        return "md";
      case "html":
        return "html";
      case "discordjs":
        return "js";
      case "discordpy":
        return "py";
    }
  }, [exportType]);

  const handleCopy = async () => {
    if (!exportContent) return;
    await navigator.clipboard.writeText(exportContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!exportContent || !blueprint) return;
    const cleanName = blueprint.server.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const filename = `${cleanName}-${exportType}.${fileExtension}`;
    const mime =
      fileExtension === "json"
        ? "application/json"
        : fileExtension === "csv"
        ? "text/csv"
        : fileExtension === "html"
        ? "text/html"
        : "text/plain";

    const blob = new Blob([exportContent], { type: mime });
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
        <Download className="w-10 h-10 mb-3 text-discord-blurple/60" />
        <p className="text-sm">No server blueprint loaded.</p>
        <p className="text-xs mt-1">Scan a Discord server to generate exports.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-fade-in pb-4">
      {/* ── Top Header ── */}
      <div className="glass-card p-4 space-y-3 mb-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-discord-blurple/20 flex items-center justify-center text-discord-blurple">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">Advanced Export Center</h2>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Export architecture blueprints, documentation, spreadsheets, and automation scripts.
              </p>
            </div>
          </div>
        </div>

        {/* Audience Filter for Documentation */}
        {(exportType === "markdown" || exportType === "html" || exportType === "channels-csv") && (
          <div className="space-y-1 pt-1 text-xs">
            <label className="text-[10px] uppercase font-semibold text-text-muted">
              Report Audience & Privacy Scope
            </label>
            <div className="grid grid-cols-3 gap-1 bg-surface-900 p-1 rounded-lg border border-surface-500/20 text-[11px]">
              <button
                onClick={() => setAudience("developer")}
                className={`py-1 rounded font-medium transition-colors ${
                  audience === "developer" ? "bg-discord-blurple text-white" : "text-text-muted hover:text-white"
                }`}
              >
                Developer
              </button>
              <button
                onClick={() => setAudience("moderator")}
                className={`py-1 rounded font-medium transition-colors ${
                  audience === "moderator" ? "bg-discord-blurple text-white" : "text-text-muted hover:text-white"
                }`}
              >
                Moderator
              </button>
              <button
                onClick={() => setAudience("member")}
                className={`py-1 rounded font-medium transition-colors ${
                  audience === "member" ? "bg-discord-blurple text-white" : "text-text-muted hover:text-white"
                }`}
              >
                Public Member
              </button>
            </div>

            {audience === "member" && (
              <div className="p-2 rounded bg-surface-900 border border-surface-500/20 text-[10px] text-emerald-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Privacy Guard Active: All private staff channels and role IDs are excluded.</span>
              </div>
            )}
          </div>
        )}

        {/* Format Selector Pills */}
        <div className="flex flex-wrap gap-1.5 pt-1 text-xs">
          <button
            onClick={() => setExportType("markdown")}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 border transition-colors ${
              exportType === "markdown"
                ? "bg-discord-blurple text-white border-discord-blurple"
                : "bg-surface-900 text-text-secondary border-surface-500/30 hover:text-white"
            }`}
          >
            <FileText className="w-3 h-3" /> Markdown (.md)
          </button>

          <button
            onClick={() => setExportType("blueprint")}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 border transition-colors ${
              exportType === "blueprint"
                ? "bg-discord-blurple text-white border-discord-blurple"
                : "bg-surface-900 text-text-secondary border-surface-500/30 hover:text-white"
            }`}
          >
            <FileCode className="w-3 h-3" /> Full Blueprint (.json)
          </button>

          <button
            onClick={() => setExportType("channels-csv")}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 border transition-colors ${
              exportType === "channels-csv"
                ? "bg-discord-blurple text-white border-discord-blurple"
                : "bg-surface-900 text-text-secondary border-surface-500/30 hover:text-white"
            }`}
          >
            <FileSpreadsheet className="w-3 h-3" /> Channels (.csv)
          </button>

          <button
            onClick={() => setExportType("roles-csv")}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 border transition-colors ${
              exportType === "roles-csv"
                ? "bg-discord-blurple text-white border-discord-blurple"
                : "bg-surface-900 text-text-secondary border-surface-500/30 hover:text-white"
            }`}
          >
            <Shield className="w-3 h-3" /> Roles Matrix (.csv)
          </button>

          <button
            onClick={() => setExportType("html")}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 border transition-colors ${
              exportType === "html"
                ? "bg-discord-blurple text-white border-discord-blurple"
                : "bg-surface-900 text-text-secondary border-surface-500/30 hover:text-white"
            }`}
          >
            <Globe className="w-3 h-3" /> HTML Report
          </button>

          <button
            onClick={() => setExportType("discordjs")}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 border transition-colors ${
              exportType === "discordjs"
                ? "bg-discord-blurple text-white border-discord-blurple"
                : "bg-surface-900 text-text-secondary border-surface-500/30 hover:text-white"
            }`}
          >
            <Terminal className="w-3 h-3" /> discord.js
          </button>

          <button
            onClick={() => setExportType("discordpy")}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 border transition-colors ${
              exportType === "discordpy"
                ? "bg-discord-blurple text-white border-discord-blurple"
                : "bg-surface-900 text-text-secondary border-surface-500/30 hover:text-white"
            }`}
          >
            <Terminal className="w-3 h-3" /> discord.py
          </button>
        </div>
      </div>

      {/* ── Content Preview & Actions ── */}
      <div className="flex-1 flex flex-col min-h-0 glass-card p-3 space-y-2">
        <div className="flex items-center justify-between border-b border-surface-500/20 pb-2 text-xs">
          <span className="font-mono text-text-muted text-[11px]">
            Preview: {exportType}.{fileExtension}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopy}
              className="btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy to Clipboard"}</span>
            </button>

            <button
              onClick={handleDownload}
              className="btn-primary text-[11px] py-1 px-2.5 flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
          </div>
        </div>

        {/* Code Preview Box */}
        <div className="flex-1 overflow-y-auto bg-surface-900 p-3 rounded-lg border border-surface-500/30 font-mono text-[10px] text-text-secondary leading-relaxed whitespace-pre-wrap select-text">
          {exportContent}
        </div>
      </div>
    </div>
  );
}

// ── Roles CSV Helper ──

function generateRolesCSV(blueprint: ServerBlueprint): string {
  const headers = ["Position", "Role Name", "Role ID", "Color", "Is Admin", "Hoist", "Permissions"];
  const rows = [headers.join(",")];

  const sorted = [...blueprint.roles].sort((a, b) => b.position - a.position);
  for (const r of sorted) {
    const isAdmin = (r.permissions || []).includes("ADMINISTRATOR") ? "Yes" : "No";
    const perms = (r.permissions || []).join("; ");
    rows.push(
      [
        r.position,
        `"${r.name}"`,
        `"${r.id}"`,
        `"${r.color || "None"}"`,
        `"${isAdmin}"`,
        `"${r.hoist ? "Yes" : "No"}"`,
        `"${perms}"`,
      ].join(",")
    );
  }

  return rows.join("\n");
}
