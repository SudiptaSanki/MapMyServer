/* ─────────────────────────────────────────────
 *  Saved Servers Directory
 *
 *  Displays all locally saved and previously scanned
 *  Discord server blueprints from local extension storage.
 * ───────────────────────────────────────────── */

import { useEffect, useState } from "react";
import { useServerStore } from "@/store/serverStore";
import { listServers, loadBlueprint, deleteBlueprint } from "@/services/storageService";
import { Server, Trash2, ArrowRight, HardDrive } from "lucide-react";

interface SavedServerEntry {
  id: string;
  name: string;
  icon?: string;
  lastAnalyzed: string;
}

export default function ServerList() {
  const { setBlueprint, setCurrentServer } = useServerStore();
  const [servers, setServers] = useState<SavedServerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAll = async () => {
    setIsLoading(true);
    const list = await listServers();
    setServers(list);
    setIsLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSelectServer = async (server: SavedServerEntry) => {
    const bp = await loadBlueprint(server.id);
    if (bp) {
      setCurrentServer(server.id, server.name, true);
      setBlueprint(bp);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Remove "${name}" from saved servers?`)) {
      await deleteBlueprint(id);
      await loadAll();
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-discord-blurple"></div>
      </div>
    );
  }

  if (servers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 glass-card m-3 text-center space-y-2">
        <HardDrive className="w-8 h-8 text-discord-blurple/60" />
        <h3 className="text-xs font-bold text-text-primary">No Saved Servers</h3>
        <p className="text-[11px] text-text-muted">
          Scanned Discord servers will automatically appear here for offline inspection and comparison.
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2.5">
      <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
        Scanned Servers ({servers.length})
      </h3>

      <div className="space-y-1.5">
        {servers.map((s) => (
          <div
            key={s.id}
            className="glass-card p-2.5 border border-surface-500/20 hover:border-surface-500/40 flex items-center justify-between gap-2"
          >
            <button
              onClick={() => handleSelectServer(s)}
              className="flex items-center gap-2.5 flex-1 min-w-0 text-left hover:text-discord-blurple transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-discord-blurple/20 flex items-center justify-center text-discord-blurple flex-shrink-0">
                <Server className="w-3.5 h-3.5" />
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-text-primary truncate">{s.name}</div>
                <div className="text-[10px] text-text-muted font-mono">
                  {new Date(s.lastAnalyzed).toLocaleDateString()}
                </div>
              </div>
            </button>

            <div className="flex items-center gap-1">
              <button
                onClick={() => handleSelectServer(s)}
                className="p-1 rounded hover:bg-surface-700 text-text-muted hover:text-white"
                title="Open server blueprint"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(s.id, s.name)}
                className="p-1 rounded hover:bg-rose-500/20 text-text-muted hover:text-rose-400"
                title="Delete saved blueprint"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
