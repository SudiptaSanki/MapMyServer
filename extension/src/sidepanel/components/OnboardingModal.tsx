/* ─────────────────────────────────────────────
 *  MapMyServer — First-Time User Walkthrough & Guide
 *
 *  Interactive 5-step onboarding and visual tour:
 *  1. Welcome & The Core Workflow (Discover -> Scan -> Recreate)
 *  2. Understanding Capture Modes (Full Admin vs Accessible Member)
 *  3. AI Server Architect (Local BYOK Privacy)
 *  4. Smart Server Cloner (Safe Recreation & Dry-Run Scripts)
 *  5. Data Privacy & Offline Storage Backup
 * ───────────────────────────────────────────── */

import { useState } from "react";
import {
  Compass,
  Layers,
  Sparkles,
  Copy,
  ShieldCheck,
  ShieldAlert,
  HardDrive,
  Terminal,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  BookOpen,
} from "lucide-react";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    id: 1,
    title: "Welcome to MapMyServer",
    subtitle: "Standalone Discord Server Architecture Intelligence & Recreation",
    icon: <Compass className="w-5 h-5 text-discord-blurple" />,
  },
  {
    id: 2,
    title: "Capture Modes & Scanning",
    subtitle: "Mode A (Full Admin) vs Mode B (Accessible Member)",
    icon: <Layers className="w-5 h-5 text-cyan-400" />,
  },
  {
    id: 3,
    title: "AI Server Architect (BYOK)",
    subtitle: "Bring Your Own Key with 100% Local Privacy",
    icon: <Sparkles className="w-5 h-5 text-amber-400" />,
  },
  {
    id: 4,
    title: "Smart Server Cloner & Scripts",
    subtitle: "Atomic Recreation with Discord.js & Discord.py",
    icon: <Copy className="w-5 h-5 text-emerald-400" />,
  },
  {
    id: 5,
    title: "Offline Storage & Public Release v1.0",
    subtitle: "Zero Telemetry, Full Data Backup & Restore",
    icon: <HardDrive className="w-5 h-5 text-fuchsia-400" />,
  },
];

