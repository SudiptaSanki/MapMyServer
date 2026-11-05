/* ─────────────────────────────────────────────
 *  MapMyServer — Global Settings & Storage Center
 *
 *  Provides user controls for:
 *  - Experience Mode (Beginner vs Advanced)
 *  - Local Storage & Privacy Management
 *  - Data Export & Zero-Trace Local Deletion
 *  - AI Credentials Configuration Link
 * ───────────────────────────────────────────── */

import { useState, useEffect } from "react";
import { useUIStore } from "@/store/uiStore";
import { getStorageUsage, listServers } from "@/services/storageService";
import AISettingsModal from "./AISettingsModal";
import {
  Settings,
  Sparkles,
  Shield,
  HardDrive,
  Trash2,
  X,
  Check,
  Download,
  Key,
} from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { experienceMode, setExperienceMode } = useUIStore();

  const [storageBytes, setStorageBytes] = useState<number>(0);
  const [savedServersCount, setSavedServersCount] = useState<number>(0);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getStorageUsage().then((usage) => setStorageBytes(usage.bytesInUse));
      listServers().then((list) => setSavedServersCount(list.length));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleExportAllData = async () => {
    const allData = await chrome.storage.local.get(null);
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mapmyserver-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSuccessMessage("All local extension data exported successfully.");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleClearAllData = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    await chrome.storage.local.clear();
    setStorageBytes(0);
    setSavedServersCount(0);
    setConfirmClear(false);
    setSuccessMessage("All local data and blueprints wiped successfully.");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
        <div className="w-full max-w-md bg-surface-900 border border-surface-500/40 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="p-3.5 border-b border-surface-500/30 bg-surface-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-text-primary">
              <Settings className="w-4 h-4 text-discord-blurple" />
              <h2 className="text-xs font-bold text-text-primary uppercase tracking-wide">
                Preferences & Storage
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-6 h-6 rounded-md bg-surface-700 hover:bg-surface-600 text-text-muted hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto space-y-4 text-xs">
            {/* Experience Mode Toggle */}
            <div className="glass-card p-3 space-y-2 border-surface-500/30">
              <label className="font-bold text-text-primary block flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Experience Mode</span>
              </label>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Choose between a streamlined visual workflow or the full developer tooling suite.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setExperienceMode("beginner")}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    experienceMode === "beginner"
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300 font-semibold"
                      : "border-surface-500/30 bg-surface-950 text-text-muted hover:border-surface-500/60"
                  }`}
                >
                  <div className="font-bold text-xs mb-0.5">Beginner Mode</div>
                  <div className="text-[10px] leading-snug">Visual tree, compare, templates, and export.</div>
                </button>

                <button
                  type="button"
                  onClick={() => setExperienceMode("advanced")}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    experienceMode === "advanced"
                      ? "border-discord-blurple/50 bg-discord-blurple/10 text-discord-blurple font-semibold"
                      : "border-surface-500/30 bg-surface-950 text-text-muted hover:border-surface-500/60"
                  }`}
                >
                  <div className="font-bold text-xs mb-0.5">Advanced Mode</div>
                  <div className="text-[10px] leading-snug">Permission bitfields, graph, AI sandbox, and code scripts.</div>
                </button>
              </div>
            </div>

            {/* AI Provider Config Link */}
            <div className="glass-card p-3 space-y-2 border-surface-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-text-primary">
                  <Key className="w-3.5 h-3.5 text-discord-blurple" />
                  <span>AI Architecture Assistant (BYOK)</span>
                </div>
                <span className="text-[9px] font-mono uppercase bg-discord-blurple/20 text-discord-blurple px-1.5 py-0.2 rounded font-semibold">
                  Optional
                </span>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Configure OpenAI, Anthropic, Gemini, OpenRouter, or local Ollama endpoints. Keys remain 100% locally stored in your browser.
              </p>
              <button
                type="button"
                onClick={() => setIsAiModalOpen(true)}
                className="btn-secondary w-full py-1.5 text-xs flex items-center justify-center gap-1.5"
              >
                <Settings className="w-3.5 h-3.5 text-discord-blurple" />
                <span>Configure AI Providers & Keys</span>
              </button>
            </div>

            {/* Local Storage & Privacy */}
            <div className="glass-card p-3 space-y-2.5 border-surface-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-text-primary">
                  <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Local Extension Storage</span>
                </div>
                <span className="text-[10px] font-mono text-text-muted">
                  {formatBytes(storageBytes)} in use
                </span>
              </div>

              <div className="p-2 rounded bg-surface-950 text-[11px] text-text-secondary space-y-1 border border-surface-500/20">
                <div className="flex items-center justify-between">
                  <span>Saved Server Blueprints:</span>
                  <span className="font-mono font-bold text-text-primary">{savedServersCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Local Storage Quota:</span>
                  <span className="font-mono text-text-muted">10 MB (Offline)</span>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleExportAllData}
                  className="btn-secondary flex-1 py-1.5 text-xs flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Backup</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearAllData}
                  className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    confirmClear
                      ? "bg-rose-600 hover:bg-rose-500 text-white animate-pulse"
                      : "bg-surface-800 hover:bg-rose-500/20 text-text-muted hover:text-rose-400 border border-surface-500/30"
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{confirmClear ? "Confirm Wipe?" : "Wipe Data"}</span>
                </button>
              </div>

              {confirmClear && (
                <div className="text-[10px] text-rose-400 font-mono">
                  Warning: This will delete all saved snapshots and cached server scans from your browser.
                </div>
              )}
            </div>

            {/* Privacy Declaration */}
            <div className="p-2.5 rounded-lg bg-surface-950 border border-surface-500/20 text-[10px] text-text-muted space-y-1">
              <div className="font-semibold text-text-secondary flex items-center gap-1">
                <Shield className="w-3 h-3 text-emerald-400" />
                <span>Zero Telemetry & Local Privacy Guarantee</span>
              </div>
              <p className="leading-relaxed">
                MapMyServer operates completely offline on your device. Scanned architectures are stored solely in your browser's local storage and are never sent to any external server.
              </p>
            </div>

            {successMessage && (
              <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs text-center flex items-center justify-center gap-1.5 animate-fade-in">
                <Check className="w-3.5 h-3.5" />
                <span>{successMessage}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-surface-500/30 bg-surface-800 flex items-center justify-between">
            <span className="text-[10px] text-text-muted font-mono">MapMyServer v1.0.0</span>
            <button
              onClick={onClose}
              className="btn-primary py-1 px-4 text-xs font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Embedded AI Settings Modal */}
      <AISettingsModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
      />
    </>
  );
}
