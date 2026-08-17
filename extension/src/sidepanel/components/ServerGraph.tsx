import { useMemo } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { useServerStore } from "@/store/serverStore";
import type { ServerBlueprint } from "@mapmyserver/shared";
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
  Network
} from "lucide-react";

function getNodeIcon(type: string) {
  const className = "w-4 h-4";
  switch (type) {
    case "text":
      return <Hash className={`${className} text-[#b5bac1]`} />;
    case "voice":
      return <Volume2 className={`${className} text-[#57f287]`} />;
    case "stage":
      return <Mic className={`${className} text-[#eb459e]`} />;
    case "forum":
      return <MessageSquare className={`${className} text-[#fee75c]`} />;
    case "announcement":
      return <Megaphone className={`${className} text-[#f0b132]`} />;
    case "media":
      return <ImageIcon className={`${className} text-[#b5bac1]`} />;
    case "category":
      return <Folder className={`${className} text-[#949ba4]`} />;
    case "thread":
      return <MessageCircle className={`${className} text-[#b5bac1]`} />;
    case "server":
      return <Server className={`${className} text-[#5865f2]`} />;
    default:
      return <Hash className={`${className} text-[#949ba4]`} />;
  }
}

// ── Layout Algorithm (Dagre) ───────────────────

const nodeWidth = 200;
const nodeHeight = 40;

function getLayoutedElements(nodes: Node[], edges: Edge[], direction = "LR") {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  dagreGraph.setGraph({ rankdir: direction, ranksep: 100, nodesep: 20 });

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
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

// ── Blueprint to Graph Converter ───────────────

function convertBlueprintToGraph(blueprint: ServerBlueprint) {
  const initialNodes: Node[] = [];
  const initialEdges: Edge[] = [];

  // Server Node (Root)
  initialNodes.push({
    id: blueprint.server.id,
    type: "default",
    data: {
      label: (
        <div className="flex items-center gap-2 font-bold p-1 text-[#f2f3f5]">
          <Server className="w-5 h-5 text-[#5865f2]" />
          <span className="truncate">{blueprint.server.name}</span>
        </div>
      ),
    },
    position: { x: 0, y: 0 },
    style: {
      background: "#2b2d31",
      color: "#f2f3f5",
      border: "1px solid #5865f2",
      borderRadius: "8px",
      width: nodeWidth,
    },
  });

  // Category Nodes
  blueprint.categories.forEach((cat) => {
    initialNodes.push({
      id: cat.id,
      type: "default",
      data: {
        label: (
          <div className="flex items-center gap-2 font-semibold text-xs uppercase text-[#b5bac1] p-1">
            <Folder className="w-4 h-4 text-[#949ba4]" />
            <span className="truncate">{cat.name}</span>
          </div>
        ),
      },
      position: { x: 0, y: 0 },
      style: {
        background: "#313338",
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
      style: { stroke: "#5865f2", strokeWidth: 2 },
    });
  });

  // Channel Nodes
  blueprint.channels.forEach((chan) => {
    // If channel has no parent category, connect it to the server directly
    const parentId = chan.parentId || blueprint.server.id;
    const icon = getNodeIcon(chan.type);

    let borderColor = "#3f4147";
    if (chan.type === "voice") borderColor = "#57f287";
    if (chan.type === "stage") borderColor = "#eb459e";
    if (chan.type === "forum") borderColor = "#fee75c";

    initialNodes.push({
      id: chan.id,
      type: "default",
      data: {
        label: (
          <div className="flex items-center gap-2 text-sm p-1">
            <span className="text-lg flex-shrink-0">{icon}</span>
            <span className="truncate">{chan.name}</span>
          </div>
        ),
      },
      position: { x: 0, y: 0 },
      style: {
        background: "#2b2d31",
        color: "#dbdee1",
        border: `1px solid ${borderColor}`,
        borderRadius: "6px",
        width: nodeWidth,
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

// ── Component ──────────────────────────────────

export default function ServerGraph() {
  const { blueprint } = useServerStore();

  const graphData = useMemo(() => {
    if (!blueprint) return null;
    return convertBlueprintToGraph(blueprint);
  }, [blueprint]);

  const [nodes, setNodes, onNodesChange] = useNodesState(graphData?.nodes ?? []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graphData?.edges ?? []);

  // Update layout when blueprint changes
  useMemo(() => {
    if (graphData) {
      setNodes(graphData.nodes);
      setEdges(graphData.edges);
    }
  }, [graphData, setNodes, setEdges]);

  if (!blueprint) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
        <div className="text-discord-blurple">
          <Network className="w-8 h-8" />
        </div>
        <p className="text-sm text-text-muted">
          Analyze a server to see its graph structure.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-140px)] rounded-lg overflow-hidden border border-surface-500/30">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
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
            if (n.style?.background === "#313338") return "#3f4147";
            return "#5865f2";
          }}
          nodeColor={(n) => n.style?.background as string}
          maskColor="rgba(30, 31, 34, 0.7)"
          className="bg-surface-900 border border-surface-500/30 rounded"
        />
      </ReactFlow>
    </div>
  );
}
