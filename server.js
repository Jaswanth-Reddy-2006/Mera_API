/**
 * Server Entry Point
 * 
 * Boots up the HTTP server and starts listening on the configured PORT.
 * Gracefully handles system shutdowns and exceptions.
 */

const http = require('http');
const app = require('./app');
const config = require('./config/environment');

const PORT = config.port;

// Create HTTP server explicitly to attach robust error handlers
const server = http.createServer(app);

// Handle server startup errors gracefully
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('\n\x1b[33m%s\x1b[0m', '==================================================');
    console.error('\x1b[31m%s\x1b[0m', `❌ PORT CONFLICT DETECTED: Port ${PORT} is already in use.`);
    console.error('\x1b[33m%s\x1b[0m', `💡 Mera API is already running or another application is using port ${PORT}.`);
    console.error('\x1b[33m%s\x1b[0m', '👉 To free the port on Windows, copy-paste and run:');
    console.error('\x1b[36m%s\x1b[0m', `   netstat -ano | findstr :${PORT}`);
    console.error('\x1b[36m%s\x1b[0m', '   taskkill /F /PID <PID_FROM_ABOVE>');
    console.error('\x1b[33m%s\x1b[0m', `👉 Or, change the PORT variable in your .env file.`);
    console.error('\x1b[33m%s\x1b[0m', '==================================================\n');
    
    // Exit with status 0 so nodemon recognizes a clean, managed exit rather than "app crashed"
    process.exit(0);
  } else {
    console.error('\x1b[31m%s\x1b[0m', 'SERVER FATAL ERROR:', err.message);
    process.exit(1);
  }
});

// Start listening
server.listen(PORT, () => {
  console.log('==================================================');
  console.log(`🚀 Mera API Server running in [${config.nodeEnv}] mode`);
  console.log(`📡 Listening on: http://localhost:${PORT}`);
  console.log(`🔗 Target Ollama: ${config.ollamaBaseUrl} (Model: ${config.ollamaModel})`);
  console.log(`🔑 Authorized API Key set: ${config.apiKey ? 'YES' : 'NO (Check .env)'}`);
  console.log('==================================================');
});

// Handle unhandled promise rejections (e.g. database disconnects or uncaught async bugs)
process.on('unhandledRejection', (err) => {
  console.error('\x1b[31m%s\x1b[0m', 'UNHANDLED REJECTION! Shutting down server...');
  console.error(err.stack || err.message);
  if (server && server.listening) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('\x1b[31m%s\x1b[0m', 'UNCAUGHT EXCEPTION! Shutting down server...');
  console.error(err.stack || err.message);
  if (server && server.listening) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Graceful termination for process signals (e.g. Docker container stop, nodemon restart)
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  if (server && server.listening) {
    server.close(() => {
      console.log('💤 Process terminated.');
    });
  } else {
    console.log('💤 Process terminated.');
  }
});

