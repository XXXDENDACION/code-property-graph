'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import SearchBar from '@/components/SearchBar';
import PackageList from '@/components/PackageList';
import SourceView from '@/components/SourceView';
import StatsBar from '@/components/StatsBar';
import { api, Graph, Node, SearchResult } from '@/lib/api';

const GraphView = dynamic(() => import('@/components/GraphView'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="spinner" />
    </div>
  ),
});

type ViewMode = 'callgraph' | 'callers';

export default function Home() {
  const [graph, setGraph] = useState<Graph | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('callgraph');
  const [depth, setDepth] = useState(2);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sourceOpen, setSourceOpen] = useState(true);

  const loadCallGraph = useCallback(
    async (funcId: string, direction: 'callees' | 'callers' = 'callees', depthOverride?: number) => {
      setLoading(true);
      try {
        const data = await api.getCallGraph(funcId, depthOverride ?? depth, direction);
        setGraph(data);
      } catch (err) {
        console.error('Failed to load call graph:', err);
      } finally {
        setLoading(false);
      }
    },
    [depth]
  );

  const handleFunctionSelect = useCallback(
    (func: Node) => {
      setSelectedNode(func);
      loadCallGraph(func.id, viewMode === 'callers' ? 'callers' : 'callees');
    },
    [loadCallGraph, viewMode]
  );

  const handleSearchSelect = useCallback(
    (result: SearchResult) => {
      const node: Node = {
        id: result.id,
        kind: result.kind,
        name: result.name,
        package: result.package,
        file: result.file,
        line: result.line,
      };
      handleFunctionSelect(node);
    },
    [handleFunctionSelect]
  );

  const handleNodeClick = useCallback((node: Node) => {
    setSelectedNode(node);
  }, []);

  const handleNodeDoubleClick = useCallback(
    (node: Node) => {
      loadCallGraph(node.id, viewMode === 'callers' ? 'callers' : 'callees');
      setSelectedNode(node);
    },
    [loadCallGraph, viewMode]
  );

  const handleViewModeChange = useCallback(
    (mode: ViewMode) => {
      setViewMode(mode);
      if (selectedNode) {
        loadCallGraph(selectedNode.id, mode === 'callers' ? 'callers' : 'callees');
      }
    },
    [selectedNode, loadCallGraph]
  );

  const handleDepthChange = useCallback(
    (newDepth: number) => {
      setDepth(newDepth);
      if (selectedNode) {
        loadCallGraph(
          selectedNode.id,
          viewMode === 'callers' ? 'callers' : 'callees',
          newDepth
        );
      }
    },
    [selectedNode, viewMode, loadCallGraph]
  );

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Header */}
      <header className="flex-shrink-0 h-14 border-b border-gray-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            CPG Explorer
          </h1>
          <SearchBar onSelect={handleSearchSelect} />
        </div>
        <StatsBar />
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`flex-shrink-0 border-r border-gray-800 bg-gray-900/30 transition-all duration-300
                     ${sidebarOpen ? 'w-72' : 'w-0'}`}
        >
          {sidebarOpen && <PackageList onFunctionSelect={handleFunctionSelect} />}
        </aside>

        {/* Toggle Sidebar Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex-shrink-0 w-6 flex items-center justify-center hover:bg-gray-800
                     transition-colors border-r border-gray-800"
        >
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Graph Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Graph Controls */}
          <div className="flex-shrink-0 h-12 border-b border-gray-800 flex items-center justify-between px-4 bg-gray-900/30">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">View:</span>
                <div className="flex rounded-lg overflow-hidden border border-gray-700">
                  <button
                    onClick={() => handleViewModeChange('callgraph')}
                    className={`px-3 py-1 text-sm transition-colors ${
                      viewMode === 'callgraph'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    Callees
                  </button>
                  <button
                    onClick={() => handleViewModeChange('callers')}
                    className={`px-3 py-1 text-sm transition-colors ${
                      viewMode === 'callers'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    Callers
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Depth:</span>
                <div className="flex rounded-lg overflow-hidden border border-gray-700">
                  {[1, 2, 3, 4, 5].map((d) => (
                    <button
                      key={d}
                      onClick={() => handleDepthChange(d)}
                      className={`px-3 py-1 text-sm transition-colors ${
                        depth === d
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {graph && (
              <div className="text-sm text-gray-500">
                {graph.nodes.length} nodes, {graph.edges.length} edges
              </div>
            )}
          </div>

          {/* Graph View */}
          <div className="flex-1 overflow-hidden">
            {!graph ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <svg className="w-16 h-16 mb-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                  />
                </svg>
                <p className="text-lg mb-2">Select a function to explore</p>
                <p className="text-sm">Use the sidebar or search to find functions</p>
              </div>
            ) : (
              <GraphView
                graph={graph}
                selectedNodeId={selectedNode?.id}
                onNodeClick={handleNodeClick}
                onNodeDoubleClick={handleNodeDoubleClick}
                loading={loading}
              />
            )}
          </div>
        </main>

        {/* Toggle Source Button */}
        <button
          onClick={() => setSourceOpen(!sourceOpen)}
          className="flex-shrink-0 w-6 flex items-center justify-center hover:bg-gray-800
                     transition-colors border-l border-gray-800"
        >
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${sourceOpen ? '' : 'rotate-180'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Source Panel */}
        <aside
          className={`flex-shrink-0 border-l border-gray-800 bg-gray-900/30 transition-all duration-300
                     ${sourceOpen ? 'w-96' : 'w-0'}`}
        >
          {sourceOpen && <SourceView selectedNode={selectedNode} />}
        </aside>
      </div>
    </div>
  );
}
