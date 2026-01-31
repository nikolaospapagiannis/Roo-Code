/**
 * Enterprise-grade ExAI Guard configuration
 * Fortune 100 bulletproof standards for enterprise deployment
 */

import { ExAIGuardConfig } from './types';

/**
 * Default configuration for ExAI Guard with enterprise-grade settings
 */
export const defaultExAIGuardConfig: ExAIGuardConfig = {
  // Core settings
  enabled: true,
  realTimeDetection: true,
  autoCorrection: true,
  
  // ML and AI settings
  mlModel: {
    modelPath: './models/violation-detector',
    inputSize: 512,
    outputSize: 6, // Number of violation types
    learningRate: 0.001,
    batchSize: 32,
    epochs: 10,
    validationSplit: 0.2
  },
  
  // ChromaDB settings for organizational intelligence
  chromaDB: {
    path: 'http://localhost:8000',
    collectionName: 'exai_guard_violations',
    embeddingModel: 'all-MiniLM-L6-v2',
    similarityThreshold: 0.3
  },
  
  // Real-time processing settings
  realTime: {
    enabled: true,
    streamInterception: true,
    correctionDelay: 100, // ms
    maxViolationsPerMinute: 1000
  },
  
  // Multi-agent system settings
  multiAgent: {
    enabled: true,
    agentCount: 4,
    coordinationStrategy: 'hybrid',
    communicationProtocol: 'message-queue'
  },
  
  // Enterprise security settings
  security: {
    encryption: {
      enabled: true,
      algorithm: 'aes-256-gcm',
      keyRotation: 30 // days
    },
    authentication: {
      enabled: true,
      method: 'jwt'
    },
    audit: {
      enabled: true,
      retentionDays: 365
    }
  },
  
  // Performance and scaling settings
  maxConcurrentDetections: 100,
  violationCacheSize: 10000,
  modelUpdateInterval: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  
  // Advanced features
  confidenceCalibration: true,
  patternLearning: true,
  organizationalIntelligence: true
};

/**
 * Development configuration with relaxed settings
 */
export const developmentExAIGuardConfig: ExAIGuardConfig = {
  ...defaultExAIGuardConfig,
  realTime: {
    ...defaultExAIGuardConfig.realTime,
    maxViolationsPerMinute: 100
  },
  maxConcurrentDetections: 10,
  violationCacheSize: 1000,
  security: {
    ...defaultExAIGuardConfig.security,
    encryption: {
      enabled: false,
      algorithm: 'aes-256-gcm',
      keyRotation: 30
    },
    audit: {
      enabled: false,
      retentionDays: 7
    }
  }
};

/**
 * Production configuration with maximum security and performance
 */
export const productionExAIGuardConfig: ExAIGuardConfig = {
  ...defaultExAIGuardConfig,
  realTime: {
    ...defaultExAIGuardConfig.realTime,
    maxViolationsPerMinute: 5000
  },
  maxConcurrentDetections: 500,
  violationCacheSize: 50000,
  security: {
    ...defaultExAIGuardConfig.security,
    encryption: {
      enabled: true,
      algorithm: 'aes-256-gcm',
      keyRotation: 7 // days
    },
    audit: {
      enabled: true,
      retentionDays: 730 // 2 years
    }
  }
};

/**
 * High-performance configuration for large-scale deployments
 */
export const highPerformanceExAIGuardConfig: ExAIGuardConfig = {
  ...productionExAIGuardConfig,
  multiAgent: {
    ...productionExAIGuardConfig.multiAgent,
    agentCount: 16,
    coordinationStrategy: 'decentralized'
  },
  maxConcurrentDetections: 2000,
  violationCacheSize: 100000,
  realTime: {
    ...productionExAIGuardConfig.realTime,
    maxViolationsPerMinute: 10000
  }
};

/**
 * Configuration manager for ExAI Guard
 */
export class ExAIGuardConfigManager {
  private config: ExAIGuardConfig;
  
