/**
 * Chat Controller
 * 
 * Intercepts requests to the OpenAI-compatible `/v1/chat/completions` endpoint.
 * Supports standard JSON responses and progressive token SSE streaming.
 * Integrates with centralized telemetry to monitor system load and performance.
 */

const ollamaService = require('../services/ollamaService');
const config = require('../config/environment');
const metricsManager = require('../utils/metrics');

class ChatController {
  constructor() {
    this.handleChatCompletion = this.handleChatCompletion.bind(this);
  }

  /**
   * Handle the Chat Completions POST request.
   */
  async handleChatCompletion(req, res, next) {
    const startTime = Date.now();
    const { 
      messages, 
      model, 
      stream = false, 
      temperature, 
      top_p, 
      max_tokens, 
      max_completion_tokens, 
      stop 
    } = req.body;

    const requestedModel = model || config.ollamaModel;
    if (config.debug) {
      console.log(`\n--- [Mera API Request] Received at ${new Date().toISOString()} ---`);
      console.log(`[Request Details] Model: "${requestedModel}", Stream: ${stream}`);
    }

    // 1. Validation: messages array is required and must not be empty
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      const errorResponse = {
        error: {
          message: "Field 'messages' is required and must be a non-empty array.",
          type: "invalid_request_error",
          param: "messages",
          code: "empty_messages"
        }
      };
      
      metricsManager.trackRequest({
        model: requestedModel,
        stream,
        latencyMs: Date.now() - startTime,
        success: false
      });

      return res.status(400).json(errorResponse);
    }

