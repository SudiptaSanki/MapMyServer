/* ─────────────────────────────────────────────
 *  AI Provider Settings & BYOK Credential Manager
 * ───────────────────────────────────────────── */

import { useState, useEffect } from "react";
import {
  type AIProviderId,
  type AIProviderConfig,
  type ProviderConnectionState,
  DEFAULT_MODELS_BY_PROVIDER,
} from "@mapmyserver/shared";
import { AIService } from "../../ai/services/AIService";
import {
  Key,
  Shield,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  Cpu,
  X,
} from "lucide-react";

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function AISettingsModal({ isOpen, onClose, onSaved }: AISettingsModalProps) {
  const [selectedProvider, setSelectedProvider] = useState<AIProviderId>("openai");
  const [apiKey, setApiKey] = useState("");
  const [modelId, setModelId] = useState("gpt-4o");
  const [customEndpoint, setCustomEndpoint] = useState("");
  const [showKey, setShowKey] = useState(false);

  const [connectionState, setConnectionState] = useState<ProviderConnectionState>({
    status: "not-configured",
  });
  const [isTesting, setIsTesting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load existing config whenever selectedProvider changes
  useEffect(() => {
    async function loadCurrent() {
      const activeId = await AIService.getActiveProviderId();
      setSelectedProvider(activeId);
      await loadProviderConfig(activeId);
    }
    if (isOpen) {
      loadCurrent();
    }
  }, [isOpen]);

  const loadProviderConfig = async (providerId: AIProviderId) => {
    const config = await AIService.loadConfig(providerId);
    if (config) {
      setApiKey(config.apiKey || "");
      setModelId(config.modelId || DEFAULT_MODELS_BY_PROVIDER[providerId][0]?.id || "");
      setCustomEndpoint(config.customEndpoint || "");
      setConnectionState({ status: "not-configured" });
    } else {
      setApiKey("");
      setModelId(DEFAULT_MODELS_BY_PROVIDER[providerId][0]?.id || "");
      setCustomEndpoint("");
      setConnectionState({ status: "not-configured" });
    }
  };

  const handleProviderChange = async (newProvider: AIProviderId) => {
    setSelectedProvider(newProvider);
    await loadProviderConfig(newProvider);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setConnectionState({ status: "testing" });

    const draftConfig: AIProviderConfig = {
      providerId: selectedProvider,
      apiKey: apiKey.trim(),
      modelId: modelId.trim(),
      customEndpoint: customEndpoint.trim() || undefined,
    };

    try {
      const result = await AIService.testConnection(selectedProvider, draftConfig);
      setConnectionState(result);
    } catch (err: unknown) {
      setConnectionState({
        status: "unavailable",
        errorMessage: (err as Error).message || "Connection failed.",
        lastChecked: Date.now(),
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    const config: AIProviderConfig = {
      providerId: selectedProvider,
      apiKey: apiKey.trim(),
      modelId: modelId.trim(),
      customEndpoint: customEndpoint.trim() || undefined,
    };

    await AIService.saveConfig(config);
    await AIService.setActiveProviderId(selectedProvider);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
    onSaved?.();
  };

  const handleRemove = async () => {
    if (confirm(`Remove configuration and API key for ${selectedProvider.toUpperCase()}?`)) {
      await AIService.removeConfig(selectedProvider);
      setApiKey("");
      setConnectionState({ status: "not-configured" });
      onSaved?.();
    }
  };

  if (!isOpen) return null;

  const currentModels = DEFAULT_MODELS_BY_PROVIDER[selectedProvider] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-800 border border-surface-500/40 rounded-xl w-full max-w-md shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-500/30">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-discord-blurple" />
            <h2 className="text-sm font-bold text-text-primary">AI Provider Settings (BYOK)</h2>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto text-xs">
          {/* Security Disclaimer */}
          <div className="p-2.5 rounded-lg bg-surface-900 border border-surface-500/30 space-y-1.5 text-text-secondary">
            <div className="flex items-center gap-1.5 text-text-primary font-semibold text-[11px]">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Bring Your Own Key (BYOK) & Privacy</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              API keys are stored exclusively in your browser’s local storage (<code>chrome.storage.local</code>). They are never synced, never sent to MapMyServer servers, and requests are dispatched directly to the provider endpoint.
            </p>
          </div>

          {/* Provider Selection */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-text-primary uppercase tracking-wider">
              AI Provider
            </label>
            <select
              value={selectedProvider}
              onChange={(e) => handleProviderChange(e.target.value as AIProviderId)}
              className="w-full bg-surface-900 border border-surface-500/30 rounded-lg p-2 text-text-primary focus:outline-none focus:border-discord-blurple text-xs"
            >
              <option value="openai">OpenAI (GPT-4o, o3-mini)</option>
              <option value="anthropic">Anthropic Claude (Claude 3.7 / 3.5 Sonnet)</option>
              <option value="gemini">Google Gemini (Gemini 2.0 Flash, 1.5 Pro)</option>
              <option value="openrouter">OpenRouter (Aggregator - 100+ Models)</option>
              <option value="custom">Custom / Local (Ollama, LM Studio, vLLM)</option>
            </select>
          </div>

          {/* Custom Endpoint Input */}
          {(selectedProvider === "custom" || selectedProvider === "openai") && (
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-text-primary flex items-center justify-between">
                <span>API Endpoint {selectedProvider === "custom" ? "(Required)" : "(Optional)"}</span>
              </label>
              <input
                type="text"
                value={customEndpoint}
                onChange={(e) => setCustomEndpoint(e.target.value)}
                placeholder={
                  selectedProvider === "custom"
                    ? "http://localhost:11434/v1"
                    : "https://api.openai.com/v1/chat/completions"
                }
                className="w-full bg-surface-900 border border-surface-500/30 rounded-lg p-2 text-text-primary font-mono text-[11px] focus:outline-none focus:border-discord-blurple"
              />
            </div>
          )}

          {/* Model Selection */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-text-primary">Model</label>
            {selectedProvider === "custom" ? (
              <input
                type="text"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                placeholder="e.g. llama3, mistral, deepseek-r1"
                className="w-full bg-surface-900 border border-surface-500/30 rounded-lg p-2 text-text-primary font-mono text-xs focus:outline-none focus:border-discord-blurple"
              />
            ) : (
              <select
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="w-full bg-surface-900 border border-surface-500/30 rounded-lg p-2 text-text-primary focus:outline-none focus:border-discord-blurple text-xs"
              >
                {currentModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* API Key Input */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-text-primary flex items-center justify-between">
              <span>API Key {selectedProvider === "custom" ? "(Optional for local)" : ""}</span>
              <a
                href={getProviderKeyUrl(selectedProvider)}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-discord-blurple hover:underline flex items-center gap-0.5"
              >
                Get API Key <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Paste your ${selectedProvider.toUpperCase()} key`}
                className="w-full bg-surface-900 border border-surface-500/30 rounded-lg p-2 pr-9 text-text-primary font-mono text-xs focus:outline-none focus:border-discord-blurple"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-2.5 text-text-muted hover:text-white"
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Status Indicator */}
          {connectionState.status !== "not-configured" && (
            <div
              className={`p-2 rounded-lg border text-[11px] flex items-center gap-2 ${
                connectionState.status === "connected"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : connectionState.status === "testing"
                  ? "bg-sky-500/10 border-sky-500/30 text-sky-400"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-300"
              }`}
            >
              {connectionState.status === "connected" && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
              {connectionState.status === "testing" && <RefreshCw className="w-4 h-4 flex-shrink-0 animate-spin" />}
              {connectionState.status !== "connected" && connectionState.status !== "testing" && (
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              )}
              <div className="flex-1 truncate">
                {connectionState.status === "connected" && (
                  <span>Connected successfully to {connectionState.testedModel || modelId}!</span>
                )}
                {connectionState.status === "testing" && <span>Testing connection...</span>}
                {connectionState.status !== "connected" && connectionState.status !== "testing" && (
                  <span>{connectionState.errorMessage || "Connection failed"}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-3 border-t border-surface-500/30 bg-surface-900/60">
          <button
            onClick={handleRemove}
            className="text-discord-red hover:bg-discord-red/10 px-2.5 py-1.5 rounded text-xs flex items-center gap-1 transition-colors"
            title="Remove stored key for this provider"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestConnection}
              disabled={isTesting || (!apiKey.trim() && selectedProvider !== "custom")}
              className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? "animate-spin" : ""}`} />
              <span>Test Connection</span>
            </button>

            <button
              onClick={handleSave}
              className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{saveSuccess ? "Saved!" : "Save & Set Default"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getProviderKeyUrl(providerId: AIProviderId): string {
  switch (providerId) {
    case "openai":
      return "https://platform.openai.com/api-keys";
    case "anthropic":
      return "https://console.anthropic.com/settings/keys";
    case "gemini":
      return "https://aistudio.google.com/app/apikey";
    case "openrouter":
      return "https://openrouter.ai/keys";
    case "custom":
      return "https://ollama.com/";
  }
}

