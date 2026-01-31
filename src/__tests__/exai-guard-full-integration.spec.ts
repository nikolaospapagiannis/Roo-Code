/**
 * Full Integration Test for ExAI Guard System
 * Tests the complete integration including brain, multi-agent, and enterprise detection
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExAIGuardService } from '../services/exai-guard/ExAIGuardService';
import { enhancedBrainService } from '../services/exai-guard/EnhancedBrainService';
import { multiAgentService } from '../services/exai-guard/MultiAgentService';
import { enterpriseViolationDetectionService } from '../services/exai-guard/EnterpriseViolationDetectionService';
import { ExAIGuardViolationSeverity, ExAIGuardViolationType } from '../services/exai-guard/ExAIGuardService';

describe('ExAI Guard Full Integration', () => {
  let exaiGuardService: ExAIGuardService;
  let mockContext: any;

  beforeEach(async () => {
    // Mock VSCode extension context
    mockContext = {
      globalState: {
        get: vi.fn(),
        update: vi.fn()
      }
    };

    // Initialize services
    exaiGuardService = ExAIGuardService.getInstance();
    await exaiGuardService.initialize(mockContext);
    
    // Initialize enhanced services
    await enhancedBrainService.initialize();
    await multiAgentService.initialize();
    await enterpriseViolationDetectionService.initialize();
  });

  afterEach(async () => {
    // Clean up services
    await multiAgentService.shutdown();
    await enterpriseViolationDetectionService.shutdown();
  });

  describe('Core ExAI Guard Service', () => {
    test('should initialize with default configuration', () => {
      const config = exaiGuardService.getConfig();
      
      expect(config.enabled).toBe(true);
      expect(config.realTimeDetection).toBe(true);
      expect(config.autoCorrection).toBe(true);
      expect(config.violationTypes.security).toBe(true);
      expect(config.violationTypes.privacy).toBe(true);
      expect(config.violationTypes.compliance).toBe(true);
      expect(config.violationTypes.ethical).toBe(true);
      expect(config.violationTypes.quality).toBe(true);
    });

    test('should detect basic security violations', () => {
      const vulnerableCode = `
        const password = "hardcoded123";
        const query = "SELECT * FROM users WHERE username = '" + userInput + "'";
        eval(userInput);
      `;

      const violations = exaiGuardService.scanContent(vulnerableCode, {
        filePath: 'test.js',
        language: 'javascript'
      });

      expect(violations.length).toBeGreaterThan(0);
      
      const securityViolations = violations.filter(v => v.type === ExAIGuardViolationType.SECURITY);
      expect(securityViolations.length).toBeGreaterThan(0);
      
      const criticalViolations = violations.filter(v => v.severity === ExAIGuardViolationSeverity.CRITICAL);
      expect(criticalViolations.length).toBeGreaterThan(0);
    });

    test('should intercept incomplete code in streams', async () => {
      const incompleteCode = `
        function calculateTotal(items) {
          // TODO: implement calculation logic
          return 0;
        }
        
        // placeholder for authentication
        function authenticateUser() {
          // FIXME: implement real authentication
          return true;
        }
      `;

      const result = await exaiGuardService.interceptStream(incompleteCode, {
        taskId: 'test-task-123',
        messageId: 'test-message-456'
      });

      expect(result.intercepted).toBe(true);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.subtasks.length).toBeGreaterThan(0);
      
      const incompleteViolations = result.violations.filter(v => 
        v.description.includes('incomplete') || v.description.includes('placeholder')
      );
      expect(incompleteViolations.length).toBeGreaterThan(0);
    });
  });

  describe('Enhanced Brain Service Integration', () => {
    test('should analyze code patterns with organizational intelligence', async () => {
      const codePattern = {
        id: 'test-pattern-1',
        patternType: 'security_analysis',
        codeSnippet: 'const password = "hardcoded123";',
        context: 'Security analysis test',
        filePath: 'test.js',
        lineNumber: 1,
        language: 'javascript',
        severity: ExAIGuardViolationSeverity.HIGH,
        isViolation: true,
        confidence: 0.9,
        metadata: { test: true }
      };

      const result = await enhancedBrainService.analyzeCodePattern(codePattern);
      
      expect(result).toBeDefined();
      expect(result.successRate).toBeGreaterThan(0);
      expect(result.recommendedAction).toBeDefined();
      expect(result.autoFixAvailable).toBeDefined();
    });

    test('should predict violation confidence with ML', async () => {
      const code = `
        const apiKey = "sk-1234567890abcdef";
        eval(userInput);
      `;

      const prediction = await enhancedBrainService.predictViolationConfidence(code, {
        context: 'security_scanning',
        filePath: 'test.js',
        language: 'javascript'
      });

      expect(prediction).toBeDefined();
      expect(prediction.confidence).toBeGreaterThan(0);
      expect(prediction.predictedLabel).toBeDefined();
      expect(prediction.features).toBeDefined();
    });

    test('should provide organizational insights', async () => {
      const insights = await enhancedBrainService.getOrganizationalInsights();
      
      expect(insights).toBeDefined();
      expect(insights.patterns).toBeDefined();
      expect(insights.recommendations).toBeDefined();
      expect(insights.performanceMetrics).toBeDefined();
    });
  });

  describe('Multi-Agent Orchestration', () => {
    test('should register and manage agents', async () => {
      const initialAgentCount = multiAgentService.getSystemMetrics().totalAgents;
      expect(initialAgentCount).toBeGreaterThan(0);

      const agents = [
        'violation-detector',
        'code-fixer', 
        'quality-analyzer',
        'security-scanner',
        'ml-predictor'
      ];

      for (const agentId of agents) {
        const metrics = multiAgentService.getAgentMetrics(agentId);
        expect(metrics).toBeDefined();
        expect(metrics?.totalTasks).toBeGreaterThanOrEqual(0);
      }
    });

    test('should submit and process analysis tasks', async () => {
      const code = `
        const password = "hardcoded123";
        const query = "SELECT * FROM users";
      `;

      const taskId = await multiAgentService.submitCodeAnalysisTask(
        code,
        'test.js',
        'javascript'
      );

      expect(taskId).toBeDefined();
      expect(taskId).toMatch(/^task_\d+_/);

      // Wait a bit for task processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const taskStatus = multiAgentService.getTaskStatus(taskId);
      expect(taskStatus).toBeDefined();
      
      // Task should be completed or running
      expect(['COMPLETED', 'RUNNING', 'ASSIGNED']).toContain(taskStatus?.status);
    });

    test('should submit and process code fix tasks', async () => {
      const violations = [
        {
          id: 'test-violation-1',
          type: ExAIGuardViolationType.SECURITY,
          severity: ExAIGuardViolationSeverity.HIGH,
          message: 'Hardcoded password detected',
          description: 'Password is hardcoded in the source code',
          timestamp: Date.now(),
          context: {
            filePath: 'test.js',
            lineNumber: '1'
          }
        }
      ];

      const originalCode = 'const password = "hardcoded123";';
      const context = { language: 'javascript', filePath: 'test.js' };

      const taskId = await multiAgentService.submitCodeFixTask(
        violations,
        originalCode,
        context
      );

      expect(taskId).toBeDefined();
      expect(taskId).toMatch(/^task_\d+_/);
    });

    test('should provide system metrics', () => {
      const metrics = multiAgentService.getSystemMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.totalAgents).toBeGreaterThan(0);
      expect(metrics.totalTasks).toBeGreaterThanOrEqual(0);
      expect(metrics.completedTasks).toBeGreaterThanOrEqual(0);
      expect(metrics.averageTaskTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Enterprise Violation Detection', () => {
    test('should initialize with enterprise patterns', () => {
      const patternCount = enterpriseViolationDetectionService.getPatternCount();
      expect(patternCount).toBeGreaterThan(50); // Should have many patterns

      const supportedLanguages = enterpriseViolationDetectionService.getSupportedLanguages();
      expect(supportedLanguages).toContain('javascript');
      expect(supportedLanguages).toContain('typescript');
      expect(supportedLanguages).toContain('python');
    });

    test('should detect enterprise-grade security violations', async () => {
      const vulnerableCode = `
        // SQL Injection vulnerability
        const query = "SELECT * FROM users WHERE username = '" + userInput + "'";
        
        // XSS vulnerability  
        document.getElementById('content').innerHTML = userContent;
        
        // Hardcoded secrets
        const apiKey = "sk-1234567890abcdef";
        const password = "superSecret123!";
        
        // Weak crypto
        const hash = crypto.createHash('md5').update(password).digest('hex');
        
        // CORS misconfiguration
        app.use(cors({ origin: '*' }));
      `;

      const result = await enterpriseViolationDetectionService.detectViolations(vulnerableCode, {
        filePath: 'enterprise-test.js',
        language: 'javascript'
      });

      expect(result).toBeDefined();
      expect(result.violations.length).toBeGreaterThan(3); // Should detect multiple violations
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.riskScore).toBeGreaterThan(5);
      expect(result.recommendations.length).toBeGreaterThan(0);
      
      // Should have security violations
      const securityViolations = result.violations.filter(v => v.type === ExAIGuardViolationType.SECURITY);
      expect(securityViolations.length).toBeGreaterThan(2);
      
      // Should have critical/high severity violations
      const highSeverityViolations = result.violations.filter(v => 
        v.severity === ExAIGuardViolationSeverity.CRITICAL || 
        v.severity === ExAIGuardViolationSeverity.HIGH
      );
      expect(highSeverityViolations.length).toBeGreaterThan(1);
    });

    test('should provide detection metrics', () => {
      const metrics = enterpriseViolationDetectionService.getMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.totalScans).toBeGreaterThanOrEqual(0);
      expect(metrics.violationsDetected).toBeGreaterThanOrEqual(0);
      expect(metrics.averageConfidence).toBeGreaterThanOrEqual(0);
      expect(metrics.performance.averageDetectionTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('End-to-End Real-Time Correction', () => {
    test('should perform complete real-time violation detection and correction', async () => {
      const problematicCode = `
        // Security issues
        const password = "hardcodedPassword123";
        const query = "DELETE FROM users WHERE id = " + userId;
        
        // Quality issues  
        function veryLongFunction() {
          // ... 100+ lines of code ...
          console.log("This function is too long and complex");
          // ... more code ...
        }
        
        // Privacy issues
        const userEmail = "user@example.com";
        const phoneNumber = "+1234567890";
      `;

      // Step 1: Core violation detection
      const coreViolations = exaiGuardService.scanContent(problematicCode, {
        filePath: 'e2e-test.js',
        language: 'javascript',
        realTime: true
      });

      expect(coreViolations.length).toBeGreaterThan(0);

      // Step 2: Enterprise-grade detection
      const enterpriseResult = await enterpriseViolationDetectionService.detectViolations(problematicCode, {
        filePath: 'e2e-test.js',
        language: 'javascript'
      });

      expect(enterpriseResult.violations.length).toBeGreaterThan(0);

      // Step 3: Multi-agent analysis
      const analysisTaskId = await multiAgentService.submitCodeAnalysisTask(
        problematicCode,
        'e2e-test.js',
        'javascript'
      );

      expect(analysisTaskId).toBeDefined();

      // Step 4: Enhanced brain analysis
      const brainAnalysis = await enhancedBrainService.analyzeCodePattern({
        id: 'e2e-test-pattern',
        patternType: 'comprehensive_analysis',
        codeSnippet: problematicCode,
        context: 'End-to-end test analysis',
        filePath: 'e2e-test.js',
        lineNumber: 1,
        language: 'javascript',
        severity: ExAIGuardViolationSeverity.HIGH,
        isViolation: true,
        confidence: 0.8,
        metadata: { testType: 'e2e' }
      });

      expect(brainAnalysis).toBeDefined();
      expect(brainAnalysis.successRate).toBeGreaterThan(0);

      // Step 5: Stream interception (simulating real-time AI response)
      const streamResult = await exaiGuardService.interceptStream(problematicCode, {
        taskId: 'e2e-task-123',
        messageId: 'e2e-message-456'
      });

      expect(streamResult.intercepted).toBe(true);
      expect(streamResult.violations.length).toBeGreaterThan(0);
      expect(streamResult.subtasks.length).toBeGreaterThan(0);

      // Verify that all systems are working together
      const totalViolations = [
        ...coreViolations,
        ...enterpriseResult.violations,
        ...streamResult.violations
      ];

      expect(totalViolations.length).toBeGreaterThan(3);

      // Should have violations from different categories
      const securityCount = totalViolations.filter(v => v.type === ExAIGuardViolationType.SECURITY).length;
      const privacyCount = totalViolations.filter(v => v.type === ExAIGuardViolationType.PRIVACY).length;
      const qualityCount = totalViolations.filter(v => v.type === ExAIGuardViolationType.QUALITY).length;

      expect(securityCount).toBeGreaterThan(0);
      expect(privacyCount).toBeGreaterThan(0);
      expect(qualityCount).toBeGreaterThan(0);

      // Should have auto-correctable violations
      const autoCorrectableViolations = totalViolations.filter(v => 
        v.correction?.autoCorrectable === true
      );
      expect(autoCorrectableViolations.length).toBeGreaterThan(0);

      console.log('End-to-End Test Results:');
      console.log('- Core violations:', coreViolations.length);
      console.log('- Enterprise violations:', enterpriseResult.violations.length);
      console.log('- Stream violations:', streamResult.violations.length);
      console.log('- Security violations:', securityCount);
      console.log('- Privacy violations:', privacyCount);
      console.log('- Quality violations:', qualityCount);
      console.log('- Auto-correctable violations:', autoCorrectableViolations.length);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle multiple concurrent detection requests', async () => {
      const testCodeSamples = [
        'const password = "test123"; eval(userInput);',
        'document.innerHTML = userContent;',
        'const apiKey = "sk-test123";',
        'crypto.createHash("md5").update(data);',
        'app.use(cors({ origin: "*" }));'
      ];

      const promises = testCodeSamples.map((code, index) =>
        enterpriseViolationDetectionService.detectViolations(code, {
          filePath: `concurrent-test-${index}.js`,
          language: 'javascript'
        })
      );

      const results = await Promise.all(promises);

      results.forEach((result, index) => {
        expect(result).toBeDefined();
        expect(result.violations.length).toBeGreaterThan(0);
        expect(result.performanceMetrics.detectionTime).toBeLessThan(1000); // Should be fast
      });

      const totalViolations = results.reduce((sum, result) => sum + result.violations.length, 0);
      expect(totalViolations).toBeGreaterThan(testCodeSamples.length);
    });

    test('should maintain system stability under load', async () => {
      // Submit multiple tasks to multi-agent system
      const taskPromises = Array.from({ length: 10 }, (_, i) =>
        multiAgentService.submitCodeAnalysisTask(
          `const test${i} = "value${i}";`,
          `load-test-${i}.js`,
          'javascript'
        )
      );

      const taskIds = await Promise.all(taskPromises);
      expect(taskIds).toHaveLength(10);

      // Wait for tasks to process
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check system metrics
      const metrics = multiAgentService.getSystemMetrics();
      expect(metrics.totalTasks).toBeGreaterThanOrEqual(10);
      expect(metrics.systemLoad).toBeLessThan(1); // Should not be overloaded

      const runningTasks = multiAgentService.getRunningTasks();
      expect(runningTasks.length).toBeLessThanOrEqual(metrics.totalAgents * 5); // Should not exceed capacity
    });
  });
});