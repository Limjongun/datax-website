"use client";

import React, { useMemo, useCallback } from 'react';
import { useDatasetStore } from '@/store/datasetStore';
import { ArrowLeft, GitMerge, Database, Cpu, Wand2 } from 'lucide-react';
import Link from 'next/link';
import { ReactFlow, Controls, Background, MiniMap, applyNodeChanges, applyEdgeChanges, Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';

export default function LineagePage() {
  const { activeDatasetId, lineage } = useDatasetStore();

  const getIconForType = (type: string) => {
    switch (type) {
      case 'source': return <Database size={16} className="text-blue-400" />;
      case 'cleaning': return <Wand2 size={16} className="text-green-400" />;
      case 'feature_engineering': return <Cpu size={16} className="text-purple-400" />;
      default: return <GitMerge size={16} className="text-slate-400" />;
    }
  };

  const { initialNodes, initialEdges } = useMemo(() => {
    if (!lineage || lineage.length === 0) return { initialNodes: [], initialEdges: [] };

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    lineage.forEach((item, index) => {
      nodes.push({
        id: item.id,
        position: { x: 0, y: 0 },
        data: { 
          label: (
            <div className="flex flex-col gap-2 p-2">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                {getIconForType(item.type)}
                <span>{item.label}</span>
              </div>
              <div className="text-xs text-slate-500">
                {new Date(item.timestamp).toLocaleString()}
              </div>
            </div>
          )
        },
        style: {
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '4px',
          width: 250,
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
        }
      });

      if (item.parentId) {
        edges.push({
          id: `e-${item.parentId}-${item.id}`,
          source: item.parentId,
          target: item.id,
          animated: true,
          style: { stroke: '#94a3b8', strokeWidth: 2 }
        });
      } else if (index > 0) {
        edges.push({
          id: `e-${lineage[index-1].id}-${item.id}`,
          source: lineage[index-1].id,
          target: item.id,
          animated: true,
          style: { stroke: '#94a3b8', strokeWidth: 2 }
        });
      }
    });

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'LR' });

    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: 250, height: 80 });
    });

    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      node.position = {
        x: nodeWithPosition.x - 250 / 2,
        y: nodeWithPosition.y - 80 / 2,
      };
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [lineage]);

  const [nodes, setNodes] = React.useState<Node[]>(initialNodes);
  const [edges, setEdges] = React.useState<Edge[]>(initialEdges);

  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges]);

  const onNodesChange = useCallback(
    (changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  
  const onEdgesChange = useCallback(
    (changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  if (!activeDatasetId) {
    return (
      <div className="flex flex-col w-full flex-1 items-center justify-center h-full p-8 bg-slate-900 text-slate-200">
        <h2 className="text-xl">Tidak Ada Dataset Aktif</h2>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full flex-1 h-screen bg-slate-900 text-slate-200">
      <div className="flex items-center p-6 border-b border-slate-800 bg-slate-900/90 backdrop-blur shrink-0">
        <Link href="/" className="mr-4 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="bg-blue-500/10 text-blue-400 p-2 rounded-lg">
              <GitMerge size={24} />
            </span>
            Data Lineage
          </h1>
          <p className="text-sm text-slate-400 mt-1">Jejak transformasi dan perubahan dataset dari awal hingga akhir.</p>
        </div>
      </div>

      <div className="flex-1 w-full h-full bg-slate-950">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          attributionPosition="bottom-right"
          colorMode="dark"
        >
          <Background color="#334155" gap={16} />
          <Controls />
          <MiniMap nodeColor="#475569" maskColor="rgba(15, 23, 42, 0.7)" />
        </ReactFlow>
      </div>
    </div>
  );
}
