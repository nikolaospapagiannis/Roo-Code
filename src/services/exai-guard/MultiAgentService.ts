
/**
 * Multi-Agent Orchestration Service
 * Integrates ExAI Guard's multi-agent system for distributed code analysis and fixing
 */

import { EventEmitter } from 'events';
import { ExAIGuardService } from './ExAIGuardService';
import { enhancedBrainService } from './EnhancedBrainService';

export interface AgentConfig {
  id: string;
  capabilities: string[];
  maxConcurrentTasks: number;
  timeout: number;
  retryCount: number;
}

export interface Task {
  id: string;
  type: string;
  capability: string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW' | 'BACKGROUND';
  payload: any;
  status: 'PENDING' | 'ASSIGNED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  assignedAgent?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: any;
  error?: string;
  retryCount: number;
  maxRetries: number;
  timeout: number;
  dependencies: string[];
  metadata: Record<string, any>;
}

export interface AgentMetrics {
  totalTasks: number;
  successRate: number;
  averageExecutionTime: number;
  cpuUsage: number;
  memoryUsage: number;
  lastHeartbeat: number;
}

export interface SystemMetrics {
  totalAgents: number;
  activeAgents: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageTaskTime: number;
  throughput: number;
  systemLoad: number;
  startTime: number;
}

export class MultiAgentService extends EventEmitter {
  private static instance: MultiAgentService;
  private config: {
    maxAgents: number;
    taskTimeout: number;
    heartbeatInterval: number;
    cleanupInterval: number;
    loadBalancingStrategy: 'round_robin' | 'least_loaded' | 'performance_based' | 'random';
  };
  
  private agents: Map<string, AgentConfig> = new Map();
  private tasks: Map<string, Task> = new Map();
  private pendingTasks: Task[] = [];
  private runningTasks: Map<string, { taskId: string; agentId: string; startedAt: number }> = new Map();
  private completedTasks: Task[] = [];
  private failedTasks: Task[] = [];
  
  private metrics: SystemMetrics;
  private isRunning = false;
  private heartbeatTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;
  private processingTimer?: NodeJS.Timeout;
  private metricsTimer?: NodeJS.Timeout;

  private constructor() {
    super();
    this.config = this.getDefaultConfig();
    this.metrics = this.initializeMetrics();
  }

  public static getInstance(): MultiAgentService {
    if (!MultiAgentService.instance) {
      MultiAgentService.instance = new MultiAgentService();
    }
    return MultiAgentService.instance;
  }

  private getDefaultConfig() {
    return {
      maxAgents: 50,
      taskTimeout: 30000,
      heartbeatInterval: 5000,
      cleanupInterval: 60000,
      loadBalancingStrategy: 'least_loaded' as const
    };
  }

  private initializeMetrics(): SystemMetrics {
    return {
      totalAgents: 0,
      activeAgents: 0,
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageTaskTime: 0,
      throughput: 0,
      systemLoad: 0,
      startTime: Date.now()
    };
  }

  public async initialize(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    try {
      // Register default agents
      await this.registerDefaultAgents();
      
      // Start background tasks
      this.startBackgroundTasks();
      
      this.isRunning = true;
      this.emit('orchestrator_initialized');
      
      console.log('Multi-Agent Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Multi-Agent Service:', error);
      throw error;
    }
  }

  private async registerDefaultAgents(): Promise<void> {
    const defaultAgents: AgentConfig[] = [
      {
        id: 'violation-detector',
        capabilities: ['violation_detection', 'pattern_analysis', 'code_scanning'],
        maxConcurrentTasks: 5,
        timeout: 15000,
        retryCount: 2
      },
      {
        id: 'code-fixer',
        capabilities: ['code_fixing', 'refactoring', 'auto_correction'],
        maxConcurrentTasks: 3,
        timeout: 30000,
        retryCount: 1
      },
      {
        id: 'quality-analyzer',
        capabilities: ['quality_analysis', 'complexity_check', 'best_practices'],
        maxConcurrentTasks: 4,
        timeout: 20000,
        retryCount: 2
      },
      {
        id: 'security-scanner',
        capabilities: ['security_scanning', 'vulnerability_detection', 'secret_detection'],
        maxConcurrentTasks: 3,
        timeout: 25000,
        retryCount: 1
      },
      {
        id: 'ml-predictor',
        capabilities: ['ml_prediction', 'confidence_scoring', 'pattern_recognition'],
        maxConcurrentTasks: 2,
        timeout: 10000,
        retryCount: 3
      }
    ];

    for (const agentConfig of defaultAgents) {
      await this.registerAgent(agentConfig);
    }
  }

