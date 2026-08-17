import { useMemo, useCallback, useState } from "react";
import { useServerStore } from "@/store/serverStore";
import { useUIStore } from "@/store/uiStore";
import { generateAIPrompt } from "@/services/aiPromptGenerator";
import type { TreeNode, ChannelPurpose } from "@mapmyserver/shared";
import FilterPanel from "./FilterPanel";
import { 
  FolderTree, 
  Plus, 
  Minus, 
  Filter, 
  Hash, 
  Volume2, 
  Mic, 
  MessageSquare, 
  Megaphone, 
  Image as ImageIcon, 
  Folder, 
  MessageCircle, 
  Server,
  ChevronRight,
  Sparkles,
  Check,
  Copy
} from "lucide-react";

const PURPOSE_BADGE_STYLES: Record<ChannelPurpose, string> = {
  ONBOARDING: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  GOVERNANCE: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  INFORMATION: "bg-sky-500/20 text-sky-300 border-sky-500/40",
  COMMUNITY: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
  SUPPORT: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  KNOWLEDGE: "bg-teal-500/20 text-teal-300 border-teal-500/40",
  EVENTS: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  TEAM: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  INTERNAL: "bg-slate-500/20 text-slate-300 border-slate-500/40",
  SHOWCASE: "bg-pink-500/20 text-pink-300 border-pink-500/40",
  FEEDBACK: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  OTHER: "bg-zinc-500/20 text-zinc-300 border-zinc-500/40",
};