    // 1.1 Validation: ensure the user message contains content
    let latestUserMessage = null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        latestUserMessage = messages[i];
        break;
      }
    }
    if (!latestUserMessage) {
      latestUserMessage = messages[messages.length - 1];
    }

    if (!latestUserMessage || !latestUserMessage.content || latestUserMessage.content.trim() === '') {
      const errorResponse = {
        error: {
          message: "The extracted user message does not contain valid content.",
          type: "invalid_request_error",
          param: "messages",
          code: "empty_message_content"
        }
      };

      metricsManager.trackRequest({
        model: requestedModel,
        stream,
        latencyMs: Date.now() - startTime,
        success: false
      });

      return res.status(400).json(errorResponse);
    }

    // Prepare generation options for Ollama
    const generationOptions = {
      model: requestedModel,
      temperature,
      top_p,
      max_tokens,
      max_completion_tokens,
      stop
    };

    // Generate OpenAI-style mock unique ID
    const id = `chatcmpl-${Math.random().toString(36).substring(2, 15)}`;
    const createdEpoch = Math.floor(Date.now() / 1000);

    // 2. Stream Pipeline Setup
    if (stream) {
      const abortController = new AbortController();
      let streamData = null;
      let hasReceivedFirstToken = false;

      // Handle early client disconnect to abort processing
      res.on('close', () => {
        if (!res.writableEnded) {
          if (config.debug) {
            console.log(`[Mera API Stream] Client disconnected. Aborting Ollama inference...`);
          }
          abortController.abort();
          
          metricsManager.trackRequest({
            model: requestedModel,
            stream: true,
            latencyMs: Date.now() - startTime,
            success: false
          });
        }
      });

      try {
        // Setup SSE Headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        streamData = await ollamaService.streamChatCompletion(messages, generationOptions, abortController.signal);

        let buffer = '';
        let promptTokens = 0;
        let completionTokens = 0;

        streamData.on('data', (chunk) => {
          // Record Time-To-First-Token (TTFT) for log reporting
          if (!hasReceivedFirstToken) {
            hasReceivedFirstToken = true;
            req.isStreaming = true;
            req.ollamaDuration = Date.now() - startTime;
          }

          buffer += chunk.toString('utf8');
          const lines = buffer.split('\n');
          // Save the last incomplete line
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line);
              
              if (parsed.done) {
                promptTokens = parsed.prompt_eval_count || 0;
                completionTokens = parsed.eval_count || 0;
              }

              const content = parsed.message?.content || '';

              const chunkResponse = {
                id,
                object: 'chat.completion.chunk',
                created: createdEpoch,
                model: requestedModel,
                choices: [
                  {
                    index: 0,
                    delta: {
                      content: content
                    },
                    logprobs: null,
                    finish_reason: parsed.done ? 'stop' : null
                  }
                ]
              };

              res.write(`data: ${JSON.stringify(chunkResponse)}\n\n`);
            } catch (err) {
              console.error(`[Streaming Error] Failed to parse SSE line:`, err, line);
            }
          }
        });

        streamData.on('end', () => {
          // Process remaining content in buffer if any
          if (buffer.trim()) {
            try {
              const parsed = JSON.parse(buffer);
              if (parsed.done) {
                promptTokens = parsed.prompt_eval_count || 0;
                completionTokens = parsed.eval_count || 0;
              }
              const content = parsed.message?.content || '';
              const chunkResponse = {
                id,
                object: 'chat.completion.chunk',
                created: createdEpoch,
                model: requestedModel,
                choices: [
                  {
                    index: 0,
                    delta: { content },
                    logprobs: null,
                    finish_reason: parsed.done ? 'stop' : null
                  }
                ]
              };
              res.write(`data: ${JSON.stringify(chunkResponse)}\n\n`);
            } catch (err) {
              // Ignore
            }
          }

          res.write('data: [DONE]\n\n');
          res.end();

          const duration = Date.now() - startTime;
          if (config.debug) {
            console.log(`[Mera API Success] Stream finished in ${duration}ms. PromptTokens=${promptTokens}, CompletionTokens=${completionTokens}`);
          }
          
          metricsManager.trackRequest({
            model: requestedModel,
            stream: true,
            latencyMs: duration,
            success: true,
            promptTokens,
            completionTokens
          });
        });

        streamData.on('error', (streamErr) => {
          // If the error was an intentional abort, ignore
          if (abortController.signal.aborted) return;

          console.error('[Mera API Stream Error] Axios stream error:', streamErr);
          const errorResponse = {
            error: {
              message: streamErr.message || 'Stream processing failed.',
              type: 'api_error',
              param: null,
              code: 'stream_processing_error'
            }
          };
          res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
          res.end();

          metricsManager.trackRequest({
            model: requestedModel,
            stream: true,
            latencyMs: Date.now() - startTime,
            success: false
          });
        });

      } catch (err) {
        if (abortController.signal.aborted) return;
        
        console.error('[Mera API Stream Start Fail]', err.message);
        
        metricsManager.trackRequest({
          model: requestedModel,
          stream: true,
          latencyMs: Date.now() - startTime,
          success: false
        });

        // If headers are not sent, forward to centralized errorHandler
        if (!res.headersSent) {
          return next(err);
        } else {
          const errorResponse = {
            error: {
              message: err.message || 'Stream generation initialization failed.',
              type: 'api_error',
              param: null,
              code: 'stream_init_error'
            }
          };
          res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
          res.end();
        }
      }

    } else {
      // 3. Non-Streaming Pipeline Setup
      try {
        const ollamaStart = Date.now();
        const ollamaResponse = await ollamaService.generateChatCompletion(messages, generationOptions);
        const ollamaDuration = Date.now() - ollamaStart;
        
        // Attach Ollama inference duration to the request context
        req.ollamaDuration = ollamaDuration;
        req.isStreaming = false;

        const duration = Date.now() - startTime;
        if (config.debug) {
          console.log(`[Ollama Response Received] Non-streaming completed in ${duration}ms`);
          console.log(`[DEBUG] Exact Response Returned from Ollama:\n${JSON.stringify(ollamaResponse, null, 2)}`);
        }

        const promptTokens = ollamaResponse.prompt_eval_count || 0;
        const completionTokens = ollamaResponse.eval_count || 0;
        const totalTokens = promptTokens + completionTokens;

        const formattedResponse = {
          id,
          object: 'chat.completion',
          created: createdEpoch,
          model: requestedModel,
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: ollamaResponse.message?.content || ''
              },
              logprobs: null,
              finish_reason: ollamaResponse.done ? 'stop' : 'length'
            }
          ],
          usage: {
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: totalTokens
          }
        };

        metricsManager.trackRequest({
          model: requestedModel,
          stream: false,
          latencyMs: duration,
          success: true,
          promptTokens,
          completionTokens
        });

        return res.status(200).json(formattedResponse);

      } catch (err) {
        metricsManager.trackRequest({
          model: requestedModel,
          stream: false,
          latencyMs: Date.now() - startTime,
          success: false
        });
        
        next(err);
      }
    }
  }
}

module.exports = new ChatController();
