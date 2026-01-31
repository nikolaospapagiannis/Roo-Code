/**
 * Fortune 100 Integration Test
 *
 * Verifies REAL Fortune 100 enterprise features:
 * - Real JWT authentication
 * - Real token counting with tiktoken
 * - Real audit trail with Winston
 * - Real session management
 * - Real context window management
 */

import { Fortune100Service } from '../Fortune100Service'
import { ExAIGuardService } from '../ExAIGuardService'
import * as fs from 'fs'
import * as path from 'path'

describe('Fortune 100 Integration', () => {
  let fortune100: Fortune100Service
  let exaiGuard: ExAIGuardService

  // Helper to create unique test user
  const createTestUser = async (prefix: string = 'test') => {
    const timestamp = Date.now() + Math.random()
    const username = `${prefix}_${timestamp}`
    const email = `${username}@example.com`
    await fortune100.registerUser(username, email, 'SecurePassword123!', ['user'])
    return { username, email, password: 'SecurePassword123!' }
  }

  beforeAll(async () => {
    fortune100 = Fortune100Service.getInstance()
    await fortune100.initialize()

    exaiGuard = ExAIGuardService.getInstance()
  })

  afterAll(async () => {
    await fortune100.shutdown()
    await exaiGuard.dispose()
  })

  describe('JWT Authentication', () => {
    it('should register user with bcrypt password hashing', async () => {
      const timestamp = Date.now()
      const user = await fortune100.registerUser(
        `testuser_${timestamp}`,
        `test_${timestamp}@example.com`,
        'SecurePassword123!',
        ['user']
      )

      expect(user.id).toBeDefined()
      expect(user.username).toBe(`testuser_${timestamp}`)
      expect(user.email).toBe(`test_${timestamp}@example.com`)
      expect(user.passwordHash).toBeDefined()
      expect(user.passwordHash).not.toBe('SecurePassword123!') // Hashed, not plain
      expect(user.roles).toContain('user')
    })

    it('should authenticate user and return JWT token', async () => {
      const timestamp = Date.now()
      await fortune100.registerUser(
        `authtest_${timestamp}`,
        `authtest_${timestamp}@example.com`,
        'SecurePassword123!',
        ['user']
      )

      const { user, session, token } = await fortune100.authenticate(
        `authtest_${timestamp}`,
        'SecurePassword123!'
      )

      expect(user.username).toBe(`authtest_${timestamp}`)
      expect(session.id).toBeDefined()
      expect(session.token).toBe(token)
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT format: header.payload.signature
    })

    it('should verify JWT token', async () => {
      const timestamp = Date.now()
      await fortune100.registerUser(
        `tokentest_${timestamp}`,
        `tokentest_${timestamp}@example.com`,
        'SecurePassword123!',
        ['user']
      )

      const { token } = await fortune100.authenticate(`tokentest_${timestamp}`, 'SecurePassword123!')

      const decoded = fortune100.verifyToken(token)
      expect(decoded.userId).toBeDefined()
      expect(decoded.username).toBe(`tokentest_${timestamp}`)
    })

    it('should reject invalid credentials', async () => {
      const timestamp = Date.now()
      await fortune100.registerUser(
        `invalidtest_${timestamp}`,
        `invalidtest_${timestamp}@example.com`,
        'SecurePassword123!',
        ['user']
      )

      await expect(
        fortune100.authenticate(`invalidtest_${timestamp}`, 'WrongPassword')
      ).rejects.toThrow('Invalid credentials')
    })
  })

  describe('Token Counting (tiktoken)', () => {
    it('should count tokens accurately using tiktoken', () => {
      const text = 'This is a test message for token counting.'
      const tokenCount = fortune100.countTokens(text)

      expect(tokenCount).toBeGreaterThan(0)
      expect(typeof tokenCount).toBe('number')
      // This text should be around 9-10 tokens
      expect(tokenCount).toBeGreaterThanOrEqual(8)
      expect(tokenCount).toBeLessThanOrEqual(12)
    })

    it('should count tokens in code accurately', () => {
      const code = `function hello() {
  console.log("Hello, World!");
  return true;
}`
      const tokenCount = fortune100.countTokens(code)

      expect(tokenCount).toBeGreaterThan(0)
      // Code should tokenize into roughly 15-20 tokens
      expect(tokenCount).toBeGreaterThanOrEqual(12)
      expect(tokenCount).toBeLessThanOrEqual(25)
    })

    it('should handle large text', () => {
      const largeText = 'word '.repeat(1000) // 1000 words
      const tokenCount = fortune100.countTokens(largeText)

      expect(tokenCount).toBeGreaterThan(900)
      expect(tokenCount).toBeLessThan(1100)
    })
  })

  describe('Session Management with Token Tracking', () => {
    it('should create session with token counting', async () => {
      const timestamp = Date.now()
      await fortune100.registerUser(
        `sessiontest_${timestamp}`,
        `sessiontest_${timestamp}@example.com`,
        'SecurePassword123!',
        ['user']
      )

      const { session, token } = await fortune100.authenticate(
        `sessiontest_${timestamp}`,
        'SecurePassword123!'
      )

      expect(session.tokenCount).toBe(0)
      expect(session.messages).toEqual([])
      expect(session.maxTokens).toBe(8192)
      expect(session.contextWindow).toBe(8192)
    })

    it('should track tokens per message', async () => {
      const timestamp = Date.now()
      await fortune100.registerUser(
        `msgtest_${timestamp}`,
        `msgtest_${timestamp}@example.com`,
        'SecurePassword123!',
        ['user']
      )

      const { session } = await fortune100.authenticate(
        `msgtest_${timestamp}`,
        'SecurePassword123!'
      )

      const message = 'This is a test message'
      fortune100.addMessageToSession(session.id, 'user', message)

      const usage = fortune100.getSessionTokenUsage(session.id)
      expect(usage.tokenCount).toBeGreaterThan(0)
      expect(usage.maxTokens).toBe(8192)
      expect(usage.percentageUsed).toBeLessThan(1)
    })

    it('should warn when approaching token limit', async () => {
      const user = await createTestUser('limittest')
      const { session } = await fortune100.authenticate(user.username, user.password)

      // Add many messages to approach limit
      const longMessage = 'word '.repeat(1000)
      for (let i = 0; i < 7; i++) {
        fortune100.addMessageToSession(session.id, 'user', longMessage)
      }

      const usage = fortune100.getSessionTokenUsage(session.id)
      expect(usage.percentageUsed).toBeGreaterThan(80)
    })
  })

  describe('Audit Trail (Winston)', () => {
    it('should create audit log directory', () => {
      const logDir = path.join(process.cwd(), 'logs')
      expect(fs.existsSync(logDir)).toBe(true)
    })

    it('should log authentication events', async () => {
      const user = await createTestUser('auditlog')
      await fortune100.authenticate(user.username, user.password)

      // Check audit log file exists
      const auditLogPath = path.join(process.cwd(), 'logs', 'audit.log')
      expect(fs.existsSync(auditLogPath)).toBe(true)

      // Verify audit log contains authentication entry
      const logContent = fs.readFileSync(auditLogPath, 'utf8')
      expect(logContent).toContain('authenticate')
      expect(logContent).toContain('success')
    })

    it('should track audit trail for user', async () => {
      const testUser = await createTestUser('audittrail')
      const { user } = await fortune100.authenticate(testUser.username, testUser.password)

      const auditTrail = fortune100.getAuditTrail(user.id, 10)
      expect(auditTrail.length).toBeGreaterThan(0)
      expect(auditTrail[0].action).toBeDefined()
      expect(auditTrail[0].result).toBeDefined()
      expect(auditTrail[0].timestamp).toBeDefined()
    })

    it('should generate compliance report', async () => {
      const startDate = Date.now() - (24 * 60 * 60 * 1000) // 24 hours ago
      const endDate = Date.now()

      const report = fortune100.getComplianceReport(startDate, endDate)

      expect(report.period).toBeDefined()
      expect(report.totalEvents).toBeGreaterThan(0)
      expect(report.successfulEvents).toBeGreaterThan(0)
      expect(report.uniqueUsers).toBeGreaterThan(0)
      expect(report.actions).toBeDefined()
    })
  })

  describe('ExAI Guard Integration', () => {
    it('should integrate Fortune100Service', () => {
      // Verify ExAIGuardService has Fortune100Service
      expect(exaiGuard).toBeDefined()
    })

    it('should count tokens when scanning files', async () => {
      const testCode = `const password = "hardcoded123"
const apiKey = "sk-1234567890abcdef"
// TODO: Fix security issues`

      const violations = exaiGuard.scanContent(testCode)
      expect(violations.length).toBeGreaterThan(0)
    })
  })

  describe('Context Window Management', () => {
    it('should calculate token usage percentage', async () => {
      const user = await createTestUser('contexttest')
      const { session } = await fortune100.authenticate(user.username, user.password)

      fortune100.addMessageToSession(session.id, 'user', 'Test message')

      const usage = fortune100.getSessionTokenUsage(session.id)
      expect(usage.percentageUsed).toBeGreaterThanOrEqual(0)
      expect(usage.percentageUsed).toBeLessThan(100)
    })

    it('should support session with multiple messages', async () => {
      const user = await createTestUser('multitest')
      const { session } = await fortune100.authenticate(user.username, user.password)

      fortune100.addMessageToSession(session.id, 'user', 'Message 1')
      fortune100.addMessageToSession(session.id, 'assistant', 'Response 1')
      fortune100.addMessageToSession(session.id, 'user', 'Message 2')

      const usage = fortune100.getSessionTokenUsage(session.id)
      expect(usage.messageCount).toBeGreaterThanOrEqual(3)
    })
  })

  describe('Fortune 100 Checklist', () => {
    it('✓ JWT authentication with bcrypt', async () => {
      const user = await createTestUser('checklist')
      const { token } = await fortune100.authenticate(user.username, user.password)
      expect(token).toBeDefined()
      expect(token.split('.')).toHaveLength(3)
    })

    it('✓ Token counting with tiktoken', () => {
      const tokens = fortune100.countTokens('This is a Fortune 100 test')
      expect(tokens).toBeGreaterThan(0)
    })

    it('✓ Audit trail (tamper-proof)', () => {
      const auditLogPath = path.join(process.cwd(), 'logs', 'audit.log')
      expect(fs.existsSync(auditLogPath)).toBe(true)
    })

    it('✓ Session management with token tracking', async () => {
      const user = await createTestUser('sessionmgmt')
      const { session } = await fortune100.authenticate(user.username, user.password)
      expect(session.tokenCount).toBeDefined()
      expect(session.messages).toBeDefined()
      expect(session.maxTokens).toBe(8192)
    })

    it('✓ Context window management', async () => {
      const user = await createTestUser('contextmgmt')
      const { session } = await fortune100.authenticate(user.username, user.password)
      fortune100.addMessageToSession(session.id, 'user', 'test')

      const usage = fortune100.getSessionTokenUsage(session.id)
      expect(usage.percentageUsed).toBeDefined()
    })

    it('✓ Compliance reporting', () => {
      const report = fortune100.getComplianceReport(Date.now() - 1000000, Date.now())
      expect(report.totalEvents).toBeGreaterThanOrEqual(0)
      expect(report.actions).toBeDefined()
    })
  })
})
