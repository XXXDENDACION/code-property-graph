'use client';

import { useEffect, useRef, useCallback } from 'react';
import cytoscape, { Core, NodeSingular, StylesheetStyle } from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { Graph, Node } from '@/lib/api';

cytoscape.use(dagre);

interface GraphViewProps {
  graph: Graph | null;
  selectedNodeId?: string;
  onNodeClick?: (node: Node) => void;
  onNodeDoubleClick?: (node: Node) => void;
  loading?: boolean;
  layoutType?: 'dagre' | 'cose' | 'breadthfirst';
}

const nodeColors: Record<string, string> = {
  function: '#3b82f6',
  method: '#8b5cf6',
  type: '#10b981',
  package: '#f59e0b',
  default: '#6b7280',
};

const getNodeColor = (kind: string): string => {
  return nodeColors[kind] || nodeColors.default;
};

export default function GraphView({
  graph,
  selectedNodeId,
  onNodeClick,
  onNodeDoubleClick,
  loading,
  layoutType = 'dagre',
}: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  const initGraph = useCallback(() => {
    if (!containerRef.current || !graph) return;

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const elements = [
      ...graph.nodes.map((node) => ({
        data: {
          id: node.id,
          label: node.name,
          kind: node.kind,
          pkg: node.package,
          file: node.file,
          line: node.line,
          typeInfo: node.typeInfo,
        },
      })),
      ...graph.edges.map((edge, i) => ({
        data: {
          id: `edge-${i}`,
          source: edge.source,
          target: edge.target,
          kind: edge.kind,
        },
      })),
    ];

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele: NodeSingular) => getNodeColor(ele.data('kind')),
            'label': 'data(label)',
            'color': '#fff',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'font-size': 11,
            'text-margin-y': 6,
            'text-background-color': '#0a0a0a',
            'text-background-opacity': 0.8,
            'text-background-padding': 3,
            'width': 40,
            'height': 40,
            'border-width': 2,
            'border-color': '#333',
          },
        },
        {
          selector: 'node:hover',
          style: {
            'border-color': '#fff',
            'border-width': 3,
            'width': 45,
            'height': 45,
          },
        },
        {
          selector: 'node.selected',
          style: {
            'border-color': '#f59e0b',
            'border-width': 4,
            'width': 50,
            'height': 50,
          },
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#444',
            'target-arrow-color': '#444',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 1.2,
            'opacity': 0.7,
          },
        },
        {
          selector: 'edge:hover',
          style: {
            'line-color': '#666',
            'target-arrow-color': '#666',
            'opacity': 1,
          },
        },
      ] as StylesheetStyle[],
      layout: {
        name: layoutType,
        ...(layoutType === 'dagre' && {
          rankDir: 'TB',
          nodeSep: 60,
          rankSep: 80,
          padding: 30,
        }),
        ...(layoutType === 'cose' && {
          nodeRepulsion: 8000,
          idealEdgeLength: 100,
          padding: 30,
        }),
        ...(layoutType === 'breadthfirst' && {
          directed: true,
          padding: 30,
          spacingFactor: 1.5,
        }),
      } as cytoscape.LayoutOptions,
      minZoom: 0.2,
      maxZoom: 3,
      wheelSensitivity: 0.3,
    });

    cyRef.current.on('tap', 'node', (evt) => {
      const node = evt.target;
      if (onNodeClick) {
        onNodeClick(node.data() as Node);
      }
      cyRef.current?.nodes().removeClass('selected');
      node.addClass('selected');
    });

    cyRef.current.on('dbltap', 'node', (evt) => {
      const node = evt.target;
      if (onNodeDoubleClick) {
        onNodeDoubleClick(node.data() as Node);
      }
    });

    cyRef.current.fit(undefined, 50);
  }, [graph, layoutType, onNodeClick, onNodeDoubleClick]);

  useEffect(() => {
    initGraph();
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
      }
    };
  }, [initGraph]);

  useEffect(() => {
    if (cyRef.current && selectedNodeId) {
      cyRef.current.nodes().removeClass('selected');
      const node = cyRef.current.getElementById(selectedNodeId);
      if (node.length > 0) {
        node.addClass('selected');
        cyRef.current.animate({
          center: { eles: node },
          zoom: 1.5,
        } as cytoscape.AnimateOptions);
      }
    }
  }, [selectedNodeId]);

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className="w-full h-full graph-container"
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="spinner" />
        </div>
      )}
      {graph && graph.nodes.length === 0 && !loading && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          No nodes to display
        </div>
      )}
      <div className="absolute bottom-4 left-4 flex gap-2 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-blue-500" /> Function
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-purple-500" /> Method
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-500" /> Type
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-amber-500" /> Package
        </span>
      </div>
    </div>
  );
}
