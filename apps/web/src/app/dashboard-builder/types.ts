import type { Layout } from 'react-grid-layout';

export type WidgetType = 'bar-chart' | 'line-chart' | 'pie-chart' | 'kpi-card' | 'data-table' | 'text-box';

export interface DashboardWidget {
  id: string; // This corresponds to the 'i' property in react-grid-layout
  type: WidgetType;
  title: string;
  // This config object will hold user configurations (e.g., selected columns, aggregation)
  // It is fully JSON serializable so it can be saved to the database.
  config: Record<string, any>; 
}

export interface DashboardState {
  id?: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  layout: Layout[]; // The ReactGridLayout array
}
