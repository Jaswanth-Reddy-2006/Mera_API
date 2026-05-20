/**
 * E2E Validation Script for Advanced Streaming & Telemetry Metrics
 * 
 * Verifies:
 * 1. OpenAI-Compatible SSE Streaming (stream: true)
 * 2. Multi-turn Chat Context Preservation (/api/chat integration)
 * 3. Secured Centralized System Telemetry (/metrics)
 * 
 * Run using: node examples/test-streaming-metrics.js
 */

const path = require('path');

// Load environment variables dynamically
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const BACKEND_PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
const BASE_URL = `http://localhost:${BACKEND_PORT}`;
const API_KEY = process.env.API_KEY || 'sk_private_gateway_9f81a7b63f25c71d882194c03b1fe8f0a0d4c8e762c9012a65b0c9535e076fb8';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m'
};

function printHeader(text) {
  console.log(`\n${colors.bold}${colors.magenta}=== ${text} ===${colors.reset}`);
}

function printPass(text) {
  console.log(`${colors.green}✓ PASS: ${text}${colors.reset}`);
}

function printFail(text, error = '') {
  console.log(`${colors.red}✗ FAIL: ${text} ${error ? `(${error})` : ''}${colors.reset}`);
}

async function testStreaming() {
  printHeader('TEST 1: Server-Sent Events (SSE) Streaming Completion');
  
  const startTime = Date.now();
  let firstTokenTime = null;
  let chunkCount = 0;
  let completeResponse = '';

  try {
    const res = await fetch(`${BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Explain string theory in exactly three short sentences.' }],
        stream: true,
        temperature: 0.7
      })
    });

    if (res.status !== 200) {
      throw new Error(`Expected HTTP 200, got ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    console.log(`${colors.cyan}--- Starting Stream Processing ---${colors.reset}`);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          
          if (dataStr === '[DONE]') {
            console.log(`\n${colors.yellow}[DONE Signal Received]${colors.reset}`);
            continue;
          }

          try {
            const parsed = JSON.parse(dataStr);
            chunkCount++;

            if (!firstTokenTime) {
              firstTokenTime = Date.now() - startTime;
              console.log(`${colors.green}[First Token Received in ${firstTokenTime}ms]${colors.reset}`);
            }

            // OpenAI structure assertions
            if (parsed.object !== 'chat.completion.chunk') {
              printFail(`Expected object: 'chat.completion.chunk', got '${parsed.object}'`);
            }

            const content = parsed.choices[0].delta?.content || '';
            completeResponse += content;
            process.stdout.write(content);
          } catch (e) {
            console.error('\nFailed to parse SSE line:', line, e);
          }
        }
      }
    }

    console.log(`\n${colors.cyan}----------------------------------${colors.reset}`);
    const duration = Date.now() - startTime;

    if (chunkCount > 0 && completeResponse.length > 0) {
      printPass(`Streaming Test Completed successfully!`);
      console.log(`- Time to First Token (TTFT): ${firstTokenTime}ms`);
      console.log(`- Total Stream Duration: ${duration}ms`);
      console.log(`- Evaluated Chunk count: ${chunkCount}`);
      console.log(`- Response Content: "${completeResponse.trim()}"`);
      return true;
    } else {
      printFail('Streaming received no valid token chunks or empty content');
      return false;
    }
  } catch (err) {
    printFail('Streaming Test Crashed', err.message);
    return false;
  }
}

