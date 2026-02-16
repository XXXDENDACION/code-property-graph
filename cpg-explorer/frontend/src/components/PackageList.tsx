'use client';

import { useState, useEffect } from 'react';
import { api, Package, Node } from '@/lib/api';

interface PackageListProps {
  onFunctionSelect: (func: Node) => void;
}

export default function PackageList({ onFunctionSelect }: PackageListProps) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [functions, setFunctions] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFuncs, setLoadingFuncs] = useState(false);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const data = await api.getPackages();
        setPackages(data || []);
      } catch (err) {
        console.error('Failed to fetch packages:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPackages();
  }, []);

  const handlePackageClick = async (pkg: string) => {
    if (selectedPkg === pkg) {
      setSelectedPkg(null);
      setFunctions([]);
      return;
    }

    setSelectedPkg(pkg);
    setLoadingFuncs(true);
    try {
      const data = await api.getPackageFunctions(pkg);
      setFunctions(data || []);
    } catch (err) {
      console.error('Failed to fetch functions:', err);
      setFunctions([]);
    } finally {
      setLoadingFuncs(false);
    }
  };

  const filteredPackages = packages.filter((pkg) =>
    pkg.name.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 p-3 border-b border-gray-800">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter packages..."
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg
                     text-sm text-white placeholder-gray-500 focus:outline-none
                     focus:border-blue-500 transition-colors"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filteredPackages.map((pkg) => (
          <div key={pkg.name}>
            <button
              onClick={() => handlePackageClick(pkg.name)}
              className={`w-full px-3 py-2 text-left hover:bg-gray-800 transition-colors
                         flex items-center justify-between border-b border-gray-800/50
                         ${selectedPkg === pkg.name ? 'bg-gray-800' : ''}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0
                             ${selectedPkg === pkg.name ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                <span className="truncate text-sm">{pkg.name}</span>
              </div>
              <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                {pkg.funcCount}
              </span>
            </button>
            {selectedPkg === pkg.name && (
              <div className="bg-gray-900/50">
                {loadingFuncs ? (
                  <div className="py-4 flex justify-center">
                    <div className="spinner w-4 h-4" />
                  </div>
                ) : (
                  functions.map((func) => (
                    <button
                      key={func.id}
                      onClick={() => onFunctionSelect(func)}
                      className="w-full px-6 py-2 text-left hover:bg-gray-800 transition-colors
                                 text-sm text-gray-300 hover:text-white border-b border-gray-800/30"
                    >
                      <span className="text-blue-400">ƒ</span>{' '}
                      {func.name}
                    </button>
                  ))
                )}
                {!loadingFuncs && functions.length === 0 && (
                  <div className="py-3 px-6 text-sm text-gray-500">
                    No functions found
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {filteredPackages.length === 0 && (
          <div className="py-8 text-center text-gray-500">
            No packages found
          </div>
        )}
      </div>
    </div>
  );
}
