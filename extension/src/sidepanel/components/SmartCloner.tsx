/* ─────────────────────────────────────────────
 *  MapMyServer — Smart Server Cloner (Stage 6)
 *
 *  8-Step Interactive Guided Workflow:
 *  1. Select Source Server (Current, Saved, Template, Mock)
 *  2. Scan & Capture Mode (Full Admin vs Accessible Member with notice)
 *  3. Review Discovered Architecture
 *  4. Smart Component Selection & Renaming (Everything, Categories, Custom)
 *  5. AI Architecture Assistant & Adaptation (BYOK)
 *  6. Destination Server & Merge Strategy (New vs Selective Merge)
 *  7. Implementation Plan Review & Destructive Safeguards
 *  8. Export & Automation (discord.js, discord.py, JSON Template, Checklist)
 * ───────────────────────────────────────────── */

import { useState, useEffect, useMemo } from "react";
import { useServerStore } from "@/store/serverStore";
import { useUIStore } from "@/store/uiStore";
import AISettingsModal from "./AISettingsModal";
import {
  type ServerBlueprint,
  type CloneWorkflow,
  type CloneSelectionConfig,
  type CloneExecutionPlan,
  type AIProviderConfig,
  detectCaptureMode,
  createCloningPlan,
  generateDiscordJsScript,
  generateDiscordPyScript,
  templateToBlueprint,
  CURATED_TEMPLATES,
} from "@mapmyserver/shared";
import { listServers, loadBlueprint } from "@/services/storageService";
import { MOCK_SERVER } from "@/services/mockServer";
import { AIService } from "@/ai/services/AIService";
import {
  Copy,
  Check,
  Folder,
  Hash,
  Volume2,
  MessageSquare,
  Radio,
  Terminal,
  Download,
  Sparkles,
  Shield,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Edit3,
  Sliders,
  Code2,
  FileText,
  Layers,
  Bot,
  Info,
  Server,
  RefreshCw,
} from "lucide-react";

