/**
 * Mera API Client Fetch Example
 * 
 * An example frontend/backend script that implements native JS fetch to send 
 * OpenAI-compatible requests to your Mera API backend server.
 * 
 * Run this example directly using: node examples/client-fetch.js
 */

const API_URL = 'http://localhost:5000/v1/chat/completions';
const API_KEY = 'sk_mera_api_123456789_prod_key'; // Configured in your .env

async function testChatCompletion() {
  const requestPayload = {
    model: 'llama3', // Passes target model to Ollama
    messages: [
      {
        role: 'system',
        content: 'You are a poetic coding assistant.'
      },
      {
        role: 'user',
        content: 'Write a four-line poem about debugging JavaScript.'
      }
    ]
  };

  try {
    console.log('Sending request to Mera API...');
    const startTime = Date.now();

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(requestPayload)
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Parse response
    const data = await response.json();

    if (!response.ok) {
      console.error(`\n❌ Request failed with status ${response.status}:`);
      console.error(JSON.stringify(data, null, 2));
      return;
    }

    console.log(`\n✅ Response received successfully in ${duration}s!\n`);
    console.log('--- Response Details ---');
    console.log(`ID: ${data.id}`);
    console.log(`Model Used: ${data.model}`);
    console.log(`Prompt Tokens: ${data.usage.prompt_tokens}`);
    console.log(`Completion Tokens: ${data.usage.completion_tokens}`);
    console.log(`Total Tokens: ${data.usage.total_tokens}`);
    console.log('\n--- Assistant Output ---');
    console.log(data.choices[0].message.content);
    console.log('------------------------');

  } catch (error) {
    console.error('\n❌ Network or client error occurred:', error.message);
  }
}

// Execute the test
testChatCompletion();
