/**
 * Simple Integration tests for Enterprise ExAI Guard
 * Tests core functionality with minimal mocking
 */

import { EnterpriseExAIGuard } from '../EnterpriseExAIGuard';
import { ViolationType, ViolationSeverity } from '../types';
import { defaultExAIGuardConfig } from '../config';

describe('EnterpriseExAIGuard Simple Integration Tests', () => {
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

  describe('Basic Functionality', () => {
    test('should initialize successfully', () => {
      expect(exaiGuard).toBeDefined();
      expect(exaiGuard.getConfig()).toBeDefined();
    });

    test('should detect violations in simple content', async () => {
      const content = 'This is a test content with TODO: fix this';
      
      const violations = await exaiGuard.detectViolations(content, {
        isCode: false
      });

      expect(Array.isArray(violations)).toBe(true);
    });

    test('should handle empty content gracefully', async () => {
      const violations = await exaiGuard.detectViolations('', { isCode: true });
      expect(Array.isArray(violations)).toBe(true);
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
    test('should throw error when not initialized', async () => {
      const uninitializedGuard = new EnterpriseExAIGuard();
      
      await expect(
        uninitializedGuard.detectViolations('test', {})
      ).rejects.toThrow('Enterprise ExAI Guard not initialized');
    });
  });
});