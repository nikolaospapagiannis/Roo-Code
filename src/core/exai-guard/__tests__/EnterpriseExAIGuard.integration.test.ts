/**
 * Integration tests for Enterprise ExAI Guard
 * Tests the full enterprise-grade violation detection and correction system
 */

import { EnterpriseExAIGuard } from '../EnterpriseExAIGuard';
import { ExAIViolation, ViolationType, ViolationSeverity, DetectionContext } from '../types';
import { defaultExAIGuardConfig } from '../config';

describe('EnterpriseExAIGuard Integration Tests', () => {
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
        
        // FIXME: This is inefficient
        function findItem(items, target) {
          for (let i = 0; i < items.length; i++) {
            if (items[i] === target) return i;
          }
          return -1;
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

  describe('Real-Time Processing', () => {
    test('should process content in real-time mode', async () => {
      const testContent = `
        function insecureFunction() {
          const apiKey = "sk-1234567890abcdef";
          eval("console.log('dangerous')");
        }
      `;

      // Start real-time processing
      exaiGuard.startRealTimeProcessing();

      // Process content in real-time
      await exaiGuard.processRealTime(testContent, {
        isCode: true,
        language: 'javascript'
      });

      // Wait a bit for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Stop processing
      exaiGuard.stopRealTimeProcessing();

      // Verify system statistics
      const stats = exaiGuard.getSystemStatistics();
      expect(stats.stream.processedChunks).toBeGreaterThan(0);
    });

    test('should handle multiple real-time streams', async () => {
      const contents = [
        'const password = "secret";',
        '// TODO: Fix this',
        'for (let i = 0; i < 10; i++) { for (let j = 0; j < 10; j++) { } }',
        '<img src="image.jpg">'
      ];

      exaiGuard.startRealTimeProcessing();

      // Process multiple contents
      const promises = contents.map(content => 
        exaiGuard.processRealTime(content, { isCode: true })
      );

      await Promise.all(promises);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      exaiGuard.stopRealTimeProcessing();

      const stats = exaiGuard.getSystemStatistics();
      expect(stats.stream.processedChunks).toBeGreaterThanOrEqual(contents.length);
    });
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
    });

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
    });
  });

  describe('Multi-Agent System', () => {
    test('should distribute work across multiple agents', async () => {
      const complexContent = `
        // Security issue
        const secretKey = "very-secret-key";
        
        // Quality issue  
        // TODO: Refactor this function
        
        // Performance issue
        function slowFunction() {
          for (let i = 0; i < 1000; i++) {
            for (let j = 0; j < 1000; j++) {
              // Nested loops
            }
          }
        }
        
        // Accessibility issue
        const image = document.createElement('img');
        image.src = 'photo.jpg';
      `;

      const violations = await exaiGuard.detectViolations(complexContent, {
        isCode: true,
        language: 'javascript',
        projectType: 'web'
      });

      // Should detect multiple types of violations
      const violationTypes = new Set(violations.map(v => v.type));
      expect(violationTypes.size).toBeGreaterThan(1);

      // Verify agent workload
      const stats = exaiGuard.getSystemStatistics();
      expect(stats.agents.length).toBeGreaterThan(0);
      expect(stats.agents.every((agent: any) => agent.currentLoad >= 0)).toBe(true);
    });
  });

  describe('Performance and Metrics', () => {
    test('should track performance metrics', async () => {
      const testContent = `
        function testFunction() {
          // Some code to analyze
          const data = [1, 2, 3, 4, 5];
          return data.map(x => x * 2).filter(x => x > 5);
        }
      `;

      await exaiGuard.detectViolations(testContent, { isCode: true });

      const metrics = exaiGuard.getPerformanceMetrics();
      expect(metrics.detectionTime).toBeGreaterThan(0);
      expect(metrics.throughput).toBeGreaterThanOrEqual(0);
    });

    test('should track confidence metrics', async () => {
      const testContent = `
        // TODO: Improve this function
        function needsWork() {
          return "not implemented";
        }
      `;

      await exaiGuard.detectViolations(testContent, { isCode: true });

      const confidenceMetrics = exaiGuard.getConfidenceMetrics();
      expect(confidenceMetrics.overall).toBeGreaterThanOrEqual(0);
      expect(confidenceMetrics.overall).toBeLessThanOrEqual(1);
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

    test('should validate configuration updates', () => {
      expect(() => {
        exaiGuard.updateConfig({ maxConcurrentDetections: -1 });
      }).toThrow();
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
    });

    test('should log correction actions', async () => {
      const testContent = '// TODO: Fix this';

      const violations = await exaiGuard.detectViolations(testContent, { isCode: true });
      await exaiGuard.applyCorrections(testContent, violations, { isCode: true });

      const auditLogs = exaiGuard.getAuditLogs();
      const correctionLog = auditLogs.find(log => log.action === 'correction_applied');
      expect(correctionLog).toBeDefined();
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
      const testContent = 'const password = "secret";';

      return new Promise<void>((resolve) => {
        exaiGuard.on('violationDetected', (violation: ExAIViolation) => {
          expect(violation.type).toBe(ViolationType.SECURITY);
          resolve();
        });

        exaiGuard.detectViolations(testContent, { isCode: true });
      });
    });

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
    });
  });
});