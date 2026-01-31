# AI Guard Integration Deployment Guide

## Overview

This document provides deployment instructions for the AI Guard integration with the Founder-X VSCode extension. The integration combines local ExAI Guard capabilities with the external AI Guard service for comprehensive violation detection, real-time monitoring, and automatic correction.

## Prerequisites

### 1. External AI Guard Service
- **Location**: `E:\coding-bai-guard\ai-guard-service`
- **Requirements**: Node.js 16+, npm/yarn
- **Port**: Default 3001 (configurable)

### 2. Founder-X Extension
- **Location**: Current workspace
- **Requirements**: VSCode extension environment
- **Dependencies**: axios, WebSocket (optional)

## Deployment Steps

### Step 1: Start AI Guard Service

```bash
# Navigate to AI Guard service directory
cd E:\coding-bai-guard\ai-guard-service

# Install dependencies
npm install

# Start the service
npm start

# Or for development mode
npm run dev
```

**Expected Output**: Service running on `http://localhost:3001`

### Step 2: Configure Founder-X Extension

The extension will automatically detect the AI Guard service. Configuration can be managed through:

1. **Command Palette**: `Founder-X: Configure AI Guard Integration`
2. **Settings**: Extension settings panel
3. **Commands**:
   - `founder-x.exai-guard.configure` - Configure ExAI Guard
   - `founder-x.exai-guard.configure-ai-guard` - Configure AI Guard integration
   - `founder-x.exai-guard.toggle` - Toggle ExAI Guard
   - `founder-x.exai-guard.toggle-ai-guard` - Toggle AI Guard integration
   - `founder-x.exai-guard.show-status` - Show status panel

### Step 3: Verify Integration

1. **Check Service Status**:
   - Use `Founder-X: Show AI Guard Status` command
   - Look for "AI Guard Service: Available" status

2. **Test Violation Detection**:
   - Open a file with potential violations
   - The system should detect and report violations in real-time

3. **Test Auto-Correction**:
   - Enable auto-correction in settings
   - The system should automatically fix auto-correctable violations

## Configuration Options

### ExAI Guard Configuration
```typescript
{
  enabled: true,
  realTimeDetection: true,
  autoCorrection: true,
  violationTypes: {
    security: true,
    privacy: true,
    compliance: true,
    ethical: true,
    quality: true
  },
  severityThreshold: 'low',
  notificationEnabled: true,
  loggingEnabled: true
}
```

### AI Guard Integration Configuration
```typescript
{
  enabled: true,
  serviceUrl: 'http://localhost:3001',
  wsUrl: 'ws://localhost:3001/agent-ws',
  realTimeMonitoring: false, // Disabled by default due to WebSocket dependency
  autoCorrection: true,
  strictMode: true,
  confidenceThreshold: 0.7,
  maxViolationsPerFile: 100
}
```

## Real-Time Features

### 1. Real-Time Violation Detection
- Monitors active editor for violations
- Provides instant feedback
- Supports multiple violation types

### 2. Automatic Correction
- Auto-corrects violations when possible
- Creates subtasks for complex fixes
- Maintains code quality standards

### 3. WebSocket Integration (Optional)
- Real-time communication with AI Guard service
- Live violation notifications
- Dynamic task orchestration

## Troubleshooting

### Common Issues

1. **Service Not Available**
   - Check if AI Guard service is running
   - Verify service URL in configuration
   - Check firewall/network settings

2. **Violations Not Detected**
   - Verify violation types are enabled
   - Check severity threshold settings
   - Ensure real-time detection is enabled

3. **Auto-Correction Not Working**
   - Verify auto-correction is enabled
   - Check if violations are auto-correctable
   - Review correction permissions

### Debug Mode

Enable debug logging in the extension settings to get detailed information about:
- Service communication
- Violation detection process
- Auto-correction attempts
- WebSocket connections

## Performance Considerations

### 1. File Size Handling
- Progressive analysis for large files
- Emergency modes for very large files
- Configurable violation limits

### 2. Memory Usage
- Stream-based processing
- Efficient violation tracking
- Automatic cleanup of old violations

### 3. Network Optimization
- HTTP fallback when WebSocket unavailable
- Connection pooling
- Request batching

## Security Considerations

### 1. Data Privacy
- Local processing for sensitive content
- Configurable data sharing with external service
- Secure communication protocols

### 2. Access Control
- Project-based access control
- Configurable service endpoints
- Secure authentication (if implemented)

## Monitoring and Metrics

### Available Statistics
- Total scans performed
- Violations detected and corrected
- AI Guard service availability
- Average response times
- Service health metrics

### Status Panel
Access via `Founder-X: Show AI Guard Status` command to view:
- Service connectivity status
- Recent violation statistics
- Configuration summary
- Performance metrics

## Updates and Maintenance

### Regular Maintenance
1. **Update AI Guard Service**: Check for updates in the external service
2. **Extension Updates**: Keep Founder-X extension updated
3. **Configuration Review**: Periodically review and optimize settings

### Backup and Recovery
- Configuration is stored in VSCode global state
- Settings can be exported/imported via commands
- Service endpoints can be reconfigured as needed

## Support

For issues with the AI Guard integration:
1. Check the extension output channel for detailed logs
2. Verify AI Guard service is running and accessible
3. Review configuration settings
4. Contact support with detailed error information

---

**Note**: This integration requires the external AI Guard service to be running for full functionality. The system will gracefully degrade when the service is unavailable, using only local ExAI Guard capabilities.