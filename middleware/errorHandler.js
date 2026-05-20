/**
 * Centralized Error Handler Middleware
 * 
 * Intercepts any synchronous or asynchronous errors thrown during request processing.
 * Maps issues like JSON syntax errors, payload limits, Axios network timeouts, 
 * or Ollama stalls directly into OpenAI-compliant error payloads.
 * Strictly hides system stack traces in production to prevent layout/vulnerability leakage.
 */

const config = require('../config/environment');

const errorHandler = (err, req, res, next) => {
  // Log the complete error stack internally on the server console
  console.error('\x1b[31m%s\x1b[0m', '[Error Caught by Middleware]:', err.stack || err.message);

  // 1. Handle JSON parsing syntax errors (e.g. malformed body)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: {
        message: 'Malformed JSON in request body.',
        type: 'invalid_request_error',
        param: null,
        code: 'malformed_json'
      }
    });
  }

  // 2. Handle Express Payload Too Large errors (HTTP 413)
  if (err.status === 413 || err.type === 'entity.too.large') {
    return res.status(413).json({
      error: {
        message: `Request payload is too large. Maximum allowed size is ${config.maxPayloadSize || '5mb'}.`,
        type: 'invalid_request_error',
        param: null,
        code: 'payload_too_large'
      }
    });
  }

  // 3. Handle Axios network / request issues (e.g. Ollama offline or timed out)
  if (err.isAxiosError) {
    const isTimeout = err.code === 'ECONNABORTED' || (err.message && err.message.toLowerCase().includes('timeout'));
    const isConnectionRefused = err.code === 'ECONNREFUSED';
    
    let message = `Ollama service error: ${err.message}`;
    let code = 'ollama_error';
    let statusCode = 502; // Bad Gateway
    
    if (isTimeout) {
      message = `Request to local Ollama timed out after ${config.ollamaTimeoutMs / 1000}s. The model may still be loading, or the prompt/context is too large.`;
      code = 'ollama_timeout';
      statusCode = 504; // Gateway Timeout
    } else if (isConnectionRefused) {
      message = `Failed to communicate with local Ollama. Please ensure Ollama is running and accessible on ${err.config?.url || config.ollamaBaseUrl}`;
      code = 'ollama_offline';
      statusCode = 503; // Service Unavailable
    }

    return res.status(statusCode).json({
      error: {
        message,
        type: 'api_connection_error',
        param: null,
        code,
        details: {
          originalError: err.message,
          ollamaStatus: err.response?.status || null
        }
      }
    });
  }

  // 4. Default Fallback 500 Internal Server Error
  const statusCode = err.status || 500;
  const errorResponse = {
    error: {
      message: err.message || 'An internal server error occurred.',
      type: 'api_error',
      param: null,
      code: err.code || 'internal_server_error'
    }
  };

  // Only expose details/stack trace if explicitly NOT in production
  if (config.nodeEnv !== 'production') {
    errorResponse.error.details = {
      stack: err.stack ? err.stack.split('\n').map(line => line.trim()) : undefined
    };
  }

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;
