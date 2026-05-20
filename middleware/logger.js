/**
 * Logging Middleware
 * 
 * A high-precision, production-grade HTTP request logger that prints the 
 * request method, original path, response status code, complete request latency,
 * and the specific local Ollama inference execution duration.
 * Strictly avoids logging sensitive customer tokens or authorization Bearer headers.
 */

const logger = (req, res, next) => {
  const start = Date.now();
  const { method, originalUrl } = req;

  // Function to run once the response is finished sending
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    
    // Choose console colors based on status code
    let color = '\x1b[32m'; // Green for 2xx
    if (statusCode >= 300 && statusCode < 400) {
      color = '\x1b[36m'; // Cyan for redirect
    } else if (statusCode >= 400 && statusCode < 500) {
      color = '\x1b[33m'; // Yellow for 4xx
    } else if (statusCode >= 500) {
      color = '\x1b[31m'; // Red for 5xx
    }

    const timestamp = new Date().toISOString();
    
    // Extract Ollama duration if attached by the controller
    const ollamaDetails = req.ollamaDuration 
      ? ` (Ollama: ${req.ollamaDuration}ms${req.isStreaming ? ' TTFT' : ''})` 
      : '';

    console.log(
      `[${timestamp}] ${method} ${originalUrl} - ${color}${statusCode}\x1b[0m in ${duration}ms${ollamaDetails}`
    );
  });

  next();
};

module.exports = logger;
