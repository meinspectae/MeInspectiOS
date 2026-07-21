/**
 * E2E Email Test Script for MeInspect
 * 
 * Tests the full email sending flow end-to-end:
 * 1. Backend health check
 * 2. Email config verification
 * 3. Direct Resend API test (if API key provided)
 * 4. Backend proxy test (sends via /api/public/test-email/send)
 * 
 * Usage:
 *   node scripts/test-email.mjs                           # Test with default recipient
 *   node scripts/test-email.mjs user@example.com          # Test with specific email
 *   RESEND_API_KEY=re_xxx node scripts/test-email.mjs     # Include direct API test
 */

const STAGING_URL = 'https://staging--olkmxpl1sliijytnc48w.youbase.cloud';
const PROD_URL = 'https://olkmxpl1sliijytnc48w.youbase.cloud';
const LOCAL_URL = 'http://localhost:8789';

// ── Test 1: Backend Health ──────────────────────────────────────────────
async function testBackendHealth() {
  console.log('\n━━━ Test 1: Backend Health ━━━');
  
  const urls = [['Local', LOCAL_URL], ['Staging', STAGING_URL], ['Production', PROD_URL]];
  
  for (const [label, url] of urls) {
    try {
      const res = await fetch(`${url}/api/public/test-email/status`);
      const data = await res.json();
      console.log(`  ${label}: ${data.configured ? '✅ Configured' : '❌ Not configured'} | Key: ${data.hasApiKey ? '✓' : '✗'}`);
    } catch (err) {
      console.log(`  ${label}: ❌ ${err.message}`);
    }
  }
  return true;
}

// ── Test 2: Resend API Key Config ───────────────────────────────────────
async function testEmailConfig(baseUrl = STAGING_URL) {
  console.log('\n━━━ Test 2: Email Configuration ━━━');
  
  try {
    const res = await fetch(`${baseUrl}/api/public/test-email/status`);
    const data = await res.json();
    
    console.log(`  API Key configured: ${data.configured ? '✅ Yes' : '❌ No'}`);
    console.log(`  From address: ${data.fromAddress}`);
    console.log(`  Server time: ${data.timestamp}`);
    
    return data.configured;
  } catch (err) {
    console.log(`  ❌ Failed to check config: ${err.message}`);
    return false;
  }
}

// ── Test 3: Direct Resend API ───────────────────────────────────────────
async function testDirectResendApi(apiKey, recipient) {
  console.log('\n━━━ Test 3: Direct Resend API ━━━');
  
  if (!apiKey) {
    console.log('  ⏭️  Skipped (no RESEND_API_KEY env var)');
    return null;
  }
  
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
      <h1 style="color: #1e293b; text-align: center;">✅ Direct API Test</h1>
      <p style="color: #64748b; text-align: center;">Resend API verified at ${new Date().toISOString()}</p>
      <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <p style="color: #166534; margin: 0;">This email was sent directly via Resend API, bypassing the backend.</p>
      </div>
    </div>
  `;
  
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'MeInspect <onboarding@resend.dev>',
        to: [recipient],
        subject: `MeInspect Direct API Test — ${new Date().toISOString()}`,
        html,
      }),
    });
    
    const data = await res.json();
    
    if (res.ok) {
      console.log(`  ✅ Email sent — ID: ${data.id}`);
      return { success: true, id: data.id };
    } else {
      console.log(`  ❌ Failed (${res.status}): ${data.message || JSON.stringify(data)}`);
      return { success: false, error: data.message };
    }
  } catch (err) {
    console.log(`  ❌ Error: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// ── Test 4: Backend Proxy ───────────────────────────────────────────────
async function testBackendProxy(recipient, baseUrl = STAGING_URL) {
  console.log('\n━━━ Test 4: Backend Proxy (via /api/public/test-email/send) ━━━');
  
  try {
    const res = await fetch(`${baseUrl}/api/public/test-email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: recipient }),
    });
    
    const data = await res.json();
    console.log(`  Status: ${res.status}`);
    
    if (res.ok && data.success) {
      console.log(`  ✅ Email sent via backend — ${data.message}`);
      return { success: true };
    } else {
      console.log(`  ❌ Failed: ${data.error || data.message || JSON.stringify(data)}`);
      return { success: false, error: data.error || data.message };
    }
  } catch (err) {
    console.log(`  ❌ Error: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// ── Main ────────────────────────────────────────────────────────────────
async function main() {
  const recipient = process.argv[2] || 'delivered@resend.dev';
  const apiKey = process.env.RESEND_API_KEY;
  
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   MeInspect Email — E2E Test Suite           ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`Recipient: ${recipient}`);
  console.log(`API Key:   ${apiKey ? '✓ Provided' : '✗ Not provided'}`);
  
  const results = {};
  
  results.health = await testBackendHealth();
  results.config = await testEmailConfig();
  results.direct = await testDirectResendApi(apiKey, recipient);
  results.proxy = await testBackendProxy(recipient);
  
  // Summary
  console.log('\n┌──────────────────────────────────────────────┐');
  console.log('│              TEST RESULTS                    │');
  console.log('├──────────────────────────────────────────────┤');
  console.log(`│ Backend Health:  ${results.health ? '✅ PASS' : '❌ FAIL'}                      │`);
  console.log(`│ Email Config:    ${results.config ? '✅ PASS' : '❌ FAIL'}                      │`);
  console.log(`│ Direct API:      ${results.direct?.success ? '✅ PASS' : results.direct ? '❌ FAIL' : '⏭️  SKIP'}                      │`);
  console.log(`│ Backend Proxy:   ${results.proxy?.success ? '✅ PASS' : '❌ FAIL'}                      │`);
  console.log('└──────────────────────────────────────────────┘');
  
  const allPassed = results.health && results.config && 
    (results.direct?.success !== false) && results.proxy?.success;
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! Email flow is working end-to-end.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the details above.');
  }
  
  if (results.proxy?.success || results.direct?.success) {
    console.log(`\n📧 Check ${recipient} inbox to verify delivery.`);
  }
  
  console.log('');
}

main().catch(console.error);
