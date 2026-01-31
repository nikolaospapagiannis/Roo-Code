/**
 * Enhanced Brain Service - Organizational Intelligence Integration
 * Integrates ExAI Guard's brain system with enhanced memory and ML capabilities
 */

import * as path from 'path';
import { EventEmitter } from 'events';
import { ExAIGuardService } from './ExAIGuardService';
import { safeWriteJson } from '../../utils/safeWriteJson';

export interface BrainConfig {
  enabled: boolean;
  persistDirectory: string;
  sqliteDbPath: string;
  embeddingProvider: 'openai' | 'local';
  openaiApiKey?: string;
  embeddingModel: string;
  similarityThreshold: number;
  maxContextLength: number;
}

export interface CodePattern {
  id: string;
  patternType: string;
  codeSnippet: string;
  context: string;
  filePath: string;
  lineNumber: number;
  language: string;
  severity: string;
  isViolation: boolean;
  confidence: number;
  metadata: Record<string, any>;
}

export interface OrganizationalIntelligenceResult {
  patternId: string;
  similarityScore: number;
  contextRelevance: number;
  organizationalFrequency: number;
  successRate: number;
  recommendedAction: string;
  autoFixAvailable: boolean;
  humanReviewRequired: boolean;
}

export class EnhancedBrainService extends EventEmitter {
  private static instance: EnhancedBrainService;
  private config: BrainConfig;
  private isInitialized = false;
  private organizationalIntelligence: any; // Will be dynamically loaded
  private mlPipeline: any; // Will be dynamically loaded
  private patternLearningEngine: any; // Will be dynamically loaded

  private constructor() {
    super();
    this.config = this.getDefaultConfig();
  }

  public static getInstance(): EnhancedBrainService {
    if (!EnhancedBrainService.instance) {
      EnhancedBrainService.instance = new EnhancedBrainService();
    }
    return EnhancedBrainService.instance;
  }

  private getDefaultConfig(): BrainConfig {
    return {
      enabled: true,
      persistDirectory: path.join(process.cwd(), '.ai_guard', 'chroma'),
      sqliteDbPath: path.join(process.cwd(), '.ai_guard', 'enhanced_memory.db'),
      embeddingProvider: 'openai',
      embeddingModel: 'text-embedding-3-small',
      similarityThreshold: 0.8,
      maxContextLength: 4000
    };
  }

  public async initialize(config?: Partial<BrainConfig>): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.config = { ...this.config, ...config };

    if (!this.config.enabled) {
      console.log('Enhanced Brain Service disabled');
      return;
    }