export default function ServerTree() {
  const { tree, blueprint } = useServerStore();
  const {
    searchQuery,
    filters,
    expandedNodes,
    toggleNode,
    expandAll,
    collapseAll,
    showFilterPanel,
    toggleFilterPanel,
    setSelectedChannelId,
    selectedChannelId,
  } = useUIStore();

  const [copiedAI, setCopiedAI] = useState(false);
  const [copiedTree, setCopiedTree] = useState(false);

  const handleCopyAIPrompt = async () => {
    if (!blueprint) return;
    const prompt = generateAIPrompt(blueprint);
    await navigator.clipboard.writeText(prompt);
    setCopiedAI(true);
    setTimeout(() => setCopiedAI(false), 2500);
  };

  const handleCopySimpleTree = async () => {
    if (!blueprint) return;
    let treeStr = `# ${blueprint.server.name}\n\n`;
    for (const cat of blueprint.categories) {
      treeStr += `📁 ${cat.name}\n`;
      const catChannels = blueprint.channels.filter((c) => c.parentId === cat.id);
      for (const ch of catChannels) {
        treeStr += `  └── #${ch.name} (${ch.type})\n`;
      }
    }
    await navigator.clipboard.writeText(treeStr);
    setCopiedTree(true);
    setTimeout(() => setCopiedTree(false), 2000);
  };

  const filteredTree = useMemo(() => {
    if (!tree) return null;
    return filterTree(tree, searchQuery, filters);
  }, [tree, searchQuery, filters]);

  if (!blueprint || !tree) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
        <div className="text-discord-blurple">
          <FolderTree className="w-8 h-8" />
        </div>
        <p className="text-sm text-text-muted">
          Analyze a server to see its structure tree.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 animate-fade-in h-full relative pb-[100px]">
      {/* Quick AI & Tree Copy Header */}
      <div className="flex items-center gap-1.5 p-1 bg-surface-900/60 border border-surface-500/20 rounded-lg">
        <button
          onClick={handleCopyAIPrompt}
          className="btn-primary text-[11px] py-1 px-2.5 flex-1 flex items-center justify-center gap-1 shadow-sm"
        >
          {copiedAI ? <Check className="w-3 h-3 text-emerald-300" /> : <Sparkles className="w-3 h-3 text-amber-300" />}
          <span>{copiedAI ? "Copied AI Prompt!" : "Copy for AI Optimizer"}</span>
        </button>
        <button
          onClick={handleCopySimpleTree}
          title="Copy Markdown Tree"
          className="btn-secondary text-[11px] py-1 px-2 flex items-center justify-center gap-1"
        >
          {copiedTree ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
          <span>{copiedTree ? "Copied" : "Copy Tree"}</span>
        </button>
      </div>

      {/* Tree Controls */}
      <div className="flex items-center gap-2">
        <button onClick={expandAll} className="btn-ghost flex items-center gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" /> Expand All
        </button>
        <button onClick={collapseAll} className="btn-ghost flex items-center gap-1.5 text-xs">
          <Minus className="w-3.5 h-3.5" /> Collapse All
        </button>
        <div className="flex-1" />
        <button
          onClick={toggleFilterPanel}
          className={`btn-ghost flex items-center gap-1.5 text-xs ${showFilterPanel ? "bg-surface-500/30 text-text-primary" : ""}`}
        >
          <Filter className="w-3.5 h-3.5" /> Filter
        </button>
      </div>

      {showFilterPanel && <FilterPanel />}

      {/* Tree */}
      <div className="glass-card p-2 overflow-y-auto flex-1">
        {filteredTree ? (
          <TreeNodeComponent
            node={filteredTree}
            expandedNodes={expandedNodes}
            toggleNode={toggleNode}
            searchQuery={searchQuery}
            onSelectChannel={setSelectedChannelId}
            selectedChannelId={selectedChannelId}
          />
        ) : (
          <p className="text-sm text-text-muted text-center py-4">
            No results match your filters.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Tree Node Component ────────────────────────

interface TreeNodeProps {
  node: TreeNode;
  expandedNodes: Set<string>;
  toggleNode: (id: string) => void;
  searchQuery: string;
  onSelectChannel: (id: string) => void;
  selectedChannelId: string | null;
}

function getNodeIcon(type: string) {
  const className = "w-4 h-4";
  switch (type) {
    case "text":
      return <Hash className={`${className} text-channel-text`} />;
    case "voice":
      return <Volume2 className={`${className} text-channel-voice`} />;
    case "stage":
      return <Mic className={`${className} text-channel-stage`} />;
    case "forum":
      return <MessageSquare className={`${className} text-channel-forum`} />;
    case "announcement":
      return <Megaphone className={`${className} text-channel-announcement`} />;
    case "media":
      return <ImageIcon className={`${className} text-channel-text`} />;
    case "category":
      return <Folder className={`${className} text-text-muted`} />;
    case "thread":
      return <MessageCircle className={`${className} text-text-secondary`} />;
    case "server":
      return <Server className={`${className} text-discord-blurple`} />;
    default:
      return <Hash className={`${className} text-text-muted`} />;
  }
}

function TreeNodeComponent({
  node,
  expandedNodes,
  toggleNode,
  searchQuery,
  onSelectChannel,
  selectedChannelId,
}: TreeNodeProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id) || expandedNodes.has("__all__");
  const indent = node.depth * 14;

  const isCategory = node.type === "category";
  const isServer = node.type === "server";
  const isChannel = !isCategory && !isServer && node.type !== "thread";
  const isSelected = selectedChannelId === node.id;

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (hasChildren) {
        toggleNode(node.id);
      }
      if (isChannel) {
        onSelectChannel(node.id);
      }
    },
    [hasChildren, isChannel, node.id, toggleNode, onSelectChannel]
  );

  const icon = getNodeIcon(node.type);

  return (
    <div>
      <div
        className={`tree-node ${isServer ? "mb-1" : ""} ${
          isSelected ? "bg-discord-blurple/20 border-discord-blurple/50 text-white" : ""
        }`}
        style={{ paddingLeft: `${indent + 4}px` }}
        onClick={handleClick}
      >
        {/* Expand/Collapse Arrow */}
        {hasChildren && (
          <span
            className={`text-text-muted transition-transform duration-200 select-none ${
              isExpanded ? "rotate-90" : ""
            }`}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        )}
        {!hasChildren && <span className="w-3.5" />}

        {/* Icon */}
        <span className="flex-shrink-0 flex items-center justify-center">{icon}</span>

        {/* Name */}
        <span
          className={`flex-1 min-w-0 truncate ${
            isServer
              ? "font-bold text-text-primary text-sm"
              : isCategory
              ? "font-semibold text-text-secondary text-xs uppercase tracking-wider"
              : "text-text-secondary text-sm hover:text-text-primary"
          }`}
        >
          <HighlightedText text={node.name} query={searchQuery} />
        </span>

        {/* Content Indicator Dot */}
        {node.metadata?.hasContent && (
          <span
            title="Contains instructions, templates, or rules"
            className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 animate-pulse"
          />
        )}

        {/* Purpose Badge */}
        {node.metadata?.purpose && (
          <span
            className={`flex-shrink-0 text-[9px] px-1.5 py-0.2 rounded border font-semibold ${
              PURPOSE_BADGE_STYLES[node.metadata.purpose.purpose] ||
              PURPOSE_BADGE_STYLES.OTHER
            }`}
          >
            {node.metadata.purpose.purpose}
          </span>
        )}

        {/* Children count badge */}
        {hasChildren && (
          <span className="flex-shrink-0 text-[10px] text-text-muted/60 bg-surface-500/20 rounded-full px-1.5 py-0.5">
            {node.children.length}
          </span>
        )}

        {/* Channel type badge */}
        {isChannel && !node.metadata?.purpose && (
          <span className={`flex-shrink-0 text-[10px] badge-${node.type === "text" ? "text" : node.type}`}>
            {node.type}
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="animate-fade-in">
          {node.children.map((child) => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              expandedNodes={expandedNodes}
              toggleNode={toggleNode}
              searchQuery={searchQuery}
              onSelectChannel={onSelectChannel}
              selectedChannelId={selectedChannelId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Highlight Component ────────────────────────

function HighlightedText({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  if (!query) return <>{text}</>;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, index)}
      <span className="bg-discord-blurple/30 text-discord-blurple rounded px-0.5">
        {text.slice(index, index + query.length)}
      </span>
      {text.slice(index + query.length)}
    </>
  );
}

// ── Tree Filtering ─────────────────────────────

function filterTree(
  node: TreeNode,
  query: string,
  filters: ReturnType<typeof useUIStore.getState>["filters"]
): TreeNode | null {
  if (!shouldShowType(node.type, filters)) return null;

  let filteredChildren = node.children
    .map((child) => filterTree(child, query, filters))
    .filter((c): c is TreeNode => c !== null);

  const matchesSearch =
    !query ||
    node.name.toLowerCase().includes(query.toLowerCase()) ||
    (node.metadata?.topic && node.metadata.topic.toLowerCase().includes(query.toLowerCase())) ||
    (node.metadata?.purpose && node.metadata.purpose.purpose.toLowerCase().includes(query.toLowerCase()));

  if (
    filters.collapseEmpty &&
    node.type === "category" &&
    filteredChildren.length === 0
  ) {
    return null;
  }

  if (matchesSearch || filteredChildren.length > 0) {
    return {
      ...node,
      children: filteredChildren,
    };
  }

  return null;
}

function shouldShowType(
  type: TreeNode["type"],
  filters: ReturnType<typeof useUIStore.getState>["filters"]
): boolean {
  switch (type) {
    case "server":
      return true;
    case "category":
      return filters.showCategories;
    case "text":
      return filters.showText;
    case "voice":
      return filters.showVoice;
    case "stage":
      return filters.showStage;
    case "forum":
      return filters.showForums;
    case "announcement":
      return filters.showAnnouncements;
    case "thread":
      return filters.showThreads;
    default:
      return true;
  }
}
