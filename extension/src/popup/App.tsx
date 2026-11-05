import { useEffect, useState } from "react";
import {
  Search,
  Server,
  Folder,
  Hash,
  MessageCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";

interface ServerStatus {
  guildId: string | null;
  name: string | null;
  onDiscord: boolean;
  hasBlueprint: boolean;
  stats: {
    categories: number;
    textChannels: number;
    voiceChannels: number;
    totalChannels: number;
    threads: number;
  } | null;
}

export default function App() {
  const [status, setStatus] = useState<ServerStatus>({
    guildId: null,
    name: null,
    onDiscord: false,
    hasBlueprint: false,
    stats: null,
  });

  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    // Check if we're on Discord by querying the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0];
      if (!tab?.url?.includes("discord.com/channels")) {
        setStatus((s) => ({ ...s, onDiscord: false }));
        return;
      }

      // Extract guild ID from URL
      const match = tab.url.match(/discord\.com\/channels\/(\d{15,22})/);
      const guildId = match?.[1] ?? null;

      if (guildId) {
        // Check for existing blueprint
        try {
          const response = await chrome.runtime.sendMessage({
            type: "REQUEST_BLUEPRINT",
            payload: { serverId: guildId },
          });

          if (response?.blueprint) {
            setStatus({
              guildId,
              name: response.blueprint.server.name,
              onDiscord: true,
              hasBlueprint: true,
              stats: {
                categories: response.blueprint.statistics.categories,
                textChannels: response.blueprint.statistics.textChannels,
                voiceChannels: response.blueprint.statistics.voiceChannels,
                totalChannels: response.blueprint.statistics.totalChannels,
                threads: response.blueprint.statistics.threads,
              },
            });
          } else {
            setStatus({
              guildId,
              name: null,
              onDiscord: true,
              hasBlueprint: false,
              stats: null,
            });
          }
        } catch {
          setStatus({
            guildId,
            name: null,
            onDiscord: true,
            hasBlueprint: false,
            stats: null,
          });
        }
      }
    });
  }, []);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      await chrome.runtime.sendMessage({ type: "REQUEST_ANALYSIS" });
      await chrome.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" });
      window.close();
    } catch {
      setAnalyzing(false);
    }
  };

  const handleOpenSidePanel = async () => {
    try {
      await chrome.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" });
      window.close();
    } catch {
      // fallback
    }
  };

  return (
    <div className="w-[320px] bg-surface-800 p-4 font-sans text-xs">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-discord-blurple/20 flex items-center justify-center text-discord-blurple">
          <Search className="w-4 h-4" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-text-primary">
            MapMyServer
          </h1>
          <p className="text-[10px] text-text-muted">
            Architecture & Permission Intelligence
          </p>
        </div>
      </div>

      {!status.onDiscord ? (
        /* Not on Discord */
        <div className="text-center py-5">
          <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-surface-700/60 flex items-center justify-center text-text-muted">
            <Server className="w-5 h-5" />
          </div>
          <p className="text-xs text-text-muted mb-1 font-medium">
            Navigate to Discord in your browser
          </p>
          <p className="text-[10px] text-text-muted/60 font-mono">
            discord.com/channels/...
          </p>
        </div>
      ) : (
        <>
          {/* Server Info */}
          <div className="glass-card p-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-discord-blurple/20 flex items-center justify-center text-discord-blurple">
                <Server className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {status.name ?? `Server ${status.guildId?.slice(0, 6)}…`}
                </p>
                <span className="visibility-page text-[10px]">page-visible</span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          {status.hasBlueprint && status.stats && (
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              <MiniStat
                icon={<Folder className="w-3.5 h-3.5 text-text-muted" />}
                value={status.stats.categories}
                label="Categories"
              />
              <MiniStat
                icon={<Hash className="w-3.5 h-3.5 text-channel-text" />}
                value={status.stats.totalChannels}
                label="Channels"
              />
              <MiniStat
                icon={<MessageCircle className="w-3.5 h-3.5 text-text-secondary" />}
                value={status.stats.threads}
                label="Threads"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="btn-primary w-full flex items-center justify-center gap-1.5 py-2 text-xs"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Analyze Server</span>
                </>
              )}
            </button>

            {status.hasBlueprint && (
              <button
                onClick={handleOpenSidePanel}
                className="btn-secondary w-full flex items-center justify-center gap-1.5 py-2 text-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Dashboard</span>
              </button>
            )}
          </div>
        </>
      )}

      {/* Footer */}
      <div className="mt-3 pt-2 border-t border-surface-500/20 text-center">
        <p className="text-[9px] text-text-muted/40 font-mono">
          Data source: page-visible · Client-side analysis
        </p>
      </div>
    </div>
  );
}

function MiniStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="bg-surface-700/50 rounded-lg p-2 text-center flex flex-col items-center">
      <span className="mb-0.5">{icon}</span>
      <div className="text-sm font-bold text-text-primary">{value}</div>
      <div className="text-[8px] text-text-muted uppercase tracking-wider">{label}</div>
    </div>
  );
}
