/**
 * Simplified Integration tests for Enterprise ExAI Guard
 * Uses test detectors instead of TensorFlow.js for faster testing
 */

import { EnterpriseExAIGuard } from '../EnterpriseExAIGuard';
import { ExAIViolation, ViolationType, ViolationSeverity, DetectionContext } from '../types';
import { defaultExAIGuardConfig } from '../config';

// Mock all components to use simplified test versions
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
        
        // Fix performance detection - look for nested loops more reliably
        if ((content.includes('for(') && content.match(/for\s*\(/g)?.length || 0) > 1) {
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

// Mock MultiAgentOrchestrator to use simplified processing
vi.mock('../MultiAgentOrchestrator', () => {
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
        
        // Fix performance detection - look for nested loops more reliably
        if ((content.includes('for(') && content.match(/for\s*\(/g)?.length || 0) > 1) {
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
      on: vi.fn(),
      emit: vi.fn(),
      dispose: vi.fn()
    }))
  };
});

// Mock RealTimeStreamProcessor
vi.mock('../RealTimeStreamProcessor', () => {
  return {
    RealTimeStreamProcessor: vi.fn().mockImplementation(() => ({
      initialize: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      emit: vi.fn(),
      dispose: vi.fn()
    })),
    EnterpriseStreamProcessor: vi.fn().mockImplementation(() => ({
      initialize: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      emit: vi.fn(),
      dispose: vi.fn()
    }))
  };
});

describe('EnterpriseExAIGuard Simplified Integration Tests', () => {
  let exaiGuard: EnterpriseExAIGuard;

  beforeEach(async () => {
    // Create a test configuration with faster processing for tests
    const testConfig = {
      ...defaultExAIGuardConfig,
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
    }, 10000);
  });

  describe('Correction System', () => {
    test('should apply security corrections', async () => {
      const insecureCode = `
        const password = "mySecretPassword123";
        function validateUser(input) {
          return input === password;
        }
      `;

      const violations = await exaiGuard.detectViolations(insecureCode, {
        isCode: true,
        language: 'javascript'
      });

      const correctionResult = await exaiGuard.applyCorrections(insecureCode, violations, {
        isCode: true,
        language: 'javascript'
      });

      expect(correctionResult.success).toBe(true);
      expect(correctionResult.appliedCorrections.length).toBeGreaterThan(0);
      expect(correctionResult.correctedContent).not.toBe(insecureCode);
    }, 10000);

    test('should apply quality corrections for TODO markers', async () => {
      const codeWithTodo = `
        // TODO: Add error handling here
        function riskyOperation() {
          return Math.random() * 100;
        }
      `;

      const violations = await exaiGuard.detectViolations(codeWithTodo, {
        isCode: true,
        language: 'javascript'
      });

      const correctionResult = await exaiGuard.applyCorrections(codeWithTodo, violations, {
        isCode: true,
        language: 'javascript'
      });

      expect(correctionResult.success).toBe(true);
      expect(correctionResult.correctedContent).toContain('Completed by ExAI Guard');
    }, 10000);
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

  describe('Audit and Compliance', () => {
    test('should maintain audit logs', async () => {
      const testContent = 'const apiKey = "sk-test123";';

      await exaiGuard.detectViolations(testContent, { isCode: true });

      const auditLogs = exaiGuard.getAuditLogs();
      expect(auditLogs.length).toBeGreaterThan(0);
      
      const detectionLog = auditLogs.find(log => log.action === 'violation_detection');
      expect(detectionLog).toBeDefined();
      expect(detectionLog?.violations.length).toBeGreaterThan(0);
    }, 10000);

    test('should log correction actions', async () => {
      const testContent = '// TODO: Fix this';

      const violations = await exaiGuard.detectViolations(testContent, { isCode: true });
      await exaiGuard.applyCorrections(testContent, violations, { isCode: true });

      const auditLogs = exaiGuard.getAuditLogs();
      const correctionLog = auditLogs.find(log => log.action === 'correction_applied');
      expect(correctionLog).toBeDefined();
    }, 10000);
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

  describe('Event System', () => {
    test('should emit violation events', async () => {
      return new Promise<void>((resolve) => {
        const testContent = 'const password = "secret";';

        exaiGuard.on('violationDetected', (violation: ExAIViolation) => {
          expect(violation.type).toBe(ViolationType.SECURITY);
          resolve();
        });

        exaiGuard.detectViolations(testContent, { isCode: true });
      });
    }, 10000);

    test('should emit system health events', async () => {
      return new Promise<void>((resolve) => {
        exaiGuard.on('systemHealthUpdate', (healthStatus: any) => {
          expect(healthStatus).toHaveProperty('status');
          expect(healthStatus).toHaveProperty('details');
          resolve();
        });

        // Trigger some processing to generate health events
        exaiGuard.detectViolations('test content', { isCode: true });
      });
    }, 10000);
  });
});