/**
 * Enterprise-grade ExAI Guard type definitions
 * Fortune 100 bulletproof standards for violation detection and correction
 */

export enum ViolationType {
  SECURITY = 'security',
  QUALITY = 'quality',
  PERFORMANCE = 'performance',
  ACCESSIBILITY = 'accessibility',
  COMPLIANCE = 'compliance',
  ETHICAL = 'ethical'
}

export enum ViolationSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ExAIViolation {
  type: ViolationType;
  severity: ViolationSeverity;
  message: string;
  content: string;
  confidence: number;
  timestamp: Date;
  correction: string;
  metadata?: Record<string, any>;
}

export interface MLModelConfig {
  modelPath: string;
  inputSize: number;
  outputSize: number;
  learningRate: number;
  batchSize: number;
  epochs: number;
  validationSplit: number;
}

export interface ChromaDBConfig {
  path: string;
  collectionName: string;
  embeddingModel: string;
  similarityThreshold: number;
}

export interface RealTimeConfig {
  enabled: boolean;
  streamInterception: boolean;
  correctionDelay: number;
  maxViolationsPerMinute: number;
}

export interface MultiAgentConfig {
  enabled: boolean;
  agentCount: number;
  coordinationStrategy: 'centralized' | 'decentralized' | 'hybrid';
  communicationProtocol: 'http' | 'websocket' | 'message-queue';
}

export interface EnterpriseSecurityConfig {
  encryption: {
    enabled: boolean;
    algorithm: string;
    keyRotation: number;
  };
  authentication: {
    enabled: boolean;
    method: 'jwt' | 'oauth' | 'api-key';
  };
  audit: {
    enabled: boolean;
    retentionDays: number;
  };
}

export interface ExAIGuardConfig {
  // Core settings
  enabled: boolean;
  realTimeDetection: boolean;
  autoCorrection: boolean;
  
  // ML and AI settings
  mlModel: MLModelConfig;
  chromaDB?: ChromaDBConfig;
  
  // Enterprise features
  realTime: RealTimeConfig;
  multiAgent: MultiAgentConfig;
  security: EnterpriseSecurityConfig;
  
  // Performance and scaling
  maxConcurrentDetections: number;
  violationCacheSize: number;
  modelUpdateInterval: number;
  
  // Advanced features
  confidenceCalibration: boolean;
  patternLearning: boolean;
  organizationalIntelligence: boolean;
}

export interface DetectionContext {
  userId?: string;
  workspaceId?: string;
  projectType?: string;
  urgency?: number;
  complexity?: number;
  isCode?: boolean;
  language?: string;
  filePath?: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export interface CorrectionResult {
  success: boolean;
  correctedContent: string;
  appliedCorrections: string[];
  remainingViolations: ExAIViolation[];
  metadata?: Record<string, any>;
}

export interface MLTrainingData {
  content: string;
  violations: ExAIViolation[];
  context: DetectionContext;
  timestamp: Date;
}

export interface OrganizationalPattern {
  id: string;
  content: string;
  violationType: ViolationType;
  severity: ViolationSeverity;
  correction: string;
  frequency: number;
  confidence: number;
  lastSeen: Date;
  metadata?: Record<string, any>;
}

export interface AgentCoordinationMessage {
  id: string;
  type: 'violation' | 'correction' | 'pattern' | 'heartbeat';
  sender: string;
  recipient?: string;
  payload: any;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface RealTimeStreamEvent {
  type: 'content' | 'violation' | 'correction' | 'completion';
  data: any;
  timestamp: Date;
  sequence: number;
}

export interface ConfidenceMetrics {
  overall: number;
  byType: Record<ViolationType, number>;
  calibration: {
    expected: number;
    observed: number;
    bias: number;
  };
}

export interface PerformanceMetrics {
  detectionTime: number;
  correctionTime: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  throughput: number;
  memoryUsage: number;
}

export interface EnterpriseAuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  timestamp: Date;
  violations: ExAIViolation[];
  corrections: CorrectionResult[];
  metadata: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

// Neural network specific types
export interface NeuralNetworkLayer {
  type: 'dense' | 'convolutional' | 'recurrent' | 'dropout';
  units?: number;
  activation?: string;
  inputShape?: number[];
  rate?: number;
}

export interface NeuralNetworkArchitecture {
  layers: NeuralNetworkLayer[];
  optimizer: string;
  loss: string;
  metrics: string[];
}

// ChromaDB specific types
export interface ChromaDBQueryResult {
  ids: string[][];
  embeddings: number[][];
  documents: string[][];
  metadatas: any[][];
  distances: number[][];
}

export interface ChromaDBCollectionConfig {
  name: string;
  metadata?: Record<string, any>;
}

// Real-time processing types
export interface StreamProcessorConfig {
  bufferSize: number;
  processingWindow: number;
  maxConcurrentStreams: number;
  timeout: number;
}

export interface ViolationPattern {
  id: string;
  pattern: RegExp | string;
  type: ViolationType;
  severity: ViolationSeverity;
  message: string;
  correction: string;
  confidence: number;
  context?: string[];
}

// Multi-agent system types
export interface AgentConfig {
  id: string;
  type: 'detector' | 'corrector' | 'coordinator' | 'analyzer';
  capabilities: ViolationType[];
  load: number;
  status: 'active' | 'inactive' | 'maintenance';
}

export interface AgentWorkload {
  agentId: string;
  currentLoad: number;
  maxLoad: number;
  queueSize: number;
  lastHeartbeat: Date;
}

// Enterprise security types
export interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  rules: SecurityRule[];
  enforcement: 'block' | 'warn' | 'log';
}

export interface SecurityRule {
  id: string;
  pattern: string;
  type: ViolationType;
  severity: ViolationSeverity;
  conditions: Record<string, any>;
}

// Export all types for easy importing
export type {
  ExAIViolation as Violation,
  ExAIGuardConfig as Config,
  DetectionContext as Context,
  CorrectionResult as Correction
};