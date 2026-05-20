/**
 * Authentication Middleware
 * 
 * Protects endpoints by validating the Authorization Bearer Token.
 * It compares the incoming Bearer token with the API_KEY set in .env.
 * If the key is invalid or missing, it responds with a 401 Unauthorized
 * in a structure that matches the OpenAI API error response.
 */

const config = require('../config/environment');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // 1. Check if Authorization header is present
  if (!authHeader) {
    return res.status(401).json({
      error: {
        message: 'You didn\'t provide an API key. You must provide your API key in the Authorization header, using Bearer auth (e.g. Authorization: Bearer YOUR_API_KEY).',
        type: 'invalid_request_error',
        param: null,
        code: 'missing_api_key'
      }
    });
  }

  // 2. Ensure it is a Bearer token
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({
      error: {
        message: 'Invalid Authorization header format. Format should be Bearer <API_KEY>.',
        type: 'invalid_request_error',
        param: null,
        code: 'invalid_authorization_format'
      }
    });
  }

  const token = parts[1];

  // 3. Compare with configured API key
  if (token !== config.apiKey) {
    return res.status(401).json({
      error: {
        message: 'Incorrect API key provided. Please check your credentials.',
        type: 'invalid_request_error',
        param: null,
        code: 'invalid_api_key'
      }
    });
  }

  // 4. Authorized, proceed to the next handler
  next();
};

module.exports = authenticate;
