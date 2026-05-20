/**
 * Ollama Service
 * 
 * Handles all direct HTTP communication with the local Ollama API server.
 * Uses Axios to send generating prompts and receives completions back.
 * Optimized for multi-turn chat completions (/api/chat) and streaming (SSE).
 */

const axios = require('axios');
const config = require('../config/environment');

class OllamaService {
  /**
   * Generates a text chat completion for a given message history using local Ollama.
   * Uses Ollama's '/api/chat' endpoint (non-streaming).
   * 
   * @param {Array<Object>} messages - The complete conversation history.
   * @param {Object} [options] - Generation options (model, temperature, stop, max_tokens).
   * @returns {Promise<Object>} The raw JSON response from Ollama.
   */
  async generateChatCompletion(messages, options = {}) {
    const {
      model = config.ollamaModel,
      temperature,
      top_p,
      max_tokens,
      max_completion_tokens,
      stop
    } = options;

    const url = `${config.ollamaBaseUrl}/api/chat`;

    // Map OpenAI standard parameters to Ollama-specific options
    const ollamaOptions = {
      num_ctx: config.ollamaNumCtx
    };
    if (temperature !== undefined) ollamaOptions.temperature = temperature;
    if (top_p !== undefined) ollamaOptions.top_p = top_p;
    
    // max_tokens or max_completion_tokens maps to num_predict
    const limit = max_tokens !== undefined ? max_tokens : max_completion_tokens;
    if (limit !== undefined) ollamaOptions.num_predict = limit;
    
    if (stop !== undefined) ollamaOptions.stop = stop;

    const payload = {
      model: model,
      messages: messages,
      stream: false,
      options: ollamaOptions
    };

    if (config.debug) {
      console.log(`[DEBUG] Exact Payload Sent to Ollama Chat:\n${JSON.stringify(payload, null, 2)}`);
    }

    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: config.ollamaTimeoutMs
    });

    return response.data;
  }

  /**
   * Initiates a streaming chat completion request using local Ollama.
   * Uses Ollama's '/api/chat' endpoint with stream: true.
   * 
   * @param {Array<Object>} messages - The complete conversation history.
   * @param {Object} [options] - Generation options.
   * @param {AbortSignal} [abortSignal] - Signal to abort the outgoing HTTP request.
   * @returns {Promise<stream.Readable>} Readable stream from Axios.
   */
  async streamChatCompletion(messages, options = {}, abortSignal = null) {
    const {
      model = config.ollamaModel,
      temperature,
      top_p,
      max_tokens,
      max_completion_tokens,
      stop
    } = options;

    const url = `${config.ollamaBaseUrl}/api/chat`;

    // Map OpenAI standard parameters to Ollama-specific options
    const ollamaOptions = {
      num_ctx: config.ollamaNumCtx
    };
    if (temperature !== undefined) ollamaOptions.temperature = temperature;
    if (top_p !== undefined) ollamaOptions.top_p = top_p;
    
    // max_tokens or max_completion_tokens maps to num_predict
    const limit = max_tokens !== undefined ? max_tokens : max_completion_tokens;
    if (limit !== undefined) ollamaOptions.num_predict = limit;
    
    if (stop !== undefined) ollamaOptions.stop = stop;

    const payload = {
      model: model,
      messages: messages,
      stream: true,
      options: ollamaOptions
    };

    if (config.debug) {
      console.log(`[DEBUG] Exact Streaming Payload Sent to Ollama Chat:\n${JSON.stringify(payload, null, 2)}`);
    }

    const axiosOptions = {
      headers: {
        'Content-Type': 'application/json'
      },
      responseType: 'stream',
      timeout: config.ollamaTimeoutMs
    };

    if (abortSignal) {
      axiosOptions.signal = abortSignal;
    }

    const response = await axios.post(url, payload, axiosOptions);
    return response.data;
  }
}

module.exports = new OllamaService();
