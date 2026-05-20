/**
 * Chat Completions Routes
 * 
 * Defines the endpoint structure for OpenAI-compatible chat generations.
 * Maps POST /v1/chat/completions to the ChatController and protects it with
 * our Bearer Token authentication middleware.
 */

const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authenticate = require('../middleware/auth');

// POST /v1/chat/completions
// Protected by the authenticate middleware
router.post('/completions', authenticate, chatController.handleChatCompletion);

module.exports = router;