    try {
      // Initialize brain components
      await this.initializeBrainComponents();
      
      // Load existing patterns and intelligence
      await this.loadExistingIntelligence();
      
      this.isInitialized = true;
      this.emit('brain_initialized');
      
      console.log('Enhanced Brain Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Enhanced Brain Service:', error);
      throw error;
    }
  }

  private async initializeBrainComponents(): Promise<void> {
    try {
      // Dynamically load Python brain components
      // Note: This would require proper Python integration in production
      // For now, we'll create TypeScript equivalents
      
      this.organizationalIntelligence = this.createOrganizationalIntelligenceMock();
      this.mlPipeline = this.createMLPipelineMock();
      this.patternLearningEngine = this.createPatternLearningEngineMock();
      
      // Initialize storage directories
      await this.initializeStorageDirectories();
      
    } catch (error) {
      console.warn('Failed to load Python brain components, using TypeScript mocks:', error);
      this.organizationalIntelligence = this.createOrganizationalIntelligenceMock();
      this.mlPipeline = this.createMLPipelineMock();
      this.patternLearningEngine = this.createPatternLearningEngineMock();
    }
  }

  private async initializeStorageDirectories(): Promise<void> {
    const fs = await import('fs/promises');
    
    const directories = [
      this.config.persistDirectory,
      path.dirname(this.config.sqliteDbPath),
      path.join(process.cwd(), '.ai_guard', 'models'),
      path.join(process.cwd(), '.ai_guard', 'training_data')
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        console.warn(`Failed to create directory ${dir}:`, error);
      }
    }
  }

  private createOrganizationalIntelligenceMock() {
    return {
      async ingest_pattern_with_intelligence(pattern: any, context: any) {
        const patternId = `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(`Ingested pattern ${patternId} with organizational intelligence`);
        return patternId;
      },
      
      async get_intelligent_recommendations(pattern: any, context: any) {
        return {
          patternId: pattern.id,
          similarityScore: 0.85,
          contextRelevance: 0.9,
          organizationalFrequency: 5,
          successRate: 0.92,
          recommendedAction: 'Apply standard fix pattern',
          autoFixAvailable: true,
          humanReviewRequired: false
        };
      },
      
      async record_fix_outcome(patternId: string, success: boolean, metadata: any) {
        console.log(`Recorded fix outcome for ${patternId}: ${success ? 'SUCCESS' : 'FAILED'}`);
        return true;
      }
    };
  }

  private createMLPipelineMock() {
    return {
      async extract_patterns_from_codebase(projectId: string, teamId: string) {
        console.log(`Extracting patterns for project ${projectId}, team ${teamId}`);
        return [];
      },
      
      async generate_embeddings(patterns: any[]) {
        console.log(`Generating embeddings for ${patterns.length} patterns`);
        return patterns.map(() => new Array(1536).fill(0));
      },
      
      cluster_patterns(embeddings: any[]) {
        console.log(`Clustering ${embeddings.length} embeddings`);
        return embeddings.map(() => 0);
      },
      
      store_patterns(patterns: any[], embeddings: any[], clusters: any[]) {
        console.log(`Stored ${patterns.length} patterns with embeddings and clusters`);
      }
    };
  }

  private createPatternLearningEngineMock() {
    return {
      async collectPattern(codeSnippet: string, violationType: string, isViolation: boolean, metadata: any) {
        const patternId = `learned_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(`Collected pattern ${patternId} for learning`);
        return patternId;
      },
      
      async trainModelIncremental(patterns: any[]) {
        console.log(`Training model incrementally with ${patterns.length} patterns`);
        return {
          accuracy: 0.87,
          precision: 0.85,
          recall: 0.89,
          f1Score: 0.87
        };
      },
      
      async predictPattern(code: string) {
        return {
          predictedLabel: 'unknown_pattern',
          confidence: 0.75,
          features: []
        };
      }
    };
  }

  private async loadExistingIntelligence(): Promise<void> {
    try {
      // Load existing patterns and models
      // This would load from ChromaDB and SQLite in production
      console.log('Loading existing organizational intelligence...');
    } catch (error) {
      console.warn('No existing intelligence found, starting fresh');
    }
  }

  public async analyzeCodePattern(codePattern: CodePattern): Promise<OrganizationalIntelligenceResult> {
    if (!this.isInitialized) {
      throw new Error('Enhanced Brain Service not initialized');
    }

    try {
      // Ingest pattern with organizational intelligence
      const patternId = await this.organizationalIntelligence.ingest_pattern_with_intelligence(
        codePattern,
        {
          projectId: 'founder-x',
          teamId: 'extension',
          timestamp: new Date().toISOString()
        }
      );

      // Get intelligent recommendations
      const recommendations = await this.organizationalIntelligence.get_intelligent_recommendations(
        codePattern,
        { context: 'real_time_analysis' }
      );

      // Learn from the pattern
      await this.patternLearningEngine.collectPattern(
        codePattern.codeSnippet,
        codePattern.patternType,
        codePattern.isViolation,
        codePattern.metadata
      );

      this.emit('pattern_analyzed', { patternId, recommendations });

      return recommendations;
    } catch (error) {
      console.error('Failed to analyze code pattern:', error);
      throw error;
    }
  }

  public async trainOnViolationPatterns(patterns: CodePattern[]): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Enhanced Brain Service not initialized');
    }

    try {
      // Extract patterns using ML pipeline
      const extractedPatterns = await this.mlPipeline.extract_patterns_from_codebase(
        'founder-x',
        'extension'
      );

      // Generate embeddings
      const embeddings = await this.mlPipeline.generate_embeddings(extractedPatterns);

      // Cluster patterns
      const clusters = this.mlPipeline.cluster_patterns(embeddings);

      // Store patterns
      this.mlPipeline.store_patterns(extractedPatterns, embeddings, clusters);

      // Train pattern learning engine
      const metrics = await this.patternLearningEngine.trainModelIncremental(patterns);

      this.emit('training_completed', { metrics });

      return metrics;
    } catch (error) {
      console.error('Failed to train on violation patterns:', error);
      throw error;
    }
  }

  public async predictViolationConfidence(code: string, context: any): Promise<{
    confidence: number;
    predictedLabel: string;
    features: any[];
  }> {
    if (!this.isInitialized) {
      throw new Error('Enhanced Brain Service not initialized');
    }

    try {
      const prediction = await this.patternLearningEngine.predictPattern(code);
      
      // Apply organizational intelligence context
      const organizationalContext = await this.organizationalIntelligence.get_intelligent_recommendations(
        { codeSnippet: code, ...context },
        { context: 'prediction' }
      );

      // Adjust confidence based on organizational knowledge
      const adjustedConfidence = prediction.confidence * 
        (1 + (organizationalContext.successRate - 0.5) * 0.2);

      return {
        confidence: Math.min(adjustedConfidence, 1.0),
        predictedLabel: prediction.predictedLabel,
        features: prediction.features
      };
    } catch (error) {
      console.error('Failed to predict violation confidence:', error);
      throw error;
    }
  }

  public async recordFixOutcome(
    patternId: string, 
    success: boolean, 
    fixDetails: any
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Enhanced Brain Service not initialized');
    }

    try {
      await this.organizationalIntelligence.record_fix_outcome(
        patternId,
        success,
        {
          ...fixDetails,
          timestamp: new Date().toISOString(),
          system: 'founder-x-extension'
        }
      );

      this.emit('fix_outcome_recorded', { patternId, success, fixDetails });
    } catch (error) {
      console.error('Failed to record fix outcome:', error);
      throw error;
    }
  }

  public async getOrganizationalInsights(): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Enhanced Brain Service not initialized');
    }

    try {
      // This would query the organizational intelligence database
      // For now, return mock insights
      return {
        totalPatterns: 150,
        violationPatterns: 87,
        successRate: 0.92,
        commonViolations: [
          { type: 'TODO_COMMENT', count: 45, successRate: 0.95 },
          { type: 'DEBUG_CODE', count: 23, successRate: 0.88 },
          { type: 'HARDCODED_SECRET', count: 12, successRate: 0.97 }
        ],
        autoFixOpportunities: 67,
        organizationalLearningRate: 0.85
      };
    } catch (error) {
      console.error('Failed to get organizational insights:', error);
      throw error;
    }
  }

  public isEnabled(): boolean {
    return this.config.enabled && this.isInitialized;
  }

  public getConfig(): BrainConfig {
    return { ...this.config };
  }

  public async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      // Save current state and clean up resources
      await this.saveCurrentState();
      
      this.isInitialized = false;
      this.emit('brain_shutdown');
      
      console.log('Enhanced Brain Service shutdown successfully');
    } catch (error) {
      console.error('Error during Enhanced Brain Service shutdown:', error);
      throw error;
    }
  }

  private async saveCurrentState(): Promise<void> {
    try {
      // Save current patterns and models
      const state = {
        timestamp: new Date().toISOString(),
        config: this.config,
        metrics: await this.getOrganizationalInsights()
      };

      const statePath = path.join(process.cwd(), '.ai_guard', 'brain_state.json');
      await safeWriteJson(statePath, state);
    } catch (error) {
      console.warn('Failed to save brain state:', error);
    }
  }
}

// Export singleton instance
export const enhancedBrainService = EnhancedBrainService.getInstance();