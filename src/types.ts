/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "ANALYST" | "VIEWER";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface ColumnProfile {
  name: string;
  type: "numeric" | "categorical" | "date" | "boolean";
  nullCount: number;
  uniqueCount: number;
  uniqueValues?: string[];
  mean?: number;
  median?: number;
  min?: number;
  max?: number;
  stdDev?: number;
  mostFrequent?: { value: string; count: number };
}

export interface DataCleanLog {
  timestamp: string;
  action: string;
  affectedRows: number;
  details: string;
}

export interface Dataset {
  id: string;
  name: string;
  rowCount: number;
  colCount: number;
  columns: ColumnProfile[];
  data: Record<string, any>[]; // raw rows
  cleanData: Record<string, any>[]; // cleaned rows
  cleanLogs: DataCleanLog[];
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  userId: string;
  datasets: Dataset[];
  selectedDatasetId?: string;
  createdAt: string;
}

export type ProblemType = "regression" | "classification";

export interface ModelMetrics {
  // Regression metrics
  r2?: number;
  rmse?: number;
  mae?: number;
  // Classification metrics
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  auc?: number;
}

export interface LeaderboardEntry {
  algorithm: string;
  problemType: ProblemType;
  metrics: ModelMetrics;
  status: "completed" | "failed";
}

export interface FeatureImportance {
  feature: string;
  importance: number; // 0 to 1
  correlation?: number; // -1 to 1 for continuous
}

export interface LocalExplanation {
  feature: string;
  value: any;
  contribution: number; // impact on single prediction
}

export interface ModelRun {
  id: string;
  projectId: string;
  datasetId: string;
  targetColumn: string;
  problemType: ProblemType;
  algorithm: string;
  hyperparams: Record<string, any>;
  metrics: ModelMetrics;
  leaderboard: LeaderboardEntry[];
  featureImportance: FeatureImportance[];
  createdAt: string;
  isProduction: boolean;
}

export interface ForecastPoint {
  date: string;
  actual?: number;
  forecast?: number;
  lowerConfidence?: number;
  upperConfidence?: number;
}

export interface ForecastResult {
  columnName: string;
  dateColumn: string;
  horizon: number;
  points: ForecastPoint[];
  seasonalityDetected: string;
  r2Score: number;
}

export interface Anomaly {
  id: string;
  rowIndex: number;
  timestamp: string;
  columnName: string;
  value: number;
  expectedValue: number;
  deviation: number; // standard deviations or percent
  isLogged: boolean;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  tableData?: Record<string, any>[];
  chartData?: {
    type: "bar" | "line" | "scatter" | "pie";
    xKey: string;
    yKeys: string[];
    data: any[];
  };
  suggestions?: string[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  component?: string;
  details: string;
}

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number; // MB
  activeSockets: number;
  averageLatencyMs: number;
  requestsTotal: number;
  errorsTotal: number;
  queueLength: number;
}
