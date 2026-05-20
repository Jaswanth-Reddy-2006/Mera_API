/**
 * Environment Configuration
 * 
 * This module loads environment variables from the .env file using dotenv,
 * performs rigorous security validations, and assigns defaults. 
 * This prevents unexpected runtime crashes and enforces best practices.
 */

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const apiKey = process.env.API_KEY;

// 1. Strict Startup API Key Validation
if (!apiKey || apiKey.trim() === '') {
  console.error('\x1b[31m%s\x1b[0m', '==================================================');
  console.error('\x1b[31m%s\x1b[0m', '🚨 CRITICAL ENVIRONMENT ERROR: API_KEY is not defined!');
  console.error('\x1b[33m%s\x1b[0m', 'A private personal AI gateway must be secured by an API key.');
  console.error('\x1b[33m%s\x1b[0m', 'Please create a .env file and define a secure API_KEY.');
  console.error('\x1b[31m%s\x1b[0m', '==================================================');
  process.exit(1);
}

// 2. Reject weak or default placeholders in production mode
const defaultPlaceholders = [
  'your_secure_api_key_here',
  'sk_mera_api_123456789_placeholder',
  'sk_mera_api_123456789_prod_key',
  'placeholder'
];
if (nodeEnv === 'production' && defaultPlaceholders.includes(apiKey.toLowerCase())) {
  console.error('\x1b[31m%s\x1b[0m', '==================================================');
  console.error('\x1b[31m%s\x1b[0m', '🚨 SECURITY ERROR: Insecure API_KEY placeholder in PRODUCTION mode!');
  console.error('\x1b[33m%s\x1b[0m', 'For security, you must generate a secure, unique API key.');
  console.error('\x1b[33m%s\x1b[0m', 'Generate one using Node.js:');
  console.error('\x1b[32m%s\x1b[0m', '   node -e "console.log(\'sk_\' + require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  console.error('\x1b[31m%s\x1b[0m', '==================================================');
  process.exit(1);
}

// 3. CORS Origins Parsing
const rawOrigins = process.env.ALLOWED_ORIGINS || '';
const allowedOrigins = rawOrigins
  ? rawOrigins.split(',').map(origin => origin.trim()).filter(Boolean)
  : [];

// Configuration Object
const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: nodeEnv,
  apiKey: apiKey,
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'llama3',
  ollamaNumCtx: parseInt(process.env.OLLAMA_NUM_CTX || '8192', 10),
  ollamaTimeoutMs: parseInt(process.env.OLLAMA_TIMEOUT_MS || '120000', 10),
  maxPayloadSize: process.env.MAX_PAYLOAD_SIZE || '5mb',
  allowedOrigins: allowedOrigins,
  trustProxy: process.env.TRUST_PROXY || 'loopback',
  debug: process.env.DEBUG === 'true'
};

module.exports = config;
