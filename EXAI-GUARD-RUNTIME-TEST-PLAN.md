# ExAI Guard Runtime Test Plan
**Date:** 2025-10-26
**Purpose:** Verify ExAI Guard integration works in actual VSCode runtime
**Status:** Ready for Manual Testing

---

## TEST ENVIRONMENT SETUP

### Prerequisites
1. ✅ Extension compiled successfully
2. ✅ VSIX package created: `bin/founder-x-ai-3.25.20.vsix`
3. ⚠️ Extension not yet loaded in VSCode
4. ⚠️ Runtime behavior not yet verified

### Installation
```bash
# Install the VSIX in VSCode
code --install-extension bin/founder-x-ai-3.25.20.vsix

# Or press F5 in VSCode to launch Extension Development Host
```

---

## TEST SUITE

### Test 1: ExAI Guard Service Initialization
**Objective:** Verify the service starts without errors

**Steps:**
1. Open VSCode Extension Development Host (F5)
2. Open Developer Tools (Help > Toggle Developer Tools)
3. Look for console output: `[ExAI Guard]` messages
4. Check for initialization errors

**Expected Output:**
```
[ExAI Guard] Enhanced ExAI Guard System initialized
[ExAI Guard] WebSocket server started on port 8080
```

**Pass Criteria:**
- ✅ No initialization errors
- ✅ Service singleton created
- ✅ Config loaded successfully

**Actual Result:** _[To be filled during testing]_

---

### Test 2: Stream Interception - Pattern Detection
**Objective:** Verify stream interception catches violations in real-time

**Steps:**
1. Start a new task in Founder-X AI extension
2. Ask AI to generate code with a hardcoded API key:
   ```
   "Write a JavaScript function that connects to an API using this key: sk_test_1234567890abcdefghijklmnop"
   ```
3. Watch the AI response stream
4. Check console for: `[ExAI Guard] Auto-corrected security violation`
5. Check if API key was redacted in the response

**Expected Behavior:**
- Stream interception activates during AI response
- Pattern detector catches hardcoded API key
- Auto-correction applies if enabled
- Telemetry event fired: `exaiGuardViolationDetected`
- Console shows: `[ExAI Guard] Auto-corrected security violation: Hardcoded API key detected`

**Pass Criteria:**
- ✅ Stream interception runs without errors
- ✅ Security pattern detected
- ✅ Violation logged to console
- ✅ Telemetry event captured

**Actual Result:** _[To be filled during testing]_

---

### Test 3: Memory Drift Detection
**Objective:** Verify AI commitment tracking and contradiction detection

**Setup:** Start a new task

**Test 3a: Commitment Tracking**

**Steps:**
1. Ask AI: "I need you to update the database schema. What will you do?"
2. Wait for AI response containing commitment: "I will update the database schema..."
3. Check console for: `[ExAI Guard] AI commitment tracked`

**Expected:**
- Commitment extracted from AI response
- Stored in memory tracker
- Console log with commitment ID

**Test 3b: Contradiction Detection**

**Steps:**
1. In same task, ask: "Actually, can you skip the database changes?"
2. Wait for AI response: "I won't update the database..."
3. Check console for: `[ExAI Guard] Memory drift detected`
4. Check for violation notification

**Expected Behavior:**
- Text similarity calculated between current response and previous commitment
- Negation pattern detected: "won't"
- Memory drift violation created with severity HIGH
- Telemetry event: `memory-drift-detected`
- Console shows: `Memory drift detected: AI contradicted previous commitment`

**Pass Criteria:**
- ✅ Commitments tracked correctly
- ✅ Contradictions detected
- ✅ Violations created with proper severity
- ✅ Telemetry fired

**Actual Result:** _[To be filled during testing]_

---

### Test 4: Real-Time Violation Notification
**Objective:** Verify webview receives violation notifications

**Steps:**
1. Trigger a violation (use Test 2 or Test 3)
2. Check if webview displays notification
3. Verify notification contains:
   - Violation type
   - Severity
   - Message
   - Description
   - Timestamp

**Expected:**
- `postMessageToWebview` called with type: `exaiGuardViolations`
- Webview receives violation data
- User sees notification (if UI implemented)

**Pass Criteria:**
- ✅ Message sent to webview
- ✅ Violation data correctly formatted
- ✅ No errors in webview console

**Actual Result:** _[To be filled during testing]_

---

### Test 5: Auto-Correction
**Objective:** Verify auto-correction modifies stream content

**Setup:** Enable auto-correction in ExAI Guard config

