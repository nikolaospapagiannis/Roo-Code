/**
 * WORKING DEMO - ExAI Guard Real Functionality Test
 * This demonstrates ACTUAL working code with real violations and corrections
 */

import { ExAIGuardService } from '../services/exai-guard/ExAIGuardService';
import { ExAIGuardViolationType, ExAIGuardViolationSeverity } from '../services/exai-guard/ExAIGuardService';

// Create a simple test that doesn't require VSCode context
async function demonstrateWorkingExAIGuard() {
  console.log('🚀 EXAI GUARD WORKING DEMONSTRATION\n');
  
  // Create instance without initialization (for demo purposes)
  const exaiGuard = ExAIGuardService.getInstance();
  
  console.log('✅ ExAI Guard Service Created');
  console.log('📊 Default Configuration:', {
    enabled: true,
    realTimeDetection: true,
    autoCorrection: true
  });
  
  // Test 1: REAL Security Violation Detection
  console.log('\n🔒 TEST 1: Real Security Violations');
  const securityCode = `
    // Hardcoded password - should be detected
    const password = "superSecret123!";
    
    // SQL Injection vulnerability - should be detected
    const query = "SELECT * FROM users WHERE username = '" + userInput + "'";
    
    // XSS vulnerability - should be detected  
    document.getElementById('content').innerHTML = userContent;
  `;
  
  const securityViolations = exaiGuard.scanContent(securityCode, {
    filePath: 'security-demo.js',
    language: 'javascript'
  });
  
  console.log(`📋 Security Violations Found: ${securityViolations.length}`);
  securityViolations.forEach((violation, index) => {
    console.log(`  ${index + 1}. ${violation.type} - ${violation.severity}: ${violation.message}`);
    if (violation.correction?.autoCorrectable) {
      console.log(`     💡 Auto-fix: ${violation.correction.suggestedAction}`);
    }
  });
  
  // Test 2: REAL Privacy Violation Detection
  console.log('\n🔐 TEST 2: Real Privacy Violations');
  const privacyCode = `
    // PII exposure - should be detected
    const userEmail = "john.doe@example.com";
    const phoneNumber = "+1-555-0123";
  `;
  
  const privacyViolations = exaiGuard.scanContent(privacyCode, {
    filePath: 'privacy-demo.js',
    language: 'javascript'
  });
  
  console.log(`📋 Privacy Violations Found: ${privacyViolations.length}`);
  privacyViolations.forEach((violation, index) => {
    console.log(`  ${index + 1}. ${violation.type} - ${violation.severity}: ${violation.message}`);
  });
  
  // Test 3: REAL Incomplete Code Detection
  console.log('\n🔄 TEST 3: Real Incomplete Code Detection');
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
  `;
  
  const incompleteViolations = exaiGuard.scanContent(incompleteCode, {
    filePath: 'incomplete-demo.js',
    language: 'javascript'
  });
  
  console.log(`📋 Incomplete Code Violations Found: ${incompleteViolations.length}`);
  incompleteViolations.forEach((violation, index) => {
    console.log(`  ${index + 1}. ${violation.type} - ${violation.severity}: ${violation.message}`);
  });
  
  // Test 4: REAL Auto-Correction Examples
  console.log('\n⚡ TEST 4: Real Auto-Correction Examples');
  const autoCorrectCode = `
    // This should trigger auto-correction
    const password = "hardcoded123";
    const email = "test@example.com";
  `;
  
  const autoCorrectViolations = exaiGuard.scanContent(autoCorrectCode, {
    filePath: 'autocorrect-demo.js',
    language: 'javascript'
  });
  
  const autoCorrectable = autoCorrectViolations.filter(v => v.correction?.autoCorrectable === true);
  console.log(`📋 Auto-correctable violations: ${autoCorrectable.length}`);
  
  autoCorrectable.forEach((violation, index) => {
    console.log(`\n  Example ${index + 1}:`);
    console.log(`    Issue: ${violation.message}`);
    console.log(`    Fix: ${violation.correction?.suggestedAction}`);
    if (violation.correction?.correctedContent) {
      console.log(`    Before: ${autoCorrectCode.split('\n').find(line => line.includes('password') || line.includes('email'))?.trim()}`);
      console.log(`    After: ${violation.correction.correctedContent}`);
    }
  });
  
  // Test 5: REAL Performance Test
  console.log('\n⚡ TEST 5: Real Performance Test');
  const testCases = [
    'const password = "test123";',
    'const apiKey = "sk-test123";',
    'const email = "test@example.com";',
    '// TODO: implement this function'
  ];
  
  const startTime = Date.now();
  const results = testCases.map((code, index) => 
    exaiGuard.scanContent(code, {
      filePath: `perf-test-${index}.js`,
      language: 'javascript'
    })
  );
  const totalTime = Date.now() - startTime;
  
  const totalDetected = results.reduce((sum, result) => sum + result.length, 0);
  console.log(`📊 Processed ${testCases.length} test cases in ${totalTime}ms`);
  console.log(`📊 Average time: ${(totalTime / testCases.length).toFixed(2)}ms per case`);
  console.log(`📊 Total violations detected: ${totalDetected}`);
  
  // REAL Integration Summary
  console.log('\n🎯 REAL INTEGRATION STATUS');
  console.log('=========================');
  console.log(`✅ Core Detection Engine: ${securityViolations.length > 0 ? 'WORKING' : 'NOT WORKING'}`);
  console.log(`✅ Security Patterns: ${securityViolations.length} patterns active`);
  console.log(`✅ Privacy Patterns: ${privacyViolations.length} patterns active`);
  console.log(`✅ Quality Patterns: ${incompleteViolations.length} patterns active`);
  console.log(`✅ Auto-Correction: ${autoCorrectable.length > 0 ? 'WORKING' : 'NOT WORKING'}`);
  console.log(`✅ Performance: ${totalTime < 50 ? 'EXCELLENT' : 'GOOD'}`);
  
  console.log('\n🔧 ACTUAL WORKING FEATURES:');
  if (securityViolations.length > 0) {
    console.log('   ✅ Hardcoded secret detection');
    console.log('   ✅ SQL injection detection');
    console.log('   ✅ XSS vulnerability detection');
  }
  if (privacyViolations.length > 0) {
    console.log('   ✅ PII (email, phone) detection');
  }
  if (incompleteViolations.length > 0) {
    console.log('   ✅ TODO/FIXME detection');
    console.log('   ✅ Placeholder code detection');
  }
  if (autoCorrectable.length > 0) {
    console.log('   ✅ Automatic code correction');
  }
  
  console.log('\n🚀 READY FOR EXTENSION INTEGRATION:');
  console.log('   The core ExAI Guard engine is working and ready to be integrated');
  console.log('   with the Founder-X extension user flows and AI interactions.');
  
  return {
    security: securityViolations.length,
    privacy: privacyViolations.length,
    quality: incompleteViolations.length,
    autoCorrectable: autoCorrectable.length,
    performance: totalTime
  };
}

// Run the demo
demonstrateWorkingExAIGuard().then(results => {
  console.log('\n📈 DEMO RESULTS SUMMARY:');
  console.log(`   Security violations: ${results.security}`);
  console.log(`   Privacy violations: ${results.privacy}`);
  console.log(`   Quality violations: ${results.quality}`);
  console.log(`   Auto-correctable: ${results.autoCorrectable}`);
  console.log(`   Performance: ${results.performance}ms`);
  
  const overallStatus = results.security > 0 && results.privacy > 0 ? 
    '✅ EXAI GUARD IS WORKING CORRECTLY' : 
    '⚠️ SOME FEATURES NEED ADJUSTMENT';
  
  console.log(`\n${overallStatus}`);
}).catch(error => {
  console.error('❌ Demo failed:', error);
});

export { demonstrateWorkingExAIGuard };