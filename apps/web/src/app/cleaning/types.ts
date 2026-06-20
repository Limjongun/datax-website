export type MissingValueAction = 'drop_rows' | 'drop_column' | 'fill_mean' | 'fill_median' | 'fill_mode' | 'ignore';

export type OutlierMethod = 'iqr' | 'zscore';
export type OutlierAction = 'drop_rows' | 'cap' | 'ignore';

export interface OutlierConfig {
  method: OutlierMethod;
  action: OutlierAction;
}

export interface CleanConfig {
  missing_values: Record<string, MissingValueAction>;
  outliers: Record<string, OutlierConfig>;
}

export interface CleanRequest {
  data: any[];
  config: CleanConfig;
}

export interface CleanResponse {
  success: boolean;
  summary: string[];
  metrics: {
    initial_rows: number;
    final_rows: number;
    initial_cols: number;
    final_cols: number;
    rows_removed: number;
    cols_removed: number;
  };
  data: any[];
}
