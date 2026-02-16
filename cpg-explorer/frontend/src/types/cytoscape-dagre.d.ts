declare module 'cytoscape-dagre' {
  import { Core, LayoutOptions } from 'cytoscape';

  interface DagreLayoutOptions extends LayoutOptions {
    name: 'dagre';
    rankDir?: 'TB' | 'BT' | 'LR' | 'RL';
    nodeSep?: number;
    rankSep?: number;
    edgeSep?: number;
    padding?: number;
  }

  const ext: (cytoscape: (options?: any) => Core) => void;
  export = ext;
}
