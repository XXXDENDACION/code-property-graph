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

export interface FunctionMetrics {
  id: string;
  name: string;
  package: string;
  file: string;
  line: number;
  complexity: number;
  loc: number;
  parameters: number;
  returns: number;
  fanIn: number;
  fanOut: number;
}

export interface Hotspot {
  id: string;
  name: string;
  package: string;
  file: string;
  line: number;
  complexity: number;
  loc: number;
  fanIn: number;
  fanOut: number;
  score: number;
}

export interface Finding {
  id: string;
  category: string;
  severity: string;
  message: string;
  file: string;
  line: number;
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

  getFunctionMetrics: (funcId: string) =>
    fetchAPI<FunctionMetrics>(`/api/function/metrics?id=${encodeURIComponent(funcId)}`),

  getSourceByFile: (file: string) =>
    fetchAPI<{ source: string; file: string }>(`/api/source?file=${encodeURIComponent(file)}`),

  search: (query: string, limit = 50) =>
    fetchAPI<SearchResult[]>(`/api/search?q=${encodeURIComponent(query)}&limit=${limit}`),

  searchCode: (query: string, limit = 30) =>
    fetchAPI<SearchResult[]>(`/api/search/code?q=${encodeURIComponent(query)}&limit=${limit}`),

  getHotspots: (limit = 20) =>
    fetchAPI<Hotspot[]>(`/api/hotspots?limit=${limit}`),

  getFunctionFindings: (funcId: string) =>
    fetchAPI<Finding[]>(`/api/function/findings?id=${encodeURIComponent(funcId)}`),

  healthCheck: () => fetchAPI<{ status: string }>('/api/health'),
};
