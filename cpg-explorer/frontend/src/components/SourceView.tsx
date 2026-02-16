'use client';

import { useEffect, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { api, Node } from '@/lib/api';

interface SourceViewProps {
  selectedNode: Node | null;
}

export default function SourceView({ selectedNode }: SourceViewProps) {
  const [source, setSource] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedNode?.file) {
      setSource('');
      return;
    }

    const fetchSource = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await api.getSourceByFile(selectedNode.file!);
        setSource(result.source || '');
      } catch (err) {
        setError('Failed to load source code');
        setSource('');
      } finally {
        setLoading(false);
      }
    };

    fetchSource();
  }, [selectedNode?.file]);

  if (!selectedNode) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        Select a node to view source code
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 p-3 border-b border-gray-800 bg-gray-900/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-white">{selectedNode.name}</h3>
            <p className="text-sm text-gray-400">
              {selectedNode.file}
              {selectedNode.line && `:${selectedNode.line}`}
            </p>
          </div>
          <span className="px-2 py-1 text-xs rounded bg-blue-500/20 text-blue-400">
            {selectedNode.kind}
          </span>
        </div>
        {selectedNode.package && (
          <p className="text-xs text-gray-500 mt-1">
            Package: {selectedNode.package}
          </p>
        )}
      </div>
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
