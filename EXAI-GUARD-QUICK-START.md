# ExAI Guard - Quick Start Guide

## Overview

ExAI Guard is now a fully-featured AI code quality and security guard with real-time analysis, automatic fixing, and self-learning capabilities.

---

## Installation

### Install the Extension

```bash
code --install-extension bin/founder-x-ai-3.25.20.vsix
```

### Verify Installation

The ExAI Guard service automatically starts when the extension loads and:
- Starts WebSocket server on port 8080
- Initializes logging to `logs/exai-guard/`
- Begins checkpoint creation every 30 seconds
- Activates self-learning system

---

## Features

### 1. Real-Time Code Analysis

**Automatic Detection**:
- Security violations (passwords, credentials, SQL injection)
- Privacy violations (PII, phone numbers, SSN, credit cards)
- Quality violations (incomplete code, TODOs, code smells)
- Compliance violations (license issues, accessibility)
- Ethical violations (bias, fairness issues)

**What Gets Scanned**:
- Files on save
- AI-generated code responses
- Project-wide analysis on request

### 2. AI-Powered Auto-Fixing

When violations are detected, ExAI Guard can:
- Generate contextual fixes based on violation type
- Apply fixes automatically (if enabled)
- Suggest test cases for verification
- Provide confidence scores for fixes

**Example Fix Types**:
- Move hardcoded passwords to environment variables
- Anonymize PII data
- Complete incomplete code patterns
- Remove TODO/FIXME markers with actual implementations

### 3. WebSocket API

Connect external tools to ExAI Guard via WebSocket:

```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
  // Send project analysis request
  ws.send(JSON.stringify({
    type: 'analyze_project',
    payload: {
      projectPath: '/path/to/project',
      files: ['src/index.ts', 'src/utils.ts']
    }
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Received:', message.type, message.payload);
});
```

### 4. Session Management

Each analysis creates a session that tracks:
- Files analyzed
- Violations found
- Fixes applied
- Duration and performance metrics

**Query Session Status**:
```javascript
ws.send(JSON.stringify({
  type: 'get_session_status',
  payload: { sessionId: 'uuid' }
}));
```

### 5. Checkpoint & Recovery

**Automatic Checkpoints**:
- Created every 30 seconds
- Stores active sessions, learning data, system stats
- Last 10 checkpoints kept in memory

**Restore from Checkpoint**:
```javascript
ws.send(JSON.stringify({
  type: 'restore_checkpoint',
  payload: { checkpointId: 'timestamp' }
}));
```

### 6. Self-Learning System

ExAI Guard learns from every analysis:
- Tracks violation patterns by type and file
- Measures fix success rates
- Identifies common error patterns
- Calculates performance metrics

**Get Learning Insights**:
```javascript
ws.send(JSON.stringify({
  type: 'get_learning_insights',
  payload: {}
}));
```

**Response**:
```json
{
  "topViolationPatterns": {
    "SECURITY": 45,
    "QUALITY": 32
  },
  "averageFixSuccessRate": 0.92,
  "commonErrors": {
    "hardcoded_credentials": 15
  }
}
```

---

## Configuration

### Enable/Disable Features

Access settings via VSCode:
- `exaiGuard.enabled` - Enable/disable ExAI Guard
- `exaiGuard.realTimeDetection` - Real-time scanning
- `exaiGuard.autoCorrection` - Automatic fix application
- `exaiGuard.notificationEnabled` - Show notifications
- `exaiGuard.loggingEnabled` - File-based logging

### Configure Violation Types

Enable/disable specific violation types:
```json
{
  "exaiGuard.violationTypes": {
    "SECURITY": true,
    "PRIVACY": true,
    "COMPLIANCE": true,
    "ETHICAL": true,
    "QUALITY": true
  }
}
```

### Set Severity Threshold

Only detect violations above threshold:
```json
{
  "exaiGuard.severityThreshold": "MEDIUM"
}
```

