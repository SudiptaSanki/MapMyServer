import { useState, useEffect } from "react";
import { useServerStore } from "@/store/serverStore";
import { Settings, Lightbulb, Save, X } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { backendToken, setBackendToken } = useServerStore();
  const [apiUrl, setApiUrl] = useState("http://localhost:3000");
  const [tokenInput, setTokenInput] = useState("");
  const [botToken, setBotToken] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedUrl = localStorage.getItem("mapmyserver_api_url");
      if (savedUrl) setApiUrl(savedUrl);
      const savedBot = localStorage.getItem("mapmyserver_bot_token");
      if (savedBot) setBotToken(savedBot);
      if (backendToken) setTokenInput(backendToken);
    }
  }, [backendToken, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("mapmyserver_api_url", apiUrl.trim());
      localStorage.setItem("mapmyserver_bot_token", botToken.trim());
      if (tokenInput.trim()) {
        setBackendToken(tokenInput.trim());
      }
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleClear = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("mapmyserver_api_url");
      localStorage.removeItem("mapmyserver_bot_token");
      localStorage.removeItem("backend_token");
    }
    setTokenInput("");
    setBotToken("");
    setBackendToken("");
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md bg-surface-900 border border-surface-500/40 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-surface-500/30 bg-surface-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-text-primary">
            <Settings className="w-5 h-5" />
            <h2 className="text-sm font-bold text-text-primary">
              MapMyServer Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-surface-700 hover:bg-surface-600 text-text-muted hover:text-text-primary flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Mode Explanation */}
          <div className="p-3 rounded-lg bg-discord-blurple/10 border border-discord-blurple/30 space-y-1">
            <div className="font-semibold text-discord-blurple flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4" /> Analysis Modes
            </div>
            <p className="text-text-secondary leading-relaxed text-[11px]">
              <strong>Default Browser Mode:</strong> Works automatically on Discord web tabs with zero setup.<br/>
              <strong>Developer / Bot Mode:</strong> Optional deep analysis (full permissions & server settings). Save credentials here directly without editing code.
            </p>
          </div>

          {/* Backend API URL */}
          <div className="space-y-1.5">
            <label className="font-semibold text-text-primary block">
              Backend API Endpoint (Optional)
            </label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://localhost:3000"
              className="w-full px-3 py-2 bg-surface-950 border border-surface-500/40 rounded-lg text-text-primary font-mono text-xs focus:outline-none focus:border-discord-blurple"
            />
            <p className="text-[10px] text-text-muted">
              Default is local backend <code className="text-text-secondary">http://localhost:3000</code> or your deployed URL.
            </p>
          </div>

          {/* Discord Bot Token / OAuth Token */}
          <div className="space-y-1.5">
            <label className="font-semibold text-text-primary block flex items-center justify-between">
              <span>Discord JWT / Session Token (Optional)</span>
              {backendToken ? (
                <span className="text-[10px] text-emerald-400 font-mono">
                  ● Authenticated
                </span>
              ) : (
                <span className="text-[10px] text-text-muted font-mono">
                  ○ Not set
                </span>
              )}
            </label>
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Paste backend session JWT token..."
              className="w-full px-3 py-2 bg-surface-950 border border-surface-500/40 rounded-lg text-text-primary font-mono text-xs focus:outline-none focus:border-discord-blurple"
            />
          </div>

          {/* Discord Bot Token */}
          <div className="space-y-1.5">
            <label className="font-semibold text-text-primary block">
              Custom Discord Bot Token (Optional for Private Bot Audits)
            </label>
            <input
              type="password"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="Bot OTU4..."
              className="w-full px-3 py-2 bg-surface-950 border border-surface-500/40 rounded-lg text-text-primary font-mono text-xs focus:outline-none focus:border-discord-blurple"
            />
            <p className="text-[10px] text-text-muted">
              Credentials are stored securely in your browser's local extension storage only.
            </p>
          </div>

          {saveSuccess && (
            <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs text-center animate-fade-in">
              ✓ Settings saved successfully!
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-surface-500/30 bg-surface-800 flex items-center justify-between gap-2">
          <button
            onClick={handleClear}
            className="px-3 py-1.5 rounded bg-surface-700 hover:bg-surface-600 text-text-muted hover:text-rose-400 text-xs font-semibold transition-colors"
          >
            Clear Credentials
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-surface-700 hover:bg-surface-600 text-text-primary text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
