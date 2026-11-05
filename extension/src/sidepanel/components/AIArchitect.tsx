/* ─────────────────────────────────────────────
 *  AI Server Architect Workspace
 *
 *  Comprehensive AI assistant interface:
 *  - Grounded Chat Assistant
 *  - What-If Architecture Planning Mode & Visual Diff
 *  - Actionable Recommendation Management
 *  - Multi-Audience Documentation Generator
 * ───────────────────────────────────────────── */

import { useState, useEffect, useRef } from "react";
import { useServerStore } from "@/store/serverStore";
import {
  type AIProviderConfig,
  type AIRecommendation,
  type ArchitectureProposal,
  type ArchitectureDiff,
  type AIMessage,
  type DocFormat,
  type DocAudience,
  buildServerAIContext,
  generateServerDocumentation,
  runSecurityAudit,
} from "@mapmyserver/shared";
import { AIService } from "../../ai/services/AIService";
import { AIRecommendationEngine } from "../../ai/services/AIRecommendationEngine";
import { AIArchitecturePlanner } from "../../ai/services/AIArchitecturePlanner";
import AISettingsModal from "./AISettingsModal";
import {
  Sparkles,
  Send,
  Settings,
  Plus,
  Trash2,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  Layers,
  FileText,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  FolderPlus,
  MessageSquare,
  Compass,
} from "lucide-react";

type WorkspaceMode = "chat" | "planner" | "recommendations" | "docs";

const QUICK_PROMPTS = [
  "How can I improve my server architecture?",
  "Which channels are redundant or should be merged?",
  "Audit moderator permissions and role hierarchy",
  "Suggest an ideal onboarding category & welcome flow",
  "How should I organize channels for a growing community?",
];

const ARCHETYPES = [
  "Developer & Tech Community",
  "Open Source Project",
  "Gaming Community & Guild",
  "Creator / Streamer Community",
  "Customer Support & Product",
  "Startup & Private Team",
  "Education & Study Group",
];