  public async registerAgent(agentConfig: AgentConfig): Promise<void> {
    if (this.agents.size >= this.config.maxAgents) {
      throw new Error(`Maximum agent limit (${this.config.maxAgents}) reached`);
    }

    this.agents.set(agentConfig.id, agentConfig);
    this.metrics.totalAgents = this.agents.size;
    this.metrics.activeAgents = this.getActiveAgents().length;

    this.emit('agent_registered', agentConfig);
    console.log(`Agent ${agentConfig.id} registered with capabilities: ${agentConfig.capabilities.join(', ')}`);
  }

  public async unregisterAgent(agentId: string): Promise<void> {
    if (!this.agents.has(agentId)) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Cancel all tasks assigned to this agent
    for (const [taskId, task] of this.tasks) {
      if (task.assignedAgent === agentId && task.status === 'RUNNING') {
        await this.cancelTask(taskId);
      }
    }

    this.agents.delete(agentId);
    this.metrics.totalAgents = this.agents.size;
    this.metrics.activeAgents = this.getActiveAgents().length;

    this.emit('agent_unregistered', agentId);
    console.log(`Agent ${agentId} unregistered`);
  }

  public async submitTask(taskOptions: {
    type: string;
    capability: string;
    priority?: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW' | 'BACKGROUND';
    payload: any;
    timeout?: number;
    maxRetries?: number;
    dependencies?: string[];
    metadata?: Record<string, any>;
  }): Promise<string> {
    const task: Task = {
      id: this.generateTaskId(),
      type: taskOptions.type,
      capability: taskOptions.capability,
      priority: taskOptions.priority || 'NORMAL',
      payload: taskOptions.payload,
      status: 'PENDING',
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: taskOptions.maxRetries || 3,
      timeout: taskOptions.timeout || this.config.taskTimeout,
      dependencies: taskOptions.dependencies || [],
      metadata: taskOptions.metadata || {}
    };

    this.tasks.set(task.id, task);
    this.pendingTasks.push(task);
    this.metrics.totalTasks++;

    this.emit('task_submitted', task);
    console.log(`Task ${task.id} submitted: ${task.type} (${task.capability})`);

    return task.id;
  }

  public async submitCodeAnalysisTask(code: string, filePath: string, language: string): Promise<string> {
    return await this.submitTask({
      type: 'CODE_ANALYSIS',
      capability: 'violation_detection',
      priority: 'HIGH',
      payload: {
        code,
        filePath,
        language,
        timestamp: new Date().toISOString()
      },
      timeout: 10000,
      maxRetries: 2,
      metadata: {
        analysisType: 'real_time',
        source: 'stream_interception'
      }
    });
  }

  public async submitCodeFixTask(violations: any[], originalCode: string, context: any): Promise<string> {
    return await this.submitTask({
      type: 'CODE_FIX',
      capability: 'code_fixing',
      priority: 'HIGH',
      payload: {
        violations,
        originalCode,
        context,
        timestamp: new Date().toISOString()
      },
      timeout: 30000,
      maxRetries: 1,
      metadata: {
        fixType: 'auto_correction',
        violationCount: violations.length
      }
    });
  }

