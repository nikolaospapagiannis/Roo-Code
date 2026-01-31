import * as tf from '@tensorflow/tfjs-node';
import { ChromaClient } from 'chromadb';
import { ExAIViolation, ViolationType, ViolationSeverity } from './types';
import { ExAIGuardConfig } from './config';

/**
 * Enterprise-grade ML-based violation detector using TensorFlow.js neural networks
 * and ChromaDB for organizational intelligence
 */
export class MLViolationDetector {
  private model: tf.LayersModel | null = null;
  private chromaClient: ChromaClient | null = null;
  private collection: any = null;
  private config: ExAIGuardConfig;

  constructor(config: ExAIGuardConfig) {
    this.config = config;
  }

  /**
   * Initialize the ML pipeline with TensorFlow.js models and ChromaDB
   */
  async initialize(): Promise<void> {
    try {
      // Initialize TensorFlow.js backend
      await tf.ready();
      
      // Load or create the neural network model
      await this.loadOrCreateModel();
      
      // Initialize ChromaDB client for organizational intelligence
      await this.initializeChromaDB();
      
      console.log('ML Violation Detector initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ML Violation Detector:', error);
      throw error;
    }
  }

  /**
   * Load existing model or create a new neural network for violation detection
   */
  private async loadOrCreateModel(): Promise<void> {
    try {
      // Try to load existing model from file system
      const modelPath = './models/violation-detector/model.json';
      
      try {
        this.model = await tf.loadLayersModel(`file://${modelPath}`);
        console.log('Loaded existing violation detection model');
      } catch {
        // Create new model if none exists
        console.log('Creating new violation detection model');
        this.model = this.createNeuralNetwork();
        await this.model.save(`file://${modelPath}`);
      }
    } catch (error) {
      console.error('Error in model loading/creation:', error);
      // Fallback to basic model
      this.model = this.createBasicModel();
    }
  }

