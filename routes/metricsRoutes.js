/**
 * Metrics Routes
 * 
 * Defines the endpoint for gateway performance and system telemetry.
 * Protected by the Bearer Token authentication middleware.
 */

const express = require('express');
const router = express.Router();
const metricsManager = require('../utils/metrics');
const authenticate = require('../middleware/auth');

// GET /metrics
// Protected by the authenticate middleware
router.get('/', authenticate, (req, res) => {
  res.status(200).json(metricsManager.getMetrics());
});

module.exports = router;