Options: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`

---

## Monitoring & Logs

### Log Files

**Session Logs** (`logs/exai-guard/session-[timestamp].json`):
- JSON format for machine processing
- Complete session history
- All events and metadata

**Detailed Logs** (`logs/exai-guard/detailed-[timestamp].log`):
- Human-readable format
- Color-coded log levels
- Detailed error messages

### Log Levels

- 🟢 **SUCCESS** - Operation completed successfully
- 🔵 **INFO** - General information
- 🟡 **WARN** - Warning conditions
- 🔴 **ERROR** - Error conditions
- 🟣 **DEBUG** - Debug information

### Console Output

Watch real-time logs in VSCode Output panel:
1. Open Output panel (View → Output)
2. Select "Roo Code" from dropdown
3. View ExAI Guard events

---

## API Reference

### WebSocket Message Types

#### Client → Server

| Type | Payload | Description |
|------|---------|-------------|
| `analyze_project` | `{ projectPath, files }` | Analyze entire project |
| `analyze_file` | `{ filePath }` | Analyze single file |
| `get_session_status` | `{ sessionId }` | Get session progress |
| `restore_checkpoint` | `{ checkpointId }` | Restore from checkpoint |
| `get_learning_insights` | `{}` | Get learning metrics |

#### Server → Client

| Type | Payload | Description |
|------|---------|-------------|
| `welcome` | `{ message, timestamp }` | Connection established |
| `analysis_started` | `{ sessionId, projectPath }` | Analysis begun |
| `file_analysis_started` | `{ sessionId, filePath }` | File analysis begun |
| `violations_detected` | `{ sessionId, filePath, violations }` | Violations found |
| `fix_generated` | `{ sessionId, violation, fix }` | AI fix created |
| `file_analysis_completed` | `{ sessionId, filePath }` | File analysis done |
| `analysis_completed` | `{ sessionId, summary }` | Project analysis done |
| `analysis_failed` | `{ sessionId, error }` | Analysis error |
| `session_status` | `{ sessionId, status, progress }` | Session status |
| `learning_insights` | `{ patterns, metrics }` | Learning data |
| `error` | `{ message, error }` | Error occurred |

---

## Examples

### Example 1: Analyze Project via WebSocket

```javascript
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
  console.log('Connected to ExAI Guard');

  // Analyze project
  ws.send(JSON.stringify({
    type: 'analyze_project',
    payload: {
      projectPath: '/Users/dev/my-project',
      files: [
        'src/index.ts',
        'src/api/routes.ts',
        'src/utils/auth.ts'
      ]
    }
  }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);

  switch (msg.type) {
    case 'analysis_started':
      console.log('Analysis started:', msg.payload.sessionId);
      break;

    case 'violations_detected':
      console.log('Violations in', msg.payload.filePath);
      msg.payload.violations.forEach(v => {
        console.log(`  - ${v.severity}: ${v.message}`);
      });
      break;

    case 'fix_generated':
      console.log('Fix generated:', msg.payload.fix.approach);
      console.log('Confidence:', msg.payload.fix.confidence);
      break;

    case 'analysis_completed':
      const summary = msg.payload.summary;
      console.log('Analysis complete:');
      console.log(`  - Violations: ${summary.totalViolations}`);
      console.log(`  - Fixes: ${summary.totalFixed}`);
      console.log(`  - Duration: ${summary.duration}ms`);
      ws.close();
      break;
  }
});
```

### Example 2: Monitor Learning Insights

```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
  // Request learning insights
  ws.send(JSON.stringify({
    type: 'get_learning_insights',
    payload: {}
  }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);

  if (msg.type === 'learning_insights') {
    const insights = msg.payload;

    console.log('Top Violation Patterns:');
    Object.entries(insights.topViolationPatterns).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    console.log(`\nAverage Fix Success Rate: ${(insights.averageFixSuccessRate * 100).toFixed(1)}%`);

    console.log('\nCommon Errors:');
    Object.entries(insights.commonErrors).forEach(([error, count]) => {
      console.log(`  ${error}: ${count}`);
    });

    ws.close();
  }
});
```

### Example 3: Track Session Progress

```javascript
const ws = new WebSocket('ws://localhost:8080');
let sessionId = null;

