/**
 * ExAI Guard Runtime Verification Script
 *
 * This script tests if ExAI Guard features actually work at runtime.
 * Run this AFTER installing the VSIX and reloading VSCode.
 *
 * Usage: node TEST-RUNTIME.js
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function pass(message) {
  testsRun++;
  testsPassed++;
  console.log(`${COLORS.green}✓ PASS${COLORS.reset} ${message}`);
}

function fail(message, error) {
  testsRun++;
  testsFailed++;
  console.log(`${COLORS.red}✗ FAIL${COLORS.reset} ${message}`);
  if (error) {
    console.log(`  ${COLORS.red}Error: ${error}${COLORS.reset}`);
  }
}

function info(message) {
  console.log(`${COLORS.blue}ℹ ${message}${COLORS.reset}`);
}

function section(title) {
  console.log(`\n${COLORS.cyan}${'='.repeat(60)}${COLORS.reset}`);
  console.log(`${COLORS.cyan}${title}${COLORS.reset}`);
  console.log(`${COLORS.cyan}${'='.repeat(60)}${COLORS.reset}\n`);
}

async function testWebSocketConnectivity() {
  section('Test 1: WebSocket Server Connectivity');

  return new Promise((resolve) => {
    info('Attempting to connect to ws://localhost:8080');

    const ws = new WebSocket('ws://localhost:8080');
    let welcomeReceived = false;
    let timeoutId;

    const cleanup = () => {
      clearTimeout(timeoutId);
      try {
        ws.close();
      } catch (e) {
        // Ignore
      }
    };

    ws.on('open', () => {
      pass('WebSocket connection established');
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'welcome') {
          pass('Welcome message received');
          pass(`Server capabilities: ${message.payload.capabilities.length}`);
          welcomeReceived = true;
          cleanup();
          resolve(true);
        }
      } catch (e) {
        fail('Failed to parse welcome message', e.message);
        cleanup();
        resolve(false);
      }
    });

    ws.on('error', (error) => {
      fail('WebSocket connection failed', error.message);
      console.log(`\n${COLORS.yellow}Possible causes:${COLORS.reset}`);
      console.log(`  1. VSCode extension not loaded`);
      console.log(`  2. ExAI Guard service failed to initialize`);
      console.log(`  3. Port 8080 is in use by another application`);
      console.log(`  4. WebSocket server failed to start`);
      cleanup();
      resolve(false);
    });

    timeoutId = setTimeout(() => {
      if (!welcomeReceived) {
        fail('Timeout waiting for welcome message (5s)');
        cleanup();
        resolve(false);
      }
    }, 5000);
  });
}

async function testLoggingSystem() {
  section('Test 2: Logging System');

  const logDir = path.join(process.cwd(), 'logs', 'exai-guard');

  info(`Checking for log directory: ${logDir}`);

  if (fs.existsSync(logDir)) {
    pass('Log directory exists');

    const files = fs.readdirSync(logDir);
    info(`Found ${files.length} files in log directory`);

    const sessionLogs = files.filter(f => f.startsWith('session-') && f.endsWith('.json'));
    const detailedLogs = files.filter(f => f.startsWith('detailed-') && f.endsWith('.log'));

    if (sessionLogs.length > 0) {
      pass(`Session log files found: ${sessionLogs.length}`);

      // Check if latest log has content
      const latestSession = sessionLogs.sort().reverse()[0];
      const content = fs.readFileSync(path.join(logDir, latestSession), 'utf8');
      const lines = content.trim().split('\n');

      if (lines.length > 0) {
        pass(`Session log has ${lines.length} entries`);

        // Try to parse first entry
        try {
          const firstEntry = JSON.parse(lines[0]);
          if (firstEntry.timestamp && firstEntry.level && firstEntry.message) {
            pass('Session log format is valid');
          } else {
            fail('Session log format invalid - missing required fields');
          }
        } catch (e) {
          fail('Session log contains invalid JSON', e.message);
        }
      } else {
        fail('Session log is empty');
      }
    } else {
      fail('No session log files found');
    }

    if (detailedLogs.length > 0) {
      pass(`Detailed log files found: ${detailedLogs.length}`);
    } else {
      fail('No detailed log files found');
    }
  } else {
    fail('Log directory does not exist');
    console.log(`\n${COLORS.yellow}This means:${COLORS.reset}`);
    console.log(`  1. ExAI Guard service did not initialize`);
    console.log(`  2. initializeLogging() did not run`);
    console.log(`  3. Extension may have failed to load`);
  }
}

async function testCheckpointSystem(ws) {
  section('Test 3: Checkpoint System');

  info('Querying checkpoint status...');

  return new Promise((resolve) => {
    // Listen for responses
    const messageHandler = (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'checkpoint_status') {
          if (message.payload.checkpoints && message.payload.checkpoints.length > 0) {
            pass(`Checkpoints exist: ${message.payload.checkpoints.length}`);
            pass(`Latest checkpoint: ${new Date(message.payload.checkpoints[0]).toISOString()}`);
          } else {
            info('No checkpoints yet (may need to wait 30 seconds)');
          }
          ws.off('message', messageHandler);
          resolve(true);
        }
      } catch (e) {
        // Ignore
      }
    };

    ws.on('message', messageHandler);

    // Note: This test depends on a checkpoint_status message type that may not exist
    // For now, we'll just check if the service responds
    setTimeout(() => {
      ws.off('message', messageHandler);
      info('Checkpoint system test skipped (requires checkpoint_status API)');
      resolve(true);
    }, 2000);
  });
}

async function testSessionManagement(ws) {
  section('Test 4: Session Management');

  return new Promise((resolve) => {
    info('Creating test session...');

    const sessionId = `test-${Date.now()}`;
    let sessionCreated = false;

    const messageHandler = (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'analysis_started' && message.payload.sessionId === sessionId) {
          pass('Session created successfully');
          pass(`Session ID: ${sessionId}`);
          sessionCreated = true;
        }

        if (message.type === 'analysis_completed' && sessionCreated) {
          pass('Session completed');
          ws.off('message', messageHandler);
          resolve(true);
        }

        if (message.type === 'error') {
          fail('Session creation failed', message.payload.message);
          ws.off('message', messageHandler);
          resolve(false);
        }
      } catch (e) {
        // Ignore parse errors
      }
    };

    ws.on('message', messageHandler);

    // Send analyze_project request
    ws.send(JSON.stringify({
      type: 'analyze_project',
      sessionId: sessionId,
      payload: {
        projectPath: __dirname,
        files: [__filename] // Analyze this test script
      }
    }));

    setTimeout(() => {
      if (!sessionCreated) {
        fail('Session creation timeout (10s)');
      }
      ws.off('message', messageHandler);
      resolve(sessionCreated);
    }, 10000);
  });
}

async function testLearningInsights(ws) {
  section('Test 5: Self-Learning System');

  return new Promise((resolve) => {
    info('Requesting learning insights...');

    const messageHandler = (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'learning_insights') {
          pass('Learning insights received');

          const insights = message.payload;

          if (insights.topViolationPatterns) {
            const patterns = Object.keys(insights.topViolationPatterns).length;
            pass(`Violation patterns tracked: ${patterns}`);
          }

          if (insights.averageFixSuccessRate !== undefined) {
            pass(`Average fix success rate: ${(insights.averageFixSuccessRate * 100).toFixed(1)}%`);
          }

          if (insights.commonErrors) {
            const errors = Object.keys(insights.commonErrors).length;
            info(`Common errors tracked: ${errors}`);
          }

          ws.off('message', messageHandler);
          resolve(true);
        }
      } catch (e) {
        // Ignore
      }
    };

    ws.on('message', messageHandler);

    ws.send(JSON.stringify({
      type: 'get_learning_insights',
      payload: {}
    }));

    setTimeout(() => {
      ws.off('message', messageHandler);
      fail('Learning insights timeout (5s)');
      resolve(false);
    }, 5000);
  });
}

async function generateTestReport(results) {
  section('Test Results Summary');

  console.log(`\nTests Run: ${testsRun}`);
  console.log(`${COLORS.green}Tests Passed: ${testsPassed}${COLORS.reset}`);
  console.log(`${COLORS.red}Tests Failed: ${testsFailed}${COLORS.reset}`);

  const passRate = testsRun > 0 ? (testsPassed / testsRun * 100).toFixed(1) : 0;
  console.log(`\nPass Rate: ${passRate}%`);

  console.log(`\n${COLORS.cyan}${'='.repeat(60)}${COLORS.reset}`);
  console.log(`${COLORS.cyan}Verdict${COLORS.reset}`);
  console.log(`${COLORS.cyan}${'='.repeat(60)}${COLORS.reset}\n`);

  if (results.websocket) {
    console.log(`${COLORS.green}✓${COLORS.reset} WebSocket server is OPERATIONAL`);
  } else {
    console.log(`${COLORS.red}✗${COLORS.reset} WebSocket server is NOT WORKING`);
  }

  if (results.logging) {
    console.log(`${COLORS.green}✓${COLORS.reset} Logging system is OPERATIONAL`);
  } else {
    console.log(`${COLORS.red}✗${COLORS.reset} Logging system is NOT WORKING`);
  }

  if (results.sessions) {
    console.log(`${COLORS.green}✓${COLORS.reset} Session management is OPERATIONAL`);
  } else {
    console.log(`${COLORS.yellow}⚠${COLORS.reset} Session management is UNTESTED`);
  }

  if (results.learning) {
    console.log(`${COLORS.green}✓${COLORS.reset} Self-learning system is OPERATIONAL`);
  } else {
    console.log(`${COLORS.yellow}⚠${COLORS.reset} Self-learning system is UNTESTED`);
  }

  const allPassed = results.websocket && results.logging;

  console.log();
  if (allPassed) {
    console.log(`${COLORS.green}OVERALL: Core features are WORKING${COLORS.reset}`);
    return 0;
  } else {
    console.log(`${COLORS.red}OVERALL: Some features are NOT WORKING${COLORS.reset}`);
    return 1;
  }
}

async function main() {
  console.log(`\n${COLORS.cyan}╔═══════════════════════════════════════════════════════════╗${COLORS.reset}`);
  console.log(`${COLORS.cyan}║                                                           ║${COLORS.reset}`);
  console.log(`${COLORS.cyan}║         ExAI Guard - Runtime Verification Test            ║${COLORS.reset}`);
  console.log(`${COLORS.cyan}║                                                           ║${COLORS.reset}`);
  console.log(`${COLORS.cyan}╚═══════════════════════════════════════════════════════════╝${COLORS.reset}\n`);

  console.log(`${COLORS.yellow}Prerequisites:${COLORS.reset}`);
  console.log(`  1. VSIX installed: code --install-extension bin/founder-x-ai-3.25.20.vsix`);
  console.log(`  2. VSCode reloaded`);
  console.log(`  3. Extension activated\n`);

  const results = {
    websocket: false,
    logging: false,
    sessions: false,
    learning: false
  };

  try {
    // Test 1: WebSocket Connectivity
    results.websocket = await testWebSocketConnectivity();

    // Test 2: Logging System
    results.logging = await testLoggingSystem();

    // If WebSocket works, test more features
    if (results.websocket) {
      const ws = new WebSocket('ws://localhost:8080');

      await new Promise((resolve) => {
        ws.on('open', resolve);
        ws.on('error', resolve);
      });

      if (ws.readyState === WebSocket.OPEN) {
        // Test 3: Skip checkpoint (needs API update)
        // await testCheckpointSystem(ws);

        // Test 4: Session Management
        results.sessions = await testSessionManagement(ws);

        // Test 5: Self-Learning
        results.learning = await testLearningInsights(ws);

        ws.close();
      }
    } else {
      console.log(`\n${COLORS.yellow}Skipping advanced tests (WebSocket not available)${COLORS.reset}\n`);
    }

    // Generate report
    const exitCode = await generateTestReport(results);
    process.exit(exitCode);

  } catch (error) {
    console.error(`\n${COLORS.red}Test suite failed with error:${COLORS.reset}`, error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
