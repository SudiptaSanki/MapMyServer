import { useUIStore, type FilterState } from "@/store/uiStore";
import { useServerStore } from "@/store/serverStore";
import {
  Folder,
  Hash,
  Volume2,
  Mic,
  MessageSquare,
  Megaphone,
  MessageCircle,
  Eye,
  Lock,
  ShieldAlert,
  RotateCcw,
  CheckSquare,
} from "lucide-react";

export default function FilterPanel() {
  const { filters, toggleFilter, resetFilters, setSelectedCategoryId } = useUIStore();
  const { blueprint } = useServerStore();

  const TYPE_OPTIONS: { key: keyof FilterState; label: string; icon: React.ReactNode }[] = [
    { key: "showCategories", label: "Categories", icon: <Folder className="w-3.5 h-3.5 text-text-muted" /> },
    { key: "showText", label: "Text Channels", icon: <Hash className="w-3.5 h-3.5 text-channel-text" /> },
    { key: "showVoice", label: "Voice Channels", icon: <Volume2 className="w-3.5 h-3.5 text-channel-voice" /> },
    { key: "showStage", label: "Stage Channels", icon: <Mic className="w-3.5 h-3.5 text-channel-stage" /> },
    { key: "showForums", label: "Forum Channels", icon: <MessageSquare className="w-3.5 h-3.5 text-channel-forum" /> },
    { key: "showAnnouncements", label: "Announcements", icon: <Megaphone className="w-3.5 h-3.5 text-channel-announcement" /> },
    { key: "showThreads", label: "Threads", icon: <MessageCircle className="w-3.5 h-3.5 text-text-secondary" /> },
  ];

  const VISIBILITY_OPTIONS: { key: keyof FilterState; label: string; icon: React.ReactNode; color: string }[] = [
    { key: "showPublic", label: "Broadly Accessible", icon: <Eye className="w-3.5 h-3.5 text-emerald-400" />, color: "text-emerald-400" },
    { key: "showRestricted", label: "Role Restricted", icon: <Lock className="w-3.5 h-3.5 text-amber-400" />, color: "text-amber-400" },
    { key: "showPrivate", label: "Private / Inaccessible", icon: <ShieldAlert className="w-3.5 h-3.5 text-discord-red" />, color: "text-discord-red" },
  ];

  return (
    <div className="glass-card p-3 animate-fade-in space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-500/20 pb-1.5">
        <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
          Filter Server Architecture
        </h4>
        <button
          onClick={resetFilters}
          className="btn-ghost text-[10px] flex items-center gap-1 text-text-muted hover:text-text-primary"
        >
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
      </div>

      {/* Category Selector */}
      {blueprint && blueprint.categories.length > 0 && (
        <div>
          <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider block mb-1">
            Focus Category
          </label>
          <select
            value={filters.selectedCategoryId || ""}
            onChange={(e) => setSelectedCategoryId(e.target.value ? e.target.value : null)}
            className="w-full text-xs px-2 py-1.5 bg-surface-900 border border-surface-500/40 rounded-lg text-text-primary focus:outline-none focus:border-discord-blurple"
          >
            <option value="">All Categories ({blueprint.categories.length})</option>
            {blueprint.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.channelIds.length} channels)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Visibility Filters */}
      <div>
        <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider block mb-1">
          Channel Visibility
        </label>
        <div className="grid grid-cols-1 gap-1">
          {VISIBILITY_OPTIONS.map((opt) => (
            <label
              key={opt.key}
              className="flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer hover:bg-surface-500/20 transition-colors text-xs"
            >
              <input
                type="checkbox"
                checked={!!filters[opt.key]}
                onChange={() => toggleFilter(opt.key)}
                className="w-3.5 h-3.5 rounded border-surface-300 text-discord-blurple focus:ring-discord-blurple/30 bg-surface-900/50 cursor-pointer accent-[#5865f2]"
              />
              <span className="flex-shrink-0">{opt.icon}</span>
              <span className={`text-xs ${opt.color}`}>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Channel Types */}
      <div>
        <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider block mb-1">
          Channel Types
        </label>
        <div className="grid grid-cols-2 gap-1">
          {TYPE_OPTIONS.map((opt) => (
            <label
              key={opt.key}
              className="flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer hover:bg-surface-500/20 transition-colors text-xs"
            >
              <input
                type="checkbox"
                checked={!!filters[opt.key]}
                onChange={() => toggleFilter(opt.key)}
                className="w-3.5 h-3.5 rounded border-surface-300 text-discord-blurple focus:ring-discord-blurple/30 bg-surface-900/50 cursor-pointer accent-[#5865f2]"
              />
              <span className="flex-shrink-0">{opt.icon}</span>
              <span className="text-xs text-text-secondary truncate">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Option: Hide empty categories */}
      <div className="pt-1 border-t border-surface-500/20">
        <label className="flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer hover:bg-surface-500/20 transition-colors text-xs">
          <input
            type="checkbox"
            checked={filters.collapseEmpty}
            onChange={() => toggleFilter("collapseEmpty")}
            className="w-3.5 h-3.5 rounded border-surface-300 text-discord-blurple focus:ring-discord-blurple/30 bg-surface-900/50 cursor-pointer accent-[#5865f2]"
          />
          <CheckSquare className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-xs text-text-muted">Hide empty categories</span>
        </label>
      </div>
    </div>
  );
}
