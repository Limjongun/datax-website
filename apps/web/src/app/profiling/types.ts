export interface ProfilingData {
  success: boolean;
  total_rows: number;
  total_columns: number;
  memory_usage_mb: number;
  dtypes: Record<string, string>;
  describe: Record<string, Record<string, any>>;
  unique_counts: Record<string, number>;
  preview: {
    head: any[];
    center: any[];
    tail: any[];
  };
  missing_values: Record<string, { count: number; percentage: number }>;
  duplicates: number;
  value_counts: Record<string, Record<string, number>>;
  outliers: Record<string, number>;
  skewness: Record<string, number | null>;
  kurtosis: Record<string, number | null>;
  histogram_data: Record<string, { counts: number[]; bins: number[] }>;
  boxplot_stats: Record<string, { min: number; q1: number; median: number; q3: number; max: number; outlier_points: number[] }>;
  correlation: Record<string, Record<string, number | null>>;
  spearman_correlation: Record<string, Record<string, number | null>>;
  alerts: Array<{ severity: 'error' | 'warning' | 'info'; message: string }>;
  mode: Record<string, string | null>;
  variance: Record<string, number | null>;
  iqr_stats: Record<string, { iqr: number; lower_bound: number; upper_bound: number } | null>;
  outlier_percentage: Record<string, number>;
  shapiro_wilk: Record<string, { statistic: number; p_value: number } | null>;
  trend: Record<string, number | null>;
  data_quality: Record<string, { completeness: number; uniqueness: number; consistency: number; validity: number }>;
}
