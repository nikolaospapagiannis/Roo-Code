# ExAI Guard Stream Interception

## Overview

The ExAI Guard Stream Interception feature provides real-time monitoring and correction of AI-generated responses in the Founder-X VSCode extension. It automatically detects incomplete code patterns in AI responses and creates subtasks for completion, ensuring code quality and completeness.

## Features

### Real-time Violation Detection
- **Stream Interception**: Monitors AI responses as they are generated
- **Incomplete Code Detection**: Identifies patterns like TODOs, stubs, "For now" comments, and fake implementations
- **Quality Violations**: Detects code quality issues in real-time

### Automatic Correction & Orchestration
- **Subtask Creation**: Automatically creates todo list items for incomplete code
- **Orchestration System**: Manages multiple AI agents for code completion
- **Real-time Correction**: Optionally applies corrections to AI responses

### Integration Points
- **Task.say() Method**: Intercepts AI responses at the message level
- **Webview Communication**: Notifies the UI about violations and subtasks
- **Todo List Integration**: Automatically adds correction tasks to the todo list

## Implementation Details

### Core Components

#### 1. ExAIGuardService
The main service that handles stream interception and violation detection:

```typescript
interface StreamInterceptionResult {
  intercepted: boolean;
  violations: ExAIGuardViolation[];
  subtasks: OrchestrationSubtask[];
  correctedContent?: string;
}
```

#### 2. Incomplete Code Patterns
Detects various incomplete code patterns:

- **TODO Comments**: `// TODO:`, `// FIXME:`, `// HACK:`
- **Function Stubs**: `function stub() {}`, `// implement this`
- **Placeholder Code**: `// placeholder`, `// dummy implementation`
- **"For Now" Comments**: `// for now`, `// temporary solution`
- **Fake Business Logic**: `return null`, `throw new Error("Not implemented")`

#### 3. Task Integration
Integrated into the `Task.say()` method:

```typescript
// In src/core/task/Task.ts
async say(type: ClineSay, text?: string, ...) {
  if (type === "text" && text && !partial) {
    const interceptionResult = exaiGuardService.interceptStream(text, {
      taskId: this.taskId,
      instanceId: this.instanceId,
      messageType: "aiResponse"
    });
    
    // Handle violations and create subtasks
    if (interceptionResult.intercepted && interceptionResult.subtasks.length > 0) {
      for (const subtask of interceptionResult.subtasks) {
        await this.addSubtaskToTodoList(subtask);
      }
    }
    
    // Use corrected content if available
    if (interceptionResult.correctedContent) {
      text = interceptionResult.correctedContent;
    }
  }
}
```

### Configuration

The feature can be configured through the extension settings:

```json
{
  "exaiGuard.enabled": true,
  "exaiGuard.realtimeViolation": true,
  "exaiGuard.realtimeCorrection": true,
  "exaiGuard.incompleteCodeDetection": true
}
```

### Violation Types

The system detects several types of violations:

1. **Security Violations**: Potentially unsafe code patterns
2. **Privacy Violations**: Data privacy concerns
3. **Compliance Violations**: Regulatory compliance issues
4. **Ethical Violations**: Ethical AI concerns
5. **Quality Violations**: Code quality issues (including incomplete code)

### Severity Levels

- **Low**: Minor issues that don't affect functionality
- **Medium**: Issues that could affect code quality
- **High**: Issues that affect functionality or security
- **Critical**: Critical security or compliance issues

## Usage Examples

### Example 1: Detecting TODO Comments

**AI Response:**
```typescript
function calculateTotal(items) {
  // TODO: implement actual calculation
  return 0;
}
```

**ExAI Guard Action:**
- Creates violation: "Incomplete code pattern detected: TODO comment"
- Adds subtask: "Complete TODO comment in calculateTotal function"
- Optionally corrects the response

### Example 2: Detecting Function Stubs

**AI Response:**
```typescript
class UserService {
  getUser(id) {
    // implement this
    return null;
  }
}
```

**ExAI Guard Action:**
- Creates violation: "Incomplete code pattern detected: function stub"
- Adds subtask: "Implement getUser function in UserService"
- Provides suggested implementation

### Example 3: Multiple Patterns

**AI Response:**
```typescript
function processData(data) {
  // TODO: validate input
  // For now, just return the data
  return data;
  
  // FIXME: add error handling
}
```

**ExAI Guard Action:**
- Creates multiple violations for each pattern
- Adds multiple subtasks for completion
- Provides comprehensive correction suggestions

## Testing

The feature includes comprehensive tests in `src/__tests__/exai-guard-stream-interception.spec.ts`:

- Stream interception functionality
- Violation detection and reporting
- Subtask creation and todo list integration
- Configuration and enable/disable scenarios

Run tests with:
```bash
cd src && npx vitest run __tests__/exai-guard-stream-interception.spec.ts
```

## Integration with Existing Systems

### Webview Communication
- Uses existing `exaiGuardViolations` message type
- Integrates with current todo list system
- Maintains compatibility with existing UI components

### Task Management
- Leverages existing Task class infrastructure
- Uses standard TodoItem structure
- Integrates with task persistence system

### Configuration System
- Uses existing settings infrastructure
- Maintains backward compatibility
- Follows established patterns for feature flags

## Benefits

1. **Improved Code Quality**: Ensures AI-generated code is complete and production-ready
2. **Reduced Manual Review**: Automatically identifies issues that need human attention
3. **Enhanced Productivity**: Creates actionable tasks for incomplete code
4. **Real-time Feedback**: Provides immediate feedback during AI interactions
5. **Scalable Quality Control**: Scales code quality monitoring across all AI interactions

## Future Enhancements

1. **Custom Pattern Detection**: Allow users to define custom incomplete code patterns
2. **Language-specific Detection**: Enhanced pattern detection for different programming languages
3. **Machine Learning Integration**: Use ML models to detect more complex incomplete patterns
4. **Team Collaboration**: Share violation patterns and corrections across teams
5. **Advanced Orchestration**: More sophisticated multi-agent orchestration for complex corrections

## Troubleshooting

### Common Issues

1. **False Positives**: Some legitimate code patterns might be flagged as incomplete
2. **Performance Impact**: Stream interception adds minimal overhead to AI responses
3. **Configuration Conflicts**: Ensure ExAI Guard settings don't conflict with other extensions

### Debugging

Enable debug logging in settings:
```json
{
  "exaiGuard.debug": true
}
```

Check the extension output channel for detailed logs about violation detection and correction actions.