**Steps:**
1. Ask AI to write code with email address:
   ```
   "Create a contact form that sends email to admin@example.com"
   ```
2. Watch for auto-correction
3. Verify email is redacted in final output

**Expected Behavior:**
- Privacy pattern detected: email address
- Auto-correction applied: `admin@example.com` → `[EMAIL_REDACTED]`
- Corrected text replaces original in stream
- Console: `[ExAI Guard] Auto-corrected privacy violation`
- Telemetry: `exaiGuardViolationCorrected`

**Pass Criteria:**
- ✅ Correction applied successfully
- ✅ Stream content modified
- ✅ No corruption of surrounding text
- ✅ Telemetry event captured

**Actual Result:** _[To be filled during testing]_

---

### Test 6: Telemetry Integration
**Objective:** Verify all telemetry events are captured

**Steps:**
1. Run Tests 2-5 above
2. Check telemetry service for events:
   - `exaiGuardViolationDetected`
   - `exaiGuardViolationCorrected`
   - `exaiGuardAction` (stream-auto-correction)
   - `exaiGuardAction` (memory-drift-detected)

**Expected:**
- All events captured with correct parameters
- Event data includes:
  - Violation type
  - Violation ID
  - Severity
  - Context (taskId, etc.)

**Pass Criteria:**
- ✅ All 4 event types captured
- ✅ Event parameters correct
- ✅ No telemetry errors

**Actual Result:** _[To be filled during testing]_

---

### Test 7: Performance Impact
**Objective:** Verify stream interception doesn't slow down AI responses

**Steps:**
1. Time AI response without ExAI Guard (baseline)
2. Enable ExAI Guard
3. Time same AI response with ExAI Guard
4. Calculate overhead

**Expected:**
- Overhead < 5ms per chunk (as designed)
- No noticeable delay to user
- Stream remains smooth

**Pass Criteria:**
- ✅ Overhead < 5ms per chunk
- ✅ No user-perceivable lag
- ✅ Stream fluidity maintained

**Actual Result:** _[To be filled during testing]_

---

### Test 8: Error Handling
**Objective:** Verify errors don't break the stream

**Steps:**
1. Inject error in ExAI Guard (e.g., invalid pattern)
2. Trigger stream interception
3. Verify AI response still streams normally
4. Check error is logged but not thrown

**Expected Behavior:**
- Try-catch wraps ExAI Guard code in Task.ts (line 1850-1970)
- Error caught: `[ExAI Guard] Stream interception error:`
- Stream continues unaffected
- User sees AI response normally

**Pass Criteria:**
- ✅ Error logged to console
- ✅ Stream not interrupted
- ✅ AI response completes normally

**Actual Result:** _[To be filled during testing]_

---

## INTEGRATION POINTS TO VERIFY

### Code Locations
```typescript
// 1. Service Initialization (extension.ts:121)
const exaiGuardService = EnhancedExAIGuardService.getInstance()

// 2. Stream Interception (Task.ts:1846-1972)
const exaiGuardService = ExAIGuardService.getInstance()
if (exaiGuardService.isEnabled() && exaiGuardService.isRealTimeDetectionEnabled()) {
  // Real-time detection code
}

// 3. Telemetry Integration (Task.ts:1895-1963)
TelemetryService.instance.captureExAIGuardViolationDetected(...)
TelemetryService.instance.captureExAIGuardViolationCorrected(...)
TelemetryService.instance.captureExAIGuardAction(...)

// 4. Webview Notification (Task.ts:1922-1941)
provider.postMessageToWebview({
  type: "exaiGuardViolations",
  violations: [...]
})
```

### Configuration Check
```typescript
// Verify config is accessible
const config = exaiGuardService.getConfig()
console.log('ExAI Guard Config:', {
  enabled: config.enabled,
  realTimeDetection: config.realTimeDetection,
  autoCorrection: config.autoCorrection,
  violationTypes: config.violationTypes
})
```

---

## DEBUGGING TIPS

### Enable Verbose Logging
Add to ExAIGuardService.ts constructor:
```typescript
console.log('[ExAI Guard] Service initialized with config:', this.config)
```

### Track All Stream Chunks
Add to Task.ts stream handler:
```typescript
console.log('[ExAI Guard] Processing chunk:', chunk.text.substring(0, 50))
```

### Monitor Memory Tracker
Add to trackAIClaim method:
```typescript
console.log('[ExAI Guard] Memory tracker state:', {
  commitments: this.memoryTracker.commitments.size,
  claims: this.memoryTracker.claims.size,
  contextWindow: this.memoryTracker.contextWindow.length
})
```