async function testMultiTurnContext() {
  printHeader('TEST 2: Native Multi-Turn Conversation Context Preservation');
  
  const conversation = [
    { role: 'user', content: 'My favorite color is emerald green.' },
    { role: 'assistant', content: 'Understood! Your favorite color is emerald green.' },
    { role: 'user', content: 'Explain why my favorite color is special in one sentence, making sure to explicitly mention what my favorite color is.' }
  ];

  try {
    const startTime = Date.now();
    const res = await fetch(`${BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        messages: conversation,
        stream: false,
        temperature: 0.2 // Lower temp for factual recall
      })
    });

    const data = await res.json();
    const duration = Date.now() - startTime;

    if (res.status === 200 && data.choices && data.choices[0].message?.content) {
      const reply = data.choices[0].message.content.trim();
      console.log(`${colors.cyan}Assistant Reply:${colors.reset} "${reply}"`);
      
      const containsColor = reply.toLowerCase().includes('emerald') || reply.toLowerCase().includes('green');
      if (containsColor) {
        printPass(`Context preserved successfully in ${duration}ms! Llama 3 successfully recalled the secret context.`);
        return true;
      } else {
        printFail('Llama 3 did not recall the favorite color from the conversation history', reply);
        return false;
      }
    } else {
      printFail(`Multi-Turn query failed. Code: ${res.status}`);
      return false;
    }
  } catch (err) {
    printFail('Multi-turn Context test crashed', err.message);
    return false;
  }
}

async function testTelemetryMetrics() {
  printHeader('TEST 3: Secured Centralized System Telemetry (/metrics)');

  try {
    // 1. First verify it is protected by authentications
    const unauthorizedRes = await fetch(`${BASE_URL}/metrics`);
    if (unauthorizedRes.status !== 401) {
      printFail(`Expected HTTP 401 Unauthorized for missing token on metrics, got ${unauthorizedRes.status}`);
      return false;
    }
    printPass('Correctly blocked anonymous access to /metrics endpoint');

    // 2. Query with correct token
    const res = await fetch(`${BASE_URL}/metrics`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });

    if (res.status !== 200) {
      throw new Error(`Expected HTTP 200, got ${res.status}`);
    }

    const metrics = await res.json();
    printPass('Successfully fetched telemetry metrics profile:');
    console.log(JSON.stringify(metrics, null, 2));

    // Verify presence of structural metrics fields
    const hasGateway = metrics.gateway && typeof metrics.gateway.total_requests === 'number';
    const hasTokens = metrics.tokens && typeof metrics.tokens.total_tokens === 'number';
    const hasPerformance = metrics.performance && typeof metrics.performance.average_latency_ms === 'number';
    const hasSystem = metrics.system && metrics.system.process_memory;

    if (hasGateway && hasTokens && hasPerformance && hasSystem) {
      printPass('Metrics payload strictly conforms to System Telemetry specs!');
      return true;
    } else {
      printFail('Metrics schema is missing required metrics clusters');
      return false;
    }
  } catch (err) {
    printFail('Telemetry metrics test crashed', err.message);
    return false;
  }
}

async function runTests() {
  console.log(`${colors.bold}${colors.magenta}=== ADVANCED PRIVATE GATEWAY UPGRADE VALIDATION ===${colors.reset}`);
  
  // Make sure server is reachable
  try {
    const probe = await fetch(`${BASE_URL}/health`);
    if (!probe.ok && probe.status !== 207) {
      throw new Error(`Server returned ${probe.status}`);
    }
  } catch (e) {
    console.error(`${colors.red}❌ Error: Local Express backend is NOT running on port 5000.${colors.reset}`);
    console.error('Please run "npm run dev" in another terminal first before executing this test.');
    process.exit(1);
  }

  const streamOk = await testStreaming();
  const contextOk = await testMultiTurnContext();
  const metricsOk = await testTelemetryMetrics();

  console.log('\n--- Advanced E2E Validation Summary ---');
  console.log(`- SSE Streaming:   ${streamOk ? colors.green + 'PASSED' : colors.red + 'FAILED'}${colors.reset}`);
  console.log(`- Multi-turn Context: ${contextOk ? colors.green + 'PASSED' : colors.red + 'FAILED'}${colors.reset}`);
  console.log(`- Telemetry Metrics:  ${metricsOk ? colors.green + 'PASSED' : colors.red + 'FAILED'}${colors.reset}`);
  console.log('----------------------------------------\n');

  if (streamOk && contextOk && metricsOk) {
    console.log(`${colors.bold}${colors.green}🎉 ALL UPGRADE CRITERIA PASSED! PRODUCTION READY.${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.bold}${colors.red}❌ SOME UPGRADES FAILED VALIDATION. PLEASE REVIEW DETAILS.${colors.reset}\n`);
    process.exit(1);
  }
}

runTests();