  private startBackgroundTasks(): void {
    // Heartbeat monitoring
    this.heartbeatTimer = setInterval(() => {
      this.checkAgentHealth();
    }, this.config.heartbeatInterval);

    // Cleanup expired tasks
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredTasks();
    }, this.config.cleanupInterval);

    // Process pending tasks
    this.processingTimer = setInterval(() => {
      this.processPendingTasks();
    }, 1000);

    // Update metrics
    this.metricsTimer = setInterval(() => {
      this.updateSystemMetrics();
    }, 5000);
  }

  private async processPendingTasks(): Promise<void> {
    if (!this.isRunning || this.pendingTasks.length === 0) {
      return;
    }

    const availableAgents = this.getAvailableAgents();
    if (availableAgents.length === 0) {
      return;
    }

    // Process tasks based on priority
    const prioritizedTasks = this.prioritizeTasks(this.pendingTasks);
    
    for (const task of prioritizedTasks) {
      if (this.runningTasks.size >= this.getMaxConcurrentTasks()) {
        break;
      }

      const agent = this.selectAgent(availableAgents, task);
      if (agent) {
        await this.assignTask(task, agent);
      }
    }
  }

  private prioritizeTasks(tasks: Task[]): Task[] {
    const priorityWeights = {
      URGENT: 5,
      HIGH: 4,
      NORMAL: 3,
      LOW: 2,
      BACKGROUND: 1
    };

    return tasks.sort((a, b) => {
      const priorityDiff = priorityWeights[b.priority] - priorityWeights[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // If same priority, use creation time
      return a.createdAt - b.createdAt;
    });
  }

  private selectAgent(availableAgents: AgentConfig[], task: Task): AgentConfig | null {
    const capableAgents = availableAgents.filter(agent =>
      agent.capabilities.includes(task.capability) || agent.capabilities.includes('*')
    );

    if (capableAgents.length === 0) {
      return null;
    }

    switch (this.config.loadBalancingStrategy) {
      case 'round_robin':
        return capableAgents[Math.floor(Math.random() * capableAgents.length)];
      
      case 'least_loaded':
        return capableAgents.reduce((leastLoaded, agent) => {
          const currentLoad = this.getAgentLoad(agent.id);
          const leastLoad = this.getAgentLoad(leastLoaded.id);
          return currentLoad < leastLoad ? agent : leastLoaded;
        });
      
      case 'performance_based':
        // For now, use random selection
        return capableAgents[Math.floor(Math.random() * capableAgents.length)];
      
      case 'random':
      default:
        return capableAgents[Math.floor(Math.random() * capableAgents.length)];
    }
  }

  private getAgentLoad(agentId: string): number {
    const runningTasksForAgent = Array.from(this.runningTasks.values())
      .filter(running => running.agentId === agentId).length;
    
    const agent = this.agents.get(agentId);
    return agent ? runningTasksForAgent / agent.maxConcurrentTasks : 1;
  }

  private async assignTask(task: Task, agent: AgentConfig): Promise<void> {
    // Remove from pending
    const pendingIndex = this.pendingTasks.findIndex(t => t.id === task.id);
    if (pendingIndex !== -1) {
      this.pendingTasks.splice(pendingIndex, 1);
    }

    // Update task status
    task.status = 'ASSIGNED';
    task.assignedAgent = agent.id;
    task.startedAt = Date.now();

    // Add to running tasks
    this.runningTasks.set(task.id, {
      taskId: task.id,
      agentId: agent.id,
      startedAt: task.startedAt
    });

    this.emit('task_assigned', { taskId: task.id, agentId: agent.id });

    // Execute task asynchronously
    this.executeTask(task, agent).catch(error => {
      console.error(`Task execution failed: ${task.id}`, error);
      this.handleTaskError(task.id, error, agent.id);
    });
  }

  private async executeTask(task: Task, agent: AgentConfig): Promise<void> {
    try {
      task.status = 'RUNNING';
      this.emit('task_started', { taskId: task.id, agentId: agent.id });

      let result: any;

      // Route to appropriate handler based on task type and capability
      switch (task.capability) {
        case 'violation_detection':
          result = await this.executeViolationDetection(task);
          break;
        
        case 'code_fixing':
          result = await this.executeCodeFixing(task);
          break;
        
        case 'quality_analysis':
          result = await this.executeQualityAnalysis(task);
          break;
        
        case 'security_scanning':
          result = await this.executeSecurityScanning(task);
          break;
        
        case 'ml_prediction':
          result = await this.executeMLPrediction(task);
          break;
        
        default:
          throw new Error(`Unknown capability: ${task.capability}`);
      }

      await this.handleTaskResult(task.id, result, agent.id);
      
    } catch (error) {
      await this.handleTaskError(task.id, error, agent.id);
    }
  }

  private async executeViolationDetection(task: Task): Promise<any> {
    const { code, filePath, language } = task.payload;
    
    // Use enhanced brain service for intelligent analysis
    const brainResult = await enhancedBrainService.analyzeCodePattern({
      id: task.id,
      patternType: 'violation_detection',
      codeSnippet: code,
      context: `File: ${filePath}, Language: ${language}`,
      filePath,
      lineNumber: 0,
      language,
      severity: 'UNKNOWN',
      isViolation: false,
      confidence: 0,
      metadata: task.metadata
    });

    // Use ExAI Guard service for basic violation detection
    const violations = ExAIGuardService.getInstance().scanContent(code, {
      filePath,
      language,
      realTime: true
    });

    return {
      violations,
      organizationalIntelligence: brainResult,
      confidence: brainResult.successRate,
      autoFixAvailable: brainResult.autoFixAvailable
    };
  }

  private async executeCodeFixing(task: Task): Promise<any> {
    const { violations, originalCode, context } = task.payload;
    
    // Use enhanced brain service for intelligent fixing recommendations
    const fixRecommendations = await Promise.all(
      violations.map(async (violation: any) => {
        const brainAnalysis = await enhancedBrainService.analyzeCodePattern({
          id: `${task.id}_${violation.id}`,
          patternType: 'code_fix',
          codeSnippet: violation.matchedText,
          context: `Fix for: ${violation.ruleName}`,
          filePath: violation.filePath,
          lineNumber: violation.line,
          language: context.language,
          severity: violation.severity,
          isViolation: true,
          confidence: 0.8,
          metadata: { ...violation, fixContext: context }
        });

        return {
          violationId: violation.id,
          recommendation: brainAnalysis.recommendedAction,
          confidence: brainAnalysis.successRate,
          autoFix: brainAnalysis.autoFixAvailable
        };
      })
    );

    // Generate fixed code - use the first violation for now
    const firstViolation = violations[0]
    const fixedCode = await ExAIGuardService.getInstance().generateFix(
      firstViolation,
      originalCode
    );

    return {
      fixedCode,
      fixRecommendations,
      appliedFixes: violations.length,
      confidence: Math.min(...fixRecommendations.map((r: any) => r.confidence))
    };
  }

  private async executeQualityAnalysis(task: Task): Promise<any> {
    const { code, filePath, language } = task.payload;
    
    // Use enhanced brain service for quality insights
    const qualityInsights = await enhancedBrainService.getOrganizationalInsights();
    
    // Analyze code quality metrics
    const metrics = {
      complexity: this.calculateComplexity(code),
      maintainability: this.calculateMaintainability(code),
      documentation: this.calculateDocumentationRatio(code),
      bestPractices: this.detectBestPractices(code, language)
    };

    return {
      metrics,
      organizationalInsights: qualityInsights,
      qualityScore: this.calculateQualityScore(metrics),
      recommendations: this.generateQualityRecommendations(metrics)
    };
  }

  private async executeSecurityScanning(task: Task): Promise<any> {
    const { code, filePath, language } = task.payload;
    
    // Use enhanced brain service for security pattern recognition
    const securityPatterns = await enhancedBrainService.predictViolationConfidence(
      code,
      { context: 'security_scanning', filePath, language }
    );

    // Detect security vulnerabilities
    const vulnerabilities = ExAIGuardService.getInstance().scanContent(code, {
      filePath,
      language,
      categories: ['security']
    });

    return {
      vulnerabilities,
      securityPatterns,
      riskLevel: this.calculateRiskLevel(vulnerabilities),
      recommendations: this.generateSecurityRecommendations(vulnerabilities)
    };
  }

  private async executeMLPrediction(task: Task): Promise<any> {
    const { code, context } = task.payload;
    
    // Use enhanced brain service for ML predictions
    const prediction = await enhancedBrainService.predictViolationConfidence(
      code,
      { context: 'ml_prediction', ...context }
    );

    return {
      prediction,
      confidence: prediction.confidence,
      recommendedAction: prediction.predictedLabel,
      metadata: { features: prediction.features }
    };
  }

  private async handleTaskResult(taskId: string, result: any, agentId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = 'COMPLETED';
    task.completedAt = Date.now();
    task.result = result;

    this.runningTasks.delete(taskId);
    this.completedTasks.push(task);
    this.metrics.completedTasks++;

    this.emit('task_completed', { taskId, agentId, result });
    console.log(`Task ${taskId} completed by agent ${agentId}`);
  }

  private async handleTaskError(taskId: string, error: any, agentId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.retryCount++;
    task.error = error.message || String(error);

    if (task.retryCount >= task.maxRetries) {
      task.status = 'FAILED';
      this.failedTasks.push(task);
      this.metrics.failedTasks++;
      this.emit('task_failed', { taskId, agentId, error: task.error });
      console.error(`Task ${taskId} failed after ${task.maxRetries} retries: ${task.error}`);
    } else {
      task.status = 'PENDING';
      task.assignedAgent = undefined;
      task.startedAt = undefined;
      this.pendingTasks.push(task);
      this.emit('task_retry', { taskId, agentId, retryCount: task.retryCount });
      console.log(`Task ${taskId} queued for retry (${task.retryCount}/${task.maxRetries})`);
    }

    this.runningTasks.delete(taskId);
  }

  public async cancelTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    if (task.status === 'RUNNING' || task.status === 'ASSIGNED') {
      task.status = 'CANCELLED';
      this.runningTasks.delete(taskId);
      this.emit('task_cancelled', { taskId, agentId: task.assignedAgent });
    } else if (task.status === 'PENDING') {
      const pendingIndex = this.pendingTasks.findIndex(t => t.id === taskId);
      if (pendingIndex !== -1) {
        this.pendingTasks.splice(pendingIndex, 1);
      }
      task.status = 'CANCELLED';
    }

    console.log(`Task ${taskId} cancelled`);
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getActiveAgents(): AgentConfig[] {
    return Array.from(this.agents.values()).filter(agent => {
      const runningTasksForAgent = Array.from(this.runningTasks.values())
        .filter(running => running.agentId === agent.id).length;
      return runningTasksForAgent < agent.maxConcurrentTasks;
    });
  }

  private getAvailableAgents(): AgentConfig[] {
    return this.getActiveAgents();
  }

  private getMaxConcurrentTasks(): number {
    return Array.from(this.agents.values())
      .reduce((sum, agent) => sum + agent.maxConcurrentTasks, 0);
  }

  private checkAgentHealth(): void {
    const now = Date.now();
    const unhealthyAgents: string[] = [];

    for (const [agentId, agent] of this.agents) {
      const runningTasksForAgent = Array.from(this.runningTasks.values())
        .filter(running => running.agentId === agentId);

      // Check for timed out tasks
      for (const running of runningTasksForAgent) {
        const task = this.tasks.get(running.taskId);
        if (task && now - running.startedAt > task.timeout) {
          console.warn(`Task ${running.taskId} timed out for agent ${agentId}`);
          this.handleTaskError(running.taskId, new Error('Task timeout'), agentId);
        }
      }
    }

    this.emit('health_check', { unhealthyAgents });
  }

  private cleanupExpiredTasks(): void {
    const now = Date.now();
    const cleanupThreshold = 24 * 60 * 60 * 1000; // 24 hours

    // Clean up old completed tasks
    this.completedTasks = this.completedTasks.filter(task =>
      now - (task.completedAt || task.createdAt) < cleanupThreshold
    );

    // Clean up old failed tasks
    this.failedTasks = this.failedTasks.filter(task =>
      now - (task.completedAt || task.createdAt) < cleanupThreshold
    );

    console.log(`Cleanup completed: ${this.completedTasks.length} completed, ${this.failedTasks.length} failed tasks retained`);
  }

  private updateSystemMetrics(): void {
    const now = Date.now();
    const runtime = now - this.metrics.startTime;

    // Calculate throughput (tasks per minute)
    const completedInLastMinute = this.completedTasks.filter(task =>
      task.completedAt && (now - task.completedAt) < 60000
    ).length;
    this.metrics.throughput = completedInLastMinute;

    // Calculate average task time
    const completedTasksWithTime = this.completedTasks.filter(task =>
      task.startedAt && task.completedAt
    );
    if (completedTasksWithTime.length > 0) {
      const totalTime = completedTasksWithTime.reduce((sum, task) =>
        sum + ((task.completedAt || 0) - (task.startedAt || 0)), 0
      );
      this.metrics.averageTaskTime = totalTime / completedTasksWithTime.length;
    }

    // Calculate system load
    const totalCapacity = this.getMaxConcurrentTasks();
    const currentLoad = this.runningTasks.size;
    this.metrics.systemLoad = totalCapacity > 0 ? currentLoad / totalCapacity : 0;

    this.emit('metrics_updated', this.metrics);
  }

  // Code analysis helper methods
  private calculateComplexity(code: string): number {
    // Simple complexity calculation based on lines and structure
    const lines = code.split('\n').length;
    const brackets = (code.match(/[{}]/g) || []).length;
    return Math.min(100, (lines * 0.3) + (brackets * 0.7));
  }

  private calculateMaintainability(code: string): number {
    const complexity = this.calculateComplexity(code);
    const comments = (code.match(/\/\/|\/\*|\*/g) || []).length;
    const lines = code.split('\n').length;
    const commentRatio = lines > 0 ? comments / lines : 0;
    
    return Math.max(0, 100 - complexity + (commentRatio * 50));
  }

  private calculateDocumentationRatio(code: string): number {
    const lines = code.split('\n').length;
    const commentLines = code.split('\n').filter(line =>
      line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')
    ).length;
    
    return lines > 0 ? (commentLines / lines) * 100 : 0;
  }

  private detectBestPractices(code: string, language: string): string[] {
    const practices: string[] = [];
    
    // Language-specific best practices
    if (language === 'typescript' || language === 'javascript') {
      if (code.includes('const ') || code.includes('let ')) practices.push('uses_const_let');
      if (!code.includes('var ')) practices.push('no_var');
      if (code.includes('interface ') || code.includes('type ')) practices.push('uses_types');
    }
    
    if (language === 'python') {
      if (code.includes('def ') && code.includes('->')) practices.push('uses_type_hints');
      if (code.includes('with ')) practices.push('uses_context_managers');
    }
    
    // General best practices
    if (code.includes('try {') && code.includes('} catch')) practices.push('error_handling');
    if (code.includes('async ') && code.includes('await ')) practices.push('async_await');
    
    return practices;
  }

  private calculateQualityScore(metrics: any): number {
    const weights = {
      complexity: 0.3,
      maintainability: 0.4,
      documentation: 0.2,
      bestPractices: 0.1
    };
    
    const complexityScore = Math.max(0, 100 - metrics.complexity);
    const maintainabilityScore = Math.min(100, metrics.maintainability);
    const documentationScore = Math.min(100, metrics.documentation * 10); // Scale up
    const bestPracticesScore = (metrics.bestPractices.length / 5) * 100; // Normalize to 5 practices
    
    return (
      complexityScore * weights.complexity +
      maintainabilityScore * weights.maintainability +
      documentationScore * weights.documentation +
      bestPracticesScore * weights.bestPractices
    );
  }

  private generateQualityRecommendations(metrics: any): string[] {
    const recommendations: string[] = [];
    
    if (metrics.complexity > 70) {
      recommendations.push('Consider refactoring to reduce code complexity');
    }
    
    if (metrics.maintainability < 60) {
      recommendations.push('Improve code maintainability by breaking down complex functions');
    }
    
    if (metrics.documentation < 20) {
      recommendations.push('Add more comments and documentation');
    }
    
    if (metrics.bestPractices.length < 3) {
      recommendations.push('Follow more language-specific best practices');
    }
    
    return recommendations;
  }

  private calculateRiskLevel(vulnerabilities: any[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const criticalCount = vulnerabilities.filter(v => v.severity === 'CRITICAL').length;
    const highCount = vulnerabilities.filter(v => v.severity === 'HIGH').length;
    
    if (criticalCount > 0) return 'CRITICAL';
    if (highCount > 0) return 'HIGH';
    if (vulnerabilities.length > 5) return 'MEDIUM';
    return 'LOW';
  }

  private generateSecurityRecommendations(vulnerabilities: any[]): string[] {
    const recommendations: string[] = [];
    
    const criticalVulns = vulnerabilities.filter(v => v.severity === 'CRITICAL');
    const highVulns = vulnerabilities.filter(v => v.severity === 'HIGH');
    
    if (criticalVulns.length > 0) {
      recommendations.push(`Fix ${criticalVulns.length} critical security vulnerabilities immediately`);
    }
    
    if (highVulns.length > 0) {
      recommendations.push(`Address ${highVulns.length} high-priority security issues`);
    }
    
    if (vulnerabilities.some(v => v.category === 'injection')) {
      recommendations.push('Use parameterized queries to prevent SQL injection');
    }
    
    if (vulnerabilities.some(v => v.category === 'xss')) {
      recommendations.push('Implement proper input sanitization to prevent XSS attacks');
    }
    
    return recommendations;
  }

  // Public API methods
  public getSystemMetrics(): SystemMetrics {
    return { ...this.metrics };
  }

  public getAgentMetrics(agentId: string): AgentMetrics | null {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    const tasksForAgent = Array.from(this.tasks.values()).filter(task =>
      task.assignedAgent === agentId
    );
    
    const completedTasks = tasksForAgent.filter(task => task.status === 'COMPLETED');
    const failedTasks = tasksForAgent.filter(task => task.status === 'FAILED');
    
    const totalExecutionTime = completedTasks.reduce((sum, task) => {
      if (task.startedAt && task.completedAt) {
        return sum + (task.completedAt - task.startedAt);
      }
      return sum;
    }, 0);
    
    return {
      totalTasks: tasksForAgent.length,
      successRate: tasksForAgent.length > 0 ? completedTasks.length / tasksForAgent.length : 0,
      averageExecutionTime: completedTasks.length > 0 ? totalExecutionTime / completedTasks.length : 0,
      cpuUsage: 0, // Would need system monitoring
      memoryUsage: 0, // Would need system monitoring
      lastHeartbeat: Date.now()
    };
  }

  public getTaskStatus(taskId: string): Task | null {
    return this.tasks.get(taskId) || null;
  }

  public getPendingTasks(): Task[] {
    return [...this.pendingTasks];
  }

  public getRunningTasks(): { taskId: string; agentId: string; startedAt: number }[] {
    return Array.from(this.runningTasks.values());
  }

  public async shutdown(): Promise<void> {
    if (!this.isRunning) return;

    // Clear timers
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    if (this.processingTimer) clearInterval(this.processingTimer);
    if (this.metricsTimer) clearInterval(this.metricsTimer);

    // Cancel all running tasks
    for (const [taskId] of this.runningTasks) {
      await this.cancelTask(taskId);
    }

    this.isRunning = false;
    this.emit('orchestrator_shutdown');
    
    console.log('Multi-Agent Service shutdown completed');
  }
}

// Export singleton instance
export const multiAgentService = MultiAgentService.getInstance();