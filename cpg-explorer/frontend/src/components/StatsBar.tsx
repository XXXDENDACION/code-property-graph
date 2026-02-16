'use client';

import { useEffect, useState } from 'react';
import { api, Stats } from '@/lib/api';

export default function StatsBar() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.getStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-6 text-sm text-gray-500">
        <div className="spinner w-4 h-4" />
        Loading stats...
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const formatNumber = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };

  return (
    <div className="flex items-center gap-6 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-gray-500">Nodes:</span>
        <span className="text-white font-medium">{formatNumber(stats.totalNodes)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-500">Edges:</span>
        <span className="text-white font-medium">{formatNumber(stats.totalEdges)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-500">Functions:</span>
        <span className="text-white font-medium">{formatNumber(stats.totalFunctions)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-500">Packages:</span>
        <span className="text-white font-medium">{formatNumber(stats.totalPackages)}</span>
      </div>
    </div>
  );
}
