import { useState, useMemo } from "react";
import { useServerStore } from "@/store/serverStore";
import {
  permissionsToBitfield,
  hasPermission,
  type PermissionFlagName,
} from "@mapmyserver/shared";
import {
  Shield,
  ShieldAlert,
  Search,
  Check,
  X,
  Eye,
  Info,
} from "lucide-react";

const CORE_MATRIX_PERMISSIONS: { key: PermissionFlagName; label: string; short: string }[] = [
  { key: "VIEW_CHANNEL", label: "View Channels", short: "View" },
  { key: "SEND_MESSAGES", label: "Send Messages", short: "Send" },
  { key: "CONNECT", label: "Connect (Voice)", short: "Connect" },
  { key: "MANAGE_CHANNELS", label: "Manage Channels", short: "Manage Ch" },
  { key: "ADMINISTRATOR", label: "Administrator", short: "Admin" },
];

export default function RoleMatrix() {
  const { blueprint } = useServerStore();
  const [search, setSearch] = useState("");
  const [onlyPowerful, setOnlyPowerful] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [compareRoleId, setCompareRoleId] = useState<string | null>(null);

  const roles = useMemo(() => {
    if (!blueprint?.roles) return [];
    return [...blueprint.roles].sort((a, b) => b.position - a.position);
  }, [blueprint]);

  const filteredRoles = useMemo(() => {
    return roles.filter((role) => {
      if (search && !role.name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (onlyPowerful) {
        const bits = permissionsToBitfield(role.permissions);
        const isPowerful =
          hasPermission(bits, "ADMINISTRATOR") ||
          hasPermission(bits, "MANAGE_CHANNELS") ||
          hasPermission(bits, "MANAGE_ROLES") ||
          hasPermission(bits, "MANAGE_GUILD");
        if (!isPowerful) return false;
      }
      return true;
    });
  }, [roles, search, onlyPowerful]);

  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const compareRole = roles.find((r) => r.id === compareRoleId);

  // Accessible channels for selected role
  const channelAccess = useMemo(() => {
    if (!selectedRole || !blueprint) return { allowed: [], denied: [] };
    const allowed: string[] = [];
    const denied: string[] = [];

    const roleBits = permissionsToBitfield(selectedRole.permissions);
    const isAdmin = hasPermission(roleBits, "ADMINISTRATOR");

    for (const channel of blueprint.channels) {
      if (isAdmin) {
        allowed.push(channel.name);
        continue;
      }

      const overwrites = channel.permissions || [];
      const roleOw = overwrites.find(
        (ow) => ow.type === "role" && (ow.id === selectedRole.id || ow.id.includes(selectedRole.name.toLowerCase()))
      );
      const everyoneOw = overwrites.find(
        (ow) => ow.type === "role" && (ow.id.toLowerCase().includes("everyone") || ow.id === "@everyone")
      );

      const roleAllows = roleOw?.allow.includes("VIEW_CHANNEL");
      const roleDenies = roleOw?.deny.includes("VIEW_CHANNEL");
      const everyoneDenies = everyoneOw?.deny.includes("VIEW_CHANNEL");

      if (roleAllows) {
        allowed.push(channel.name);
      } else if (roleDenies) {
        denied.push(channel.name);
      } else if (everyoneDenies) {
        denied.push(channel.name);
      } else {
        allowed.push(channel.name);
      }
    }

    return { allowed, denied };
  }, [selectedRole, blueprint]);

  if (!blueprint || roles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6 animate-fade-in">
        <div className="w-12 h-12 rounded-xl bg-surface-700/60 flex items-center justify-center text-text-muted">
          <Shield className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-text-primary">No Roles Scanned Yet</h3>
        <p className="text-xs text-text-muted max-w-xs leading-relaxed">
          Open Discord's <strong>Server Settings ➔ Roles</strong> page in your browser. MapMyServer will passively capture role configurations and build this matrix.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 animate-fade-in pb-12 text-xs">
      {/* Search & Powerful Filter Header */}
      <div className="glass-card p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-discord-blurple" />
            <h2 className="font-bold text-text-primary text-xs uppercase tracking-wider">
              Role Permission Matrix ({roles.length})
            </h2>
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-text-muted hover:text-text-primary">
            <input
              type="checkbox"
              checked={onlyPowerful}
              onChange={(e) => setOnlyPowerful(e.target.checked)}
              className="accent-[#5865f2] rounded"
            />
            <span className={onlyPowerful ? "text-amber-400 font-semibold" : ""}>Powerful Roles Only</span>
          </label>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search roles by name..."
            className="w-full pl-8 pr-3 py-1.5 bg-surface-900 border border-surface-500/40 rounded-lg text-xs text-text-primary focus:outline-none focus:border-discord-blurple"
          />
        </div>
      </div>

      {/* Role Permission Table */}
      <div className="glass-card p-0 overflow-hidden border border-surface-500/30">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-800/90 border-b border-surface-500/30 text-[10px] text-text-muted uppercase tracking-wider">
                <th className="py-2 px-3">Role</th>
                {CORE_MATRIX_PERMISSIONS.map((p) => (
                  <th key={p.key} className="py-2 px-2 text-center" title={p.label}>
                    {p.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-500/20">
              {filteredRoles.map((role) => {
                const bits = permissionsToBitfield(role.permissions);
                const isAdmin = hasPermission(bits, "ADMINISTRATOR");
                const isSelected = selectedRoleId === role.id;

                return (
                  <tr
                    key={role.id}
                    onClick={() => {
                      if (selectedRoleId === role.id) setSelectedRoleId(null);
                      else setSelectedRoleId(role.id);
                    }}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-discord-blurple/20 font-semibold"
                        : "hover:bg-surface-700/40"
                    }`}
                  >
                    <td className="py-2 px-3 flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: role.color || "#949ba4" }}
                      />
                      <div className="min-w-0">
                        <div className="text-text-primary truncate font-medium flex items-center gap-1">
                          <span>{role.name}</span>
                          {isAdmin && (
                            <span title="Administrator Role" className="text-discord-red">
                              <ShieldAlert className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] text-text-muted block">
                          Pos: {role.position} {role.memberCount !== undefined ? `· ${role.memberCount} members` : ""}
                        </span>
                      </div>
                    </td>

                    {CORE_MATRIX_PERMISSIONS.map((p) => {
                      const granted = hasPermission(bits, p.key);
                      return (
                        <td key={p.key} className="py-2 px-2 text-center">
                          {granted ? (
                            <span
                              className={`inline-flex items-center justify-center w-5 h-5 rounded ${
                                p.key === "ADMINISTRATOR"
                                  ? "bg-discord-red/20 text-discord-red"
                                  : "bg-emerald-500/20 text-emerald-400"
                              }`}
                            >
                              <Check className="w-3 h-3" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-5 h-5 text-text-muted/40">
                              <X className="w-3 h-3" />
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Role Detail & Comparison Panel */}
      {selectedRole && (
        <div className="glass-card p-3 space-y-3 border-discord-blurple/40 animate-fade-in">
          <div className="flex items-center justify-between border-b border-surface-500/20 pb-2">
            <div className="flex items-center gap-2">
              <span
                className="w-3.5 h-3.5 rounded-full"
                style={{ backgroundColor: selectedRole.color || "#949ba4" }}
              />
              <span className="font-bold text-text-primary text-sm">{selectedRole.name}</span>
              <span className="text-[10px] text-text-muted bg-surface-800 px-2 py-0.5 rounded border border-surface-500/30">
                Hierarchy Position: {selectedRole.position}
              </span>
            </div>
            <button
              onClick={() => setSelectedRoleId(null)}
              className="text-text-muted hover:text-text-primary text-xs"
            >
              Close
            </button>
          </div>

          {/* Role Comparison Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-text-muted uppercase font-semibold">Compare With:</span>
            <select
              value={compareRoleId || ""}
              onChange={(e) => setCompareRoleId(e.target.value || null)}
              className="text-xs px-2 py-1 bg-surface-900 border border-surface-500/40 rounded text-text-primary focus:outline-none focus:border-discord-blurple flex-1"
            >
              <option value="">None (Select secondary role)</option>
              {roles
                .filter((r) => r.id !== selectedRole.id)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} (Pos {r.position})
                  </option>
                ))}
            </select>
          </div>

          {/* Comparison Diff Table if comparing */}
          {compareRole && (
            <div className="p-2.5 rounded bg-surface-800/80 border border-surface-500/20 text-xs space-y-1.5">
              <div className="font-semibold text-text-primary text-[11px] flex items-center justify-between">
                <span>Permission Comparison</span>
                <span className="text-text-muted font-normal text-[10px]">
                  {selectedRole.name} vs {compareRole.name}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {CORE_MATRIX_PERMISSIONS.map((p) => {
                  const sBits = permissionsToBitfield(selectedRole.permissions);
                  const cBits = permissionsToBitfield(compareRole.permissions);
                  const sHas = hasPermission(sBits, p.key);
                  const cHas = hasPermission(cBits, p.key);

                  return (
                    <div key={p.key} className="p-1.5 rounded bg-surface-900/60 border border-surface-500/20">
                      <div className="text-text-muted text-[10px] uppercase">{p.label}</div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className={sHas ? "text-emerald-400 font-medium" : "text-text-muted"}>
                          {selectedRole.name}: {sHas ? "Yes" : "No"}
                        </span>
                        <span className={cHas ? "text-emerald-400 font-medium" : "text-text-muted"}>
                          {compareRole.name}: {cHas ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Channel Access Breakdown */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-text-primary flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-400" /> Channel Access Summary
              </span>
              <span className="text-[10px] text-text-muted font-mono">
                {channelAccess.allowed.length} visible / {channelAccess.denied.length} restricted
              </span>
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1 text-[11px] p-2 bg-surface-900/80 rounded border border-surface-500/30">
              {channelAccess.allowed.length > 0 && (
                <div>
                  <span className="text-[10px] font-semibold text-emerald-400 block mb-1">
                    Accessible Channels ({channelAccess.allowed.length}):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {channelAccess.allowed.map((name) => (
                      <span key={name} className="px-1.5 py-0.5 rounded bg-surface-800 text-text-secondary border border-surface-500/20">
                        #{name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {channelAccess.denied.length > 0 && (
                <div className="mt-2 pt-2 border-t border-surface-500/20">
                  <span className="text-[10px] font-semibold text-rose-400 block mb-1">
                    Restricted / Hidden Channels ({channelAccess.denied.length}):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {channelAccess.denied.map((name) => (
                      <span key={name} className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30">
                        #{name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Disclaimers & Notes */}
      <div className="p-2.5 rounded-lg bg-surface-900/60 border border-surface-500/20 flex items-start gap-2 text-text-muted text-[11px] leading-relaxed">
        <Info className="w-4 h-4 text-discord-blurple flex-shrink-0 mt-0.5" />
        <div>
          <strong>Note on Effective Permissions:</strong> This matrix displays evaluated role baseline rules and channel role overwrites. Individual user-specific overwrites or thread-level restrictions may grant or deny individual members permissions beyond what is displayed here.
        </div>
      </div>
    </div>
  );
}
