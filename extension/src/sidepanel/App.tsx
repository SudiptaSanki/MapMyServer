import { useEffect, useState } from "react";
import { useServerStore } from "@/store/serverStore";
import { useUIStore, type SidePanelTab } from "@/store/uiStore";
import ServerOverview from "./components/ServerOverview";
import ServerTree from "./components/ServerTree";
import ServerGraph from "./components/ServerGraph";
import Statistics from "./components/Statistics";
import ChangeHistory from "./components/ChangeHistory";
import SearchBar from "./components/SearchBar";
import ChannelDetail from "./components/ChannelDetail";
import SettingsModal from "./components/SettingsModal";

const TABS: { id: SidePanelTab; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "tree", label: "Tree", icon: "🌳" },
  { id: "graph", label: "Graph", icon: "🕸️" },
  { id: "stats", label: "Stats", icon: "📈" },
  { id: "history", label: "History", icon: "📜" },
];

export default function App() {
  const { currentServer, blueprint, checkActiveTab, requestAnalysis } = useServerStore();
  const { activeTab, setActiveTab, selectedChannelId } = useUIStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // On mount, actively check the current tab
  useEffect(() => {
    checkActiveTab();
    chrome.runtime.sendMessage({ type: "REQUEST_SERVER_LIST" }).catch(() => {});
  }, [checkActiveTab]);

  const isServerActive = currentServer.onDiscord || !!blueprint;
  const serverName = blueprint?.server.name || currentServer.name;
  const sourceName = blueprint?.server.visibility.source || (currentServer.onDiscord ? "page-visible" : "offline");

  const renderContent = () => {
    if (!isServerActive) {
      return (
        <NotOnDiscord
          onDetect={async () => {
            await checkActiveTab();
            const state = useServerStore.getState();
            if (state.currentServer.onDiscord) {
              await requestAnalysis();
            }
          }}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      );
    }

    switch (activeTab) {
      case "overview":
        return <ServerOverview />;
      case "tree":
        return <ServerTree />;
      case "graph":
        return <ServerGraph />;
      case "stats":
        return <Statistics />;
      case "history":
        return <ChangeHistory />;
      default:
        return <ServerOverview />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-800 relative font-sans">
      {/* Header */}
      <header className="flex-shrink-0 px-4 py-3 border-b border-surface-500/30 bg-surface-800/90 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-discord-blurple/20 flex items-center justify-center text-xs">
              🔍
            </div>
            <h1 className="text-sm font-semibold text-text-primary tracking-tight">
              MapMyServer
            </h1>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => checkActiveTab()}
              title="Refresh / Re-detect active tab"
              className="w-7 h-7 rounded-lg bg-surface-700/60 hover:bg-surface-600 text-text-muted hover:text-text-primary flex items-center justify-center text-xs transition-colors"
            >
              🔄
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              title="Configure Settings & API"
              className="w-7 h-7 rounded-lg bg-surface-700/60 hover:bg-surface-600 text-text-muted hover:text-text-primary flex items-center justify-center text-xs transition-colors"
            >
              ⚙️
            </button>
          </div>
        </div>

        {isServerActive && serverName && (
          <div className="mt-2 flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-discord-blurple/30 flex items-center justify-center text-[10px]">
              🟣
            </div>
            <span className="text-sm font-medium text-text-primary truncate">
              {serverName}
            </span>
            <span className="visibility-page text-[10px]">{sourceName}</span>
          </div>
        )}
      </header>

      {/* Search (when blueprint exists) */}
      {blueprint && isServerActive && (
        <div className="flex-shrink-0 px-3 pt-2">
          <SearchBar />
        </div>
      )}

      {/* Tab Navigation */}
      {isServerActive && (
        <nav className="flex-shrink-0 px-3 pt-2 pb-1">
          <div className="flex gap-1 p-1 bg-surface-900/40 rounded-lg">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={
                  activeTab === tab.id ? "tab-btn-active" : "tab-btn"
                }
              >
                <span className="mr-1">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-3 py-2">
        {renderContent()}
      </main>

      {/* Slide-over Channel Detail Panel */}
      {selectedChannelId && <ChannelDetail />}

      {/* In-UI Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Footer */}
      <footer className="flex-shrink-0 px-4 py-2 border-t border-surface-500/20 text-[10px] text-text-muted/50 text-center">
        Data source: {sourceName} · Authorized access only
      </footer>
    </div>
  );
}

function NotOnDiscord({
  onDetect,
  onOpenSettings,
}: {
  onDetect: () => void;
  onOpenSettings: () => void;
}) {
  const { loadMockServer } = useServerStore();
  const [isDetecting, setIsDetecting] = useState(false);

  const handleDetectClick = async () => {
    setIsDetecting(true);
    await onDetect();
    setIsDetecting(false);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-4 animate-fade-in">
      <div className="p-4 flex flex-col gap-4 w-full max-w-sm">
        {/* Browser Mode Action Card */}
        <div className="p-5 bg-surface-900 border border-discord-blurple/40 rounded-xl shadow-lg shadow-discord-blurple/10 flex flex-col items-center">
          <div className="text-3xl mb-2">🔍</div>
          <h3 className="text-sm font-bold text-text-primary mb-1">
            Browser Mode (Zero Setup)
          </h3>
          <p className="text-xs text-text-secondary text-center mb-4 leading-relaxed">
            Make sure your Discord tab is open in Chrome, then click below to scan the server structure.
          </p>
          <button
            onClick={handleDetectClick}
            disabled={isDetecting}
            className="btn-primary text-xs py-2 px-4 w-full flex items-center justify-center gap-2 shadow-md shadow-brand-500/20"
          >
            <span>{isDetecting ? "⏳" : "🔍"}</span>
            {isDetecting ? "Scanning Active Tab..." : "Detect & Analyze Current Discord Tab"}
          </button>
        </div>

        {/* Demo Option */}
        <div className="p-4 bg-surface-900/60 border border-surface-500/30 rounded-xl flex flex-col items-center">
          <div className="text-2xl mb-1">🧪</div>
          <h4 className="text-xs font-bold text-text-primary mb-1">
            Want to see how it looks?
          </h4>
          <p className="text-[11px] text-text-muted text-center mb-3">
            Load the rich GDG Community blueprint to test all Tree, Graph, and Detail features.
          </p>
          <button
            onClick={loadMockServer}
            className="px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-text-primary text-xs font-semibold rounded-lg transition-colors w-full border border-surface-500/20"
          >
            🧪 Load Rich Mock Community
          </button>
        </div>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="text-xs text-text-muted hover:text-text-secondary transition-colors flex items-center justify-center gap-1"
        >
          <span>⚙️</span> Developer / Bot API Settings
        </button>
      </div>

      <div className="text-[11px] text-text-muted/60 bg-surface-700/30 rounded-lg px-3 py-1.5 font-mono">
        discord.com/channels/...
      </div>
    </div>
  );
}
