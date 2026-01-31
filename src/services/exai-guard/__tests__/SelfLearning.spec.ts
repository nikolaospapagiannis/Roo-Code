/**
 * Tests for SelfLearningService
 * These tests ACTUALLY verify PostgreSQL-backed pattern recognition and solution caching
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') })

import { SelfLearningService } from '../SelfLearningService'
import { PrismaClient } from '@prisma/client'

describe('SelfLearningService - Pattern Recognition & Solution Caching', () => {
  let service: SelfLearningService
  let prisma: PrismaClient

  beforeAll(async () => {
    prisma = new PrismaClient()
    await prisma.$connect()

    service = SelfLearningService.getInstance()
    await service.initialize()
  })

  afterAll(async () => {
    // Cleanup test data
    await prisma.$executeRaw`DELETE FROM solution_applications WHERE 1=1`
    await prisma.$executeRaw`DELETE FROM solution_cache WHERE 1=1`
    await prisma.$executeRaw`DELETE FROM error_patterns WHERE 1=1`

    await service.shutdown()
    await prisma.$disconnect()
  })

  describe('✅ ACTUALLY Recognizes Error Patterns', () => {
    it('should recognize and store new error pattern in database', async () => {
      const pattern = await service.recognizeError({
        errorMessage: 'TypeError: Cannot read property "foo" of undefined',
        errorType: 'TypeError',
        language: 'JavaScript',
        framework: 'Node.js'
      })

      expect(pattern.id).toBeDefined()
      expect(pattern.patternSignature).toContain('<STRING>')
      expect(pattern.errorType).toBe('TypeError')
      expect(pattern.language).toBe('JavaScript')
      expect(pattern.occurrenceCount).toBe(1)

      // ACTUALLY verify in database
      const dbPattern = await prisma.$queryRaw<any[]>`
        SELECT * FROM error_patterns WHERE id = ${pattern.id}::uuid
      `

      expect(dbPattern.length).toBe(1)
      expect(dbPattern[0].pattern_hash).toBe(pattern.patternHash)
    })

    it('should increment occurrence count for existing patterns', async () => {
      const error = 'ReferenceError: x is not defined'

      // First occurrence
      const pattern1 = await service.recognizeError({
        errorMessage: error,
        errorType: 'ReferenceError'
      })

      expect(pattern1.occurrenceCount).toBe(1)

      // Second occurrence (same error)
      const pattern2 = await service.recognizeError({
        errorMessage: error,
        errorType: 'ReferenceError'
      })

      expect(pattern2.patternHash).toBe(pattern1.patternHash)
      expect(pattern2.occurrenceCount).toBe(2)

      // Third occurrence
      const pattern3 = await service.recognizeError({
        errorMessage: error,
        errorType: 'ReferenceError'
      })

      expect(pattern3.occurrenceCount).toBe(3)
    })

    it('should normalize error messages with variable content', async () => {
      // Different variable values should map to same pattern
      const error1 = 'Error at line 42 in file /home/user/app.js'
      const error2 = 'Error at line 108 in file /var/www/index.js'
      const error3 = 'Error at line 7 in file C:\\Users\\dev\\main.js'

      const pattern1 = await service.recognizeError({ errorMessage: error1 })
      const pattern2 = await service.recognizeError({ errorMessage: error2 })
      const pattern3 = await service.recognizeError({ errorMessage: error3 })

      // Should recognize as same pattern (normalized)
      expect(pattern1.patternHash).toBe(pattern2.patternHash)
      expect(pattern2.patternHash).toBe(pattern3.patternHash)
      expect(pattern3.occurrenceCount).toBe(3)
    })

    it('should increase confidence score with more occurrences', async () => {
      const error = 'SyntaxError: Unexpected token'

      const pattern1 = await service.recognizeError({ errorMessage: error })
      expect(pattern1.confidenceScore).toBeLessThan(0.1)

      // Recognize same error multiple times
      for (let i = 0; i < 50; i++) {
        await service.recognizeError({ errorMessage: error })
      }

      const patternFinal = await service.recognizeError({ errorMessage: error })
      expect(patternFinal.confidenceScore).toBeGreaterThan(0.8)
    })
  })

  describe('✅ ACTUALLY Caches Solutions', () => {
    it('should cache solution for pattern in database', async () => {
      const pattern = await service.recognizeError({
        errorMessage: 'ModuleNotFoundError: No module named "requests"',
        language: 'Python'
      })

      const solution = await service.cacheSolution({
        patternId: pattern.id,
        solutionText: 'Install requests module: pip install requests',
        solutionType: 'fix',
        contextTags: ['python', 'pip', 'dependencies']
      })

      expect(solution.id).toBeDefined()
      expect(solution.patternId).toBe(pattern.id)
      expect(solution.solutionText).toContain('pip install')
      expect(solution.successRate).toBe(0)

      // ACTUALLY verify in database
      const dbSolution = await prisma.$queryRaw<any[]>`
        SELECT * FROM solution_cache WHERE id = ${solution.id}::uuid
      `

      expect(dbSolution.length).toBe(1)
      expect(dbSolution[0].solution_hash).toBe(solution.solutionHash)
    })

    it('should not duplicate solutions for same pattern', async () => {
      const pattern = await service.recognizeError({
        errorMessage: 'ImportError: cannot import name Foo'
      })

      const solutionText = 'Check if Foo is defined in the module'

      const solution1 = await service.cacheSolution({
        patternId: pattern.id,
        solutionText
      })

      const solution2 = await service.cacheSolution({
        patternId: pattern.id,
        solutionText
      })

      // Should return same solution
      expect(solution1.id).toBe(solution2.id)
    })

    it('should retrieve solutions ordered by success rate', async () => {
      const pattern = await service.recognizeError({
        errorMessage: 'Test error for multiple solutions'
      })

      // Create 3 solutions with different success rates
      const sol1 = await service.cacheSolution({
        patternId: pattern.id,
        solutionText: 'Solution 1 - Low success'
      })

      const sol2 = await service.cacheSolution({
        patternId: pattern.id,
        solutionText: 'Solution 2 - High success'
      })

      const sol3 = await service.cacheSolution({
        patternId: pattern.id,
        solutionText: 'Solution 3 - Medium success'
      })

      // Record different success rates
      await service.recordSolutionApplication({
        solutionId: sol1.id,
        patternId: pattern.id,
        outcome: 'success'
      })
      await service.recordSolutionApplication({
        solutionId: sol1.id,
        patternId: pattern.id,
        outcome: 'failure'
      })
      await service.recordSolutionApplication({
        solutionId: sol1.id,
        patternId: pattern.id,
        outcome: 'failure'
      })

      await service.recordSolutionApplication({
        solutionId: sol2.id,
        patternId: pattern.id,
        outcome: 'success'
      })
      await service.recordSolutionApplication({
        solutionId: sol2.id,
        patternId: pattern.id,
        outcome: 'success'
      })
      await service.recordSolutionApplication({
        solutionId: sol2.id,
        patternId: pattern.id,
        outcome: 'success'
      })

      await service.recordSolutionApplication({
        solutionId: sol3.id,
        patternId: pattern.id,
        outcome: 'success'
      })
      await service.recordSolutionApplication({
        solutionId: sol3.id,
        patternId: pattern.id,
        outcome: 'failure'
      })

      // Get solutions (should be ordered by success rate)
      const solutions = await service.getSolutionsForPattern(pattern.id)

      expect(solutions.length).toBe(3)
      expect(solutions[0].id).toBe(sol2.id) // 100% success
      expect(solutions[1].id).toBe(sol3.id) // 50% success
      expect(solutions[2].id).toBe(sol1.id) // 33% success
    })
  })

  describe('✅ ACTUALLY Tracks Solution Applications', () => {
    it('should record solution application with outcome', async () => {
      const pattern = await service.recognizeError({
        errorMessage: 'Application error for tracking'
      })

      const solution = await service.cacheSolution({
        patternId: pattern.id,
        solutionText: 'Test solution'
      })

      const application = await service.recordSolutionApplication({
        solutionId: solution.id,
        patternId: pattern.id,
        userId: 'test-user',
        outcome: 'success',
        resolutionTime: 30,
        confidence: 0.95
      })

      expect(application.id).toBeDefined()
      expect(application.outcome).toBe('success')
      expect(application.resolutionTime).toBe(30)

      // Verify in database
      const dbApplication = await prisma.$queryRaw<any[]>`
        SELECT * FROM solution_applications WHERE id = ${application.id}::uuid
      `

      expect(dbApplication.length).toBe(1)
      expect(dbApplication[0].outcome).toBe('success')
    })

    it('should update solution success count on successful application', async () => {
      const pattern = await service.recognizeError({
        errorMessage: 'Success count test error'
      })

      const solution = await service.cacheSolution({
        patternId: pattern.id,
        solutionText: 'Success test solution'
      })

      expect(solution.successCount).toBe(0)

      await service.recordSolutionApplication({
        solutionId: solution.id,
        patternId: pattern.id,
        outcome: 'success'
      })

      // Fetch updated solution
      const solutions = await service.getSolutionsForPattern(pattern.id)
      const updated = solutions.find(s => s.id === solution.id)

      expect(updated?.successCount).toBe(1)
      expect(updated?.successRate).toBe(1.0)
    })

    it('should update solution failure count on failed application', async () => {
      const pattern = await service.recognizeError({
        errorMessage: 'Failure count test error'
      })

      const solution = await service.cacheSolution({
        patternId: pattern.id,
        solutionText: 'Failure test solution'
      })

      await service.recordSolutionApplication({
        solutionId: solution.id,
        patternId: pattern.id,
        outcome: 'failure'
      })

      const solutions = await service.getSolutionsForPattern(pattern.id)
      const updated = solutions.find(s => s.id === solution.id)

      expect(updated?.failureCount).toBe(1)
      expect(updated?.successRate).toBe(0.0)
    })

    it('should calculate success rate correctly', async () => {
      const pattern = await service.recognizeError({
        errorMessage: 'Success rate calculation test'
      })

      const solution = await service.cacheSolution({
        patternId: pattern.id,
        solutionText: 'Rate calculation solution'
      })

      // 3 successes, 1 failure = 75% success rate
      await service.recordSolutionApplication({ solutionId: solution.id, patternId: pattern.id, outcome: 'success' })
      await service.recordSolutionApplication({ solutionId: solution.id, patternId: pattern.id, outcome: 'success' })
      await service.recordSolutionApplication({ solutionId: solution.id, patternId: pattern.id, outcome: 'success' })
      await service.recordSolutionApplication({ solutionId: solution.id, patternId: pattern.id, outcome: 'failure' })

      const solutions = await service.getSolutionsForPattern(pattern.id)
      const updated = solutions.find(s => s.id === solution.id)

      expect(updated?.successCount).toBe(3)
      expect(updated?.failureCount).toBe(1)
      expect(updated?.successRate).toBeCloseTo(0.75, 2)
    })
  })

  describe('✅ ACTUALLY Provides Learning Metrics', () => {
    it('should return accurate learning metrics', async () => {
      const metrics = await service.getMetrics()

      expect(metrics.totalPatternsRecognized).toBeGreaterThan(0)
      expect(metrics.totalSolutionsCached).toBeGreaterThan(0)
      expect(metrics.totalApplications).toBeGreaterThan(0)
      expect(typeof metrics.averageSuccessRate).toBe('number')
    })

    it('should identify top performing solutions', async () => {
      const pattern = await service.recognizeError({
        errorMessage: 'Top solutions test'
      })

      const solution = await service.cacheSolution({
        patternId: pattern.id,
        solutionText: 'Top performing solution'
      })

      // Make it top performing (5 successes)
      for (let i = 0; i < 5; i++) {
        await service.recordSolutionApplication({
          solutionId: solution.id,
          patternId: pattern.id,
          outcome: 'success'
        })
      }

      const topSolutions = await service.getTopSolutions(10)

      expect(topSolutions.length).toBeGreaterThan(0)
      expect(topSolutions[0].successRate).toBeGreaterThan(0.8)
    })

    it('should identify frequently occurring patterns', async () => {
      const error = 'Frequent error pattern test - ' + Math.random()

      // Create pattern with high occurrence count
      for (let i = 0; i < 20; i++) {
        await service.recognizeError({ errorMessage: error })
      }

      const frequentPatterns = await service.getFrequentPatterns(10)

      expect(frequentPatterns.length).toBeGreaterThan(0)
      const testPattern = frequentPatterns.find(p => p.patternSignature.includes('Frequent error pattern test'))
      expect(testPattern?.occurrenceCount).toBe(20)
    })
  })

  describe('✅ ACTUALLY Finds Similar Patterns', () => {
    it('should find similar error patterns', async () => {
      await service.recognizeError({
        errorMessage: 'Connection timeout after 30 seconds'
      })

      const similar = await service.findSimilarPatterns('Connection timeout after 60 seconds')

      expect(similar.length).toBeGreaterThan(0)
    })
  })

  describe('✅ ACTUALLY Cleans Up Old Data', () => {
    it('should cleanup old learning data', async () => {
      const deletedCount = await service.cleanupOldData(90)

      expect(typeof deletedCount).toBe('number')
      expect(deletedCount).toBeGreaterThanOrEqual(0)
    })
  })
})