export default function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(1);

  if (!isOpen) return null;

  const handleFinish = () => {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.set({ has_seen_onboarding: true }).catch(() => {});
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
      <div className="w-full max-w-lg bg-surface-900 border border-surface-500/40 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-3.5 border-b border-surface-500/30 bg-surface-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-discord-blurple/20 flex items-center justify-center text-discord-blurple">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-text-primary uppercase tracking-wide">
                MapMyServer User Guide
              </h2>
              <p className="text-[10px] text-text-muted">Step {currentStep} of {STEPS.length}</p>
            </div>
          </div>
          <button
            onClick={handleFinish}
            className="w-6 h-6 rounded-md bg-surface-700 hover:bg-surface-600 text-text-muted hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Step Indicator Progress Bar */}
        <div className="w-full h-1 bg-surface-800 flex">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={`h-full flex-1 transition-all duration-300 ${
                s.id <= currentStep ? "bg-discord-blurple" : "bg-transparent"
              }`}
            />
          ))}
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Step 1 */}
          {currentStep === 1 && (
            <div className="space-y-3.5 animate-fade-in">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-discord-blurple/10 border border-discord-blurple/30 flex items-center justify-center text-discord-blurple">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-text-primary">What is MapMyServer?</h3>
                  <p className="text-[11px] text-text-secondary">
                    Your all-in-one platform to inspect, analyze, and recreate Discord server architectures.
                  </p>
                </div>
              </div>

              <div className="glass-card p-3 space-y-2 border-surface-500/30 text-[11px] text-text-secondary">
                <p>
                  MapMyServer transforms complex Discord community structures into clean, interactive blueprints.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[10px]">
                  <div className="p-2 rounded bg-surface-950 border border-surface-500/20 text-text-primary">
                    <span className="text-discord-blurple font-bold">1. SCAN</span>: Auto-detects active Discord tabs & sweeps virtualized channels.
                  </div>
                  <div className="p-2 rounded bg-surface-950 border border-surface-500/20 text-text-primary">
                    <span className="text-cyan-400 font-bold">2. ANALYZE</span>: Interactive tree, role matrix, and 100-pt security audit.
                  </div>
                  <div className="p-2 rounded bg-surface-950 border border-surface-500/20 text-text-primary">
                    <span className="text-amber-400 font-bold">3. CUSTOMIZE</span>: AI Architect tailored recommendations (BYOK).
                  </div>
                  <div className="p-2 rounded bg-surface-950 border border-surface-500/20 text-text-primary">
                    <span className="text-emerald-400 font-bold">4. RECREATE</span>: Discord.js/Discord.py scripts & manual checklists.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {currentStep === 2 && (
            <div className="space-y-3.5 animate-fade-in">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-text-primary">Understanding Capture Modes</h3>
                  <p className="text-[11px] text-text-secondary">
                    How MapMyServer strictly respects Discord permissions and user boundaries.
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Mode A: Full Administrator Capture</span>
                  </div>
                  <p className="text-text-secondary text-[10px] leading-relaxed">
                    Available when your account holds Administrator privileges. Captures complete categories, channels, role hierarchy, bitfield permissions, and channel overwrites.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Mode B: Accessible Member Capture</span>
                  </div>
                  <p className="text-text-secondary text-[10px] leading-relaxed">
                    Used when joining communities as a regular member. Captures only genuinely accessible channels and visible structure. Never bypasses permissions, accesses private channels, or fabricates hidden data.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {currentStep === 3 && (
            <div className="space-y-3.5 animate-fade-in">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-text-primary">AI Server Architect (BYOK)</h3>
                  <p className="text-[11px] text-text-secondary">
                    Bring Your Own Key architecture with zero intermediate servers.
                  </p>
                </div>
              </div>

              <div className="glass-card p-3 space-y-2.5 border-surface-500/30 text-[11px] text-text-secondary">
                <p>
                  Connect your preferred model provider directly inside the extension settings:
                </p>
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-surface-950 border border-surface-500/30 text-text-primary">OpenAI (GPT-4o)</span>
                  <span className="px-2 py-0.5 rounded bg-surface-950 border border-surface-500/30 text-text-primary">Anthropic (Claude 3.5 Sonnet)</span>
                  <span className="px-2 py-0.5 rounded bg-surface-950 border border-surface-500/30 text-text-primary">Google Gemini (2.0 Flash)</span>
                  <span className="px-2 py-0.5 rounded bg-surface-950 border border-surface-500/30 text-text-primary">OpenRouter</span>
                  <span className="px-2 py-0.5 rounded bg-surface-950 border border-surface-500/30 text-text-primary">Local Ollama (localhost:11434)</span>
                </div>
                <div className="p-2 rounded bg-surface-950 border border-surface-500/20 text-[10px] space-y-1">
                  <div className="font-semibold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> 100% Local Privacy
                  </div>
                  <p className="text-text-muted">
                    Your API keys are stored solely in your Chrome browser storage. No account, no MapMyServer backend, and no external tracking.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 4 */}
          {currentStep === 4 && (
            <div className="space-y-3.5 animate-fade-in">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Copy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-text-primary">Smart Server Cloner</h3>
                  <p className="text-[11px] text-text-secondary">
                    Selective component cloning and safe automation scripts.
                  </p>
                </div>
              </div>

              <div className="glass-card p-3 space-y-2 border-surface-500/30 text-[11px] text-text-secondary">
                <p>
                  Use the 8-step wizard in the <strong>Smart Cloner</strong> tab to pick specific categories or individual channels, rename them on the fly, and choose your destination.
                </p>
                <div className="space-y-1.5 pt-1 text-[10px]">
                  <div className="flex items-start gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-discord-blurple flex-shrink-0 mt-0.5" />
                    <span><strong>Selective Merge:</strong> Merges into existing servers while safely skipping duplicates without destructive overwrites.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span><strong>Safe Bot Automation:</strong> Generates Discord.js v14 or Discord.py v2 scripts with <code className="text-text-primary font-mono bg-surface-950 px-1 rounded">--dry-run</code> and rate-limit safeguards.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5 */}
          {currentStep === 5 && (
            <div className="space-y-3.5 animate-fade-in">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-text-primary">Public Release v1.0 & Data Backup</h3>
                  <p className="text-[11px] text-text-secondary">
                    You're ready to inspect and optimize Discord communities!
                  </p>
                </div>
              </div>

              <div className="glass-card p-3 space-y-2 border-surface-500/30 text-[11px] text-text-secondary">
                <p>
                  MapMyServer is fully open-source and operates independently on your device:
                </p>
                <ul className="list-disc list-inside space-y-1 text-[10px] text-text-muted">
                  <li>Toggle between <strong>Beginner Mode</strong> and <strong>Advanced Mode</strong> anytime in the top-right header.</li>
                  <li>Export a complete JSON backup of all your saved blueprints in <strong>Settings ➔ Preferences & Storage</strong>.</li>
                  <li>Reopen this walkthrough at any time by clicking the <strong>Help (?)</strong> button.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-3 border-t border-surface-500/30 bg-surface-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
            className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1 disabled:opacity-40"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>

          <div className="flex items-center gap-1">
            {STEPS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentStep(s.id)}
                className={`w-2 h-2 rounded-full transition-all ${
                  s.id === currentStep ? "bg-discord-blurple w-4" : "bg-surface-600"
                }`}
              />
            ))}
          </div>

          {currentStep < STEPS.length ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => Math.min(STEPS.length, prev + 1))}
              className="btn-primary py-1.5 px-3.5 text-xs flex items-center gap-1"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="btn-primary py-1.5 px-4 text-xs flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Get Started</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
