export type EncodingMethod = 'onehot' | 'label';
export type ScalingMethod = 'standard' | 'minmax' | 'robust';
export type TransformationMethod = 'log' | 'sqrt' | 'binning_equal_width';

export interface EncodingConfig {
  column: string;
  method: EncodingMethod;
  drop_original?: boolean;
}

export interface ScalingConfig {
  column: string;
  method: ScalingMethod;
  drop_original?: boolean;
}

export interface TransformationConfig {
  column: string;
  method: TransformationMethod;
  bins?: number;
  drop_original?: boolean;
}

export interface CreationConfig {
  new_column: string;
  formula: string;
}

export interface FeatureEngineeringConfig {
  encoding: EncodingConfig[];
  scaling: ScalingConfig[];
  transformation: TransformationConfig[];
  creation: CreationConfig[];
}

export interface FeatureEngineeringRequest {
  data: any[];
  config: FeatureEngineeringConfig;
}

export interface FeatureEngineeringResponse {
  success: boolean;
  summary: string[];
  data: any[];
}
