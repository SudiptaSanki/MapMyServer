import { useMemo, useCallback, useEffect } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  MarkerType,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { useServerStore } from "@/store/serverStore";
import { useUIStore } from "@/store/uiStore";
import type { ServerBlueprint, VisibilityClassification } from "@mapmyserver/shared";
import {
  Server,
  Folder,
  Hash,
  Volume2,
  Mic,
  MessageSquare,
  Megaphone,
  Image as ImageIcon,
  MessageCircle,
  Network,
  Lock,
  Maximize2,
  RotateCcw,
} from "lucide-react";

function getNodeIcon(type: string) {
  const className = "w-3.5 h-3.5";
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

function getVisibilityBorderColor(classification?: VisibilityClassification): string {
  switch (classification) {
    case "broadly-accessible":
      return "#3f4147"; // clean default
    case "role-restricted":
      return "#f59e0b"; // amber
    case "member-restricted":
      return "#ec4899"; // fuchsia
    case "user-inaccessible":
      return "#ed4245"; // red
    default:
      return "#3f4147";
  }
}

// ── Layout Algorithm (Dagre) ───────────────────

const nodeWidth = 210;
const nodeHeight = 42;

function getLayoutedElements(nodes: Node[], edges: Edge[], direction = "LR") {
  if (nodes.length === 0) return { nodes: [], edges: [] };

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, ranksep: 90, nodesep: 24 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: "left" as any,
      sourcePosition: "right" as any,
      position: {
        x: nodeWithPosition ? nodeWithPosition.x - nodeWidth / 2 : 0,
        y: nodeWithPosition ? nodeWithPosition.y - nodeHeight / 2 : 0,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

// ── Blueprint to Graph Converter with Filter Integration ──

function convertBlueprintToGraph(
  blueprint: ServerBlueprint,
  filters: ReturnType<typeof useUIStore.getState>["filters"],
  searchQuery: string,
  selectedChannelId: string | null
) {
  const initialNodes: Node[] = [];
  const initialEdges: Edge[] = [];

  const visibleCategoryIds = new Set<string>();

  // Filter channels
  const filteredChannels = blueprint.channels.filter((chan) => {
    // 1. Category focus filter
    if (filters.selectedCategoryId && chan.parentId !== filters.selectedCategoryId) {
      return false;
    }

    // 2. Channel Type filter
    if (chan.type === "text" && !filters.showText) return false;
    if (chan.type === "voice" && !filters.showVoice) return false;
    if (chan.type === "stage" && !filters.showStage) return false;
    if (chan.type === "forum" && !filters.showForums) return false;
    if (chan.type === "announcement" && !filters.showAnnouncements) return false;

    // 3. Visibility filter
    const vis = chan.visibilityAnalysis?.classification || "broadly-accessible";
    if (vis === "broadly-accessible" && !filters.showPublic) return false;
    if (vis === "role-restricted" && !filters.showRestricted) return false;
    if (vis === "user-inaccessible" && !filters.showPrivate) return false;

    // 4. Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        chan.name.toLowerCase().includes(q) ||
        (chan.topic && chan.topic.toLowerCase().includes(q)) ||
        (chan.purpose?.purpose && chan.purpose.purpose.toLowerCase().includes(q));
      if (!match) return false;
    }

    if (chan.parentId) {
      visibleCategoryIds.add(chan.parentId);
    }
    return true;
  });

  // Filter categories
  const filteredCategories = blueprint.categories.filter((cat) => {
    if (!filters.showCategories) return false;
    if (filters.selectedCategoryId && cat.id !== filters.selectedCategoryId) return false;
    if (filters.collapseEmpty && !visibleCategoryIds.has(cat.id)) return false;
    return true;
  });

  // Root Server Node
  initialNodes.push({
    id: blueprint.server.id,
    type: "default",
    data: {
      type: "server",
      label: (
        <div className="flex items-center gap-2 font-bold px-2 py-1 text-text-primary text-xs">
          <Server className="w-4 h-4 text-discord-blurple flex-shrink-0" />
          <span className="truncate">{blueprint.server.name}</span>
        </div>
      ),
    },
    position: { x: 0, y: 0 },
    style: {
      background: "#1e1f22",
      color: "#f2f3f5",
      border: "1.5px solid #5865f2",
      borderRadius: "8px",
      width: nodeWidth,
    },
  });

  // Category Nodes
  filteredCategories.forEach((cat) => {
    initialNodes.push({
      id: cat.id,
      type: "default",
      data: {
        type: "category",
        label: (
          <div className="flex items-center gap-1.5 font-semibold text-[11px] uppercase tracking-wider text-text-secondary px-2 py-1">
            <Folder className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
            <span className="truncate">{cat.name}</span>
          </div>
        ),
      },
      position: { x: 0, y: 0 },
      style: {
        background: "#2b2d31",
        color: "#dbdee1",
        border: "1px solid #3f4147",
        borderRadius: "6px",
        width: nodeWidth,
      },
    });

    initialEdges.push({
      id: `e-${blueprint.server.id}-${cat.id}`,
      source: blueprint.server.id,
      target: cat.id,
      type: "smoothstep",
      animated: true,
      style: { stroke: "#5865f2", strokeWidth: 1.5 },
    });
  });

  // Channel Nodes
  filteredChannels.forEach((chan) => {
    const parentId =
      chan.parentId && filteredCategories.some((c) => c.id === chan.parentId)
        ? chan.parentId
        : blueprint.server.id;

    const icon = getNodeIcon(chan.type);
    const borderColor = getVisibilityBorderColor(chan.visibilityAnalysis?.classification);
    const isSelected = selectedChannelId === chan.id;
    const isRestricted =
      chan.visibilityAnalysis?.classification === "role-restricted" ||
      chan.visibilityAnalysis?.classification === "member-restricted";

    initialNodes.push({
      id: chan.id,
      type: "default",
      data: {
        type: "channel",
        channelId: chan.id,
        label: (
          <div className="flex items-center justify-between px-2 py-1 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="flex-shrink-0">{icon}</span>
              <span className={`truncate ${isSelected ? "text-white font-semibold" : "text-text-primary"}`}>
                {chan.name}
              </span>
            </div>
            {isRestricted && (
              <span title="Restricted Channel" className="flex-shrink-0 text-amber-400 ml-1">
                <Lock className="w-3 h-3" />
              </span>
            )}
          </div>
        ),
      },
      position: { x: 0, y: 0 },
      style: {
        background: isSelected ? "#383a40" : "#2b2d31",
        color: "#dbdee1",
        border: isSelected ? "2px solid #5865f2" : `1px solid ${borderColor}`,
        borderRadius: "6px",
        width: nodeWidth,
        boxShadow: isSelected ? "0 0 10px rgba(88, 101, 242, 0.4)" : undefined,
        cursor: "pointer",
      },
    });

    initialEdges.push({
      id: `e-${parentId}-${chan.id}`,
      source: parentId,
      target: chan.id,
      type: "default",
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "#80848e",
      },
      style: { stroke: "#80848e" },
    });
  });

  return getLayoutedElements(initialNodes, initialEdges, "LR");
}

// ── Graph Inner Component ──────────────────────

function ServerGraphInner() {
  const { blueprint } = useServerStore();
  const { filters, searchQuery, selectedChannelId, setSelectedChannelId } = useUIStore();
  const { fitView } = useReactFlow();

  const graphData = useMemo(() => {
    if (!blueprint) return { nodes: [], edges: [] };
    return convertBlueprintToGraph(blueprint, filters, searchQuery, selectedChannelId);
  }, [blueprint, filters, searchQuery, selectedChannelId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(graphData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graphData.edges);

  // Sync state safely with useEffect (no useMemo side-effects)
  useEffect(() => {
    setNodes(graphData.nodes);
    setEdges(graphData.edges);
  }, [graphData.nodes, graphData.edges, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.data?.type === "channel" && typeof node.id === "string") {
        setSelectedChannelId(node.id);
      }
    },
    [setSelectedChannelId]
  );

  if (!blueprint) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
        <div className="text-discord-blurple">
          <Network className="w-8 h-8" />
        </div>
        <p className="text-sm text-text-muted">Analyze a server to see its graph structure.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100vh-140px)] rounded-lg overflow-hidden border border-surface-500/30 bg-surface-950">
      {/* Quick Graph Toolbar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 p-1 bg-surface-900/90 backdrop-blur border border-surface-500/40 rounded-lg shadow-lg">
        <button
          onClick={() => fitView({ duration: 400 })}
          title="Fit to Screen"
          className="p-1.5 rounded hover:bg-surface-700 text-text-muted hover:text-text-primary transition-colors text-xs flex items-center gap-1"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span className="text-[10px]">Fit</span>
        </button>
        <button
          onClick={() => {
            setNodes(graphData.nodes);
            setEdges(graphData.edges);
            fitView({ duration: 400 });
          }}
          title="Reset Layout"
          className="p-1.5 rounded hover:bg-surface-700 text-text-muted hover:text-text-primary transition-colors text-xs flex items-center gap-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="text-[10px]">Reset</span>
        </button>
        {selectedChannelId && (
          <button
            onClick={() => setSelectedChannelId(null)}
            className="text-[10px] px-2 py-1 rounded bg-discord-blurple/20 text-discord-blurple hover:bg-discord-blurple/30 font-medium ml-1"
          >
            Clear Selection
          </button>
        )}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        fitView
        minZoom={0.1}
        maxZoom={1.5}
        attributionPosition="bottom-right"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#3f4147" gap={16} />
        <Controls showInteractive={false} className="bg-surface-700 fill-text-primary" />
        <MiniMap
          nodeStrokeColor={(n) => {
            if (n.style?.background === "#1e1f22") return "#5865f2";
            if (n.style?.background === "#2b2d31") return "#3f4147";
            return "#5865f2";
          }}
          nodeColor={(n) => (n.style?.background as string) || "#2b2d31"}
          maskColor="rgba(30, 31, 34, 0.7)"
          className="bg-surface-900 border border-surface-500/30 rounded"
        />
      </ReactFlow>
    </div>
  );
}

export default function ServerGraph() {
  return (
    <ReactFlowProvider>
      <ServerGraphInner />
    </ReactFlowProvider>
  );
}