ws.on('open', () => {
  // Start analysis
  ws.send(JSON.stringify({
    type: 'analyze_project',
    payload: {
      projectPath: '/path/to/project',
      files: ['src/file1.ts', 'src/file2.ts']
    }
  }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);

  if (msg.type === 'analysis_started') {
    sessionId = msg.payload.sessionId;

    // Poll for status every 2 seconds
    const statusInterval = setInterval(() => {
      ws.send(JSON.stringify({
        type: 'get_session_status',
        payload: { sessionId }
      }));
    }, 2000);

    // Stop polling after 30 seconds
    setTimeout(() => clearInterval(statusInterval), 30000);
  }

  if (msg.type === 'session_status') {
    const progress = msg.payload.progress;
    const percent = (progress.filesProcessed / progress.totalFiles * 100).toFixed(1);
    console.log(`Progress: ${percent}% (${progress.filesProcessed}/${progress.totalFiles} files)`);
    console.log(`  Violations: ${progress.violationsFound}`);
    console.log(`  Fixes: ${progress.fixesApplied}`);
  }
});
```

---

## Troubleshooting

### WebSocket Connection Failed

**Problem**: Cannot connect to `ws://localhost:8080`

**Solutions**:
1. Verify extension is loaded: Check VSCode Extensions panel
2. Check logs: Look for "WebSocket server started" message
3. Check port: Ensure port 8080 is not in use by another application
4. Restart VSCode: Reload window to restart service

### No Violations Detected

**Problem**: ExAI Guard not finding obvious issues

**Solutions**:
1. Check if enabled: Verify `exaiGuard.enabled` is `true`
2. Check severity threshold: Lower threshold to `LOW`
3. Check violation types: Ensure relevant types are enabled
4. Review logs: Check detailed log for scan results

### Auto-Correction Not Working

**Problem**: Fixes not being applied automatically

**Solutions**:
1. Enable auto-correction: Set `exaiGuard.autoCorrection` to `true`
2. Check fix capability: Not all violations are auto-correctable
3. Check confidence: Low-confidence fixes may not auto-apply
4. Review logs: Check for fix application errors

### High Memory Usage

**Problem**: Extension using too much memory

**Solutions**:
1. Reduce checkpoint frequency: Modify checkpoint interval
2. Limit session history: Clear old sessions
3. Disable learning: Temporarily disable self-learning
4. Restart extension: Reload window to clear cache

---

## Best Practices

### 1. Start with Manual Analysis
- Enable real-time detection but disable auto-correction
- Review suggested fixes before applying
- Build confidence in fix quality

### 2. Monitor Learning Insights
- Regularly check learning metrics
- Identify common violation patterns
- Adjust coding practices to reduce violations

### 3. Use Checkpoints for Large Projects
- Enable checkpointing for projects with 100+ files
- Restore from checkpoints if analysis crashes
- Review checkpoint frequency based on project size

### 4. Configure Severity Appropriately
- Use `CRITICAL` threshold for production deployments
- Use `LOW` threshold during development
- Adjust based on project maturity

### 5. Review Logs Regularly
- Check session logs for patterns
- Review fix success rates
- Identify areas for improvement

---

## Support

### Resources
- Full Documentation: `EXAI-GUARD-COMPLETE-IMPLEMENTATION.md`
- Source Code: `src/services/exai-guard/ExAIGuardService.ts`
- Tests: `src/services/exai-guard/__tests__/`
- Logs: `logs/exai-guard/`

### Getting Help
1. Check logs for error messages
2. Review configuration settings
3. Verify WebSocket connectivity
4. Check extension version

---

*Last Updated: 2025-10-26*
*Version: 3.25.20*
