export type RechargeStatus =
  | "ELIGIBLE"
  | "CONDITIONALLY_ELIGIBLE"
  | "NOT_ELIGIBLE"
  | "INSUFFICIENT_DATA"
  | "REVIEW_REQUIRED";

export type CriterionResult = "pass" | "fail" | "unknown" | "review";

export interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface Property {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  notes: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoofSegmentInput {
  label: string;
  area_m2: number;
  material: string;
  runoff_coefficient?: number | null;
  area_method?: string;
}

export interface RainfallInput {
  annual_mm: number;
  monthly_mm?: number[] | null;
  source?: string;
  period?: string;
}

export interface DemandInput {
  people: number;
  litres_per_person_per_day: number;
}

export interface SiteInput {
  infiltration_mm_per_hr?: number | null;
  water_table_depth_m?: number | null;
  contamination_distance_m?: number | null;
  available_space_m2?: number | null;
  slope_pct?: number | null;
  soil_class?: string | null;
}

export interface GeometryInput {
  eave_length_m?: number | null;
  building_height_m?: number;
  tank_distance_m?: number;
  recharge_distance_m?: number;
}

export interface AssessmentInputPayload {
  segments: RoofSegmentInput[];
  rainfall: RainfallInput;
  demand: DemandInput;
  site: SiteInput;
  geometry: GeometryInput;
  target_reliability: number;
  region?: string;
}

export interface WarningItem {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
}

export interface SourceRef {
  key: string;
  title: string;
  publisher: string;
  year: number | null;
  locator: string | null;
  url: string | null;
  status: string;
}

export interface RooftopResult {
  area_m2: number;
  gross_rainfall_m3: number;
  runoff_m3: number;
  first_flush_m3: number;
  filter_loss_m3: number;
  net_m3: number;
  monthly_net_m3: number[] | null;
  warnings: WarningItem[];
}

export interface TankOption {
  shape: string;
  material: string;
  dimensions: Record<string, number>;
  gross_m3: number;
  usable_m3: number;
  reliability: number | null;
  overflow_m3: number | null;
  unmet_m3: number | null;
  months_empty: number | null;
  label: string;
}

export interface StorageResult {
  demand_m3: number;
  recommended: TankOption | null;
  options: TankOption[];
  target_reliability: number;
  warnings: WarningItem[];
}

export interface CriterionEvaluation {
  id: string;
  label: string;
  value: number | null;
  unit: string | null;
  result: CriterionResult;
  threshold: string | null;
  source: SourceRef | null;
  note: string | null;
}

export interface RechargeResult {
  status: RechargeStatus;
  criteria: CriterionEvaluation[];
  missing: string[];
  reasons: string[];
  warnings: WarningItem[];
}

export interface MediaLayer {
  order: number;
  thickness_mm: number;
  material: string;
}

export interface StructureOption {
  type: string;
  shape: string;
  dimensions: Record<string, number>;
  depth_m: number;
  working_volume_m3: number;
  design_volume_m3: number;
  percolation_m3_per_hr: number;
  fraction_handled: number;
  clearance_above_water_table_m: number;
  media_layers: MediaLayer[];
  note: string | null;
}

export interface PipeLine {
  id: string;
  purpose: string;
  from_point: string;
  to_point: string;
  diameter_mm: number;
  length_m: number;
  slope: string;
}

export interface QuantityItem {
  item: string;
  unit: string;
  quantity: number;
  note: string | null;
}

export interface AssessmentResult {
  rooftop: RooftopResult;
  storage: StorageResult;
  recharge: RechargeResult;
  structure: StructureOption | null;
  system: string;
  piping: PipeLine[];
  quantities: QuantityItem[];
  warnings: WarningItem[];
  sources: SourceRef[];
  method_version: string;
  coverage: Record<string, number>;
  notes: string[];
}

export interface AssessmentSummary {
  id: string;
  property_id: string;
  label: string;
  system: string;
  recharge_status: RechargeStatus;
  annual_net_litres: number;
  tank_usable_m3: number;
  method_version: string;
  created_at: string;
}

export interface AssessmentDetail extends AssessmentSummary {
  input: AssessmentInputPayload;
  result: AssessmentResult;
}

export interface AiConceptResponse {
  configured: boolean;
  message: string;
  image_data_url: string | null;
  narrative: string | null;
  model: string | null;
}
