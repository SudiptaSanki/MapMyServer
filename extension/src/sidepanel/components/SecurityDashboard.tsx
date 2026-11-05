/* ─────────────────────────────────────────────
 *  Security Dashboard Component
 *
 *  Interactive Security Audit Center & Server Health Intelligence.
 *  Visualizes findings, health grades, evidence tables,
 *  and provides copyable AI security prompts.
 * ───────────────────────────────────────────── */

import { useState, useMemo } from "react";
import { useServerStore } from "@/store/serverStore";
import { useUIStore } from "@/store/uiStore";
import {
  runSecurityAudit,
  type SecurityFinding,
  type FindingSeverity,
  type FindingCategory,
  type FindingStatus,
  type SecurityAuditReport,
} from "@mapmyserver/shared";
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  Copy,
  Check,
  Search,
  Filter,
  ExternalLink,
  Hash,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function SecurityDashboard() {
  const { blueprint } = useServerStore();
  const { setSelectedChannelId } = useUIStore();

  const [severityFilter, setSeverityFilter] = useState<FindingSeverity | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<FindingCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<FindingStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  // Run deterministic security audit
  const auditReport: SecurityAuditReport | null = useMemo(() => {
    if (!blueprint) return null;
    return runSecurityAudit(blueprint);
  }, [blueprint]);

  // Filtered findings list
  const filteredFindings = useMemo(() => {
    if (!auditReport) return [];

    return auditReport.findings.filter((finding) => {
      if (severityFilter !== "all" && finding.severity !== severityFilter) return false;
      if (categoryFilter !== "all" && finding.category !== categoryFilter) return false;
      if (statusFilter !== "all" && finding.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = finding.title.toLowerCase().includes(q);
        const matchesDesc = finding.description.toLowerCase().includes(q);
        const matchesRule = finding.ruleId.toLowerCase().includes(q);
        const matchesResource = finding.affectedResourceNames.some((r) => r.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesRule && !matchesResource) return false;
      }

      return true;
    });
  }, [auditReport, severityFilter, categoryFilter, statusFilter, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedFindings((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopyReport = async () => {
    if (!auditReport) return;
    const text = formatMarkdownReport(auditReport);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  if (!blueprint || !auditReport) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-text-muted">
        <ShieldAlert className="w-10 h-10 mb-3 text-text-muted/60" />
        <p className="text-sm">No server blueprint loaded.</p>
        <p className="text-xs mt-1">Scan a Discord server to generate a security health audit.</p>
      </div>
    );
  }

  const { score, grade, summary, scanQuality } = auditReport;

  // Grade color styling
  const gradeStyles: Record<string, { bg: string; text: string; border: string }> = {
    A: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
    B: { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/30" },
    C: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
    D: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30" },
    F: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/30" },
  };
  const currentGradeStyle = gradeStyles[grade] || gradeStyles.C;

  return (
    <div className="flex flex-col gap-3 animate-fade-in pb-8">
      {/* ── Top Health & Posture Card ── */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl border ${currentGradeStyle.bg} ${currentGradeStyle.text} ${currentGradeStyle.border}`}
            >
              {grade}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-text-primary">Security & Health Posture</h2>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${currentGradeStyle.bg} ${currentGradeStyle.text} ${currentGradeStyle.border}`}>
                  Score: {score}/100
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                {score >= 90
                  ? "Excellent architecture with strong permission gating."
                  : score >= 75
                  ? "Good overall posture with minor permission inconsistencies."
                  : score >= 50
                  ? "Elevated exposure risk: several channels or roles require review."
                  : "Critical security vulnerabilities detected. Immediate action advised."}
              </p>
            </div>
          </div>

          <button
            onClick={handleCopyReport}
            className="btn-secondary text-xs flex items-center gap-1.5 px-2.5 py-1.5 flex-shrink-0"
            title="Copy structured Markdown report to share with AI or team"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy AI Report"}</span>
          </button>
        </div>

        {/* Severity Count Chips */}
        <div className="grid grid-cols-5 gap-1.5 pt-1">
          <button
            onClick={() => setSeverityFilter(severityFilter === "critical" ? "all" : "critical")}
            className={`p-1.5 rounded text-center border transition-colors ${
              severityFilter === "critical"
                ? "bg-rose-500/30 border-rose-500/70 text-white"
                : "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20"
            }`}
          >
            <div className="text-[10px] uppercase font-semibold">Critical</div>
            <div className="text-sm font-bold font-mono">{summary.critical}</div>
          </button>

          <button
            onClick={() => setSeverityFilter(severityFilter === "high" ? "all" : "high")}
            className={`p-1.5 rounded text-center border transition-colors ${
              severityFilter === "high"
                ? "bg-orange-500/30 border-orange-500/70 text-white"
                : "bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20"
            }`}
          >
            <div className="text-[10px] uppercase font-semibold">High</div>
            <div className="text-sm font-bold font-mono">{summary.high}</div>
          </button>

          <button
            onClick={() => setSeverityFilter(severityFilter === "medium" ? "all" : "medium")}
            className={`p-1.5 rounded text-center border transition-colors ${
              severityFilter === "medium"
                ? "bg-amber-500/30 border-amber-500/70 text-white"
                : "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20"
            }`}
          >
            <div className="text-[10px] uppercase font-semibold">Medium</div>
            <div className="text-sm font-bold font-mono">{summary.medium}</div>
          </button>

          <button
            onClick={() => setSeverityFilter(severityFilter === "low" ? "all" : "low")}
            className={`p-1.5 rounded text-center border transition-colors ${
              severityFilter === "low"
                ? "bg-sky-500/30 border-sky-500/70 text-white"
                : "bg-sky-500/10 border-sky-500/20 text-sky-400 hover:bg-sky-500/20"
            }`}
          >
            <div className="text-[10px] uppercase font-semibold">Low</div>
            <div className="text-sm font-bold font-mono">{summary.low}</div>
          </button>

          <button
            onClick={() => setSeverityFilter(severityFilter === "informational" ? "all" : "informational")}
            className={`p-1.5 rounded text-center border transition-colors ${
              severityFilter === "informational"
                ? "bg-slate-500/30 border-slate-500/70 text-white"
                : "bg-slate-500/10 border-slate-500/20 text-slate-300 hover:bg-slate-500/20"
            }`}
          >
            <div className="text-[10px] uppercase font-semibold">Info</div>
            <div className="text-sm font-bold font-mono">{summary.informational}</div>
          </button>
        </div>

        {/* Scan Quality Notice */}
        {scanQuality && scanQuality.permissionDataQuality !== "full" && (
          <div className="text-[11px] p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Partial Data Scan: </span>
              Audit is based on {scanQuality.source} inspection ({scanQuality.completenessScore}% completeness). Hidden channels or internal overwrites may require a full bot scan for confirmed status.
            </div>
          </div>
        )}
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="glass-card p-3 space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search findings, channels, rules..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface-900/60 border border-surface-500/20 rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-discord-blurple/50"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Category Dropdown */}
          <div className="flex-1 flex items-center gap-1 bg-surface-900/60 border border-surface-500/20 rounded px-2 py-1 text-[11px]">
            <Filter className="w-3 h-3 text-text-muted" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as FindingCategory | "all")}
              className="bg-transparent text-text-secondary focus:outline-none w-full capitalize"
            >
              <option value="all" className="bg-surface-800">All Categories</option>
              <option value="administrator" className="bg-surface-800">Administrator</option>
              <option value="staff-exposure" className="bg-surface-800">Staff Exposure</option>
              <option value="visibility" className="bg-surface-800">Visibility</option>
              <option value="consistency" className="bg-surface-800">Consistency</option>
              <option value="roles" className="bg-surface-800">Roles</option>
              <option value="organization" className="bg-surface-800">Organization</option>
              <option value="voice" className="bg-surface-800">Voice</option>
              <option value="data-quality" className="bg-surface-800">Data Quality</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="flex-1 flex items-center gap-1 bg-surface-900/60 border border-surface-500/20 rounded px-2 py-1 text-[11px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FindingStatus | "all")}
              className="bg-transparent text-text-secondary focus:outline-none w-full capitalize"
            >
              <option value="all" className="bg-surface-800">All Statuses</option>
              <option value="confirmed" className="bg-surface-800">Confirmed</option>
              <option value="needs-review" className="bg-surface-800">Needs Review</option>
              <option value="insufficient-data" className="bg-surface-800">Insufficient Data</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Findings List ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-text-muted px-1">
          <span>
            Showing {filteredFindings.length} of {auditReport.findings.length} findings
          </span>
          {(severityFilter !== "all" || categoryFilter !== "all" || statusFilter !== "all" || searchQuery) && (
            <button
              onClick={() => {
                setSeverityFilter("all");
                setCategoryFilter("all");
                setStatusFilter("all");
                setSearchQuery("");
              }}
              className="text-discord-blurple hover:underline text-[11px]"
            >
              Reset Filters
            </button>
          )}
        </div>

        {filteredFindings.length === 0 ? (
          <div className="glass-card p-6 text-center text-text-muted space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <div className="text-xs font-semibold text-text-primary">No Matching Security Findings</div>
            <p className="text-[11px]">
              No issues detected for the selected filter combination.
            </p>
          </div>
        ) : (
          filteredFindings.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              isExpanded={expandedFindings.has(finding.id)}
              onToggle={() => toggleExpand(finding.id)}
              onSelectChannel={(chanId) => setSelectedChannelId(chanId)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Finding Card Component ─────────────────────

function FindingCard({
  finding,
  isExpanded,
  onToggle,
  onSelectChannel,
}: {
  finding: SecurityFinding;
  isExpanded: boolean;
  onToggle: () => void;
  onSelectChannel: (channelId: string) => void;
}) {
  const severityBadge = getSeverityBadge(finding.severity);
  const statusBadge = getStatusBadge(finding.status);

  return (
    <div
      className={`glass-card p-3 border transition-all duration-150 ${
        finding.severity === "critical"
          ? "border-rose-500/40 bg-rose-500/5"
          : finding.severity === "high"
          ? "border-orange-500/30 bg-orange-500/5"
          : finding.severity === "medium"
          ? "border-amber-500/20"
          : "border-surface-500/20"
      }`}
    >
      {/* Header */}
      <div className="cursor-pointer select-none" onClick={onToggle}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {severityBadge}
            {statusBadge}
            <span className="text-[10px] text-text-muted font-mono uppercase bg-surface-900/60 px-1.5 py-0.5 rounded border border-surface-500/20">
              {finding.category}
            </span>
          </div>

          <button className="text-text-muted hover:text-text-primary p-0.5">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        <h3 className="text-xs font-bold text-text-primary mt-1.5 leading-snug">
          {finding.title}
        </h3>

        <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
          {finding.description}
        </p>
      </div>

      {/* Affected Resources */}
      {finding.affectedResourceNames.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-surface-500/20">
          <span className="text-[10px] text-text-muted">Target:</span>
          {finding.affectedResourceNames.map((name, i) => {
            const resourceId = finding.affectedResourceIds[i];
            const isChannel = name.startsWith("#");
            return (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  if (resourceId && isChannel) {
                    onSelectChannel(resourceId);
                  }
                }}
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1 ${
                  isChannel
                    ? "bg-discord-blurple/20 text-discord-blurple hover:bg-discord-blurple/30 border border-discord-blurple/30"
                    : "bg-surface-700/80 text-text-primary border border-surface-500/30"
                }`}
                title={isChannel ? "Inspect channel permissions" : "Role resource"}
              >
                {isChannel ? <Hash className="w-2.5 h-2.5" /> : null}
                <span>{name}</span>
                {isChannel && <ExternalLink className="w-2.5 h-2.5 opacity-60" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Expanded Details: Evidence & Recommendation */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-surface-500/20 space-y-2.5 animate-fade-in text-[11px]">
          {/* Recommendation */}
          <div className="p-2 rounded bg-discord-blurple/10 border border-discord-blurple/20 text-discord-blurple/90 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-white">
              <CheckCircle2 className="w-3.5 h-3.5 text-discord-blurple" />
              <span>Remediation Guidance</span>
            </div>
            <p className="leading-relaxed text-text-primary">{finding.recommendation}</p>
          </div>

          {/* Evidence Details */}
          {finding.evidence.length > 0 && (
            <div className="space-y-1.5">
              <span className="font-semibold text-text-muted text-[10px] uppercase tracking-wider">
                Audit Evidence
              </span>
              <div className="space-y-1">
                {finding.evidence.map((ev, i) => (
                  <div
                    key={i}
                    className="p-1.5 rounded bg-surface-900/80 border border-surface-500/20 font-mono text-[10px] space-y-0.5"
                  >
                    <div className="text-text-muted">{ev.field}</div>
                    <div className="text-rose-300">
                      <span className="text-text-muted">Actual: </span>
                      {ev.actualValue}
                    </div>
                    {ev.expectedValue && (
                      <div className="text-emerald-400">
                        <span className="text-text-muted">Expected: </span>
                        {ev.expectedValue}
                      </div>
                    )}
                    <div className="text-text-secondary text-[10px] font-sans pt-0.5">
                      {ev.explanation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-[10px] text-text-muted pt-1">
            <span>Rule: {finding.ruleId}</span>
            <span>Confidence: {finding.confidence.toUpperCase()}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Badges ─────────────────────────────────────

function getSeverityBadge(severity: FindingSeverity) {
  switch (severity) {
    case "critical":
      return (
        <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold uppercase flex items-center gap-1">
          <ShieldAlert className="w-3 h-3" /> Critical
        </span>
      );
    case "high":
      return (
        <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/40 text-[10px] font-bold uppercase flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> High
        </span>
      );
    case "medium":
      return (
        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-semibold uppercase flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Medium
        </span>
      );
    case "low":
      return (
        <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] font-semibold uppercase flex items-center gap-1">
          <Info className="w-3 h-3" /> Low
        </span>
      );
    case "informational":
      return (
        <span className="px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-300 border border-slate-500/40 text-[10px] uppercase flex items-center gap-1">
          <Info className="w-3 h-3" /> Info
        </span>
      );
  }
}

function getStatusBadge(status: FindingStatus) {
  switch (status) {
    case "confirmed":
      return (
        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px]">
          Confirmed
        </span>
      );
    case "needs-review":
      return (
        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px]">
          Needs Review
        </span>
      );
    case "insufficient-data":
      return (
        <span className="px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-400 border border-slate-500/30 text-[10px]">
          Partial Data
        </span>
      );
  }
}

// ── Markdown Formatter for AI Prompt Generation ──

function formatMarkdownReport(report: SecurityAuditReport): string {
  const dateStr = new Date(report.generatedAt).toLocaleString();
  let md = `# Discord Server Architecture & Security Audit Report\n\n`;
  md += `**Server Name**: ${report.serverName}\n`;
  md += `**Server ID**: ${report.serverId}\n`;
  md += `**Audit Timestamp**: ${dateStr}\n`;
  md += `**Overall Security Grade**: ${report.grade} (${report.score}/100)\n\n`;

  md += `## Executive Summary\n`;
  md += `- **Total Findings**: ${report.summary.totalFindings}\n`;
  md += `- **Critical**: ${report.summary.critical}\n`;
  md += `- **High**: ${report.summary.high}\n`;
  md += `- **Medium**: ${report.summary.medium}\n`;
  md += `- **Low**: ${report.summary.low}\n`;
  md += `- **Informational**: ${report.summary.informational}\n`;
  md += `- **Confirmed Issues**: ${report.summary.confirmed}\n`;
  md += `- **Needs Review**: ${report.summary.needsReview}\n\n`;

  if (report.findings.length === 0) {
    md += `*No security findings or permission anomalies detected.*\n\n`;
  } else {
    md += `## Detailed Findings & Remediation Steps\n\n`;
    for (const f of report.findings) {
      md += `### [${f.severity.toUpperCase()}] ${f.title}\n`;
      md += `- **Category**: ${f.category}\n`;
      md += `- **Rule**: \`${f.ruleId}\`\n`;
      md += `- **Status**: ${f.status} (Confidence: ${f.confidence})\n`;
      if (f.affectedResourceNames.length > 0) {
        md += `- **Affected Resources**: ${f.affectedResourceNames.join(", ")}\n`;
      }
      md += `- **Description**: ${f.description}\n`;
      md += `- **Recommendation**: ${f.recommendation}\n`;
      if (f.evidence.length > 0) {
        md += `- **Evidence**:\n`;
        for (const ev of f.evidence) {
          md += `  - \`${ev.field}\`: Actual: "${ev.actualValue}"${ev.expectedValue ? ` | Expected: "${ev.expectedValue}"` : ""} (${ev.explanation})\n`;
        }
      }
      md += `\n`;
    }
  }

  md += `## Prompt for AI Assistant:\n`;
  md += `> "Please review the Discord server security audit findings above. Suggest concrete action plans, role hierarchy improvements, permission overwrite adjustments, and structural restructuring to elevate this server to a grade A architecture."\n`;

  return md;
}
