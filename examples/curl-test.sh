#!/bin/bash

# =================================================================================
# Mera API curl Test Request
# 
# This script sends an OpenAI-style chat completions POST request to your locally
# running Mera API Express backend, which redirects the request to local Ollama.
# =================================================================================

# Colors for presentation
GREEN='\033[0;32m'
NC='\033[0;30m' # No Color

echo -e "${GREEN}Testing health endpoint first (GET /health):${NC}"
curl -X GET http://localhost:5000/health
echo -e "\n\n"

echo -e "${GREEN}Sending chat completion request (POST /v1/chat/completions):${NC}"
curl -X POST http://localhost:5000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_mera_api_123456789_prod_key" \
  -d '{
    "model": "llama3",
    "messages": [
      {
        "role": "system",
        "content": "You are a concise, helpful assistant."
      },
      {
        "role": "user",
        "content": "Explain what a neural network is in exactly one sentence."
      }
    ]
  }'
echo -e "\n"
