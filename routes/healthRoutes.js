/**
 * Health Route
 * 
 * Exposes a public GET /health route to check if the Express backend
 * is online, inspect container/host resource utilization, and perform
 * comprehensive live sub-system checks against the local Ollama daemon.
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const config = require('../config/environment');

/**
 * Formats seconds into a human-readable duration string.
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);
  return parts.join(' ');
}

router.get('/', async (req, res) => {
  const uptimeSeconds = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  const healthStatus = {
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(uptimeSeconds),
    uptime_formatted: formatUptime(uptimeSeconds),
    environment: config.nodeEnv,
    system: {
      platform: process.platform,
      arch: process.arch,
      node_version: process.version,
      memory: {
        rss_mb: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100,
        heap_total_mb: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
        heap_used_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100
      }
    },
    ollama: {
      status: 'UNKNOWN',
      baseUrl: config.ollamaBaseUrl,
      configuredModel: config.ollamaModel,
      modelAvailable: false
    }
  };

  try {
    // 1. Check if the local Ollama server is alive
    const ollamaCheck = await axios.get(config.ollamaBaseUrl, { timeout: 3000 });
    
    if (ollamaCheck.status === 200) {
      healthStatus.ollama.status = 'CONNECTED';
      
      // 2. Fetch list of local tags/models to verify download status
      try {
        const tagsResponse = await axios.get(`${config.ollamaBaseUrl}/api/tags`, { timeout: 3000 });
        const modelsList = tagsResponse.data.models || [];
        
        // Match name or name:latest or model prefix
        const targetModel = config.ollamaModel.toLowerCase();
        const found = modelsList.some(m => {
          const name = m.name.toLowerCase();
          return name === targetModel || name === `${targetModel}:latest` || targetModel === name.split(':')[0];
        });

        healthStatus.ollama.modelAvailable = found;
        if (!found) {
          healthStatus.ollama.status = 'DEGRADED';
          healthStatus.ollama.message = `Configured model "${config.ollamaModel}" not found on Ollama. Please run "ollama pull ${config.ollamaModel}".`;
        }
      } catch (tagErr) {
        healthStatus.ollama.modelAvailable = false;
        healthStatus.ollama.status = 'DEGRADED';
        healthStatus.ollama.message = `Connected to Ollama base endpoint, but failed to fetch model tags: ${tagErr.message}`;
      }
    } else {
      healthStatus.ollama.status = 'DEGRADED';
    }
  } catch (error) {
    healthStatus.ollama.status = 'DISCONNECTED';
    healthStatus.ollama.error = error.message;
  }

  // 3. Determine overall HTTP status code
  let httpCode = 200;
  if (healthStatus.ollama.status === 'DISCONNECTED') {
    httpCode = 503; // Service Unavailable
    healthStatus.status = 'DEGRADED';
  } else if (healthStatus.ollama.status === 'DEGRADED') {
    httpCode = 207; // Multi-Status (Express is UP, but Ollama is missing the model/degraded)
  }

  res.status(httpCode).json(healthStatus);
});

module.exports = router;
