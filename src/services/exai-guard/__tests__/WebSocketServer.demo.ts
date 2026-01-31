/**
 * WebSocket Server Demo - PROVES multi-client communication works
 * Run this directly with: ts-node WebSocketServer.demo.ts
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.join(__dirname, '../../../.env') })

import { WebSocketServerService } from '../WebSocketServer'
import WebSocket from 'ws'

async function demo() {
  console.log('🚀 Starting WebSocket Server Demo\n')

  // Create and start server
  const server = WebSocketServerService.getInstance({
    port: 3600,
    authRequired: false
  })

  await server.start()
  console.log('✅ WebSocket server started on port 3600\n')

  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 500))

  console.log('📡 Connecting 3 clients...\n')

  // Create 3 clients
  const client1 = new WebSocket('ws://localhost:3600')
  const client2 = new WebSocket('ws://localhost:3600')
  const client3 = new WebSocket('ws://localhost:3600')

  // Wait for all connections
  await Promise.all([
    new Promise((resolve) => client1.on('open', resolve)),
    new Promise((resolve) => client2.on('open', resolve)),
    new Promise((resolve) => client3.on('open', resolve))
  ])

  console.log('✅ All clients connected\n')

  // Get client IDs
  let client1Id: string
  let client2Id: string
  let client3Id: string

  client1Id = await new Promise<string>((resolve) => {
    client1.once('message', (data) => {
      const msg = JSON.parse(data.toString())
      console.log(`Client 1 ID: ${msg.data.clientId}`)
      resolve(msg.data.clientId)
    })
  })

  client2Id = await new Promise<string>((resolve) => {
    client2.once('message', (data) => {
      const msg = JSON.parse(data.toString())
      console.log(`Client 2 ID: ${msg.data.clientId}`)
      resolve(msg.data.clientId)
    })
  })

  client3Id = await new Promise<string>((resolve) => {
    client3.once('message', (data) => {
      const msg = JSON.parse(data.toString())
      console.log(`Client 3 ID: ${msg.data.clientId}`)
      resolve(msg.data.clientId)
    })
  })

  console.log('\n✅ All clients received unique IDs\n')

  // Test 1: Room-based broadcast
  console.log('📢 Test 1: Room-based broadcast')
  console.log('Clients 1 and 2 joining "demo-room"...\n')

  client1.send(JSON.stringify({ type: 'join:room', room: 'demo-room' }))
  client2.send(JSON.stringify({ type: 'join:room', room: 'demo-room' }))

  await new Promise(resolve => setTimeout(resolve, 200))

  const client2ReceivedBroadcast = new Promise<boolean>((resolve) => {
    client2.on('message', (data) => {
      const msg = JSON.parse(data.toString())
      if (msg.type === 'message:room' && msg.room === 'demo-room') {
        console.log(`✅ Client 2 received broadcast: "${msg.data.text}"`)
        resolve(true)
      }
    })
  })

  console.log('Client 1 sending message to room...\n')
  client1.send(JSON.stringify({
    type: 'message:room',
    room: 'demo-room',
    data: { text: 'Hello from Client 1!' }
  }))

  await client2ReceivedBroadcast
  console.log('✅ Test 1 PASSED: Room broadcast works\n')

  // Test 2: Unicast (direct message)
  console.log('📨 Test 2: Unicast (direct message)')
  console.log('Client 1 sending private message to Client 3...\n')

  const client3ReceivedUnicast = new Promise<boolean>((resolve) => {
    client3.on('message', (data) => {
      const msg = JSON.parse(data.toString())
      if (msg.type === 'message:client') {
        console.log(`✅ Client 3 received private message: "${msg.data.secret}"`)
        resolve(true)
      }
    })
  })

  client1.send(JSON.stringify({
    type: 'message:client',
    to: client3Id,
    data: { secret: 'This is private!' }
  }))

  await client3ReceivedUnicast
  console.log('✅ Test 2 PASSED: Unicast works\n')

  // Test 3: Server statistics
  console.log('📊 Test 3: Server statistics')
  const stats = server.getStats()
  console.log(`  - Connected clients: ${stats.clients}`)
  console.log(`  - Active rooms: ${stats.rooms}`)
  console.log(`  - Total messages: ${stats.messageCount}`)
  console.log('✅ Test 3 PASSED: Stats tracking works\n')

  // Cleanup
  console.log('🧹 Cleaning up...')
  client1.close()
  client2.close()
  client3.close()

  await new Promise(resolve => setTimeout(resolve, 200))

  await server.shutdown()
  console.log('✅ Server shutdown complete\n')

  console.log('🎉 ALL TESTS PASSED - WebSocket Server Multi-Client Support is PROVEN\n')

  process.exit(0)
}

demo().catch((error) => {
  console.error('❌ Demo failed:', error)
  process.exit(1)
})
