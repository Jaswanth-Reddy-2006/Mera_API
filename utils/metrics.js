/**
 * Centralized Telemetry & Metrics Manager
 * 
 * Aggregates in-memory usage metrics for request volume, streaming vs. non-streaming,
 * token consumption, processing latencies, and error occurrences.
 */

const os = require('os');

class MetricsManager {
  constructor() {
    this.startTime = Date.now();
    this.totalRequests = 0;
    this.streamingRequests = 0;
    this.nonStreamingRequests = 0;
    this.failedRequests = 0;
    this.promptTokens = 0;
    this.completionTokens = 0;
    this.totalTokens = 0;
    this.totalLatencyMs = 0;
    this.requestsPerModel = {};
  }

  /**
   * Tracks a completed or failed request.
   * 
   * @param {Object} data
   * @param {string} data.model - The model requested
   * @param {boolean} data.stream - Whether the request was streamed
   * @param {number} data.latencyMs - The time taken to process the request
   * @param {boolean} data.success - Whether the request succeeded
   * @param {number} [data.promptTokens] - Count of prompt tokens
   * @param {number} [data.completionTokens] - Count of completion tokens
   */
  trackRequest({ model, stream, latencyMs, success, promptTokens = 0, completionTokens = 0 }) {
    this.totalRequests += 1;
    
    if (stream) {
      this.streamingRequests += 1;
    } else {
      this.nonStreamingRequests += 1;
    }

    if (!success) {
      this.failedRequests += 1;
    }

    if (model) {
      this.requestsPerModel[model] = (this.requestsPerModel[model] || 0) + 1;
    }

    this.promptTokens += promptTokens;
    this.completionTokens += completionTokens;
    this.totalTokens += (promptTokens + completionTokens);
    this.totalLatencyMs += latencyMs;
  }

  /**
   * Returns a complete metrics profile including system resource utilization.
   * 
   * @returns {Object} JSON metrics payload
   */
  getMetrics() {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const avgLatencyMs = this.totalRequests > 0 ? Math.round(this.totalLatencyMs / this.totalRequests) : 0;
    const memoryUsage = process.memoryUsage();

    return {
      gateway: {
        uptime_seconds: uptimeSeconds,
        uptime_formatted: this.formatUptime(uptimeSeconds),
        start_time: new Date(this.startTime).toISOString(),
        total_requests: this.totalRequests,
        streaming_requests: this.streamingRequests,
        non_streaming_requests: this.nonStreamingRequests,
        failed_requests: this.failedRequests,
        success_rate_percent: this.totalRequests > 0 ? parseFloat(((this.totalRequests - this.failedRequests) / this.totalRequests * 100).toFixed(2)) : 100,
        requests_per_model: this.requestsPerModel
      },
      tokens: {
        total_prompt_tokens: this.promptTokens,
        total_completion_tokens: this.completionTokens,
        total_tokens: this.totalTokens,
        tokens_per_second: uptimeSeconds > 0 ? parseFloat((this.totalTokens / uptimeSeconds).toFixed(2)) : 0
      },
      performance: {
        total_latency_ms: this.totalLatencyMs,
        average_latency_ms: avgLatencyMs
      },
      system: {
        platform: process.platform,
        arch: process.arch,
        node_version: process.version,
        cpu_cores: os.cpus().length,
        free_memory_bytes: os.freemem(),
        total_memory_bytes: os.totalmem(),
        process_memory: {
          rss: memoryUsage.rss,
          heap_total: memoryUsage.heapTotal,
          heap_used: memoryUsage.heapUsed,
          external: memoryUsage.external
        },
        load_average: os.loadavg() // [1 min, 5 min, 15 min]
      }
    };
  }

  /**
   * Utility to format duration into a human-readable string.
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);

    return parts.join(' ');
  }
}

module.exports = new MetricsManager();
