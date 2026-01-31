/**
 * Simplified ML Violation Detector for testing
 * Provides the same interface but without TensorFlow.js dependency
 */

import { ExAIViolation, ViolationType, ViolationSeverity, DetectionContext, ExAIGuardConfig } from './types';

/**
 * Simplified ML Violation Detector for testing
 * Uses rule-based detection instead of TensorFlow.js neural networks
 */
export class TestMLViolationDetector {
  private config: ExAIGuardConfig;

  constructor(config: ExAIGuardConfig) {
    this.config = config;
  }

  /**
   * Initialize the detector (no-op for testing)
   */
  async initialize(): Promise<void> {
    console.log('Test ML Violation Detector initialized');
  }

  /**
   * Detect violations using rule-based patterns
   */
  async detectViolations(content: string, context: any = {}): Promise<ExAIViolation[]> {
    const violations: ExAIViolation[] = [];
    
    // Security violations
    if (this.detectSecurityViolations(content)) {
      violations.push({
        type: ViolationType.SECURITY,
        severity: ViolationSeverity.HIGH,
        message: 'Security violation detected: hardcoded credentials or unsafe patterns',
        content: content.substring(0, 200),
        confidence: 0.9,
        timestamp: new Date(),
        correction: 'Remove hardcoded credentials and use secure alternatives'
      });
    }
    
    // Quality violations
    if (this.detectQualityViolations(content)) {
      violations.push({
        type: ViolationType.QUALITY,
        severity: ViolationSeverity.MEDIUM,
        message: 'Quality violation detected: incomplete code or TODO markers',
        content: content.substring(0, 200),
        confidence: 0.8,
        timestamp: new Date(),
        correction: 'Complete marked sections and improve code quality'
      });
    }
    
    // Performance violations
    if (this.detectPerformanceViolations(content)) {
      violations.push({
        type: ViolationType.PERFORMANCE,
        severity: ViolationSeverity.MEDIUM,
        message: 'Performance violation detected: inefficient patterns',
        content: content.substring(0, 200),
        confidence: 0.7,
        timestamp: new Date(),
        correction: 'Optimize code for better performance'
      });
    }
    
    // Accessibility violations
    if (this.detectAccessibilityViolations(content)) {
      violations.push({
        type: ViolationType.ACCESSIBILITY,
        severity: ViolationSeverity.LOW,
        message: 'Accessibility violation detected: missing accessibility attributes',
        content: content.substring(0, 200),
        confidence: 0.6,
        timestamp: new Date(),
        correction: 'Add proper accessibility attributes'
      });
    }
    
    return violations;
  }

  /**
   * Detect security violations
   */
  private detectSecurityViolations(content: string): boolean {
    const securityPatterns = [
      /password\s*=\s*["'][^"']*["']/i,
      /secret\s*=\s*["'][^"']*["']/i,
      /api[_-]?key\s*=\s*["'][^"']*["']/i,
      /eval\s*\(/i,
      /Function\s*\(/i,
      /innerHTML\s*=\s*[^;]*user/i
    ];
    
    return securityPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Detect quality violations
   */
  private detectQualityViolations(content: string): boolean {
    const qualityPatterns = [
      /\/\/\s*TODO:/i,
      /\/\/\s*FIXME:/i,
      /\/\*\s*TODO:/i,
      /\/\*\s*FIXME:/i
    ];
    
    return qualityPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Detect performance violations
   */
  private detectPerformanceViolations(content: string): boolean {
    const performancePatterns = [
      /for\s*\([^)]*\)\s*\{[^}]*for\s*\([^)]*\)\s*\{/i, // Nested loops
      /while\s*\([^)]*\)\s*\{[^}]*while\s*\([^)]*\)\s*\{/i, // Nested while loops
      /\.map\([^)]*\)\.filter\([^)]*\)/i, // Chained array operations
      /\.filter\([^)]*\)\.map\([^)]*\)/i  // Chained array operations
    ];
    
    return performancePatterns.some(pattern => pattern.test(content));
  }

  /**
   * Detect accessibility violations
   */
  private detectAccessibilityViolations(content: string): boolean {
    const accessibilityPatterns = [
      /<img[^>]*>(?!.*alt=)/i, // Image without alt
      /<div[^>]*>(?!.*role=)/i, // Div without role
      /<button[^>]*>(?!.*aria-)/i // Button without aria
    ];
    
    return accessibilityPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Train model (no-op for testing)
   */
  async trainModel(trainingData: Array<{content: string, violations: ExAIViolation[]}>): Promise<void> {
    console.log('Training model with', trainingData.length, 'samples');
  }

  /**
   * Store violation pattern (no-op for testing)
   */
  async storeViolationPattern(violation: ExAIViolation): Promise<void> {
    console.log('Storing violation pattern:', violation.type);
  }

  /**
   * Clean up resources (no-op for testing)
   */
  dispose(): void {
    // No resources to clean up
  }
}