export default function SmartCloner() {
  const { blueprint: liveBlueprint, currentServer, checkActiveTab, requestAnalysis } = useServerStore();
  const { setActiveTab } = useUIStore();

  const [activeAiConfig, setActiveAiConfig] = useState<AIProviderConfig | null>(null);
  const [isAISettingsOpen, setIsAISettingsOpen] = useState(false);

  const [step, setStep] = useState<number>(1);
  const [savedServers, setSavedServers] = useState<Array<{ id: string; name: string }>>([]);

  // Source & Destination Selectors
  const [sourceId, setSourceId] = useState<string>("live");
  const [destinationId, setDestinationId] = useState<string>("new");
  const [workflow, setWorkflow] = useState<CloneWorkflow>("full-clone");

  // Loaded blueprints
  const [sourceBlueprint, setSourceBlueprint] = useState<ServerBlueprint | null>(null);
  const [destinationBlueprint, setDestinationBlueprint] = useState<ServerBlueprint | null>(null);

  // Selection Config
  const [selectionConfig, setSelectionConfig] = useState<CloneSelectionConfig>({
    mode: "everything",
    selectedCategoryIds: [],
    selectedChannelIds: [],
    selectedRoleIds: [],
    excludedChannelIds: [],
    includeRoles: true,
    includeDescriptions: true,
    includePermissions: true,
    categoryRenames: {},
    channelRenames: {},
  });

  // AI Assistant in Step 5
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);

  // Script & Export options in Step 8
  const [exportFormat, setExportFormat] = useState<"discordjs" | "discordpy" | "template" | "checklist">("discordjs");
  const [dryRun, setDryRun] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  // Load saved servers on mount
  useEffect(() => {
    listServers().then((list) => {
      setSavedServers(list.map((s) => ({ id: s.id, name: s.name })));
    });
    AIService.getActiveConfig().then(setActiveAiConfig);
  }, []);

  // Resolve Source Blueprint
  useEffect(() => {
    const resolve = async () => {
      if (sourceId === "live") {
        setSourceBlueprint(liveBlueprint || null);
      } else if (sourceId === "mock") {
        setSourceBlueprint(MOCK_SERVER);
      } else if (sourceId.startsWith("template:")) {
        const tid = sourceId.replace("template:", "");
        const tmpl = CURATED_TEMPLATES.find((t) => t.id === tid);
        if (tmpl) setSourceBlueprint(templateToBlueprint(tmpl));
      } else if (sourceId.startsWith("saved:")) {
        const sid = sourceId.replace("saved:", "");
        const bp = await loadBlueprint(sid);
        setSourceBlueprint(bp);
      }
    };
    resolve();
  }, [sourceId, liveBlueprint]);

  // Resolve Destination Blueprint
  useEffect(() => {
    const resolve = async () => {
      if (destinationId === "new") {
        setDestinationBlueprint(null);
        setWorkflow("full-clone");
      } else if (destinationId === "live") {
        setDestinationBlueprint(liveBlueprint || null);
        setWorkflow("selective-merge");
      } else if (destinationId.startsWith("saved:")) {
        const sid = destinationId.replace("saved:", "");
        const bp = await loadBlueprint(sid);
        setDestinationBlueprint(bp);
        setWorkflow("selective-merge");
      }
    };
    resolve();
  }, [destinationId, liveBlueprint]);

  // Capture Mode Detection
  const captureMode = useMemo(() => {
    if (!sourceBlueprint) return null;
    return detectCaptureMode(sourceBlueprint);
  }, [sourceBlueprint]);

  // Initialize selected categories and channels whenever sourceBlueprint changes
  useEffect(() => {
    if (sourceBlueprint) {
      setSelectionConfig((prev) => ({
        ...prev,
        selectedCategoryIds: sourceBlueprint.categories.map((c) => c.id),
        selectedChannelIds: sourceBlueprint.channels.map((ch) => ch.id),
        selectedRoleIds: sourceBlueprint.roles.map((r) => r.id),
      }));
    }
  }, [sourceBlueprint]);

  // Execution Plan
  const executionPlan: CloneExecutionPlan | null = useMemo(() => {
    if (!sourceBlueprint) return null;
    return createCloningPlan(sourceBlueprint, destinationBlueprint, workflow, selectionConfig);
  }, [sourceBlueprint, destinationBlueprint, workflow, selectionConfig]);

  // AI Adaptation Handler (Step 5)
  const handleRunAiAssistant = async () => {
    if (!sourceBlueprint || !aiPrompt.trim()) return;
    const config = activeAiConfig || (await AIService.getActiveConfig());
    if (!config || !config.apiKey) {
      setIsAISettingsOpen(true);
      return;
    }

    setIsAiLoading(true);
    try {
      const promptText = `Source Discord Server: ${sourceBlueprint.server.name}
Categories: ${sourceBlueprint.categories.map((c) => c.name).join(", ")}
Channels (${sourceBlueprint.channels.length}): ${sourceBlueprint.channels.slice(0, 20).map((c) => `#${c.name}`).join(", ")}

User Request: "${aiPrompt.trim()}"

Provide an expert Discord server architecture recommendation based strictly on the user request.
Distinguish observed source facts from your suggestions. Include:
1. Recommended Category Adjustments
2. Recommended New or Renamed Channels
3. Relevant Roles and Permissions Hierarchy`;

      const response = await AIService.generate(
        [
          {
            role: "system",
            content:
              "You are an expert Discord Server Architect. Ground your suggestions in Discord community best practices. Never invent false source facts.",
          },
          { role: "user", content: promptText },
        ],
        undefined,
        config
      );

      setAiRecommendation(response.text);
    } catch (err: any) {
      alert(`AI Request Error: ${err.message || err}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Channel Icon Helper
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

  // Copy or Download Outputs in Step 8
  const handleCopyOutput = () => {
    if (!executionPlan) return;
    let content = "";
    if (exportFormat === "discordjs") {
      content = generateDiscordJsScript(executionPlan.filteredBlueprint, { dryRun });
    } else if (exportFormat === "discordpy") {
      content = generateDiscordPyScript(executionPlan.filteredBlueprint, { dryRun });
    } else if (exportFormat === "template") {
      content = JSON.stringify(executionPlan.filteredBlueprint, null, 2);
    } else {
      content = executionPlan.manualChecklist;
    }

    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadOutput = () => {
    if (!executionPlan) return;
    let content = "";
    let filename = `clone-${executionPlan.sourceServerName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

    if (exportFormat === "discordjs") {
      content = generateDiscordJsScript(executionPlan.filteredBlueprint, { dryRun });
      filename += ".js";
    } else if (exportFormat === "discordpy") {
      content = generateDiscordPyScript(executionPlan.filteredBlueprint, { dryRun });
      filename += ".py";
    } else if (exportFormat === "template") {
      content = JSON.stringify(executionPlan.filteredBlueprint, null, 2);
      filename += "-template.json";
    } else {
      content = executionPlan.manualChecklist;
      filename += "-recreation-guide.md";
    }

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-3 animate-fade-in pb-12">
      {/* ── Wizard Header ── */}
      <div className="glass-card p-4 space-y-3 border-discord-blurple/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Copy className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">Smart Server Cloner</h2>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Capture, customize, and recreate any accessible Discord server architecture.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold bg-surface-900 border border-surface-500/30 px-2 py-1 rounded text-text-muted">
            Step {step} of 8
          </span>
        </div>

        {/* ── Progress Step Indicator ── */}
        <div className="grid grid-cols-8 gap-1 pt-1">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
            <button
              key={s}
              onClick={() => s <= step && setStep(s)}
              disabled={s > step}
              className={`h-1.5 rounded-full transition-all ${
                s === step
                  ? "bg-discord-blurple"
                  : s < step
                  ? "bg-emerald-400"
                  : "bg-surface-700 opacity-50"
              }`}
              title={`Step ${s}`}
            />
          ))}
        </div>
      </div>

      {/* ── STEP 1: Select Source Server ── */}
      {step === 1 && (
        <div className="glass-card p-4 space-y-3.5 animate-fade-in">
          <div>
            <h3 className="font-bold text-text-primary text-xs flex items-center gap-1.5">
              <Server className="w-4 h-4 text-discord-blurple" />
              <span>Step 1: Choose Source Server to Model</span>
            </h3>
            <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
              Select the Discord server whose architecture you wish to examine and clone.
            </p>
          </div>

          <div className="space-y-2 pt-1">
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="w-full bg-surface-900 border border-surface-500/30 rounded-lg p-2.5 text-xs text-text-primary focus:outline-none focus:border-discord-blurple"
            >
              {liveBlueprint ? (
                <option value="live">Active Discord Server: {liveBlueprint.server.name}</option>
              ) : currentServer.onDiscord ? (
                <option value="live">Active Tab: {currentServer.name || "Discord Server"}</option>
              ) : null}

              <optgroup label="Curated Architecture Templates">
                {CURATED_TEMPLATES.map((t) => (
                  <option key={t.id} value={`template:${t.id}`}>
                    Template: {t.name} ({t.category})
                  </option>
                ))}
              </optgroup>

              {savedServers.length > 0 && (
                <optgroup label="Previously Scanned / Saved Servers">
                  {savedServers.map((s) => (
                    <option key={s.id} value={`saved:${s.id}`}>
                      Saved: {s.name}
                    </option>
                  ))}
                </optgroup>
              )}

              <optgroup label="Demo Showcase">
                <option value="mock">GDG Community (Rich Mock Blueprint)</option>
              </optgroup>
            </select>

            {/* Quick detection card if on Discord but blueprint not scanned */}
            {!liveBlueprint && sourceId === "live" && (
              <div className="p-3 rounded-lg bg-surface-900 border border-amber-500/30 text-xs space-y-2">
                <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Server Not Yet Scanned</span>
                </div>
                <p className="text-[11px] text-text-secondary">
                  Your active Discord tab is ready. Click below to sweep and scan visible channels.
                </p>
                <button
                  onClick={async () => {
                    await checkActiveTab();
                    await requestAnalysis();
                  }}
                  className="btn-primary w-full py-1.5 text-xs flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Scan Active Discord Server Now</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-surface-500/20">
            <button
              onClick={() => setStep(2)}
              disabled={!sourceBlueprint}
              className="btn-primary py-1.5 px-4 text-xs flex items-center gap-1.5"
            >
              <span>Next: Inspect Scan Mode</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Scan & Capture Mode Detection ── */}
      {step === 2 && sourceBlueprint && captureMode && (
        <div className="glass-card p-4 space-y-3.5 animate-fade-in">
          <div>
            <h3 className="font-bold text-text-primary text-xs flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-discord-blurple" />
              <span>Step 2: Architecture Capture Mode</span>
            </h3>
            <p className="text-[11px] text-text-secondary mt-1">
              Evaluated based on your actual permissions on {sourceBlueprint.server.name}.
            </p>
          </div>

          {/* Mode Notification Banner */}
          <div
            className={`p-3.5 rounded-xl border space-y-2 ${
              captureMode.mode === "full-admin"
                ? "bg-discord-blurple/10 border-discord-blurple/40"
                : "bg-emerald-500/10 border-emerald-500/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-text-primary flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{captureMode.title}</span>
              </span>
              <span className="text-[9px] font-mono uppercase bg-surface-900 border border-surface-500/30 px-1.5 py-0.2 rounded font-semibold text-text-primary">
                {captureMode.badge}
              </span>
            </div>

            <p className="text-[11px] text-text-secondary leading-relaxed">
              {captureMode.description}
            </p>

            {/* Mandatory Notice for Accessible Member Mode */}
            {captureMode.notice && (
              <div className="p-2.5 rounded bg-surface-950 border border-surface-500/30 text-[10px] text-text-muted space-y-1">
                <div className="font-semibold text-amber-300 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  <span>Capture Scope Disclosure</span>
                </div>
                <p className="leading-relaxed">{captureMode.notice}</p>
              </div>
            )}
          </div>

          {/* Discovered Stats */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded bg-surface-900 border border-surface-500/20">
              <span className="text-[10px] text-text-muted block">Categories</span>
              <span className="font-bold text-text-primary font-mono">{sourceBlueprint.categories.length}</span>
            </div>
            <div className="p-2 rounded bg-surface-900 border border-surface-500/20">
              <span className="text-[10px] text-text-muted block">Channels</span>
              <span className="font-bold text-text-primary font-mono">{sourceBlueprint.channels.length}</span>
            </div>
            <div className="p-2 rounded bg-surface-900 border border-surface-500/20">
              <span className="text-[10px] text-text-muted block">Completeness</span>
              <span className="font-bold text-emerald-400 font-mono">
                {sourceBlueprint.scanQuality?.completenessScore || 100}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-surface-500/20">
            <button onClick={() => setStep(1)} className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <button onClick={() => setStep(3)} className="btn-primary py-1.5 px-4 text-xs flex items-center gap-1.5">
              <span>Next: Review Structure</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Review Architecture ── */}
      {step === 3 && sourceBlueprint && (
        <div className="glass-card p-4 space-y-3.5 animate-fade-in">
          <div>
            <h3 className="font-bold text-text-primary text-xs flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-discord-blurple" />
              <span>Step 3: Discovered Server Architecture</span>
            </h3>
            <p className="text-[11px] text-text-secondary mt-1">
              Review categories, channels, and observable ordering before configuring component selection.
            </p>
          </div>

          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {sourceBlueprint.categories.map((cat) => {
              const catChannels = sourceBlueprint.channels.filter((c) => c.parentId === cat.id);
              return (
                <div key={cat.id} className="p-2.5 rounded bg-surface-900 border border-surface-500/20 space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-xs text-text-primary">
                    <div className="flex items-center gap-1.5">
                      <Folder className="w-3.5 h-3.5 text-discord-blurple" />
                      <span>{cat.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-text-muted">{catChannels.length} channels</span>
                  </div>

                  <div className="grid grid-cols-2 gap-1 pl-4 border-l border-surface-500/20 pt-1">
                    {catChannels.map((ch) => (
                      <div key={ch.id} className="flex items-center gap-1 text-[11px] text-text-secondary truncate">
                        {getChannelIcon(ch.type)}
                        <span className="truncate">{ch.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-surface-500/20">
            <button onClick={() => setStep(2)} className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <button onClick={() => setStep(4)} className="btn-primary py-1.5 px-4 text-xs flex items-center gap-1.5">
              <span>Next: Select Components</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Smart Component Selection & Renaming ── */}
      {step === 4 && sourceBlueprint && (
        <div className="glass-card p-4 space-y-3.5 animate-fade-in">
          <div>
            <h3 className="font-bold text-text-primary text-xs flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-discord-blurple" />
              <span>Step 4: Smart Architecture Selection</span>
            </h3>
            <p className="text-[11px] text-text-secondary mt-1">
              Choose which categories and channels to reuse. You can rename items and exclude unwanted sections.
            </p>
          </div>

          {/* Mode Radio Buttons */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            {[
              { id: "everything", label: "Clone Everything", desc: "All accessible channels" },
              { id: "selected-categories", label: "Selected Categories", desc: "Choose specific categories" },
              { id: "custom-components", label: "Custom Channels", desc: "Granular channel pick" },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectionConfig((prev) => ({ ...prev, mode: m.id as any }))}
                className={`p-2 rounded-lg border text-left transition-all ${
                  selectionConfig.mode === m.id
                    ? "border-discord-blurple bg-discord-blurple/10 text-discord-blurple font-semibold"
                    : "border-surface-500/20 bg-surface-900 text-text-muted hover:border-surface-500/40"
                }`}
              >
                <div className="font-bold text-[11px]">{m.label}</div>
                <div className="text-[9px] mt-0.5 leading-tight">{m.desc}</div>
              </button>
            ))}
          </div>

          {/* Category Selection & Renaming */}
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {sourceBlueprint.categories.map((cat) => {
              const isCatSelected = selectionConfig.selectedCategoryIds.includes(cat.id);
              const catChannels = sourceBlueprint.channels.filter((c) => c.parentId === cat.id);

              return (
                <div key={cat.id} className="p-2.5 rounded bg-surface-900 border border-surface-500/20 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-text-primary flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={isCatSelected}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...selectionConfig.selectedCategoryIds, cat.id]
                            : selectionConfig.selectedCategoryIds.filter((id) => id !== cat.id);
                          setSelectionConfig((prev) => ({ ...prev, selectedCategoryIds: next }));
                        }}
                        className="rounded border-surface-500 text-discord-blurple focus:ring-0"
                      />
                      <Folder className="w-3.5 h-3.5 text-discord-blurple flex-shrink-0" />
                      <span className="truncate">{cat.name}</span>
                    </label>

                    {/* Inline Rename Category */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Edit3 className="w-3 h-3 text-text-muted" />
                      <input
                        type="text"
                        placeholder="Rename category..."
                        value={selectionConfig.categoryRenames[cat.id] || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectionConfig((prev) => ({
                            ...prev,
                            categoryRenames: { ...prev.categoryRenames, [cat.id]: val },
                          }));
                        }}
                        className="bg-surface-950 border border-surface-500/30 rounded px-1.5 py-0.5 text-[10px] text-text-primary w-28 focus:outline-none focus:border-discord-blurple"
                      />
                    </div>
                  </div>

                  {/* Individual Channels inside if custom mode */}
                  {selectionConfig.mode === "custom-components" && isCatSelected && (
                    <div className="pl-5 space-y-1 border-l border-surface-500/20 pt-1">
                      {catChannels.map((ch) => {
                        const isChSelected = selectionConfig.selectedChannelIds.includes(ch.id);
                        return (
                          <div key={ch.id} className="flex items-center justify-between text-[11px] gap-2">
                            <label className="flex items-center gap-1.5 cursor-pointer text-text-secondary flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChSelected}
                                onChange={(e) => {
                                  const next = e.target.checked
                                    ? [...selectionConfig.selectedChannelIds, ch.id]
                                    : selectionConfig.selectedChannelIds.filter((id) => id !== ch.id);
                                  setSelectionConfig((prev) => ({ ...prev, selectedChannelIds: next }));
                                }}
                                className="rounded border-surface-500 text-discord-blurple"
                              />
                              {getChannelIcon(ch.type)}
                              <span className="truncate">{ch.name}</span>
                            </label>

                            <input
                              type="text"
                              placeholder="Rename..."
                              value={selectionConfig.channelRenames[ch.id] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSelectionConfig((prev) => ({
                                  ...prev,
                                  channelRenames: { ...prev.channelRenames, [ch.id]: val },
                                }));
                              }}
                              className="bg-surface-950 border border-surface-500/30 rounded px-1.5 py-0.5 text-[9px] text-text-primary w-24 focus:outline-none focus:border-discord-blurple"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Options Toggles */}
          <div className="p-2.5 rounded bg-surface-900 border border-surface-500/20 space-y-2 text-xs">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-text-secondary">Include Visible Roles & Hierarchy</span>
              <input
                type="checkbox"
                checked={selectionConfig.includeRoles}
                onChange={(e) => setSelectionConfig((prev) => ({ ...prev, includeRoles: e.target.checked }))}
                className="rounded border-surface-500 text-discord-blurple"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-text-secondary">Include Channel Topics & Descriptions</span>
              <input
                type="checkbox"
                checked={selectionConfig.includeDescriptions}
                onChange={(e) => setSelectionConfig((prev) => ({ ...prev, includeDescriptions: e.target.checked }))}
                className="rounded border-surface-500 text-discord-blurple"
              />
            </label>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-surface-500/20">
            <button onClick={() => setStep(3)} className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <button onClick={() => setStep(5)} className="btn-primary py-1.5 px-4 text-xs flex items-center gap-1.5">
              <span>Next: AI Optimization</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 5: AI Architecture Assistant & Adaptation ── */}
      {step === 5 && sourceBlueprint && (
        <div className="glass-card p-4 space-y-3.5 animate-fade-in">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-text-primary text-xs flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Step 5: AI Architecture Customization (Optional)</span>
              </h3>
              <p className="text-[11px] text-text-secondary mt-1">
                Ask your preferred AI model to tailor this architecture to your community's niche or improve channel naming.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAISettingsOpen(true)}
              className="text-[10px] text-discord-blurple hover:underline flex-shrink-0"
            >
              {activeAiConfig?.apiKey ? `Model: ${activeAiConfig.modelId || activeAiConfig.providerId}` : "Configure AI Key"}
            </button>
          </div>

          {/* Quick Prompt Chips */}
          <div className="flex flex-wrap gap-1.5 text-[10px]">
            {[
              "Adapt this architecture for a Gaming & Esports community",
              "Simplify this into a lightweight layout for a small team",
              "Improve channel names with standard kebab-case formatting",
              "Add an onboarding, rules, and announcements section",
            ].map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setAiPrompt(chip)}
                className="px-2 py-1 rounded bg-surface-900 border border-surface-500/20 text-text-secondary hover:text-white hover:border-discord-blurple transition-all"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Prompt Input */}
          <div className="space-y-1.5">
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g., I love this developer community structure, but want to add a support ticket category and remove voice channels..."
              rows={3}
              className="w-full bg-surface-900 border border-surface-500/30 rounded-lg p-2.5 text-xs text-text-primary focus:outline-none focus:border-discord-blurple resize-none"
            />

            <button
              onClick={handleRunAiAssistant}
              disabled={isAiLoading || !aiPrompt.trim()}
              className="btn-secondary w-full py-1.5 text-xs flex items-center justify-center gap-1.5 text-discord-blurple hover:text-white"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>{isAiLoading ? "Consulting AI Model..." : "Ask AI to Recommend Adjustments"}</span>
            </button>
          </div>

          {/* AI Recommendation Box */}
          {aiRecommendation && (
            <div className="p-3 rounded-lg bg-surface-900 border border-amber-500/30 space-y-1.5 max-h-48 overflow-y-auto text-xs">
              <div className="font-bold text-amber-300 flex items-center gap-1 text-[11px]">
                <Sparkles className="w-3 h-3" />
                <span>AI Architecture Proposal</span>
              </div>
              <div className="text-[11px] text-text-secondary whitespace-pre-wrap leading-relaxed">
                {aiRecommendation}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-surface-500/20">
            <button onClick={() => setStep(4)} className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <button onClick={() => setStep(6)} className="btn-primary py-1.5 px-4 text-xs flex items-center gap-1.5">
              <span>Next: Select Destination</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 6: Destination Server & Merge Strategy ── */}
      {step === 6 && (
        <div className="glass-card p-4 space-y-3.5 animate-fade-in">
          <div>
            <h3 className="font-bold text-text-primary text-xs flex items-center gap-1.5">
              <Server className="w-4 h-4 text-emerald-400" />
              <span>Step 6: Destination & Merge Strategy</span>
            </h3>
            <p className="text-[11px] text-text-secondary mt-1">
              Choose whether you are building a brand new server or merging these components into an existing server.
            </p>
          </div>

          {/* Strategy Selection */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => {
                setDestinationId("new");
                setWorkflow("full-clone");
              }}
              className={`p-3 rounded-xl border text-left transition-all ${
                workflow === "full-clone"
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-300 font-semibold"
                  : "border-surface-500/20 bg-surface-900 text-text-muted hover:border-surface-500/40"
              }`}
            >
              <div className="font-bold text-xs">A. Full Server Clone</div>
              <div className="text-[10px] mt-1 leading-snug">
                Recreate the architecture in a brand new Discord server from scratch.
              </div>
            </button>

            <button
              onClick={() => {
                setDestinationId("live");
                setWorkflow("selective-merge");
              }}
              className={`p-3 rounded-xl border text-left transition-all ${
                workflow === "selective-merge"
                  ? "border-discord-blurple bg-discord-blurple/10 text-discord-blurple font-semibold"
                  : "border-surface-500/20 bg-surface-900 text-text-muted hover:border-surface-500/40"
              }`}
            >
              <div className="font-bold text-xs">B. Selective Merge</div>
              <div className="text-[10px] mt-1 leading-snug">
                Merge selected categories and channels into an existing server without deleting anything.
              </div>
            </button>
          </div>

          {/* Destination Server Selector if Selective Merge */}
          {workflow === "selective-merge" && (
            <div className="space-y-1.5 pt-1 text-xs">
              <label className="font-semibold text-text-primary block">Select Target Server to Merge Into</label>
              <select
                value={destinationId}
                onChange={(e) => setDestinationId(e.target.value)}
                className="w-full bg-surface-900 border border-surface-500/30 rounded-lg p-2 text-xs text-text-primary focus:outline-none focus:border-discord-blurple"
              >
                {liveBlueprint ? (
                  <option value="live">Active Server: {liveBlueprint.server.name}</option>
                ) : null}

                {savedServers.map((s) => (
                  <option key={s.id} value={`saved:${s.id}`}>
                    Saved: {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-surface-500/20">
            <button onClick={() => setStep(5)} className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <button onClick={() => setStep(7)} className="btn-primary py-1.5 px-4 text-xs flex items-center gap-1.5">
              <span>Next: Review Plan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 7: Implementation Review & Plan ── */}
      {step === 7 && executionPlan && (
        <div className="glass-card p-4 space-y-3.5 animate-fade-in">
          <div>
            <h3 className="font-bold text-text-primary text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-discord-blurple" />
              <span>Step 7: Implementation Plan Review</span>
            </h3>
            <p className="text-[11px] text-text-secondary mt-1">
              Review every operation that will be executed in the destination server.
            </p>
          </div>

          {/* Plan Counters */}
          <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
            <div className="p-2 rounded bg-surface-900 border border-surface-500/20">
              <span className="text-[9px] text-text-muted block">Categories</span>
              <span className="font-bold text-text-primary font-mono">{executionPlan.totalCategoriesToCreate}</span>
            </div>
            <div className="p-2 rounded bg-surface-900 border border-surface-500/20">
              <span className="text-[9px] text-text-muted block">Channels</span>
              <span className="font-bold text-text-primary font-mono">{executionPlan.totalChannelsToCreate}</span>
            </div>
            <div className="p-2 rounded bg-surface-900 border border-surface-500/20">
              <span className="text-[9px] text-text-muted block">Roles</span>
              <span className="font-bold text-text-primary font-mono">{executionPlan.totalRolesToCreate}</span>
            </div>
            <div className="p-2 rounded bg-surface-900 border border-surface-500/20">
              <span className="text-[9px] text-text-muted block">Duplicates Skipped</span>
              <span className="font-bold text-amber-300 font-mono">{executionPlan.skippedDuplicatesCount}</span>
            </div>
          </div>

          {/* Operations List */}
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1 text-xs">
            {executionPlan.operations.map((op, i) => (
              <div
                key={op.id}
                className={`p-2 rounded border text-[11px] space-y-0.5 ${
                  op.action === "CREATE_CATEGORY" || op.action === "CREATE_CHANNEL"
                    ? "bg-surface-900/90 border-surface-500/20"
                    : op.action === "SKIP_EXISTING"
                    ? "bg-amber-500/5 border-amber-500/20 opacity-80"
                    : "bg-surface-900 border-surface-500/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-text-muted text-[10px]">#{i + 1}</span>
                    <span
                      className={`text-[9px] font-mono font-bold uppercase px-1 rounded ${
                        op.action === "CREATE_CATEGORY" || op.action === "CREATE_CHANNEL"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {op.action.replace(/_/g, " ")}
                    </span>
                    <span className="font-bold text-text-primary">{op.name}</span>
                  </div>
                  {op.categoryName && (
                    <span className="text-[9px] text-text-muted font-mono">in {op.categoryName}</span>
                  )}
                </div>
                <p className="text-[10px] text-text-secondary pl-4">{op.details}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-surface-500/20">
            <button onClick={() => setStep(6)} className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <button onClick={() => setStep(8)} className="btn-primary py-1.5 px-4 text-xs flex items-center gap-1.5">
              <span>Next: Export & Recreate</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 8: Export, Scripts & Recreation ── */}
      {step === 8 && executionPlan && (
        <div className="glass-card p-4 space-y-3.5 animate-fade-in">
          <div>
            <h3 className="font-bold text-text-primary text-xs flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Step 8: Export & Recreate Architecture</span>
            </h3>
            <p className="text-[11px] text-text-secondary mt-1">
              Generate production-grade automation scripts with dry-run support, or download the step-by-step manual checklist.
            </p>
          </div>

          {/* Format Radio Tabs */}
          <div className="grid grid-cols-4 gap-1.5 text-xs">
            {[
              { id: "discordjs", label: "discord.js", icon: <Terminal className="w-3 h-3" /> },
              { id: "discordpy", label: "discord.py", icon: <Terminal className="w-3 h-3" /> },
              { id: "template", label: "JSON Template", icon: <Code2 className="w-3 h-3" /> },
              { id: "checklist", label: "Manual Checklist", icon: <FileText className="w-3 h-3" /> },
            ].map((fmt) => (
              <button
                key={fmt.id}
                onClick={() => setExportFormat(fmt.id as any)}
                className={`py-1.5 px-2 rounded-lg border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                  exportFormat === fmt.id
                    ? "border-discord-blurple bg-discord-blurple/10 text-discord-blurple font-bold"
                    : "border-surface-500/20 bg-surface-900 text-text-muted hover:border-surface-500/40"
                }`}
              >
                {fmt.icon}
                <span className="text-[10px]">{fmt.label}</span>
              </button>
            ))}
          </div>

          {/* Dry Run Toggle for scripts */}
          {(exportFormat === "discordjs" || exportFormat === "discordpy") && (
            <div className="p-2.5 rounded bg-surface-900 border border-surface-500/20 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="font-semibold text-text-primary block">Dry-Run Simulation Mode</span>
                <span className="text-[10px] text-text-muted">
                  Tests permissions and logs planned creations without altering your Discord server.
                </span>
              </div>
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="rounded border-surface-500 text-discord-blurple focus:ring-0"
              />
            </div>
          )}

          {/* Security Best Practices Reminder */}
          <div className="p-2.5 rounded-lg bg-surface-950 border border-surface-500/20 text-[10px] text-text-muted space-y-1">
            <div className="font-semibold text-text-secondary flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-400" />
              <span>Zero Token Leak Guarantee</span>
            </div>
            <p className="leading-relaxed">
              Scripts load bot tokens exclusively via <code className="text-text-primary">process.env.DISCORD_BOT_TOKEN</code>. Never paste or commit your real Discord bot token.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleCopyOutput}
              className="btn-secondary flex-1 py-2 text-xs flex items-center justify-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied to Clipboard!" : "Copy Code / Text"}</span>
            </button>

            <button
              onClick={handleDownloadOutput}
              className="btn-primary flex-1 py-2 text-xs flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-surface-500/20">
            <button onClick={() => setStep(7)} className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Review
            </button>

            <button
              onClick={() => {
                setStep(1);
                setActiveTab("overview");
              }}
              className="btn-secondary py-1.5 px-3 text-xs"
            >
              Finish & Return to Overview
            </button>
          </div>
        </div>
      )}

      {/* AI Settings Modal */}
      <AISettingsModal
        isOpen={isAISettingsOpen}
        onClose={() => setIsAISettingsOpen(false)}
        onSaved={async () => {
          const cfg = await AIService.getActiveConfig();
          setActiveAiConfig(cfg);
        }}
      />
    </div>
  );
}
