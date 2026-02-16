'use client';

import { useEffect, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { api, Node, FunctionMetrics } from '@/lib/api';

interface SourceViewProps {
  selectedNode: Node | null;
}

export default function SourceView({ selectedNode }: SourceViewProps) {
  const [source, setSource] = useState<string>('');
  const [metrics, setMetrics] = useState<FunctionMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedNode) {
      setSource('');
      setMetrics(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [sourceResult, metricsResult] = await Promise.allSettled([
          selectedNode.file ? api.getSourceByFile(selectedNode.file) : Promise.resolve({ source: '' }),
          api.getFunctionMetrics(selectedNode.id),
        ]);

        if (sourceResult.status === 'fulfilled') {
          setSource(sourceResult.value.source || '');
        }
        if (metricsResult.status === 'fulfilled') {
          setMetrics(metricsResult.value);
        }
      } catch (err) {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedNode?.id, selectedNode?.file]);

  if (!selectedNode) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        Select a node to view details
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-3 border-b border-gray-800 bg-gray-900/50">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-white truncate">{selectedNode.name}</h3>
            <p className="text-sm text-gray-400 truncate">
              {selectedNode.file}
              {selectedNode.line && `:${selectedNode.line}`}
            </p>
          </div>
          <span className="flex-shrink-0 ml-2 px-2 py-1 text-xs rounded bg-blue-500/20 text-blue-400">
            {selectedNode.kind}
          </span>
        </div>
        {selectedNode.package && (
          <p className="text-xs text-gray-500 mt-1 truncate">
            Package: {selectedNode.package}
          </p>
        )}
      </div>

      {/* Metrics */}
      {metrics && (metrics.complexity > 0 || metrics.loc > 0) && (
        <div className="flex-shrink-0 p-3 border-b border-gray-800 bg-gray-900/30">
          <div className="grid grid-cols-3 gap-2 text-xs">
            {metrics.complexity > 0 && (
              <div className="flex flex-col">
                <span className="text-gray-500">Complexity</span>
                <span className={`font-medium ${
                  metrics.complexity > 10 ? 'text-red-400' :
                  metrics.complexity > 5 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {metrics.complexity}
                </span>
              </div>
            )}
            {metrics.loc > 0 && (
              <div className="flex flex-col">
                <span className="text-gray-500">LOC</span>
                <span className="font-medium text-white">{metrics.loc}</span>
              </div>
            )}
            {metrics.parameters > 0 && (
              <div className="flex flex-col">
                <span className="text-gray-500">Params</span>
                <span className="font-medium text-white">{metrics.parameters}</span>
              </div>
            )}
            {metrics.fanIn > 0 && (
              <div className="flex flex-col">
                <span className="text-gray-500">Fan-In</span>
                <span className="font-medium text-white">{metrics.fanIn}</span>
              </div>
            )}
            {metrics.fanOut > 0 && (
              <div className="flex flex-col">
                <span className="text-gray-500">Fan-Out</span>
                <span className="font-medium text-white">{metrics.fanOut}</span>
              </div>
            )}
            {metrics.returns > 0 && (
              <div className="flex flex-col">
                <span className="text-gray-500">Returns</span>
                <span className="font-medium text-white">{metrics.returns}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Source Code */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="spinner" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-400">
            {error}
          </div>
        ) : source ? (
          <SyntaxHighlighter
            language="go"
            style={vscDarkPlus}
            showLineNumbers
            lineNumberStyle={{ color: '#6b7280', minWidth: '3em' }}
            customStyle={{
              margin: 0,
              padding: '1rem',
              background: 'transparent',
              fontSize: '13px',
            }}
            wrapLines
            lineProps={(lineNumber) => {
              const style: React.CSSProperties = { display: 'block' };
              if (selectedNode.line && lineNumber === selectedNode.line) {
                style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
                style.borderLeft = '3px solid #3b82f6';
                style.marginLeft = '-3px';
              }
              return { style };
            }}
          >
            {source}
          </SyntaxHighlighter>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            No source available
          </div>
        )}
      </div>
    </div>
  );
}
