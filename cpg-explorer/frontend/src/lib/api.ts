const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050';

export interface Node {
  id: string;
  kind: string;
  name: string;
  file?: string;
  line?: number;
  package?: string;
  typeInfo?: string;
}

export interface Edge {
  source: string;
  target: string;
  kind: string;
}

export interface Graph {
  nodes: Node[];
  edges: Edge[];
}

export interface Package {
  name: string;
  module?: string;
  fileCount: number;
  funcCount: number;
}

export interface SearchResult {
  id: string;
  kind: string;
  name: string;
  package?: string;
  file?: string;
  line?: number;
}

export interface Stats {
  totalNodes: number;
  totalEdges: number;
  totalFunctions: number;
  totalPackages: number;
  totalFiles: number;
}

async function fetchAPI<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`);
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

export const api = {
  getStats: () => fetchAPI<Stats>('/api/stats'),

  getPackages: () => fetchAPI<Package[]>('/api/packages'),

  getPackageGraph: () => fetchAPI<Graph>('/api/packages/graph'),

  getPackageFunctions: (pkg: string) =>
    fetchAPI<Node[]>(`/api/packages/${encodeURIComponent(pkg)}/functions`),

  getCallGraph: (funcId: string, depth = 2, direction: 'callees' | 'callers' = 'callees') =>
    fetchAPI<Graph>(`/api/callgraph?id=${encodeURIComponent(funcId)}&depth=${depth}&direction=${direction}`),

  getSource: (funcId: string) =>
    fetchAPI<{ source: string }>(`/api/function/source?id=${encodeURIComponent(funcId)}`),

  getSourceByFile: (file: string) =>
    fetchAPI<{ source: string; file: string }>(`/api/source?file=${encodeURIComponent(file)}`),

  search: (query: string, limit = 50) =>
    fetchAPI<SearchResult[]>(`/api/search?q=${encodeURIComponent(query)}&limit=${limit}`),

  healthCheck: () => fetchAPI<{ status: string }>('/api/health'),
};
