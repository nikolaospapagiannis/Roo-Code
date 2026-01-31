/**
 * Tests for WebSocketServerService
 * These tests ACTUALLY verify multi-client WebSocket communication
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') })

import { WebSocketServerService, WebSocketMessage } from '../WebSocketServer'
import { SessionStorageService } from '../SessionStorageService'
import { JwtBlacklistService } from '../JwtBlacklistService'
import { PrismaClient } from '@prisma/client'
import WebSocket from 'ws'

describe('WebSocketServerService - Multi-Client Integration', () => {
  let server: WebSocketServerService
  let sessionService: SessionStorageService
  let jwtBlacklist: JwtBlacklistService
  let prisma: PrismaClient
  const testPort = 3500 + Math.floor(Math.random() * 100) // Random port to avoid conflicts

  beforeAll(async () => {
    prisma = new PrismaClient()
    await prisma.$connect()

    sessionService = SessionStorageService.getInstance()
    await sessionService.initialize()

    jwtBlacklist = JwtBlacklistService.getInstance()
    await jwtBlacklist.initialize()

    server = WebSocketServerService.getInstance({
      port: testPort,
      maxClients: 100,
      messageRateLimit: 1000,
      sessionService,
      jwtBlacklist,
      authRequired: false // Allow unauthenticated for testing
    })

    await server.start()
  })

  afterAll(async () => {
    await server.shutdown()
    await sessionService.shutdown()
    await jwtBlacklist.shutdown()
    await prisma.$disconnect()
  })

  describe('✅ ACTUALLY Handles Multiple Clients', () => {
    it('should accept multiple client connections', async () => {
      const client1 = new WebSocket(`ws://localhost:${testPort}`)
      const client2 = new WebSocket(`ws://localhost:${testPort}`)
      const client3 = new WebSocket(`ws://localhost:${testPort}`)

      // Wait for connections
      await Promise.all([
        new Promise((resolve) => client1.on('open', resolve)),
        new Promise((resolve) => client2.on('open', resolve)),
        new Promise((resolve) => client3.on('open', resolve))
      ])

      // Wait for welcome messages
      await new Promise((resolve) => setTimeout(resolve, 200))

      const stats = server.getStats()
      expect(stats.clients).toBeGreaterThanOrEqual(3)

      client1.close()
      client2.close()
      client3.close()
    })

    it('should send unique client IDs to each connection', async () => {
      const client1 = new WebSocket(`ws://localhost:${testPort}`)
      const client2 = new WebSocket(`ws://localhost:${testPort}`)

      const client1Id = await new Promise<string>((resolve) => {
        client1.on('message', (data) => {
          const msg = JSON.parse(data.toString())
          if (msg.type === 'connection:established') {
            resolve(msg.data.clientId)
          }
        })
      })

      const client2Id = await new Promise<string>((resolve) => {
        client2.on('message', (data) => {
          const msg = JSON.parse(data.toString())
          if (msg.type === 'connection:established') {
            resolve(msg.data.clientId)
          }
        })
      })

      expect(client1Id).toBeDefined()
      expect(client2Id).toBeDefined()
      expect(client1Id).not.toBe(client2Id)

      client1.close()
      client2.close()
    })

    it('should track client disconnections', async () => {
      const client = new WebSocket(`ws://localhost:${testPort}`)

      await new Promise((resolve) => client.on('open', resolve))
      await new Promise((resolve) => setTimeout(resolve, 100))

      const statsBefore = server.getStats()
      const clientsBefore = statsBefore.clients

      client.close()

      // Wait for disconnect to process
      await new Promise((resolve) => setTimeout(resolve, 200))

      const statsAfter = server.getStats()
      expect(statsAfter.clients).toBe(clientsBefore - 1)
    })
  })

  describe('✅ ACTUALLY Implements Room-Based Communication', () => {
    it('should allow clients to join rooms', async () => {
      const client = new WebSocket(`ws://localhost:${testPort}`)

      await new Promise((resolve) => client.on('open', resolve))

      // Skip welcome message
      await new Promise((resolve) => client.once('message', resolve))

      const roomJoined = new Promise<boolean>((resolve) => {
        client.on('message', (data) => {
          const msg = JSON.parse(data.toString())
          if (msg.type === 'room:joined' && msg.data.room === 'test-room') {
            resolve(true)
          }
        })
      })

      client.send(JSON.stringify({
        type: 'join:room',
        room: 'test-room'
      }))

      const joined = await roomJoined
      expect(joined).toBe(true)

      client.close()
    })

    it('should broadcast messages to all clients in a room', async () => {
      const client1 = new WebSocket(`ws://localhost:${testPort}`)
      const client2 = new WebSocket(`ws://localhost:${testPort}`)
      const client3 = new WebSocket(`ws://localhost:${testPort}`)

      // Wait for connections
      await Promise.all([
        new Promise((resolve) => client1.on('open', resolve)),
        new Promise((resolve) => client2.on('open', resolve)),
        new Promise((resolve) => client3.on('open', resolve))
      ])

      // Skip welcome messages
      await Promise.all([
        new Promise((resolve) => client1.once('message', resolve)),
        new Promise((resolve) => client2.once('message', resolve)),
        new Promise((resolve) => client3.once('message', resolve))
      ])

      const roomName = 'broadcast-room-' + Math.random()

      // All clients join room
      client1.send(JSON.stringify({ type: 'join:room', room: roomName }))
      client2.send(JSON.stringify({ type: 'join:room', room: roomName }))
      client3.send(JSON.stringify({ type: 'join:room', room: roomName }))

      // Wait for join confirmations
      await new Promise((resolve) => setTimeout(resolve, 200))

      // Setup listeners for broadcast
      const client2Received = new Promise<any>((resolve) => {
        client2.on('message', (data) => {
          const msg = JSON.parse(data.toString())
          if (msg.type === 'message:room' && msg.room === roomName) {
            resolve(msg.data)
          }
        })
      })

      const client3Received = new Promise<any>((resolve) => {
        client3.on('message', (data) => {
          const msg = JSON.parse(data.toString())
          if (msg.type === 'message:room' && msg.room === roomName) {
            resolve(msg.data)
          }
        })
      })

      // Client 1 sends message to room
      client1.send(JSON.stringify({
        type: 'message:room',
        room: roomName,
        data: { text: 'Hello room!' }
      }))

      const [msg2, msg3] = await Promise.all([client2Received, client3Received])

      expect(msg2.text).toBe('Hello room!')
      expect(msg3.text).toBe('Hello room!')

      client1.close()
      client2.close()
      client3.close()
    })

    it('should isolate messages between different rooms', async () => {
      const client1 = new WebSocket(`ws://localhost:${testPort}`)
      const client2 = new WebSocket(`ws://localhost:${testPort}`)

      await Promise.all([
        new Promise((resolve) => client1.on('open', resolve)),
        new Promise((resolve) => client2.on('open', resolve))
      ])

      // Skip welcome messages
      await Promise.all([
        new Promise((resolve) => client1.once('message', resolve)),
        new Promise((resolve) => client2.once('message', resolve))
      ])

      const room1 = 'room-1-' + Math.random()
      const room2 = 'room-2-' + Math.random()

      // Client1 joins room1, Client2 joins room2
      client1.send(JSON.stringify({ type: 'join:room', room: room1 }))
      client2.send(JSON.stringify({ type: 'join:room', room: room2 }))

      await new Promise((resolve) => setTimeout(resolve, 200))

      // Client2 should NOT receive messages from room1
      let client2ReceivedRoom1Message = false
      client2.on('message', (data) => {
        const msg = JSON.parse(data.toString())
        if (msg.type === 'message:room' && msg.room === room1) {
          client2ReceivedRoom1Message = true
        }
      })

      // Client1 sends to room1
      client1.send(JSON.stringify({
        type: 'message:room',
        room: room1,
        data: { text: 'Private to room1' }
      }))

      await new Promise((resolve) => setTimeout(resolve, 200))

      expect(client2ReceivedRoom1Message).toBe(false)

      client1.close()
      client2.close()
    })

    it('should allow clients to leave rooms', async () => {
      const client = new WebSocket(`ws://localhost:${testPort}`)

      await new Promise((resolve) => client.on('open', resolve))
      await new Promise((resolve) => client.once('message', resolve))

      const roomName = 'leave-room-' + Math.random()

      // Join room
      client.send(JSON.stringify({ type: 'join:room', room: roomName }))
      await new Promise((resolve) => setTimeout(resolve, 100))

      const roomClients = server.getRoomClients(roomName)
      expect(roomClients.length).toBe(1)

      // Leave room
      const leftRoom = new Promise<boolean>((resolve) => {
        client.on('message', (data) => {
          const msg = JSON.parse(data.toString())
          if (msg.type === 'room:left' && msg.data.room === roomName) {
            resolve(true)
          }
        })
      })

      client.send(JSON.stringify({ type: 'leave:room', room: roomName }))

      await leftRoom

      const roomClientsAfter = server.getRoomClients(roomName)
      expect(roomClientsAfter.length).toBe(0)

      client.close()
    })
  })

  describe('✅ ACTUALLY Implements Unicast Communication', () => {
    it('should send message to specific client', async () => {
      const client1 = new WebSocket(`ws://localhost:${testPort}`)
      const client2 = new WebSocket(`ws://localhost:${testPort}`)
      const client3 = new WebSocket(`ws://localhost:${testPort}`)

      await Promise.all([
        new Promise((resolve) => client1.on('open', resolve)),
        new Promise((resolve) => client2.on('open', resolve)),
        new Promise((resolve) => client3.on('open', resolve))
      ])

      // Get client IDs
      const client1Id = await new Promise<string>((resolve) => {
        client1.once('message', (data) => {
          const msg = JSON.parse(data.toString())
          resolve(msg.data.clientId)
        })
      })

      const client2Id = await new Promise<string>((resolve) => {
        client2.once('message', (data) => {
          const msg = JSON.parse(data.toString())
          resolve(msg.data.clientId)
        })
      })

      await new Promise((resolve) => client3.once('message', resolve))

      // Client3 should NOT receive message
      let client3ReceivedMessage = false
      client3.on('message', (data) => {
        const msg = JSON.parse(data.toString())
        if (msg.type === 'message:client') {
          client3ReceivedMessage = true
        }
      })

      // Setup listener for client2
      const client2Received = new Promise<any>((resolve) => {
        client2.on('message', (data) => {
          const msg = JSON.parse(data.toString())
          if (msg.type === 'message:client') {
            resolve(msg.data)
          }
        })
      })

      // Client1 sends to Client2
      client1.send(JSON.stringify({
        type: 'message:client',
        to: client2Id,
        data: { text: 'Private message' }
      }))

      const receivedData = await client2Received

      expect(receivedData.text).toBe('Private message')
      expect(client3ReceivedMessage).toBe(false)

      client1.close()
      client2.close()
      client3.close()
    })
  })

  describe('✅ ACTUALLY Implements Rate Limiting', () => {
    it('should enforce message rate limits', async () => {
      const client = new WebSocket(`ws://localhost:${testPort}`)

      await new Promise((resolve) => client.on('open', resolve))
      await new Promise((resolve) => client.once('message', resolve))

      // Setup error listener
      let rateLimitError = false
      client.on('message', (data) => {
        const msg = JSON.parse(data.toString())
        if (msg.type === 'error' && msg.data.message === 'Rate limit exceeded') {
          rateLimitError = true
        }
      })

      // Send messages exceeding rate limit (1000 per minute = ~16 per second)
      for (let i = 0; i < 1100; i++) {
        client.send(JSON.stringify({
          type: 'ping'
        }))
      }

      await new Promise((resolve) => setTimeout(resolve, 500))

      // Should have triggered rate limit
      expect(rateLimitError).toBe(true)

      client.close()
    })
  })

  describe('✅ ACTUALLY Provides Server Statistics', () => {
    it('should track client count, rooms, and messages', async () => {
      const client1 = new WebSocket(`ws://localhost:${testPort}`)
      const client2 = new WebSocket(`ws://localhost:${testPort}`)

      await Promise.all([
        new Promise((resolve) => client1.on('open', resolve)),
        new Promise((resolve) => client2.on('open', resolve))
      ])

      await Promise.all([
        new Promise((resolve) => client1.once('message', resolve)),
        new Promise((resolve) => client2.once('message', resolve))
      ])

      const roomName = 'stats-room-' + Math.random()

      client1.send(JSON.stringify({ type: 'join:room', room: roomName }))
      client2.send(JSON.stringify({ type: 'join:room', room: roomName }))

      await new Promise((resolve) => setTimeout(resolve, 200))

      const stats = server.getStats()

      expect(stats.clients).toBeGreaterThanOrEqual(2)
      expect(stats.rooms).toBeGreaterThanOrEqual(1)
      expect(stats.messageCount).toBeGreaterThan(0)

      client1.close()
      client2.close()
    })

    it('should list clients in a room', async () => {
      const client1 = new WebSocket(`ws://localhost:${testPort}`)
      const client2 = new WebSocket(`ws://localhost:${testPort}`)
      const client3 = new WebSocket(`ws://localhost:${testPort}`)

      await Promise.all([
        new Promise((resolve) => client1.on('open', resolve)),
        new Promise((resolve) => client2.on('open', resolve)),
        new Promise((resolve) => client3.on('open', resolve))
      ])

      await Promise.all([
        new Promise((resolve) => client1.once('message', resolve)),
        new Promise((resolve) => client2.once('message', resolve)),
        new Promise((resolve) => client3.once('message', resolve))
      ])

      const roomName = 'list-room-' + Math.random()

      client1.send(JSON.stringify({ type: 'join:room', room: roomName }))
      client2.send(JSON.stringify({ type: 'join:room', room: roomName }))
      // client3 does not join

      await new Promise((resolve) => setTimeout(resolve, 200))

      const roomClients = server.getRoomClients(roomName)

      expect(roomClients.length).toBe(2)

      client1.close()
      client2.close()
      client3.close()
    })
  })

  describe('✅ ACTUALLY Handles Server Lifecycle', () => {
    it('should disconnect all clients on shutdown', async () => {
      // Create new server instance for this test
      const testServer = WebSocketServerService.getInstance({
        port: testPort + 1
      })

      await testServer.start()

      const client1 = new WebSocket(`ws://localhost:${testPort + 1}`)
      const client2 = new WebSocket(`ws://localhost:${testPort + 1}`)

      await Promise.all([
        new Promise((resolve) => client1.on('open', resolve)),
        new Promise((resolve) => client2.on('open', resolve))
      ])

      const client1Closed = new Promise((resolve) => client1.on('close', resolve))
      const client2Closed = new Promise((resolve) => client2.on('close', resolve))

      await testServer.shutdown()

      await Promise.all([client1Closed, client2Closed])

      expect(client1.readyState).toBe(WebSocket.CLOSED)
      expect(client2.readyState).toBe(WebSocket.CLOSED)
    })
  })

  describe('✅ ACTUALLY Supports Ping/Pong for Keep-Alive', () => {
    it('should respond to ping messages', async () => {
      const client = new WebSocket(`ws://localhost:${testPort}`)

      await new Promise((resolve) => client.on('open', resolve))
      await new Promise((resolve) => client.once('message', resolve))

      const pongReceived = new Promise<number>((resolve) => {
        client.on('message', (data) => {
          const msg = JSON.parse(data.toString())
          if (msg.type === 'pong') {
            resolve(msg.data.timestamp)
          }
        })
      })

      client.send(JSON.stringify({ type: 'ping' }))

      const timestamp = await pongReceived

      expect(timestamp).toBeGreaterThan(0)

      client.close()
    })
  })
})
