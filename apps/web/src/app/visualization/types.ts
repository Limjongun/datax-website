export type ChartType = 'bar' | 'line' | 'scatter' | 'pie' | 'heatmap' | 'correlation';

export interface ChartConfig {
  id: string;
  type: ChartType;
  xAxisCol: string;
  yAxisCols: string[];
}
