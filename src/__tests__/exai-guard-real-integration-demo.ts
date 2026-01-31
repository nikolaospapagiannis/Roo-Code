/**
 * REAL Integration Demo for ExAI Guard
 * This demonstrates actual working functionality with real user flows
 */

import { ExAIGuardService } from '../services/exai-guard/ExAIGuardService';
import { ExAIGuardViolationType, ExAIGuardViolationSeverity } from '../services/exai-guard/ExAIGuardService';

// Mock VSCode extension context with minimal required properties
const mockContext = {
  globalState: {
    get: () => null,
    update: () => Promise.resolve()
  },
  subscriptions: [],
  workspaceState: {
    get: () => null,
    update: () => Promise.resolve(),
    keys: () => []
  },
  extensionUri: { fsPath: '' } as any,
  extensionPath: '',
  environmentVariableCollection: {} as any,
  storageUri: undefined,
  globalStorageUri: { fsPath: '' } as any,
  logUri: { fsPath: '' } as any,
  storagePath: undefined,
  globalStoragePath: '',
  logPath: '',
  asAbsolutePath: (path: string) => path,
  extensionMode: 1,
  extension: {
    id: 'test-extension',
    extensionUri: { fsPath: '' } as any,
    extensionPath: '',
    isActive: true,
    packageJSON: {},
    exports: {},
    activate: () => Promise.resolve({}),
  },
  languageModelAccessInformation: {
    onDidChange: () => ({ dispose: () => {} }),
  },
  secrets: {
    get: () => Promise.resolve(undefined),
    store: () => Promise.resolve(),
    delete: () => Promise.resolve()
  }
} as any;

