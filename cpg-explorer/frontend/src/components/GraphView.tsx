'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import cytoscape, { Core, NodeSingular, StylesheetStyle } from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { Graph, Node } from '@/lib/api';

cytoscape.use(dagre);

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onCenter: () => void;
  zoomLevel: number;
}

function ZoomControls({ onZoomIn, onZoomOut, onFit, onCenter, zoomLevel }: ZoomControlsProps) {
  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-1 bg-gray-900/90 rounded-lg border border-gray-700 p-1">
      <button
        onClick={onZoomIn}
        className="p-2 hover:bg-gray-700 rounded transition-colors text-gray-300 hover:text-white"
        title="Zoom In"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12M6 12h12" />
        </svg>
      </button>
      <div className="text-xs text-center text-gray-400 py-1">
        {Math.round(zoomLevel * 100)}%
      </div>
      <button
        onClick={onZoomOut}
        className="p-2 hover:bg-gray-700 rounded transition-colors text-gray-300 hover:text-white"
        title="Zoom Out"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h12" />
        </svg>
      </button>
      <div className="border-t border-gray-700 my-1" />
      <button
        onClick={onFit}
        className="p-2 hover:bg-gray-700 rounded transition-colors text-gray-300 hover:text-white"
        title="Fit to View"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </button>
      <button
        onClick={onCenter}
        className="p-2 hover:bg-gray-700 rounded transition-colors text-gray-300 hover:text-white"
        title="Center Graph"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 10c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" />
        </svg>
      </button>
    </div>
  );
}

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
  const initTimeoutRef = useRef<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isInitializing, setIsInitializing] = useState(false);

  const handleZoomIn = useCallback(() => {
    if (cyRef.current) {
      const newZoom = Math.min(cyRef.current.zoom() * 1.3, 3);
      cyRef.current.zoom({ level: newZoom, renderedPosition: { x: cyRef.current.width() / 2, y: cyRef.current.height() / 2 } });
      setZoomLevel(newZoom);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (cyRef.current) {
      const newZoom = Math.max(cyRef.current.zoom() / 1.3, 0.2);
      cyRef.current.zoom({ level: newZoom, renderedPosition: { x: cyRef.current.width() / 2, y: cyRef.current.height() / 2 } });
      setZoomLevel(newZoom);
    }
  }, []);

  const handleFit = useCallback(() => {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 50);
      setZoomLevel(cyRef.current.zoom());
    }
  }, []);

  const handleCenter = useCallback(() => {
    if (cyRef.current) {
      cyRef.current.center();
      setZoomLevel(cyRef.current.zoom());
    }
  }, []);

  const initGraph = useCallback(() => {
    if (!containerRef.current || !graph) return;

    // Cancel any pending initialization
    if (initTimeoutRef.current) {
      cancelAnimationFrame(initTimeoutRef.current);
    }

    // Destroy existing graph immediately to free memory
    if (cyRef.current) {
      cyRef.current.destroy();
      cyRef.current = null;
    }

    setIsInitializing(true);

    // Defer heavy Cytoscape initialization to next frame to keep UI responsive
    initTimeoutRef.current = requestAnimationFrame(() => {
      if (!containerRef.current || !graph) {
        setIsInitializing(false);
        return;
      }

      // Create a set of node IDs for fast lookup
      const nodeIds = new Set(graph.nodes.map((n) => n.id));

      // Filter edges to only include those where both source and target exist
      const validEdges = graph.edges.filter(
        (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
      );

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
        ...validEdges.map((edge, i) => ({
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

      cyRef.current.on('zoom', () => {
        if (cyRef.current) {
          setZoomLevel(cyRef.current.zoom());
        }
      });

      cyRef.current.fit(undefined, 50);
      setZoomLevel(cyRef.current.zoom());
      setIsInitializing(false);
    });
  }, [graph, layoutType, onNodeClick, onNodeDoubleClick]);

  useEffect(() => {
    initGraph();
    return () => {
      if (initTimeoutRef.current) {
        cancelAnimationFrame(initTimeoutRef.current);
      }
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
      {(loading || isInitializing) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="spinner" />
        </div>
      )}
      {graph && graph.nodes.length === 0 && !loading && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          No nodes to display
        </div>
      )}
      {graph && graph.nodes.length > 0 && (
        <ZoomControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFit={handleFit}
          onCenter={handleCenter}
          zoomLevel={zoomLevel}
        />
      )}
    </div>
  );
}
