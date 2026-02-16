'use client';

import { useEffect, useState } from 'react';
import { api, Hotspot, Node } from '@/lib/api';

interface HotspotsPanelProps {
  onFunctionSelect: (node: Node) => void;
}

export default function HotspotsPanel({ onFunctionSelect }: HotspotsPanelProps) {
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    const loadHotspots = async () => {
      try {
        const data = await api.getHotspots(15);
        setHotspots(data || []);
      } catch (err) {
        console.error('Failed to load hotspots:', err);
      } finally {
        setLoading(false);
      }
    };
    loadHotspots();
  }, []);

  const handleClick = (hotspot: Hotspot) => {
    const node: Node = {
      id: hotspot.id,
      kind: 'function',
      name: hotspot.name,
      package: hotspot.package,
      file: hotspot.file,
      line: hotspot.line,
    };
    onFunctionSelect(node);
  };

  const getScoreColor = (score: number) => {
    if (score >= 50) return 'text-red-400';
    if (score >= 30) return 'text-orange-400';
    if (score >= 15) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getComplexityBadge = (complexity: number) => {
    if (complexity >= 20) return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (complexity >= 10) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    if (complexity >= 5) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-green-500/20 text-green-400 border-green-500/30';
  };

  return (
    <div className="border-t border-gray-800">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between text-sm font-medium text-gray-300 hover:bg-gray-800/50"
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
          </svg>
          Hotspots
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="max-h-64 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="spinner" />
            </div>
          ) : hotspots.length === 0 ? (
            <div className="px-3 py-4 text-sm text-gray-500 text-center">
              No hotspots found
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {hotspots.map((hotspot, index) => (
                <button
                  key={hotspot.id}
                  onClick={() => handleClick(hotspot)}
                  className="w-full text-left px-2 py-2 rounded hover:bg-gray-800/50 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-gray-500 w-4">{index + 1}</span>
                      <span className="text-sm text-gray-200 truncate group-hover:text-white">
                        {hotspot.name}
                      </span>
                    </div>
                    <span className={`text-xs font-mono ${getScoreColor(hotspot.score)}`}>
                      {hotspot.score}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 ml-6">
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${getComplexityBadge(hotspot.complexity)}`}>
                      CC:{hotspot.complexity}
                    </span>
                    <span className="text-xs text-gray-500">
                      LOC:{hotspot.loc}
                    </span>
                    <span className="text-xs text-gray-500">
                      Fan:{hotspot.fanIn}/{hotspot.fanOut}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 truncate mt-1 ml-6">
                    {hotspot.package}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
