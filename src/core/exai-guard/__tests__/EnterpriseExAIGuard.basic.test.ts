/**
 * Basic Integration tests for Enterprise ExAI Guard
 * Focuses on core functionality with comprehensive mocking
 */

import { EnterpriseExAIGuard } from '../EnterpriseExAIGuard';
import { ExAIViolation, ViolationType, ViolationSeverity, DetectionContext } from '../types';
import { defaultExAIGuardConfig } from '../config';

// Mock all components comprehensively
vi.mock('../MLViolationDetector', () => {
  return {
    MLViolationDetector: vi.fn().mockImplementation(() => ({
      initialize: vi.fn().mockResolvedValue(undefined),
      detectViolations: vi.fn().mockImplementation(async (content: string) => {
        const violations: ExAIViolation[] = [];
        
        // Simple rule-based detection for testing
        if (content.includes('password = "') || content.includes("password = '")) {
          violations.push({
            type: ViolationType.SECURITY,
            severity: ViolationSeverity.HIGH,
            message: 'Security violation: hardcoded credentials',
            content: content.substring(0, 200),
            confidence: 0.9,
            timestamp: new Date(),
            correction: 'Remove hardcoded credentials'
          });
        }
        
        if (content.includes('TODO:') || content.includes('FIXME:')) {
          violations.push({
            type: ViolationType.QUALITY,
            severity: ViolationSeverity.MEDIUM,
            message: 'Quality violation: incomplete code',
            content: content.substring(0, 200),
            confidence: 0.8,
            timestamp: new Date(),
            correction: 'Complete marked sections'
          });
        }
        
        // Performance detection - look for nested loops
        const forLoopCount = (content.match(/for\s*\(/g) || []).length;
        if (forLoopCount > 1) {
          violations.push({
            type: ViolationType.PERFORMANCE,
            severity: ViolationSeverity.MEDIUM,
            message: 'Performance violation: nested loops',
            content: content.substring(0, 200),
            confidence: 0.7,
            timestamp: new Date(),
            correction: 'Optimize nested loops'
          });
        }
        
        return violations;
      }),
      trainModel: vi.fn().mockResolvedValue(undefined),
      storeViolationPattern: vi.fn().mockResolvedValue(undefined),
      dispose: vi.fn()
    }))
  };
});

// Mock MultiAgentOrchestrator
vi.mock('../MultiAgentOrchestrator', () => {
  const { ViolationType, ViolationSeverity } = require('../types');
  
  return {
    MultiAgentOrchestrator: vi.fn().mockImplementation(() => ({
      initialize: vi.fn().mockResolvedValue(undefined),
      processContent: vi.fn().mockImplementation(async (content: string, context: DetectionContext) => {
        const violations: ExAIViolation[] = [];
        
        // Simple rule-based detection for testing
        if (content.includes('password = "') || content.includes("password = '")) {
          violations.push({
            type: ViolationType.SECURITY,
            severity: ViolationSeverity.HIGH,
            message: 'Security violation: hardcoded credentials',
            content: content.substring(0, 200),
            confidence: 0.9,
            timestamp: new Date(),
            correction: 'Remove hardcoded credentials'
          });
        }
        
        if (content.includes('TODO:') || content.includes('FIXME:')) {
          violations.push({
            type: ViolationType.QUALITY,
            severity: ViolationSeverity.MEDIUM,
            message: 'Quality violation: incomplete code',
            content: content.substring(0, 200),
            confidence: 0.8,
            timestamp: new Date(),
            correction: 'Complete marked sections'
          });
        }
        
        // Performance detection - look for nested loops
        const forLoopCount = (content.match(/for\s*\(/g) || []).length;
        if (forLoopCount > 1) {
          violations.push({
            type: ViolationType.PERFORMANCE,
            severity: ViolationSeverity.MEDIUM,
            message: 'Performance violation: nested loops',
            content: content.substring(0, 200),
            confidence: 0.7,
            timestamp: new Date(),
            correction: 'Optimize nested loops'
          });
        }
        
        return violations;
      }),
      getAllAgents: vi.fn().mockReturnValue([
        {
          id: 'test-agent-1',
          type: 'detector',
          capabilities: [ViolationType.SECURITY, ViolationType.QUALITY, ViolationType.PERFORMANCE]
        }
      ]),
      getSystemWorkload: vi.fn().mockReturnValue({
        totalAgents: 1,
        activeAgents: 1,
        averageLoad: 0.5
      }),
      on: vi.fn(),
      emit: vi.fn(),
      dispose: vi.fn()
    }))
  };
});

// Mock RealTimeStreamProcessor with all required methods
vi.mock('../RealTimeStreamProcessor', () => {
  return {
    RealTimeStreamProcessor: vi.fn().mockImplementation(() => ({
      initialize: vi.fn().mockResolvedValue(undefined),
      startProcessing: vi.fn(),
      stopProcessing: vi.fn(),
      getStatistics: vi.fn().mockReturnValue({
        processedMessages: 0,
        violationsDetected: 0,
        correctionsApplied: 0
      }),
      getCacheStatistics: vi.fn().mockReturnValue({
        size: 0,
        hits: 0,
        misses: 0
      }),
      clearCache: vi.fn(),
      on: vi.fn(),
      emit: vi.fn(),
      dispose: vi.fn()
    })),
    EnterpriseStreamProcessor: vi.fn().mockImplementation(() => ({
      initialize: vi.fn().mockResolvedValue(undefined),
      startProcessing: vi.fn(),
      stopProcessing: vi.fn(),
      getStatistics: vi.fn().mockReturnValue({
        processedMessages: 0,
        violationsDetected: 0,
        correctionsApplied: 0
      }),
      getCacheStatistics: vi.fn().mockReturnValue({
        size: 0,
        hits: 0,
        misses: 0
      }),
      clearCache: vi.fn(),
      on: vi.fn(),
      emit: vi.fn(),
      dispose: vi.fn()
    }))
  };
});

describe('EnterpriseExAIGuard Basic Integration Tests', () => {
  let exaiGuard: EnterpriseExAIGuard;

  beforeEach(async () => {
    // Create a test configuration with faster processing for tests
    const testConfig = {
      ...defaultExAIGuardConfig,
      autoCorrection: true, // Enable auto-correction for tests
      realTime: {
        ...defaultExAIGuardConfig.realTime,
        correctionDelay: 10, // Faster for tests
        maxViolationsPerMinute: 1000
      },
      maxConcurrentDetections: 10,
      violationCacheSize: 100,
      multiAgent: {
        ...defaultExAIGuardConfig.multiAgent,
        agentCount: 2 // Smaller for tests
      }
    };

    exaiGuard = new EnterpriseExAIGuard(testConfig);
    await exaiGuard.initialize();
  });

  afterEach(() => {
    exaiGuard.dispose();
  });

  describe('Basic Violation Detection', () => {
    test('should detect security violations in code', async () => {
      const codeWithSecurityIssue = `
        const password = "secret123";
        function login(user, pass) {
          if (pass === password) {
            return true;
          }
          return false;
        }
      `;

      const violations = await exaiGuard.detectViolations(codeWithSecurityIssue, {
        isCode: true,
        language: 'javascript'
      });

      expect(violations.length).toBeGreaterThan(0);
      expect(violations.some(v => v.type === ViolationType.SECURITY)).toBe(true);
    });

    test('should detect quality violations with TODO markers', async () => {
      const codeWithTodo = `
        // TODO: Implement error handling
        function processData(data) {
          return data.map(item => item.value);
        }
      `;

      const violations = await exaiGuard.detectViolations(codeWithTodo, {
        isCode: true,
        language: 'javascript'
      });

      expect(violations.length).toBeGreaterThan(0);
      expect(violations.some(v => v.type === ViolationType.QUALITY)).toBe(true);
    });

    test('should detect performance violations in nested loops', async () => {
      const codeWithPerformanceIssue = `
        function findDuplicates(array1, array2) {
          const duplicates = [];
          for (let i = 0; i < array1.length; i++) {
            for (let j = 0; j < array2.length; j++) {
              if (array1[i] === array2[j]) {
                duplicates.push(array1[i]);
              }
            }
          }
          return duplicates;
        }
      `;

      const violations = await exaiGuard.detectViolations(codeWithPerformanceIssue, {
        isCode: true,
        language: 'javascript'
      });

      expect(violations.length).toBeGreaterThan(0);
      expect(violations.some(v => v.type === ViolationType.PERFORMANCE)).toBe(true);
    });
  });

  describe('Configuration Management', () => {
    test('should update configuration dynamically', () => {
      const initialConfig = exaiGuard.getConfig();
      expect(initialConfig.autoCorrection).toBe(true);

      // Update configuration
      exaiGuard.updateConfig({ autoCorrection: false });

      const updatedConfig = exaiGuard.getConfig();
      expect(updatedConfig.autoCorrection).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle empty content gracefully', async () => {
      const violations = await exaiGuard.detectViolations('', { isCode: true });
      expect(Array.isArray(violations)).toBe(true);
    });

    test('should handle invalid context gracefully', async () => {
      const violations = await exaiGuard.detectViolations('test content', {});
      expect(Array.isArray(violations)).toBe(true);
    });

    test('should throw error when not initialized', async () => {
      const uninitializedGuard = new EnterpriseExAIGuard();
      
      await expect(
        uninitializedGuard.detectViolations('test', {})
      ).rejects.toThrow('Enterprise ExAI Guard not initialized');
    });
  });

  describe('System Health and Monitoring', () => {
    test('should provide system statistics', () => {
      const stats = exaiGuard.getSystemStatistics();
      
      expect(stats).toHaveProperty('performance');
      expect(stats).toHaveProperty('confidence');
      expect(stats).toHaveProperty('stream');
      expect(stats).toHaveProperty('cache');
      expect(stats).toHaveProperty('agents');
      expect(stats).toHaveProperty('auditLogs');
    });

    test('should clear cache when requested', () => {
      exaiGuard.clearCache();
      
      const stats = exaiGuard.getSystemStatistics();
      expect(stats.cache.size).toBe(0);
    });
  });
});