/**
 * Express Application Setup
 * 
 * Configures the production-hardened Express middleware pipeline:
 * - Helmet security headers (prevents clickjacking, content sniffing, XSS, etc.)
 * - Gzip payload compression
 * - Environment-controlled CORS origins
 * - Configurable request body limit (denies oversized payloads)
 * - Custom request logging
 * - Routes for health checks, telemetry, and chat completions
 * - Global centralized error handling (last in pipeline)
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const config = require('./config/environment');

// Route Modules
const healthRoutes = require('./routes/healthRoutes');
const chatRoutes = require('./routes/chatRoutes');
const metricsRoutes = require('./routes/metricsRoutes');

const app = express();

// 1. Trust Proxy Configuration (Crucial for deployments behind Nginx/ELB)
app.set('trust proxy', config.trustProxy);

// 2. Helmet Security Headers (Production Hardening)
app.use(helmet());

// 3. Enable Gzip Compression
app.use(compression());

// 4. Secure CORS Configuration (Environment-Controlled Origins)
const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server or script requests with no origin (e.g., cURL, Postman, AI Agents)
    if (!origin) return callback(null, true);
    
    // Check if the origin is explicitly authorized
    if (config.allowedOrigins.includes(origin) || config.allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    
    // In development mode, dynamically authorize localhost development environments
    if (config.nodeEnv === 'development') {
      const isLocalhost = origin.startsWith('http://localhost:') || 
                          origin.startsWith('http://127.0.0.1:') || 
                          origin.startsWith('https://localhost:') || 
                          origin.startsWith('https://127.0.0.1:');
      if (isLocalhost) {
        return callback(null, true);
      }
    }
    
    const corsError = new Error(`The CORS policy for this gateway rejects connections from Origin: ${origin}`);
    corsError.status = 403;
    corsError.code = 'cors_origin_rejected';
    return callback(corsError, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With']
};
app.use(cors(corsOptions));

// 5. Configurable JSON Parser Limit (Protects against resource consumption attacks)
app.use(express.json({ limit: config.maxPayloadSize }));

// 6. Custom Console Logger (Logs durations, paths, statuses, and Ollama latencies)
app.use(logger);

// 7. Route Registration
app.use('/health', healthRoutes);
app.use('/v1/chat', chatRoutes);
app.use('/metrics', metricsRoutes);

// 8. Route fallback (404 Not Found)
app.use((req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  error.code = 'route_not_found';
  next(error);
});

// 9. Centralized global error handling middleware
app.use(errorHandler);

module.exports = app;
