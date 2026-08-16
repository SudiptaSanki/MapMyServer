import { useUIStore, type FilterState } from "@/store/uiStore";

const FILTER_OPTIONS: { key: keyof FilterState; label: string; icon: string }[] = [
  { key: "showCategories", label: "Categories", icon: "📁" },
  { key: "showText", label: "Text Channels", icon: "📝" },
  { key: "showVoice", label: "Voice Channels", icon: "🔊" },
  { key: "showStage", label: "Stage Channels", icon: "🎤" },
  { key: "showForums", label: "Forum Channels", icon: "📋" },
  { key: "showAnnouncements", label: "Announcements", icon: "📢" },
  { key: "showThreads", label: "Threads", icon: "💬" },
  { key: "collapseEmpty", label: "Hide empty categories", icon: "🚫" },
];

export default function FilterPanel() {
  const { filters, toggleFilter, resetFilters } = useUIStore();

  return (
    <div className="glass-card p-3 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Filters
        </h4>
        <button onClick={resetFilters} className="btn-ghost text-[10px]">
          Reset
        </button>
      </div>

      <div className="flex flex-col gap-1">
        {FILTER_OPTIONS.map((opt) => (
          <label
            key={opt.key}
            className="flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer
                       hover:bg-surface-500/20 transition-colors text-sm"
          >
            <input
              type="checkbox"
              checked={filters[opt.key]}
              onChange={() => toggleFilter(opt.key)}
              className="w-3.5 h-3.5 rounded border-surface-300 
                         text-discord-blurple focus:ring-discord-blurple/30
                         bg-surface-900/50 cursor-pointer accent-[#5865f2]"
            />
            <span className="text-xs">{opt.icon}</span>
            <span className="text-xs text-text-secondary">{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
