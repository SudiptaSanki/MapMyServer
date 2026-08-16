import { useEffect, useState } from "react";

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
      const match = tab.url.match(/discord\.com\/channels\/(\d{17,20})/);
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
      // Open side panel for full results
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
    <div className="w-[320px] bg-surface-800 p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-discord-blurple/20 flex items-center justify-center text-sm">
          🔍
        </div>
        <div>
          <h1 className="text-sm font-semibold text-text-primary">
            Discord Server Blueprint
          </h1>
          <p className="text-[10px] text-text-muted">
            Analyze · Visualize · Compare
          </p>
        </div>
      </div>

      {!status.onDiscord ? (
        /* Not on Discord */
        <div className="text-center py-4">
          <div className="text-2xl mb-2">💬</div>
          <p className="text-xs text-text-muted">
            Navigate to a Discord server to use this extension.
          </p>
          <p className="text-[10px] text-text-muted/50 mt-1">
            <code>discord.com/channels/...</code>
          </p>
        </div>
      ) : (
        <>
          {/* Server Info */}
          <div className="glass-card p-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-discord-blurple to-discord-fuchsia/60 flex items-center justify-center text-sm">
                🟣
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
              <MiniStat icon="📁" value={status.stats.categories} label="Cat" />
              <MiniStat icon="📝" value={status.stats.totalChannels} label="Chan" />
              <MiniStat icon="💬" value={status.stats.threads} label="Thrd" />
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="btn-primary w-full"
            >
              {analyzing ? "⏳ Analyzing…" : "🔍 Analyze Server"}
            </button>

            {status.hasBlueprint && (
              <button
                onClick={handleOpenSidePanel}
                className="btn-secondary w-full"
              >
                📊 Open Dashboard
              </button>
            )}
          </div>
        </>
      )}

      {/* Footer */}
      <div className="mt-3 pt-2 border-t border-surface-500/20 text-center">
        <p className="text-[9px] text-text-muted/40">
          No tokens extracted · Data source: page-visible
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
  icon: string;
  value: number;
  label: string;
}) {
  return (
    <div className="bg-surface-700/50 rounded-lg p-2 text-center">
      <span className="text-xs">{icon}</span>
      <div className="text-sm font-bold text-text-primary">{value}</div>
      <div className="text-[9px] text-text-muted uppercase">{label}</div>
    </div>
  );
}
