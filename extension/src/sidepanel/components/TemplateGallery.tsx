/* ─────────────────────────────────────────────
 *  Server Template Gallery & Custom Template Builder
 *
 *  Browse curated templates, save current server as a reusable template,
 *  import/export templates, and inspect category architectures.
 * ───────────────────────────────────────────── */

import { useState, useEffect, useMemo } from "react";
import { useServerStore } from "@/store/serverStore";
import { useUIStore } from "@/store/uiStore";
import {
  type ServerTemplate,
  type TemplateAudience,
  blueprintToTemplate,
  CURATED_TEMPLATES,
} from "@mapmyserver/shared";
import { TemplateService } from "../../services/templateService";
import {
  LayoutTemplate,
  Search,
  Plus,
  Download,
  Upload,
  Code2,
  Trash2,
  Check,
  ChevronDown,
  ChevronUp,
  Tag,
  ShieldAlert,
  Terminal,
  Folder,
} from "lucide-react";

export default function TemplateGallery() {
  const { blueprint } = useServerStore();
  const { setActiveTab } = useUIStore();

  const [templates, setTemplates] = useState<ServerTemplate[]>(CURATED_TEMPLATES);
  const [selectedAudience, setSelectedAudience] = useState<TemplateAudience | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);

  // Custom Template Builder Modal state
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [customCategory, setCustomCategory] = useState<TemplateAudience>("community");
  const [excludePrivate, setExcludePrivate] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Import modal state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  const loadAll = async () => {
    const all = await TemplateService.getAllTemplates();
    setTemplates(all);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      if (selectedAudience !== "all" && t.category !== selectedAudience) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = t.name.toLowerCase().includes(q);
        const matchesDesc = t.description.toLowerCase().includes(q);
        const matchesTag = t.tags.some((tag) => tag.toLowerCase().includes(q));
        if (!matchesName && !matchesDesc && !matchesTag) return false;
      }
      return true;
    });
  }, [templates, selectedAudience, searchQuery]);

  // Save current server as custom template
  const handleCreateCustom = async () => {
    if (!blueprint) return;
    try {
      const template = blueprintToTemplate(blueprint, {
        name: customName.trim() || `${blueprint.server.name} Template`,
        description: customDescription.trim() || `Derived from ${blueprint.server.name}`,
        category: customCategory,
        excludePrivateStaff: excludePrivate,
      });

      await TemplateService.saveCustomTemplate(template);
      await loadAll();
      setIsBuilderOpen(false);
      setCustomName("");
      setCustomDescription("");
    } catch (err: unknown) {
      alert(`Failed to save template: ${(err as Error).message}`);
    }
  };

  // Import JSON template
  const handleImport = async () => {
    setImportError(null);
    try {
      await TemplateService.importTemplateFromJson(importJsonText);
      await loadAll();
      setIsImportOpen(false);
      setImportJsonText("");
    } catch (err: unknown) {
      setImportError((err as Error).message);
    }
  };

  // Export JSON template
  const handleExportJson = (t: ServerTemplate) => {
    const jsonStr = TemplateService.exportTemplateAsJson(t);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${t.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-template.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyJson = async (t: ServerTemplate) => {
    const jsonStr = TemplateService.exportTemplateAsJson(t);
    await navigator.clipboard.writeText(jsonStr);
    setCopiedId(t.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteCustom = async (t: ServerTemplate) => {
    if (confirm(`Delete custom template "${t.name}"?`)) {
      await TemplateService.deleteCustomTemplate(t.id);
      await loadAll();
    }
  };

  return (
    <div className="flex flex-col gap-3 animate-fade-in pb-8">
      {/* ── Top Header & Actions ── */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-discord-blurple/20 flex items-center justify-center text-discord-blurple">
              <LayoutTemplate className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">Server Template Gallery</h2>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Explore production-ready Discord layouts or save your own architecture as a reusable template.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => {
              if (!blueprint) {
                alert("Please scan a Discord server first to convert it into a template.");
                return;
              }
              setCustomName(`${blueprint.server.name} Template`);
              setIsBuilderOpen(true);
            }}
            className="btn-primary flex-1 py-1.5 px-3 text-xs flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Save Server as Template</span>
          </button>

          <button
            onClick={() => setIsImportOpen(true)}
            className="btn-secondary py-1.5 px-3 text-xs flex items-center justify-center gap-1.5"
            title="Import custom template from JSON"
          >
            <Upload className="w-3.5 h-3.5 text-discord-blurple" />
            <span>Import JSON</span>
          </button>
        </div>
      </div>

      {/* ── Search & Filter Tabs ── */}
      <div className="glass-card p-3 space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates by name, keyword, or tag..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface-900 border border-surface-500/20 rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-discord-blurple"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] scrollbar-none">
          {(
            [
              "all",
              "developer",
              "opensource",
              "gaming",
              "creator",
              "startup",
              "organization",
              "support",
              "education",
              "community",
            ] as const
          ).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedAudience(cat)}
              className={`px-2.5 py-1 rounded-full whitespace-nowrap capitalize transition-colors ${
                selectedAudience === cat
                  ? "bg-discord-blurple text-white font-semibold"
                  : "bg-surface-900 text-text-secondary hover:text-text-primary border border-surface-500/20"
              }`}
            >
              {cat === "all" ? "All Templates" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Template Cards List ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs text-text-muted px-1">
          <span>Showing {filteredTemplates.length} templates</span>
        </div>

        {filteredTemplates.map((template) => {
          const isBuiltin = CURATED_TEMPLATES.some((t) => t.id === template.id);
          const totalChannels = template.categories.reduce((sum, c) => sum + c.channels.length, 0);
          const isExpanded = expandedTemplateId === template.id;

          return (
            <div
              key={template.id}
              className="glass-card p-3.5 border border-surface-500/30 hover:border-surface-500/50 transition-all space-y-2.5"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-text-primary text-xs leading-snug">{template.name}</h3>
                    <span className="text-[10px] font-mono uppercase bg-discord-blurple/20 text-discord-blurple px-1.5 py-0.2 rounded border border-discord-blurple/30 font-semibold">
                      {template.category}
                    </span>
                    {!isBuiltin && (
                      <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/30 font-semibold">
                        Custom
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
                    {template.description}
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-[10px] font-mono text-text-muted block">
                    {template.categories.length} Cats • {totalChannels} Chans
                  </span>
                </div>
              </div>

              {/* Tags */}
              {template.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <Tag className="w-3 h-3 text-text-muted" />
                  {template.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-mono bg-surface-900 text-text-muted px-1.5 py-0.2 rounded border border-surface-500/20"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Category Preview Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {template.categories.map((cat, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-mono bg-surface-900/90 text-text-primary px-1.5 py-0.5 rounded border border-surface-500/20 flex items-center gap-1"
                  >
                    <Folder className="w-2.5 h-2.5 text-discord-blurple" />
                    <span>{cat.name}</span>
                    <span className="text-text-muted">({cat.channels.length})</span>
                  </span>
                ))}
              </div>

              {/* Expanded Category Channels breakdown */}
              {isExpanded && (
                <div className="pt-2 border-t border-surface-500/20 space-y-2 animate-fade-in text-xs">
                  {template.categories.map((cat, i) => (
                    <div key={i} className="p-2 rounded bg-surface-900/80 border border-surface-500/20 space-y-1">
                      <div className="font-bold text-[11px] text-text-primary flex items-center justify-between">
                        <span>📁 {cat.name}</span>
                        {cat.isStaffOnly && (
                          <span className="text-[9px] text-amber-400 font-mono uppercase bg-amber-500/10 px-1 rounded">
                            Staff Only
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-1 pt-0.5">
                        {cat.channels.map((ch, j) => (
                          <div
                            key={j}
                            className="text-[10px] font-mono text-text-secondary truncate flex items-center gap-1"
                          >
                            <span>#{ch.name}</span>
                            <span className="text-[9px] text-text-muted">({ch.type})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {template.roles.length > 0 && (
                    <div className="p-2 rounded bg-surface-900/80 border border-surface-500/20 space-y-1">
                      <div className="font-bold text-[11px] text-text-primary">Recommended Roles</div>
                      <div className="flex flex-wrap gap-1">
                        {template.roles.map((r, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-800 border border-surface-500/20 text-text-primary"
                          >
                            {r.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-surface-500/20 text-xs">
                <button
                  onClick={() =>
                    setExpandedTemplateId(isExpanded ? null : template.id)
                  }
                  className="text-text-muted hover:text-text-primary flex items-center gap-1 text-[11px]"
                >
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  <span>{isExpanded ? "Hide Details" : "View Structure"}</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleCopyJson(template)}
                    className="p-1.5 rounded hover:bg-surface-700 text-text-muted hover:text-text-primary"
                    title="Copy template JSON"
                  >
                    {copiedId === template.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Code2 className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => handleExportJson(template)}
                    className="p-1.5 rounded hover:bg-surface-700 text-text-muted hover:text-text-primary"
                    title="Download template .json"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setActiveTab("automation")}
                    className="btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1 text-discord-blurple hover:text-white"
                    title="Generate discord.js or discord.py script from this template"
                  >
                    <Terminal className="w-3 h-3" />
                    <span>Script</span>
                  </button>

                  {!isBuiltin && (
                    <button
                      onClick={() => handleDeleteCustom(template)}
                      className="p-1.5 rounded hover:bg-rose-500/20 text-rose-400"
                      title="Delete custom template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Custom Template Builder Modal ── */}
      {isBuilderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-800 border border-surface-500/40 rounded-xl w-full max-w-md shadow-2xl p-4 space-y-3.5 text-xs">
            <div className="flex items-center justify-between border-b border-surface-500/20 pb-2">
              <h3 className="font-bold text-text-primary text-sm">Save as Reusable Template</h3>
              <button onClick={() => setIsBuilderOpen(false)} className="text-text-muted hover:text-white">✕</button>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-text-primary">Template Name</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. My Community Layout"
                className="w-full bg-surface-900 border border-surface-500/30 rounded-lg p-2 text-xs text-text-primary focus:outline-none focus:border-discord-blurple"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-text-primary">Description</label>
              <textarea
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                rows={2}
                placeholder="What community or workflow is this template tailored for?"
                className="w-full bg-surface-900 border border-surface-500/30 rounded-lg p-2 text-xs text-text-primary focus:outline-none focus:border-discord-blurple resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-text-primary">Category</label>
              <select
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value as TemplateAudience)}
                className="w-full bg-surface-900 border border-surface-500/30 rounded-lg p-2 text-xs text-text-primary capitalize focus:outline-none focus:border-discord-blurple"
              >
                <option value="community">Community</option>
                <option value="developer">Developer</option>
                <option value="opensource">Open Source</option>
                <option value="gaming">Gaming</option>
                <option value="creator">Creator</option>
                <option value="startup">Startup</option>
                <option value="organization">Organization</option>
                <option value="support">Support</option>
                <option value="education">Education</option>
              </select>
            </div>

            {/* Privacy Safeguard Toggle */}
            <div className="p-2.5 rounded bg-surface-900 border border-surface-500/20 flex items-start gap-2">
              <input
                type="checkbox"
                id="excludePrivate"
                checked={excludePrivate}
                onChange={(e) => setExcludePrivate(e.target.checked)}
                className="mt-0.5 rounded border-surface-500 text-discord-blurple focus:ring-0"
              />
              <label htmlFor="excludePrivate" className="text-[11px] leading-tight select-none cursor-pointer">
                <span className="font-semibold text-text-primary block">Exclude Private & Staff Channels</span>
                <span className="text-text-muted">
                  Strips internal staff channels and private role-restricted sections from the exported template.
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-500/20">
              <button onClick={() => setIsBuilderOpen(false)} className="btn-secondary px-3 py-1.5 text-xs">
                Cancel
              </button>
              <button onClick={handleCreateCustom} className="btn-primary px-3.5 py-1.5 text-xs">
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Import Template Modal ── */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-800 border border-surface-500/40 rounded-xl w-full max-w-md shadow-2xl p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-surface-500/20 pb-2">
              <h3 className="font-bold text-text-primary text-sm">Import Template JSON</h3>
              <button onClick={() => setIsImportOpen(false)} className="text-text-muted hover:text-white">✕</button>
            </div>

            <p className="text-[11px] text-text-secondary">
              Paste the JSON code of a MapMyServer template below to validate and import it into your local gallery.
            </p>

            <textarea
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              rows={8}
              placeholder="Paste JSON here..."
              className="w-full bg-surface-900 border border-surface-500/30 rounded-lg p-2 font-mono text-[10px] text-text-primary focus:outline-none focus:border-discord-blurple"
            />

            {importError && (
              <div className="p-2 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-500/20">
              <button onClick={() => setIsImportOpen(false)} className="btn-secondary px-3 py-1.5 text-xs">
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!importJsonText.trim()}
                className="btn-primary px-3.5 py-1.5 text-xs disabled:opacity-50"
              >
                Import & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