  constructor(initialConfig?: Partial<ExAIGuardConfig>) {
    this.config = {
      ...defaultExAIGuardConfig,
      ...initialConfig
    };
  }
  
  /**
   * Get the current configuration
   */
  getConfig(): ExAIGuardConfig {
    return { ...this.config };
  }
  
  /**
   * Update configuration with validation
   */
  updateConfig(updates: Partial<ExAIGuardConfig>): void {
    // Validate updates
    this.validateConfigUpdates(updates);
    
    // Apply updates
    this.config = {
      ...this.config,
      ...updates
    };
  }
  
  /**
   * Validate configuration updates
   */
  private validateConfigUpdates(updates: Partial<ExAIGuardConfig>): void {
    // Validate numeric values
    if (updates.maxConcurrentDetections !== undefined) {
      if (updates.maxConcurrentDetections < 1 || updates.maxConcurrentDetections > 10000) {
        throw new Error('maxConcurrentDetections must be between 1 and 10000');
      }
    }
    
    if (updates.violationCacheSize !== undefined) {
      if (updates.violationCacheSize < 100 || updates.violationCacheSize > 1000000) {
        throw new Error('violationCacheSize must be between 100 and 1000000');
      }
    }
    
    // Validate real-time settings
    if (updates.realTime) {
      if (updates.realTime.correctionDelay !== undefined && updates.realTime.correctionDelay < 0) {
        throw new Error('correctionDelay must be non-negative');
      }
      
      if (updates.realTime.maxViolationsPerMinute !== undefined && updates.realTime.maxViolationsPerMinute < 0) {
        throw new Error('maxViolationsPerMinute must be non-negative');
      }
    }
    
    // Validate ML model settings
    if (updates.mlModel) {
      if (updates.mlModel.learningRate !== undefined && (updates.mlModel.learningRate <= 0 || updates.mlModel.learningRate > 1)) {
        throw new Error('learningRate must be between 0 and 1');
      }
      
      if (updates.mlModel.batchSize !== undefined && updates.mlModel.batchSize < 1) {
        throw new Error('batchSize must be at least 1');
      }
      
      if (updates.mlModel.epochs !== undefined && updates.mlModel.epochs < 1) {
        throw new Error('epochs must be at least 1');
      }
      
      if (updates.mlModel.validationSplit !== undefined && (updates.mlModel.validationSplit < 0 || updates.mlModel.validationSplit >= 1)) {
        throw new Error('validationSplit must be between 0 and 1');
      }
    }
  }
  
  /**
   * Get configuration for specific environment
   */
  static getConfigForEnvironment(environment: string): ExAIGuardConfig {
    switch (environment.toLowerCase()) {
      case 'development':
        return developmentExAIGuardConfig;
      case 'production':
        return productionExAIGuardConfig;
      case 'high-performance':
        return highPerformanceExAIGuardConfig;
      default:
        return defaultExAIGuardConfig;
    }
  }
  
