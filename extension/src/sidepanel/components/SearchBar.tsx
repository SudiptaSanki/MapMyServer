import { useUIStore } from "@/store/uiStore";

export default function SearchBar() {
  const { searchQuery, setSearchQuery } = useUIStore();

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted/50 text-sm pointer-events-none">
        🔍
      </span>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search channels, categories, threads…"
        className="input-search pl-8 pr-8"
      />
      {searchQuery && (
        <button
          onClick={() => setSearchQuery("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted/50 
                     hover:text-text-secondary transition-colors text-xs w-5 h-5 
                     flex items-center justify-center rounded-full hover:bg-surface-500/30"
        >
          ✕
        </button>
      )}
    </div>
  );
}