async function runRealIntegrationDemo() {
  console.log('🚀 EXAI GUARD REAL INTEGRATION DEMO\n');
  
  // Initialize the service
  const exaiGuard = ExAIGuardService.getInstance();
  await exaiGuard.initialize(mockContext);
  
  console.log('✅ ExAI Guard Service Initialized');
  console.log('📊 Configuration:', exaiGuard.getConfig());
  
  // Test 1: Real Security Violation Detection
  console.log('\n🔒 TEST 1: Security Violation Detection');
  const securityVulnerableCode = `
    // Hardcoded secrets
    const password = "superSecret123!";
    const apiKey = "sk-1234567890abcdef";
    
    // SQL Injection vulnerability
    const query = "SELECT * FROM users WHERE username = '" + userInput + "'";
    
    // XSS vulnerability
    document.getElementById('content').innerHTML = userContent;
  `;
  
  const securityViolations = exaiGuard.scanContent(securityVulnerableCode, {
    filePath: 'security-test.js',
    language: 'javascript'
  });
  
  console.log(`📋 Security Violations Found: ${securityViolations.length}`);
  securityViolations.forEach((violation, index) => {
    console.log(`  ${index + 1}. ${violation.type} - ${violation.severity}: ${violation.message}`);
    if (violation.correction?.autoCorrectable) {
      console.log(`     💡 Auto-fix available: ${violation.correction.suggestedAction}`);
    }
  });
  
  // Test 2: Privacy Violation Detection
  console.log('\n🔐 TEST 2: Privacy Violation Detection');
  const privacyVulnerableCode = `
    // PII exposure
    const userEmail = "john.doe@example.com";
    const phoneNumber = "+1-555-0123";
    const ssn = "123-45-6789";
  `;
  
  const privacyViolations = exaiGuard.scanContent(privacyVulnerableCode, {
    filePath: 'privacy-test.js',
    language: 'javascript'
  });
  
  console.log(`📋 Privacy Violations Found: ${privacyViolations.length}`);
  privacyViolations.forEach((violation, index) => {
    console.log(`  ${index + 1}. ${violation.type} - ${violation.severity}: ${violation.message}`);
  });
  
  // Test 3: Incomplete Code Detection (Stream Interception)
  console.log('\n🔄 TEST 3: Stream Interception - Incomplete Code');
  const incompleteCode = `
    function calculateTotal(items) {
      // TODO: implement calculation logic
      return 0;
    }
    
    // placeholder for authentication
    function authenticateUser() {
      // FIXME: implement real authentication
      return true;
    }
    
    // fake business logic
    function processOrder() {
      // simulated processing
      return { success: true };
    }
  `;
  
  const streamResult = await exaiGuard.interceptStream(incompleteCode, {
    taskId: 'demo-task-123',
    messageId: 'demo-message-456'
  });
  
  console.log(`📋 Stream Intercepted: ${streamResult.intercepted}`);
  console.log(`📋 Violations Found: ${streamResult.violations.length}`);
  console.log(`📋 Subtasks Generated: ${streamResult.subtasks.length}`);
  
  streamResult.violations.forEach((violation, index) => {
    console.log(`  ${index + 1}. ${violation.type} - ${violation.severity}: ${violation.message}`);
  });
  
  streamResult.subtasks.forEach((subtask, index) => {
    console.log(`  📝 Subtask ${index + 1}: ${subtask.description}`);
  });
  
  // Test 4: Real-Time Correction
  console.log('\n⚡ TEST 4: Real-Time Correction');
  const problematicCode = `
    // Multiple issues in one code block
    const password = "hardcodedPassword123";
    const query = "DELETE FROM users WHERE id = " + userId;
    const userEmail = "user@example.com";
    
    function veryLongFunction() {
      // This function is too long and complex
      console.log("Placeholder implementation");
      // TODO: add real logic
      return null;
    }
  `;
  
  const allViolations = exaiGuard.scanContent(problematicCode, {
    filePath: 'correction-test.js',
    language: 'javascript',
    realTime: true
  });
  
  console.log(`📋 Total Violations Found: ${allViolations.length}`);
  
  const securityCount = allViolations.filter(v => v.type === ExAIGuardViolationType.SECURITY).length;
  const privacyCount = allViolations.filter(v => v.type === ExAIGuardViolationType.PRIVACY).length;
  const qualityCount = allViolations.filter(v => v.type === ExAIGuardViolationType.QUALITY).length;
  
  console.log(`   🔒 Security: ${securityCount}`);
  console.log(`   🔐 Privacy: ${privacyCount}`);
  console.log(`   📊 Quality: ${qualityCount}`);
  
  const autoCorrectable = allViolations.filter(v => v.correction?.autoCorrectable === true);
  console.log(`   ⚡ Auto-correctable: ${autoCorrectable.length}`);
  
  // Show auto-correction examples
  autoCorrectable.slice(0, 2).forEach((violation, index) => {
    console.log(`\n   Example Auto-Correction ${index + 1}:`);
    console.log(`     Issue: ${violation.message}`);
    console.log(`     Fix: ${violation.correction?.suggestedAction}`);
    if (violation.correction?.correctedContent) {
      console.log(`     Corrected: ${violation.correction.correctedContent.substring(0, 50)}...`);
    }
  });
  
  // Test 5: Performance and Scalability
  console.log('\n⚡ TEST 5: Performance Test');
  const testSamples = [
    'const password = "test123";',
    'document.innerHTML = userContent;',
    'const apiKey = "sk-test123";',
    'const email = "test@example.com";'
  ];
  
  const startTime = Date.now();
  const results = testSamples.map((code, index) => 
    exaiGuard.scanContent(code, {
      filePath: `performance-test-${index}.js`,
      language: 'javascript'
    })
  );
  const totalTime = Date.now() - startTime;
  
  const totalViolations = results.reduce((sum, result) => sum + result.length, 0);
  console.log(`📊 Processed ${testSamples.length} samples in ${totalTime}ms`);
  console.log(`📊 Average time per sample: ${(totalTime / testSamples.length).toFixed(2)}ms`);
  console.log(`📊 Total violations detected: ${totalViolations}`);
  
  // Summary
  console.log('\n🎯 INTEGRATION SUMMARY');
  console.log('=====================');
  console.log(`✅ Core Service: Working`);
  console.log(`✅ Security Detection: ${securityViolations.length > 0 ? 'Working' : 'Issues'}`);
  console.log(`✅ Privacy Detection: ${privacyViolations.length > 0 ? 'Working' : 'Issues'}`);
  console.log(`✅ Stream Interception: ${streamResult.intercepted ? 'Working' : 'Issues'}`);
  console.log(`✅ Real-Time Correction: ${autoCorrectable.length > 0 ? 'Working' : 'Issues'}`);
  console.log(`✅ Performance: ${totalTime < 100 ? 'Good' : 'Acceptable'}`);
  
  console.log('\n🔧 NEXT STEPS FOR FULL INTEGRATION:');
  console.log('  1. Integrate with webview message handler');
  console.log('  2. Add UI components for violation display');
  console.log('  3. Implement auto-correction execution');
  console.log('  4. Add user preferences for violation types');
  console.log('  5. Integrate with extension commands');
  
  return {
    securityViolations,
    privacyViolations,
    streamResult,
    allViolations,
    performance: {
      totalTime,
      averageTime: totalTime / testSamples.length,
      totalViolations
    }
  };
}

// Run the demo if this file is executed directly
if (require.main === module) {
  runRealIntegrationDemo().catch(console.error);
}

export { runRealIntegrationDemo };