  /**
   * Validate complete configuration
   */
  static validateConfig(config: ExAIGuardConfig): string[] {
    const errors: string[] = [];
    
    // Check required fields
    if (!config.mlModel) {
      errors.push('ML model configuration is required');
    }
    
    if (config.maxConcurrentDetections < 1) {
      errors.push('maxConcurrentDetections must be at least 1');
    }
    
    if (config.violationCacheSize < 100) {
      errors.push('violationCacheSize must be at least 100');
    }
    
    // Check ML model configuration
    if (config.mlModel) {
      if (config.mlModel.inputSize < 1) {
        errors.push('ML model inputSize must be at least 1');
      }
      
      if (config.mlModel.outputSize < 1) {
        errors.push('ML model outputSize must be at least 1');
      }
      
      if (config.mlModel.learningRate <= 0 || config.mlModel.learningRate > 1) {
        errors.push('ML model learningRate must be between 0 and 1');
      }
      
      if (config.mlModel.batchSize < 1) {
        errors.push('ML model batchSize must be at least 1');
      }
      
      if (config.mlModel.epochs < 1) {
        errors.push('ML model epochs must be at least 1');
      }
      
      if (config.mlModel.validationSplit < 0 || config.mlModel.validationSplit >= 1) {
        errors.push('ML model validationSplit must be between 0 and 1');
      }
    }
    
    // Check real-time configuration
    if (config.realTime) {
      if (config.realTime.correctionDelay < 0) {
        errors.push('Real-time correctionDelay must be non-negative');
      }
      
      if (config.realTime.maxViolationsPerMinute < 0) {
        errors.push('Real-time maxViolationsPerMinute must be non-negative');
      }
    }
    
    // Check multi-agent configuration
    if (config.multiAgent) {
      if (config.multiAgent.agentCount < 1) {
        errors.push('Multi-agent agentCount must be at least 1');
      }
      
      if (!['centralized', 'decentralized', 'hybrid'].includes(config.multiAgent.coordinationStrategy)) {
        errors.push('Multi-agent coordinationStrategy must be one of: centralized, decentralized, hybrid');
      }
      
      if (!['http', 'websocket', 'message-queue'].includes(config.multiAgent.communicationProtocol)) {
        errors.push('Multi-agent communicationProtocol must be one of: http, websocket, message-queue');
      }
    }
    
    // Check security configuration
    if (config.security) {
      if (config.security.encryption.keyRotation < 1) {
        errors.push('Security encryption keyRotation must be at least 1 day');
      }
      
      if (config.security.audit.retentionDays < 1) {
        errors.push('Security audit retentionDays must be at least 1 day');
      }
    }
    
    return errors;
  }
  
  /**
   * Generate configuration schema for validation
   */
  static getConfigSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        realTimeDetection: { type: 'boolean' },
        autoCorrection: { type: 'boolean' },
        mlModel: {
          type: 'object',
          properties: {
            modelPath: { type: 'string' },
            inputSize: { type: 'number', minimum: 1 },
            outputSize: { type: 'number', minimum: 1 },
            learningRate: { type: 'number', minimum: 0, maximum: 1 },
            batchSize: { type: 'number', minimum: 1 },
            epochs: { type: 'number', minimum: 1 },
            validationSplit: { type: 'number', minimum: 0, maximum: 1 }
          },
          required: ['modelPath', 'inputSize', 'outputSize', 'learningRate', 'batchSize', 'epochs', 'validationSplit']
        },
        chromaDB: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            collectionName: { type: 'string' },
            embeddingModel: { type: 'string' },
            similarityThreshold: { type: 'number', minimum: 0, maximum: 1 }
          }
        },
        realTime: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            streamInterception: { type: 'boolean' },
            correctionDelay: { type: 'number', minimum: 0 },
            maxViolationsPerMinute: { type: 'number', minimum: 0 }
          }
        },
        multiAgent: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            agentCount: { type: 'number', minimum: 1 },
            coordinationStrategy: { type: 'string', enum: ['centralized', 'decentralized', 'hybrid'] },
            communicationProtocol: { type: 'string', enum: ['http', 'websocket', 'message-queue'] }
          }
        },
        security: {
          type: 'object',
          properties: {
            encryption: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean' },
                algorithm: { type: 'string' },
                keyRotation: { type: 'number', minimum: 1 }
              }
            },
            authentication: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean' },
                method: { type: 'string', enum: ['jwt', 'oauth', 'api-key'] }
              }
            },
            audit: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean' },
                retentionDays: { type: 'number', minimum: 1 }
              }
            }
          }
        },
        maxConcurrentDetections: { type: 'number', minimum: 1 },
        violationCacheSize: { type: 'number', minimum: 100 },
        modelUpdateInterval: { type: 'number', minimum: 0 },
        confidenceCalibration: { type: 'boolean' },
        patternLearning: { type: 'boolean' },
        organizationalIntelligence: { type: 'boolean' }
      },
      required: ['enabled', 'realTimeDetection', 'autoCorrection', 'mlModel']
    };
  }
}

// Export types for convenience
export type { ExAIGuardConfig };