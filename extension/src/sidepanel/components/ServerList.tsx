import { useEffect } from "react";
import { useServerStore } from "@/store/serverStore";

export default function ServerList() {
  const { 
    backendToken, 
    authorizedServers, 
    isLoadingServers, 
    fetchAuthorizedServers,
    fetchBlueprintFromApi,
    setBackendToken,
    setCurrentServer,
  } = useServerStore();

  useEffect(() => {
    if (backendToken && authorizedServers.length === 0) {
      fetchAuthorizedServers();
    }
  }, [backendToken, authorizedServers.length, fetchAuthorizedServers]);

  const handleLogin = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/auth/login");
      const { url } = await res.json();
      
      // Open Discord OAuth2 in a new window
      const authWindow = window.open(url, "Discord Auth", "width=500,height=800");

      // Listen for messages from the popup (we'd normally use chrome.identity here, but this is a web app fallback)
      window.addEventListener("message", (event) => {
        if (event.data?.type === "DISCORD_AUTH_SUCCESS") {
          setBackendToken(event.data.token);
          authWindow?.close();
        }
      });
    } catch (e) {
      console.error("Failed to login", e);
    }
  };

  const handleServerClick = (server: any) => {
    setCurrentServer(server.id, server.name, true);
    fetchBlueprintFromApi(server.id);
  };

  if (!backendToken) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-surface-900 border border-surface-500 rounded-lg m-4">
        <div className="text-4xl mb-4">🔐</div>
        <h3 className="text-lg font-bold text-text-primary mb-2">Connect Discord</h3>
        <p className="text-sm text-text-muted text-center mb-6">
          Link your Discord account to map servers you are a member of.
        </p>
        <button
          onClick={handleLogin}
          className="px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white font-semibold rounded transition-colors w-full"
        >
          Login with Discord
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4">
        My Servers
      </h3>
      
      {isLoadingServers ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {authorizedServers.map((server) => (
            <button
              key={server.id}
              onClick={() => handleServerClick(server)}
              className="flex items-center gap-3 p-3 bg-surface-900 hover:bg-surface-700 border border-surface-500 hover:border-brand-500 rounded-lg transition-colors text-left"
            >
              {server.icon ? (
                <img
                  src={`https://cdn.discordapp.com/icons/${server.id}/${server.icon}.png`}
                  alt={server.name}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-surface-500 flex items-center justify-center font-bold text-text-primary">
                  {server.name.charAt(0)}
                </div>
              )}
              <span className="font-semibold text-text-primary truncate">{server.name}</span>
            </button>
          ))}
          
          {authorizedServers.length === 0 && !isLoadingServers && (
            <div className="text-center p-6 text-text-muted text-sm">
              No servers found. Make sure the bot is invited to your servers.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