  /**
   * Create a sophisticated neural network for violation detection
   */
  private createNeuralNetwork(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        // Input layer for text features (token embeddings, syntax patterns, etc.)
        tf.layers.dense({
          inputShape: [512], // Feature vector size
          units: 256,
          activation: 'relu'
        }),
        
        // Hidden layers for pattern recognition
        tf.layers.dense({
          units: 128,
          activation: 'relu'
        }),
        
        tf.layers.dropout({
          rate: 0.3 // Prevent overfitting
        }),
        
        tf.layers.dense({
          units: 64,
          activation: 'relu'
        }),
        
        // Output layer for violation classification
        tf.layers.dense({
          units: Object.keys(ViolationType).length,
          activation: 'softmax'
        })
      ]
    });

    // Compile with advanced optimizer and loss function
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  /**
   * Fallback basic model for when advanced model fails
   */
  private createBasicModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [128],
          units: 64,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: Object.keys(ViolationType).length,
          activation: 'softmax'
        })
      ]
    });

    model.compile({
      optimizer: 'adam',
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  /**
   * Initialize ChromaDB for organizational intelligence and pattern storage
   */
  private async initializeChromaDB(): Promise<void> {
    try {
      this.chromaClient = new ChromaClient({
        path: this.config.chromaDB?.path || 'http://localhost:8000'
      });

      // Create or get the violations collection
      this.collection = await this.chromaClient.getOrCreateCollection({
        name: 'exai_guard_violations',
        metadata: { 
          "hnsw:space": "cosine",
          "description": "ExAI Guard violation patterns and organizational intelligence"
        }
      });

      console.log('ChromaDB initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ChromaDB:', error);
      // Continue without ChromaDB - system will still work with ML models
    }
  }

  /**
   * Advanced ML-based violation detection with neural network inference
   */
  async detectViolations(content: string, context: any = {}): Promise<ExAIViolation[]> {
    const violations: ExAIViolation[] = [];
    
    try {
      // Extract features from content for ML processing
      const features = await this.extractFeatures(content, context);
      
      // Perform neural network inference
      const predictions = await this.predictWithModel(features);
      
      // Analyze predictions and generate violations
      const mlViolations = this.analyzePredictions(predictions, content, context);
      violations.push(...mlViolations);
      
      // Check against organizational intelligence in ChromaDB
      const orgViolations = await this.checkOrganizationalIntelligence(content, context);
      violations.push(...orgViolations);
      
    } catch (error) {
      console.error('ML violation detection failed:', error);
      // Fallback to rule-based detection
      const fallbackViolations = this.fallbackDetection(content, context);
      violations.push(...fallbackViolations);
    }
    
    return violations;
  }

  /**
   * Extract sophisticated features for ML processing
   */
  private async extractFeatures(content: string, context: any): Promise<tf.Tensor> {
    const features: number[] = [];
    
    // Text complexity features
    features.push(content.length / 1000); // Normalized length
    features.push((content.match(/[A-Z]/g) || []).length / content.length); // Capitalization ratio
    features.push((content.match(/[0-9]/g) || []).length / content.length); // Number ratio
    
    // Code-specific features (if applicable)
    if (context.isCode) {
      features.push((content.match(/function|class|const|let|var/g) || []).length / content.length);
      features.push((content.match(/[{}()[\]]/g) || []).length / content.length);
    }
    
    // Quality indicators
    features.push(this.calculateReadabilityScore(content));
    features.push(this.detectIncompletePatterns(content));
    
    // Context features
    features.push(context.urgency || 0);
    features.push(context.complexity || 0);
    
    // Pad or truncate to fixed size
    while (features.length < 512) {
      features.push(0);
    }
    if (features.length > 512) {
      features.length = 512;
    }
    
    return tf.tensor2d([features]);
  }

  /**
   * Perform neural network inference
   */
  private async predictWithModel(features: tf.Tensor): Promise<tf.Tensor> {
    if (!this.model) {
      throw new Error('ML model not initialized');
    }
    
    return this.model.predict(features) as tf.Tensor;
  }

  /**
   * Analyze neural network predictions and generate violations
   */
  private analyzePredictions(
    predictions: tf.Tensor, 
    content: string, 
    context: any
  ): ExAIViolation[] {
    const violations: ExAIViolation[] = [];
    const predictionArray = predictions.dataSync();
    
    // Threshold for violation detection confidence
    const confidenceThreshold = 0.7;
    
    Object.keys(ViolationType).forEach((violationType, index) => {
      const confidence = predictionArray[index];
      
      if (confidence > confidenceThreshold) {
        violations.push({
          type: violationType as ViolationType,
          severity: this.calculateSeverity(confidence, violationType as ViolationType),
          message: `ML-detected ${violationType} violation (confidence: ${(confidence * 100).toFixed(1)}%)`,
          content: content.substring(0, 200), // Truncate for performance
          confidence: confidence,
          timestamp: new Date(),
          correction: this.generateCorrection(violationType as ViolationType, content, context)
        });
      }
    });
    
    return violations;
  }

  /**
   * Check against organizational intelligence stored in ChromaDB
   */
  private async checkOrganizationalIntelligence(
    content: string, 
    context: any
  ): Promise<ExAIViolation[]> {
    if (!this.collection) {
      return [];
    }
    
    try {
      // Query similar violations from organizational memory
      const results = await this.collection.query({
        queryTexts: [content],
        nResults: 5
      });
      
      const violations: ExAIViolation[] = [];
      
      // Analyze similarity to known violation patterns
      if (results.distances && results.distances[0]) {
        results.distances[0].forEach((distance: number, index: number) => {
          if (distance < 0.3) { // High similarity threshold
            const metadata = results.metadatas?.[0]?.[index];
            if (metadata) {
              violations.push({
                type: metadata.type as ViolationType,
                severity: metadata.severity as ViolationSeverity,
                message: `Organizational pattern match: ${metadata.message}`,
                content: content.substring(0, 200),
                confidence: 1 - distance, // Inverse of distance = confidence
                timestamp: new Date(),
                correction: metadata.correction
              });
            }
          }
        });
      }
      
      return violations;
    } catch (error) {
      console.error('ChromaDB query failed:', error);
      return [];
    }
  }

  /**
   * Fallback detection when ML system fails
   */
  private fallbackDetection(content: string, context: any): ExAIViolation[] {
    // Basic rule-based detection as fallback
    const violations: ExAIViolation[] = [];
    
    if (content.length < 10) {
      violations.push({
        type: ViolationType.QUALITY,
        severity: ViolationSeverity.MEDIUM,
        message: 'Content too short for meaningful analysis',
        content,
        confidence: 0.8,
        timestamp: new Date(),
        correction: 'Provide more detailed content for better assistance'
      });
    }
    
    if (content.includes('TODO') || content.includes('FIXME')) {
      violations.push({
        type: ViolationType.QUALITY,
        severity: ViolationSeverity.LOW,
        message: 'Contains incomplete markers (TODO/FIXME)',
        content,
        confidence: 0.9,
        timestamp: new Date(),
        correction: 'Complete the marked sections before proceeding'
      });
    }
    
    return violations;
  }

  /**
   * Calculate severity based on confidence and violation type
   */
  private calculateSeverity(confidence: number, type: ViolationType): ViolationSeverity {
    if (confidence > 0.9) return ViolationSeverity.CRITICAL;
    if (confidence > 0.7) return ViolationSeverity.HIGH;
    if (confidence > 0.5) return ViolationSeverity.MEDIUM;
    return ViolationSeverity.LOW;
  }

  /**
   * Generate intelligent corrections based on violation type and context
   */
  private generateCorrection(type: ViolationType, content: string, context: any): string {
    const corrections: Record<ViolationType, string> = {
      [ViolationType.SECURITY]: 'Review and sanitize input/output for security vulnerabilities',
      [ViolationType.QUALITY]: 'Improve code quality and follow best practices',
      [ViolationType.PERFORMANCE]: 'Optimize for better performance and efficiency',
      [ViolationType.ACCESSIBILITY]: 'Ensure accessibility standards are met',
      [ViolationType.COMPLIANCE]: 'Verify compliance with organizational policies',
      [ViolationType.ETHICAL]: 'Review for ethical considerations and bias'
    };
    
    return corrections[type] || 'Review and improve the content';
  }

  /**
   * Calculate readability score using advanced metrics
   */
  private calculateReadabilityScore(content: string): number {
    const words = content.split(/\s+/).filter(word => word.length > 0);
    const sentences = content.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
    const syllables = this.countSyllables(content);
    
    if (words.length === 0 || sentences.length === 0) return 0;
    
    // Simplified Flesch Reading Ease calculation
    const wordsPerSentence = words.length / sentences.length;
    const syllablesPerWord = syllables / words.length;
    
    return Math.max(0, Math.min(1, 1 - (wordsPerSentence * syllablesPerWord) / 100));
  }

  /**
   * Count syllables in text (simplified implementation)
   */
  private countSyllables(text: string): number {
    // Simplified syllable counting
    return text.toLowerCase()
      .replace(/[^aeiouy]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(syllable => syllable.length > 0)
      .length;
  }

  /**
   * Detect incomplete code patterns
   */
  private detectIncompletePatterns(content: string): number {
    const incompletePatterns = [
      /\/\/\s*todo:/i,
      /\/\/\s*fixme:/i,
      /function\s+\w+\s*\([^)]*\)\s*\{[^}]*$/,
      /if\s*\([^)]*\)\s*\{[^}]*$/,
      /for\s*\([^)]*\)\s*\{[^}]*$/,
      /while\s*\([^)]*\)\s*\{[^}]*$/
    ];
    
    let incompleteCount = 0;
    incompletePatterns.forEach(pattern => {
      if (pattern.test(content)) {
        incompleteCount++;
      }
    });
    
    return incompleteCount / incompletePatterns.length;
  }

  /**
   * Train the model with new violation data for continuous improvement
   */
  async trainModel(trainingData: Array<{content: string, violations: ExAIViolation[]}>): Promise<void> {
    if (!this.model) return;
    
    try {
      // Prepare training data
      const features: number[][] = [];
      const labels: number[][] = [];
      
      for (const data of trainingData) {
        const featureVector = await this.extractFeatures(data.content, {});
        features.push(Array.from(featureVector.dataSync()));
        
        // Create one-hot encoded labels
        const labelVector = new Array(Object.keys(ViolationType).length).fill(0);
        data.violations.forEach(violation => {
          const violationIndex = Object.keys(ViolationType).indexOf(violation.type);
          if (violationIndex !== -1) {
            labelVector[violationIndex] = 1;
          }
        });
        labels.push(labelVector);
      }
      
      // Convert to tensors
      const featureTensor = tf.tensor2d(features);
      const labelTensor = tf.tensor2d(labels);
      
      // Train the model
      await this.model.fit(featureTensor, labelTensor, {
        epochs: 10,
        batchSize: 32,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            console.log(`Epoch ${epoch + 1}: loss = ${logs?.loss}, accuracy = ${logs?.acc}`);
          }
        }
      });
      
      // Clean up tensors
      featureTensor.dispose();
      labelTensor.dispose();
      
      console.log('Model training completed successfully');
    } catch (error) {
      console.error('Model training failed:', error);
    }
  }

  /**
   * Store violation pattern in organizational intelligence
   */
  async storeViolationPattern(violation: ExAIViolation): Promise<void> {
    if (!this.collection) return;
    
    try {
      await this.collection.add({
        ids: [`violation_${Date.now()}`],
        metadatas: [{
          type: violation.type,
          severity: violation.severity,
          message: violation.message,
          correction: violation.correction,
          timestamp: violation.timestamp.toISOString()
        }],
        documents: [violation.content]
      });
      
      console.log('Violation pattern stored in organizational intelligence');
    } catch (error) {
      console.error('Failed to store violation pattern:', error);
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose();
    }
    // ChromaDB client doesn't need explicit disposal
  }
}