'use client';

import { useEffect, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { api, Node, FunctionMetrics, Finding } from '@/lib/api';

interface SourceViewProps {
  selectedNode: Node | null;
}

export default function SourceView({ selectedNode }: SourceViewProps) {
  const [source, setSource] = useState<string>('');
  const [metrics, setMetrics] = useState<FunctionMetrics | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedNode) {
      setSource('');
      setMetrics(null);
      setFindings([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [sourceResult, metricsResult, findingsResult] = await Promise.allSettled([
          selectedNode.file ? api.getSourceByFile(selectedNode.file) : Promise.resolve({ source: '' }),
          api.getFunctionMetrics(selectedNode.id),
          api.getFunctionFindings(selectedNode.id),
        ]);

        if (sourceResult.status === 'fulfilled') {
          setSource(sourceResult.value.source || '');
        }
        if (metricsResult.status === 'fulfilled') {
          setMetrics(metricsResult.value);
        }
        if (findingsResult.status === 'fulfilled') {
          setFindings(findingsResult.value || []);
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

      {/* Findings */}
      {findings.length > 0 && (
        <div className="flex-shrink-0 p-3 border-b border-gray-800 bg-gray-900/30">
          <div className="text-xs text-gray-400 mb-2 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Findings ({findings.length})
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {findings.map((finding) => (
              <div
                key={finding.id}
                className={`text-xs px-2 py-1.5 rounded border ${
                  finding.severity === 'critical' || finding.severity === 'high'
                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                    : finding.severity === 'medium'
                    ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                    : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">{finding.category}</span>
                  <span className="text-[10px] uppercase opacity-70">{finding.severity}</span>
                </div>
                {finding.message && (
                  <p className="opacity-80 mt-0.5">{finding.message}</p>
                )}
              </div>
            ))}
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