export default function AIArchitect() {
  const { blueprint } = useServerStore();

  const [mode, setMode] = useState<WorkspaceMode>("chat");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeConfig, setActiveConfig] = useState<AIProviderConfig | null>(null);

  // Chat State
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Recommendations State
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);

  // Architecture Planner State
  const [selectedArchetype, setSelectedArchetype] = useState(ARCHETYPES[0]);
  const [customArchetype, setCustomArchetype] = useState("");
  const [activeProposal, setActiveProposal] = useState<ArchitectureProposal | null>(null);
  const [proposalDiff, setProposalDiff] = useState<ArchitectureDiff | null>(null);
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);

  // Documentation Generator State
  const [docFormat, setDocFormat] = useState<DocFormat>("markdown");
  const [docAudience, setDocAudience] = useState<DocAudience>("developer");
  const [generatedDoc, setGeneratedDoc] = useState("");
  const [docCopied, setDocCopied] = useState(false);

  // Refresh active provider configuration
  const refreshConfig = async () => {
    const config = await AIService.getActiveConfig();
    setActiveConfig(config);
  };

  useEffect(() => {
    refreshConfig();
  }, []);

  // Load existing recommendations & proposals when blueprint changes
  useEffect(() => {
    if (!blueprint) return;
    AIRecommendationEngine.loadRecommendations(blueprint.server.id).then(setRecommendations);
    AIArchitecturePlanner.loadProposals(blueprint.server.id).then((props) => {
      if (props.length > 0) {
        setActiveProposal(props[0]);
        setProposalDiff(AIArchitecturePlanner.getDiff(blueprint, props[0]));
      }
    });
  }, [blueprint]);

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Update generated documentation preview
  useEffect(() => {
    if (!blueprint) return;
    const auditReport = runSecurityAudit(blueprint);
    const doc = generateServerDocumentation(blueprint, auditReport, docFormat, docAudience);
    setGeneratedDoc(doc);
  }, [blueprint, docFormat, docAudience]);

  // Chat Submission Handler
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputPrompt;
    if (!text.trim() || isLoading) return;

    if (!activeConfig || !activeConfig.apiKey) {
      setIsSettingsOpen(true);
      return;
    }

    if (!blueprint) return;

    const userMessage: AIMessage = {
      role: "user",
      content: text.trim(),
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputPrompt("");
    setIsLoading(true);
    setChatError(null);

    try {
      // Build server context and security audit
      const audit = runSecurityAudit(blueprint);
      const systemContext = buildServerAIContext(blueprint, audit);

      const conversationPayload: AIMessage[] = [
        { role: "system", content: systemContext },
        ...newMessages,
      ];

      const response = await AIService.generate(conversationPayload, {
        temperature: 0.7,
      });

      const assistantMessage: AIMessage = {
        role: "assistant",
        content: response.text,
        timestamp: Date.now(),
      };

      setMessages([...newMessages, assistantMessage]);
    } catch (err: unknown) {
      setChatError((err as Error).message || "AI generation failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = async (content: string, index: number) => {
    await navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Generate AI Recommendations
  const handleGenerateRecommendations = async () => {
    if (!blueprint) return;
    if (!activeConfig || !activeConfig.apiKey) {
      setIsSettingsOpen(true);
      return;
    }

    setIsLoadingRecs(true);
    try {
      const audit = runSecurityAudit(blueprint);
      const recs = await AIRecommendationEngine.generateRecommendations(blueprint, audit);
      setRecommendations(recs);
    } catch (err: unknown) {
      alert(`Failed to generate recommendations: ${(err as Error).message}`);
    } finally {
      setIsLoadingRecs(false);
    }
  };

  const handleUpdateRecState = async (recId: string, state: AIRecommendation["state"]) => {
    if (!blueprint) return;
    const updated = await AIRecommendationEngine.updateRecommendationState(blueprint.server.id, recId, state);
    setRecommendations(updated);
  };

  // Generate Architecture Proposal (What-If Sandbox)
  const handleGenerateProposal = async () => {
    if (!blueprint) return;
    if (!activeConfig || !activeConfig.apiKey) {
      setIsSettingsOpen(true);
      return;
    }

    setIsGeneratingProposal(true);
    try {
      const target = customArchetype.trim() || selectedArchetype;
      const proposal = await AIArchitecturePlanner.generateProposal(blueprint, target);
      setActiveProposal(proposal);
      setProposalDiff(AIArchitecturePlanner.getDiff(blueprint, proposal));
    } catch (err: unknown) {
      alert(`Proposal generation failed: ${(err as Error).message}`);
    } finally {
      setIsGeneratingProposal(false);
    }
  };

  if (!blueprint) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-text-muted">
        <Sparkles className="w-10 h-10 mb-3 text-discord-blurple/60" />
        <p className="text-sm">No server blueprint loaded.</p>
        <p className="text-xs mt-1">Scan a Discord server to unlock the AI Server Architect.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-fade-in pb-4">
      {/* ── Top Workspace Header ── */}
      <div className="glass-card p-3 mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-discord-blurple/20 flex items-center justify-center text-discord-blurple">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs font-bold text-text-primary">AI Server Architect</h2>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-900 border border-surface-500/20 text-text-secondary">
                {blueprint.server.name}
              </span>
            </div>
            <div className="text-[10px] text-text-muted flex items-center gap-1.5 mt-0.5">
              <span className="capitalize">{activeConfig?.providerId || "No Provider"}</span>
              <span>•</span>
              <span className="font-mono">{activeConfig?.modelId || "BYOK Required"}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsSettingsOpen(true)}
          className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1 text-text-primary hover:text-white"
          title="Configure AI Provider & API Key"
        >
          <Settings className="w-3.5 h-3.5 text-discord-blurple" />
          <span className="text-[11px]">Settings</span>
        </button>
      </div>

      {/* ── Mode Navigation Tabs ── */}
      <div className="flex items-center gap-1 bg-surface-900/80 p-1 rounded-lg border border-surface-500/20 mb-2.5 text-xs">
        <button
          onClick={() => setMode("chat")}
          className={`flex-1 py-1 rounded font-medium transition-colors flex items-center justify-center gap-1 ${
            mode === "chat"
              ? "bg-discord-blurple text-white shadow-sm"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          <MessageSquare className="w-3 h-3" />
          <span>Advisor</span>
        </button>

        <button
          onClick={() => setMode("planner")}
          className={`flex-1 py-1 rounded font-medium transition-colors flex items-center justify-center gap-1 ${
            mode === "planner"
              ? "bg-discord-blurple text-white shadow-sm"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          <Layers className="w-3 h-3" />
          <span>Planning Mode</span>
        </button>

        <button
          onClick={() => setMode("recommendations")}
          className={`flex-1 py-1 rounded font-medium transition-colors flex items-center justify-center gap-1 ${
            mode === "recommendations"
              ? "bg-discord-blurple text-white shadow-sm"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          <Lightbulb className="w-3 h-3" />
          <span>Recommendations ({recommendations.length})</span>
        </button>

        <button
          onClick={() => setMode("docs")}
          className={`flex-1 py-1 rounded font-medium transition-colors flex items-center justify-center gap-1 ${
            mode === "docs"
              ? "bg-discord-blurple text-white shadow-sm"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          <FileText className="w-3 h-3" />
          <span>Docs</span>
        </button>
      </div>

      {/* ── Mode 1: Chat Assistant ── */}
      {mode === "chat" && (
        <div className="flex-1 flex flex-col min-h-0 glass-card p-3 space-y-2">
          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
            {messages.length === 0 ? (
              <div className="text-center py-6 space-y-3">
                <Compass className="w-8 h-8 text-discord-blurple/60 mx-auto" />
                <div className="text-xs font-semibold text-text-primary">
                  Discord Server Architecture Assistant
                </div>
                <p className="text-[11px] text-text-muted max-w-xs mx-auto leading-relaxed">
                  I have analyzed your server blueprint: {blueprint.categories.length} categories, {blueprint.channels.length} channels, and {blueprint.roles.length} roles. Ask anything about organization, permissions, or scaling.
                </p>

                {/* Quick Prompts */}
                <div className="flex flex-col gap-1.5 pt-2 max-w-xs mx-auto text-left">
                  <span className="text-[10px] text-text-muted uppercase font-semibold">
                    Suggested Questions:
                  </span>
                  {QUICK_PROMPTS.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(p)}
                      className="p-2 rounded bg-surface-900/80 hover:bg-surface-700/80 border border-surface-500/20 text-[11px] text-text-secondary hover:text-text-primary transition-colors text-left"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${
                    m.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[90%] rounded-xl p-3 leading-relaxed ${
                      m.role === "user"
                        ? "bg-discord-blurple text-white"
                        : "bg-surface-900 border border-surface-500/30 text-text-primary whitespace-pre-wrap"
                    }`}
                  >
                    {m.content}
                  </div>
                  {m.role === "assistant" && (
                    <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-text-muted">
                      <button
                        onClick={() => handleCopyMessage(m.content, idx)}
                        className="hover:text-text-primary flex items-center gap-1"
                      >
                        {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedIndex === idx ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex items-center gap-2 text-text-muted text-[11px] p-2 bg-surface-900/60 rounded-lg">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-discord-blurple" />
                <span>Architect is analyzing server blueprint...</span>
              </div>
            )}

            {chatError && (
              <div className="p-2 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{chatError}</span>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input */}
          <div className="pt-2 border-t border-surface-500/20 flex items-center gap-1.5">
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
              placeholder={activeConfig?.apiKey ? "Ask about architecture, roles, channels..." : "Configure API key in settings to chat"}
              disabled={isLoading}
              className="flex-1 bg-surface-900 border border-surface-500/30 rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-discord-blurple"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputPrompt.trim()}
              className="btn-primary p-2 flex items-center justify-center disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Mode 2: Architecture Planning Mode (What-If Sandbox) ── */}
      {mode === "planner" && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          <div className="glass-card p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-text-primary text-xs">Architecture Planning Sandbox</h3>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  Propose, preview, and diff an optimized server layout without altering your live Discord server.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-text-muted">Target Community Purpose</label>
              <select
                value={selectedArchetype}
                onChange={(e) => setSelectedArchetype(e.target.value)}
                className="w-full bg-surface-900 border border-surface-500/30 rounded-lg p-2 text-xs text-text-primary focus:outline-none focus:border-discord-blurple"
              >
                {ARCHETYPES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={customArchetype}
                onChange={(e) => setCustomArchetype(e.target.value)}
                placeholder="Or describe custom goals (e.g. AI Hackathon with 5 teams)"
                className="w-full bg-surface-900 border border-surface-500/30 rounded-lg p-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-discord-blurple"
              />
            </div>

            <button
              onClick={handleGenerateProposal}
              disabled={isGeneratingProposal}
              className="btn-primary w-full py-2 flex items-center justify-center gap-1.5"
            >
              {isGeneratingProposal ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing Architecture Proposal...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Generate Proposed Architecture</span>
                </>
              )}
            </button>
          </div>

          {/* Diff Results */}
          {activeProposal && proposalDiff && (
            <div className="glass-card p-3 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between border-b border-surface-500/20 pb-2">
                <div>
                  <h4 className="font-bold text-text-primary text-xs">{activeProposal.title}</h4>
                  <p className="text-[11px] text-text-secondary mt-0.5">{activeProposal.description}</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-discord-blurple/20 text-discord-blurple border border-discord-blurple/30 font-semibold">
                  {proposalDiff.totalChanges} changes
                </span>
              </div>

              {/* Added Categories & Channels */}
              {proposalDiff.addedCategories.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>Proposed New Categories ({proposalDiff.addedCategories.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {proposalDiff.addedCategories.map((cat) => (
                      <span
                        key={cat.id}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                      >
                        + {cat.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {proposalDiff.addedChannels.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Proposed New Channels ({proposalDiff.addedChannels.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {proposalDiff.addedChannels.map((ch) => (
                      <span
                        key={ch.id}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                        title={ch.reason}
                      >
                        + #{ch.name} ({ch.type})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Modified Channels */}
              {proposalDiff.modifiedChannels.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Proposed Channel Reorganizations ({proposalDiff.modifiedChannels.length})</span>
                  </div>
                  <div className="space-y-1">
                    {proposalDiff.modifiedChannels.map((mod, i) => (
                      <div
                        key={i}
                        className="p-1.5 rounded bg-surface-900 border border-surface-500/20 text-[10px] space-y-0.5"
                      >
                        <span className="font-bold text-text-primary font-mono">#{mod.current.name}</span>
                        {mod.differences.map((diff, j) => (
                          <div key={j} className="text-amber-300 font-mono">
                            • {diff}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Removed Channels */}
              {proposalDiff.removedChannels.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="text-[11px] font-semibold text-rose-400 flex items-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Redundant Channels Recommended for Merging/Removal ({proposalDiff.removedChannels.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {proposalDiff.removedChannels.map((ch) => (
                      <span
                        key={ch.id}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20"
                      >
                        - #{ch.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Mode 3: Recommendations Tracker ── */}
      {mode === "recommendations" && (
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
          <div className="glass-card p-3 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-text-primary text-xs">AI Architecture Recommendations</h3>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Track, accept, reject, or complete concrete structural recommendations.
              </p>
            </div>
            <button
              onClick={handleGenerateRecommendations}
              disabled={isLoadingRecs}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 flex-shrink-0"
            >
              {isLoadingRecs ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{isLoadingRecs ? "Analyzing..." : "Analyze & Recommend"}</span>
            </button>
          </div>

          {recommendations.length === 0 ? (
            <div className="glass-card p-6 text-center text-text-muted space-y-2">
              <Lightbulb className="w-8 h-8 text-amber-400 mx-auto" />
              <div className="text-xs font-semibold text-text-primary">No Recommendations Generated Yet</div>
              <p className="text-[11px] max-w-xs mx-auto">
                Click "Analyze & Recommend" above to examine channel clutter, onboarding flow, and permission safety.
              </p>
            </div>
          ) : (
            recommendations.map((rec) => (
              <div
                key={rec.id}
                className={`glass-card p-3 border transition-colors space-y-2 ${
                  rec.state === "accepted"
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : rec.state === "rejected"
                    ? "border-surface-500/20 opacity-60"
                    : rec.state === "completed"
                    ? "border-sky-500/40 bg-sky-500/5"
                    : "border-surface-500/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                        rec.priority === "critical"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                          : rec.priority === "high"
                          ? "bg-orange-500/20 text-orange-300 border border-orange-500/40"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      }`}
                    >
                      {rec.priority}
                    </span>
                    <span className="text-[10px] font-mono uppercase bg-surface-900 px-1.5 py-0.2 rounded text-text-muted border border-surface-500/20">
                      {rec.category}
                    </span>
                    <span
                      className={`text-[10px] font-semibold capitalize px-1.5 py-0.2 rounded ${
                        rec.state === "accepted"
                          ? "text-emerald-400 bg-emerald-500/20"
                          : rec.state === "completed"
                          ? "text-sky-400 bg-sky-500/20"
                          : rec.state === "rejected"
                          ? "text-rose-400 bg-rose-500/20"
                          : "text-text-muted bg-surface-900"
                      }`}
                    >
                      {rec.state}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleUpdateRecState(rec.id, "accepted")}
                      className="p-1 rounded hover:bg-emerald-500/20 text-emerald-400"
                      title="Accept recommendation"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleUpdateRecState(rec.id, "completed")}
                      className="p-1 rounded hover:bg-sky-500/20 text-sky-400"
                      title="Mark implemented"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleUpdateRecState(rec.id, "rejected")}
                      className="p-1 rounded hover:bg-rose-500/20 text-rose-400"
                      title="Reject recommendation"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h4 className="font-bold text-text-primary text-xs leading-snug">{rec.title}</h4>
                <p className="text-[11px] text-text-secondary leading-relaxed">{rec.description}</p>

                <div className="p-2 rounded bg-surface-900 border border-surface-500/20 text-[10px] space-y-1">
                  <div className="text-text-primary font-semibold">Implementation:</div>
                  <div className="text-text-secondary leading-relaxed">{rec.suggestedImplementation}</div>
                  <div className="text-emerald-400 pt-0.5">Benefit: {rec.expectedBenefit}</div>
                </div>

                <div className="pt-1 flex items-center justify-end">
                  <button
                    onClick={() => {
                      setMode("chat");
                      handleSendMessage(
                        `Generate a comprehensive, step-by-step implementation plan for recommendation: "${rec.title}". Include problem diagnosis, current vs proposed configuration, required permissions, risk factors, rollout steps, and an automation script snippet.`
                      );
                    }}
                    className="text-[10px] text-discord-blurple hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Turn Into Implementation Plan</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Mode 4: Documentation Generator ── */}
      {mode === "docs" && (
        <div className="flex-1 flex flex-col min-h-0 glass-card p-3 space-y-2.5">
          <div className="flex items-center justify-between border-b border-surface-500/20 pb-2">
            <div>
              <h3 className="font-bold text-text-primary text-xs">Architecture Documentation</h3>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Generate clean, publication-ready server documentation for your team.
              </p>
            </div>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(generatedDoc);
                setDocCopied(true);
                setTimeout(() => setDocCopied(false), 2000);
              }}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 flex-shrink-0"
            >
              {docCopied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{docCopied ? "Copied!" : "Copy Docs"}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-1 bg-surface-900 border border-surface-500/20 rounded px-2 py-1 text-[11px]">
              <span className="text-text-muted">Format:</span>
              <select
                value={docFormat}
                onChange={(e) => setDocFormat(e.target.value as DocFormat)}
                className="bg-transparent text-text-primary uppercase focus:outline-none w-full"
              >
                <option value="markdown" className="bg-surface-800">Markdown (.md)</option>
                <option value="html" className="bg-surface-800">HTML (.html)</option>
                <option value="json" className="bg-surface-800">JSON (.json)</option>
                <option value="csv" className="bg-surface-800">CSV (.csv)</option>
              </select>
            </div>

            <div className="flex-1 flex items-center gap-1 bg-surface-900 border border-surface-500/20 rounded px-2 py-1 text-[11px]">
              <span className="text-text-muted">Audience:</span>
              <select
                value={docAudience}
                onChange={(e) => setDocAudience(e.target.value as DocAudience)}
                className="bg-transparent text-text-primary capitalize focus:outline-none w-full"
              >
                <option value="developer" className="bg-surface-800">Developer (Technical)</option>
                <option value="moderator" className="bg-surface-800">Moderator (Governance)</option>
                <option value="member" className="bg-surface-800">Community Member (Directory)</option>
              </select>
            </div>
          </div>

          {/* Code/Text Preview */}
          <div className="flex-1 overflow-y-auto bg-surface-900 p-2.5 rounded-lg border border-surface-500/30 font-mono text-[10px] text-text-secondary leading-relaxed whitespace-pre-wrap select-text">
            {generatedDoc}
          </div>
        </div>
      )}

      {/* AISettingsModal */}
      <AISettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={refreshConfig}
      />
    </div>
  );
}