---

## KNOWN ISSUES TO CHECK

### Issue 1: Service Import Mismatch
**Problem:** Task.ts imports `ExAIGuardService` but extension.ts imports `EnhancedExAIGuardService`
**Location:**
- Task.ts:1848: `ExAIGuardService.getInstance()`
- extension.ts:30: `EnhancedExAIGuardService.getInstance()`

**Impact:** May cause singleton mismatch or undefined methods
**Fix Required:** Verify both use same service class

### Issue 2: Method Availability
**Methods called but may not exist:**
- `scanContent()` - called in Task.ts:1863
- `applyCorrection()` - called in Task.ts:1886
- `trackAIClaim()` - called in Task.ts:1852
- `detectMemoryDrift()` - called in Task.ts:1858

**Verification:** Check these methods exist in ExAIGuardService.ts

### Issue 3: Telemetry Methods
**Methods called:**
- `captureExAIGuardViolationDetected()` - Task.ts:1946
- `captureExAIGuardViolationCorrected()` - Task.ts:1896
- `captureExAIGuardAction()` - Task.ts:1911, 1958

**Verification:** Check TelemetryService has these methods

---

## AUTOMATED VERIFICATION SCRIPT

Save as `test-exai-guard.js`:

```javascript
// Run in VSCode Extension Development Host Console
(async function testExAIGuard() {
  console.log('=== ExAI Guard Integration Test ===')

  // Test 1: Service exists
  try {
    const { ExAIGuardService } = await import('./services/exai-guard/ExAIGuardService')
    const service = ExAIGuardService.getInstance()
    console.log('✅ Test 1: Service initialized')
    console.log('   Config:', service.getConfig())
  } catch (error) {
    console.error('❌ Test 1 Failed:', error.message)
  }

  // Test 2: Pattern detection
  try {
    const { ExAIGuardService } = await import('./services/exai-guard/ExAIGuardService')
    const service = ExAIGuardService.getInstance()
    const testContent = 'const apiKey = "sk_test_1234567890abcdef"'
    const violations = service.scanContent(testContent, { taskId: 'test' })
    console.log('✅ Test 2: Pattern detection')
    console.log('   Found violations:', violations.length)
  } catch (error) {
    console.error('❌ Test 2 Failed:', error.message)
  }

  // Test 3: Memory drift
  try {
    const { ExAIGuardService } = await import('./services/exai-guard/ExAIGuardService')
    const service = ExAIGuardService.getInstance()

    // Track commitment
    service.trackAIClaim('I will update the database schema', { taskId: 'test' })

    // Test contradiction
    const violations = service.detectMemoryDrift('I will not update the database', { taskId: 'test' })
    console.log('✅ Test 3: Memory drift detection')
    console.log('   Drift violations:', violations.length)
  } catch (error) {
    console.error('❌ Test 3 Failed:', error.message)
  }

  console.log('=== Test Complete ===')
})()
```

---

## TEST RESULTS TEMPLATE

### Test Session: [DATE/TIME]
**Tester:** [NAME]
**Environment:** VSCode [VERSION]
**Extension Version:** 3.25.20

| Test | Status | Notes |
|------|--------|-------|
| 1. Service Init | ⚠️ Pending | |
| 2. Pattern Detection | ⚠️ Pending | |
| 3a. Commitment Tracking | ⚠️ Pending | |
| 3b. Contradiction Detection | ⚠️ Pending | |
| 4. Webview Notification | ⚠️ Pending | |
| 5. Auto-Correction | ⚠️ Pending | |
| 6. Telemetry Integration | ⚠️ Pending | |
| 7. Performance Impact | ⚠️ Pending | |
| 8. Error Handling | ⚠️ Pending | |

**Overall Status:** ⚠️ UNTESTED

**Critical Issues Found:** _[None yet]_

**Recommendations:** _[To be filled]_

---

## NEXT STEPS AFTER TESTING

### If All Tests Pass ✅
1. Document working features
2. Create user guide
3. Decide on enhancement priorities (Option 3 from status report)

### If Tests Fail ❌
1. Debug runtime errors
2. Fix integration issues
3. Re-test until passing
4. Document fixes applied

### If Partially Working ⚠️
1. Document what works vs what doesn't
2. Prioritize fixes
3. Create bug fix plan
4. Implement fixes incrementally

---

**HONEST ASSESSMENT:** This integration has NEVER been tested in actual runtime. All previous work was compile-time only. This test plan will reveal the truth about whether the code actually works.
