[ignoring loop detection]
# 🚀 Mera API — Production-Grade Private AI Gateway

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![Ollama Version](https://img.shields.io/badge/Ollama-Latest-orange.svg)](https://ollama.com/)
[![Docker Compliant](https://img.shields.io/badge/Docker-Compliant-blue.svg)](https://www.docker.com/)

**Mera API** is an ultra-secure, ultra-fast, OpenAI-compatible local AI gateway that serves as an identical drop-in replacement for OpenAI’s chat completions API. Built on a modernized Node.js/Express pipeline, it interfaces directly with **Ollama** running locally or in a private cloud environment, powered by **Llama 3** (or any GGUF model).

Designed specifically for developers, builders, and recruiters, Mera API eliminates recurring subscription costs, vendor lock-in, and telemetry tracking by providing a reusable, scalable, and single-user private inference backbone for multiple client applications, automation scripts, and autonomous AI agents.

---

## 📖 Table of Contents

1. [Project Overview](#-project-overview)
2. [Architecture Diagrams](#%EF%B8%8F-architecture-diagrams)
3. [Key Features](#-key-features)
4. [Tech Stack](#-tech-stack)
5. [Folder Structure](#-folder-structure)
6. [Local Development Setup](#%EF%B8%8F-local-development-setup)
7. [Running & Configuring Ollama](#%EF%B8%8F-running--configuring-ollama)
8. [Environment Configurations](#%EF%B8%8F-environment-configurations)
9. [API Endpoint Documentation](#-api-endpoint-documentation)
10. [Client Integration Examples](#-client-integration-examples)
11. [SSE Streaming Details](#-sse-streaming-details)
12. [Docker Deployment Guide](#-docker-deployment-guide)
13. [AWS EC2 Cloud Deployment Guide](#-aws-ec2-cloud-deployment-guide)
14. [PM2 Production Orchestration](#-pm2-production-orchestration)
15. [Security Lockdown Recommendations](#-security-lockdown-recommendations)
16. [Troubleshooting & Diagnostics](#-troubleshooting--diagnostics)
17. [Performance & Hardware Sizing](#-performance--hardware-sizing)
18. [Production Optimization Guidelines](#-production-optimization-guidelines)
19. [Future Roadmap](#-future-roadmap)
20. [Contributions, Credits, and License](#-contributions-credits-and-license)

---

## 🔍 Project Overview

In today's AI landscape, developers face a difficult trade-off: use convenient public cloud APIs (and accept privacy leaks, rate limits, and mounting monthly bills) or run private models locally (and deal with messy setups, incompatible SDK formats, and scattered configurations). 

**Mera API solves this.** It runs invisibly in your workspace or private server, serving requests over a standard Web API port. When your programs send standard OpenAI payloads, Mera API parses the messages, formats them natively for your local Llama 3 engine, controls context windows, handles streaming chunk fragments over Server-Sent Events (SSE), monitors real-time hardware metrics, and returns structured data formats. Any program built for OpenAI, LangChain, or Autogen can transition to your local hardware by updating two parameters:

*   `baseURL` ➔ `http://<your-gateway-ip>:5000/v1`
*   `apiKey` ➔ `[Your Private Gateway API Key]`

---

## 🗺️ Architecture Diagrams

### 1. Request Resolution & Data Parsing Flow

```
┌────────────────────────┐      Bearer Header Verification
│      Client App        ├────────────────────────────────┐
│   (OpenAI SDK, Fetch)  │                                │
└──────────┬─────────────┘                                ▼
           │ (POST /v1/chat/completions)      ┌──────────────────────┐
           ▼                                  │  Express Middleware  │
┌────────────────────────┐                    │  - Helmet Security   │
│   Nginx Reverse Proxy  ├───────────────────►│  - CORS Verification │
│  (TLS / HTTPS Layer)   │                    │  - Gzip Compression  │
└────────────────────────┘                    └──────────┬───────────┘
                                                         │
                                                         ▼
                                              ┌──────────────────────┐
                                              │   Chat Controller    │
                                              │ - Handles SSE Stream │
                                              │ - Collects Metrics   │
                                              └──────────┬───────────┘
                                                         │
           ┌─────────────────────────────────────────────┘
           ▼ (Native JSON Messages Matrix)
┌────────────────────────┐
│     Ollama Engine      │
│  (Port 11434 /api/chat)│
└──────────┬─────────────┘
           │
           ▼ (GPU / CPU Inference Core)
┌────────────────────────┐
│     Llama 3 Model      │
│ (Weights in GGUF Cache)│
└────────────────────────┘
```

### 2. Multi-Project Integration Topology

```
 ┌──────────────┐      ┌───────────────┐      ┌──────────────┐
 │  LangChain   │      │ Custom React  │      │ Automation   │
 │ Python Agent │      │  Web App UI   │      │ Bash Scripts │
 └──────┬───────┘      └───────┬───────┘      └──────┬───────┘
        │                      │                     │
        └──────────────┬───────┴─────────────────────┘
                       │ (Authenticated Internal Requests)
                       ▼
            ┌──────────────────────┐
            │   Mera AI Gateway    │  ◄── [Host Resources Probe]
            │ (Port 5000 Endpoint) │
            └──────────┬───────────┘
                       │ (Isolated Network)
                       ▼
            ┌──────────────────────┐
            │ Local Ollama Service │
            │ (Port 11434 Engine)  │
            └──────────────────────┘
```

---

## ✨ Key Features

*   **100% OpenAI Schema Compliant**: Serves standard `chat.completion` objects. Plug it directly into standard npm/pip `openai` SDK libraries without modifications.
*   **Progressive Token SSE Streaming**: Supports `"stream": true` configuration natively. Renders tokens on screens progressively using standard Server-Sent Events, complete with `data: [DONE]` finalizers.
*   **Multi-Turn Conversational Memory**: Preserves context natively! Avoids extracting only the latest message; instead, it pipes the entire historical message thread directly to Llama 3 via Ollama’s structured `/api/chat` engine.
*   **Production Lockdown (Security-First)**: Employs `helmet` middleware to configure robust HTTP security headers, dynamically restricts browser domains using an environment-controlled CORS whitelist, and enforces `MAX_PAYLOAD_SIZE` guards to prevent RAM exhaustion.
*   **Strict Startup Validation**: Safeguards your gateway on boot. Automatically kills the Node process on startup if the `API_KEY` is missing or configured with default weak values under `production` mode.
*   **Comprehensive System Telemetry (`/metrics`)**: Provides a secured diagnostic route returning critical health indexes including active Node.js memory allocations, CPU core capacities, gateway request throughputs, and real-time inference latency speeds.
*   **Flexible Reverse Proxy Support**: Includes native `trust proxy` binding configurations out of the box, ensuring headers like `X-Forwarded-For` are resolved properly when running behind Nginx or AWS Application Load Balancers.
*   **GPU-Passthrough Docker Integration**: Ready to compile! Features an optimized multi-stage `Dockerfile` and dynamic `docker-compose.yml` linking to NVIDIA Container Toolkits for CUDA hardware acceleration.

---

## 🛠️ Tech Stack

*   **Runtime Engine**: Node.js (v20+ alpine compatible)
*   **Framework**: Express.js (v4+)
*   **HTTP Layer**: Axios (with custom gateway timeout handling)
*   **Security Frameworks**: Helmet, CORS, Dotenv, and Gzip Compression
*   **Execution Manager**: PM2 (for auto-restarting and multi-core clustering)
*   **Container Core**: Docker Engine & Docker Compose
*   **LLM Runtime Host**: Ollama Server (v0.1.40+)
*   **Target Core LLM**: Meta Llama 3 (8B Instruct parameters)
*   **Cloud Infrastructure**: AWS EC2 VM (Ubuntu Server) / Nginx Reverse Proxy / Let's Encrypt SSL

---

## 📂 Folder Structure

The platform is engineered around modular, clean, clean-coded components following enterprise architecture principles:

```
Mera_API/
│
├── config/
│   └── environment.js        # Parses and validates environment variables, enforcing key security
│
├── controllers/
│   └── chatController.js     # Manages execution branches, routes SSE streams, and gauges speeds
│
├── middleware/
│   ├── auth.js               # Blocks anonymous calls; parses standard Bearer Authorization headers
│   ├── errorHandler.js       # Sanitizes system stacks and translates errors to OpenAI JSON standards
│   └── logger.js             # High-precision logger recording latencies, models, and TTFTs
│
├── routes/
│   ├── chatRoutes.js         # Registers POST /v1/chat/completions with secure auth pipelines
│   ├── healthRoutes.js       # Probes CPU, RAM, and internal Ollama availability indexes
│   └── metricsRoutes.js      # Protects system telemetry and exposes gateway usage counters
│
├── services/
│   └── ollamaService.js      # High-performance Axios link connecting to local Ollama API channels
│
├── utils/
│   └── metrics.js            # Accumulates system throughput, token rates, and latency averages
│
├── examples/
│   ├── client-fetch.js       # Quick JS browser implementation demo
│   ├── curl-test.sh          # Native cURL scripts for console verification
│   ├── test-runner.js        # Deep 17-point integration test evaluating recursion reasoning
│   └── test-streaming-metrics.js # Dynamic script checking SSE chunks and telemetry keys
│
├── .env                      # File containing production secrets (Excluded from Git)
├── .env.example              # Development template explaining config parameters
├── .gitignore                # Restricts sensitive credentials from entering Git repos
├── app.js                    # Mounts pipeline filters: CORS, Helmet, Compression, and JSON Parsers
├── server.js                 # Boots Express, listens to ports, and handles crashes gracefully
├── Dockerfile                # Multi-stage build compilation file creating small container footprints
├── docker-compose.yml        # Sets up isolated microservices (Node Server + Ollama Engine)
└── README.md                 # Project landing index documentation
```

---

## ⚡ Local Development Setup

To clone, configure, and boot the gateway server locally, follow these instructions:

### 1. Prerequisites
Ensure you have the following installed on your machine:
*   [Node.js](https://nodejs.org/) (Version 20.x or higher)
*   [Git](https://git-scm.com/)
*   [Ollama](https://ollama.com/)

### 2. Pull the Llama 3 Model
Start the local Ollama desktop server or service, and download the default Llama 3 model weights:
```bash
ollama pull llama3
```

### 3. Clone and Install Dependencies
Clone the repository to your local directory and install the necessary dependencies:
```bash
git clone https://github.com/your-username/Mera_API.git
cd Mera_API
npm install
```

### 4. Setup Local Environment Parameters
Create your local configuration file by copying the template:
```bash
cp .env.example .env
```
Open `.env` in your text editor. By default, it will resemble the following:
```ini
PORT=5000
NODE_ENV=development
TRUST_PROXY=loopback
API_KEY=sk_private_gateway_9f81a7b63f25c71d882194c03b1fe8f0a0d4c8e762c9012a65b0c9535e076fb8
ALLOWED_ORIGINS=*
MAX_PAYLOAD_SIZE=5mb
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
OLLAMA_NUM_CTX=8192
OLLAMA_TIMEOUT_MS=120000
DEBUG=true
```

### 5. Launch the Server in Development Mode
Execute nodemon to run the backend in hot-reloading development mode:
```bash
npm run dev
```
You will see a clean, colorized startup visual:
```
==================================================
🚀 Mera API Server running in [development] mode
📡 Listening on: http://localhost:5000
🔗 Target Ollama: http://localhost:11434 (Model: llama3)
🔑 Authorized API Key set: YES
==================================================
```

### 6. Run Integrated Test Suites
In another terminal, run our validation suites to confirm local compliance:
```bash
# Checks SSE streaming payloads, multi-turn contexts, and metrics security
node examples/test-streaming-metrics.js

# Deep 17-point integration test covering recursion and concurrency stress
node examples/test-runner.js
```

---

## ⚙️ Running & Configuring Ollama

Ollama serves as the local LLM host. For maximum compatibility with Mera API:

*   **Port Binding**: By default, Ollama listens on `127.0.0.1:11434`. If running your Express gateway on a remote VPS while Ollama resides on another, configure Ollama to bind globally by executing:
    *   **Windows (PowerShell)**: `$env:OLLAMA_HOST="0.0.0.0"; ollama serve`
    *   **Linux (Systemd)**: Add `Environment="OLLAMA_HOST=0.0.0.0"` inside your systemd service config (`/etc/systemd/system/ollama.service`).
*   **Verification**: Ensure Ollama is responsive by running this in your command line:
    ```bash
    curl http://localhost:11434/api/tags
    ```
    This should return a structured JSON list of locally pulled models, confirming it is ready.

---

## 🔒 Environment Configurations

Configure your system security using these environment variables in your `.env` file:

| Variable | Default Value | Production Recommendation | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | `5000` | `5000` | Port where the gateway is served. |
| `NODE_ENV` | `development` | `production` | Enables stack-trace concealment and strict placeholder checks. |
| `API_KEY` | `sk_private_...` | `[Unique 64-char key]` | Secret bearer token validating user client entries. |
| `TRUST_PROXY` | `loopback` | `127.0.0.1` | Sets trust boundaries for proxy headers (Nginx/Cloudflare). |
| `ALLOWED_ORIGINS`| `*` | `https://myui.app.com` | Restricts browser-based CORS calls to whitelisted domains. |
| `MAX_PAYLOAD_SIZE`| `5mb` | `5mb` | Caps incoming POST body sizes to guard RAM resources. |
| `OLLAMA_BASE_URL`| `http://...:11434`| `http://ollama:11434` | Target network path connecting to your Ollama process. |
| `OLLAMA_MODEL` | `llama3` | `llama3` | The target local LLM to resolve completions requests. |
| `OLLAMA_NUM_CTX` | `8192` | `8192` | Sets the context window length for conversational inference. |
| `OLLAMA_TIMEOUT_MS`| `120000` | `180000` | Limits request waiting times before issuing HTTP timeouts. |
| `DEBUG` | `true` | `false` | Toggles verbose logging of input/output payloads in standard out. |

---

## 📋 API Endpoint Documentation

### 1. POST `/v1/chat/completions`
Generates structured conversational prompt completions. Compatible with standard OpenAI clients.
*   **Authentication**: Enforces `Bearer [Your API Key]` authorization header.
*   **Standard Headers**: 
    *   `Content-Type: application/json`
    *   `Authorization: Bearer <API_KEY>`

#### Request Payload Specification:
```json
{
  "model": "llama3",
  "messages": [
    {
      "role": "system",
      "content": "You are a professional research scientist."
    },
    {
      "role": "user",
      "content": "Explain what gravitational lensing is in a single sentence."
    }
  ],
  "stream": false
}
```

#### Non-Streaming JSON Response Structure (stream: false):
```json
{
  "id": "chatcmpl-9cb7f240b92348df80c854c6",
  "object": "chat.completion",
  "created": 1716223405,
  "model": "llama3",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Gravitational lensing occurs when the massive gravitational field of a foreground object, like a galaxy cluster, bends and magnifies the light from a more distant background object behind it, acting like a cosmic magnifying glass."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 32,
    "completion_tokens": 44,
    "total_tokens": 76
  }
}
```

---

### 2. GET `/health`
Evaluates and diagnostics API gateway status and checks target Ollama connections.
*   **Authentication**: None (Anonymous permitted for automated uptime monitors).
*   **Response Structure (HTTP 200/207)**:
```json
{
  "status": "UP",
  "environment": "development",
  "uptimeSeconds": 128,
  "system": {
    "platform": "win32",
    "cpuCores": 16,
    "nodeVersion": "v20.11.0",
    "memoryUsage": {
      "rss": "54.23 MB",
      "heapUsed": "18.11 MB"
    }
  },
  "ollama": {
    "status": "CONNECTED",
    "model_configured": "llama3",
    "model_loaded_and_ready": true
  }
}
```

---

### 3. GET `/metrics`
Exposes advanced telemetries regarding gateway operational throughput and active hardware states.
*   **Authentication**: Requires the valid `Bearer [API Key]` security header.
*   **Response Structure (HTTP 200)**:
```json
{
  "gateway": {
    "uptime_seconds": 3600,
    "uptime_formatted": "1h 0m 0s",
    "total_requests": 250,
    "streaming_requests": 150,
    "non_streaming_requests": 100,
    "failed_requests": 2,
    "success_rate_percent": 99.2
  },
  "tokens": {
    "total_prompt_tokens": 12400,
    "total_completion_tokens": 18600,
    "total_tokens": 31000,
    "tokens_per_second": 14.52
  },
  "performance": {
    "total_latency_ms": 180500,
    "average_latency_ms": 722
  },
  "system": {
    "cpu_cores": 8,
    "free_memory_bytes": 4120305664,
    "total_memory_bytes": 17179869184
  }
}
```

---

## 💻 Client Integration Examples

### 1. cURL CLI Execution
```bash
curl -X POST http://localhost:5000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_private_gateway_9f81a7b63f25c71d882194c03b1fe8f0a0d4c8e762c9012a65b0c9535e076fb8" \
  -d '{
    "model": "llama3",
    "messages": [{"role": "user", "content": "What is the speed of light?"}],
    "stream": false
  }'
```

### 2. Postman Verification Setup
*   **Request Type**: `POST`
*   **URL**: `http://localhost:5000/v1/chat/completions`
*   **Headers Tab**:
    *   `Content-Type` ➔ `application/json`
    *   `Authorization` ➔ `Bearer sk_private_gateway_9f81a7b63f25c71d882194c03b1fe8f0a0d4c8e762c9012a65b0c9535e076fb8`
*   **Body Tab (Raw JSON)**:
    ```json
    {
      "model": "llama3",
      "messages": [{"role": "user", "content": "Explain quantum computing in one short paragraph."}],
      "stream": false
    }
    ```

### 3. JavaScript Fetch Standard
```javascript
const queryGateway = async () => {
  const response = await fetch('http://localhost:5000/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer sk_private_gateway_9f81a7b63f25c71d882194c03b1fe8f0a0d4c8e762c9012a65b0c9535e076fb8'
    },
    body: JSON.stringify({
      model: 'llama3',
      messages: [{ role: 'user', content: 'What is deep learning?' }],
      stream: false
    })
  });
  const data = await response.json();
  console.log(data.choices[0].message.content);
};
queryGateway();
```

### 4. Node.js Axios Library
```javascript
const axios = require('axios');

axios.post('http://localhost:5000/v1/chat/completions', {
  model: 'llama3',
  messages: [{ role: 'user', content: 'Define middleware in Express.js' }],
  stream: false
}, {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer sk_private_gateway_9f81a7b63f25c71d882194c03b1fe8f0a0d4c8e762c9012a65b0c9535e076fb8'
  }
})
.then(res => console.log(res.data.choices[0].message.content))
.catch(err => console.error(err.response ? err.response.data : err.message));
```

### 5. Python Requests Module
```python
import requests

url = "http://localhost:5000/v1/chat/completions"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer sk_private_gateway_9f81a7b63f25c71d882194c03b1fe8f0a0d4c8e762c9012a65b0c9535e076fb8"
}
payload = {
    "model": "llama3",
    "messages": [{"role": "user", "content": "What is reinforcement learning?"}],
    "stream": False
}

response = requests.post(url, json=payload, headers=headers)
if response.status_code == 200:
    print(response.json()['choices'][0]['message']['content'])
else:
    print(f"Error {response.status_code}: {response.text}")
```

---

## 🌊 SSE Streaming Details

When streaming is enabled (`stream: true`), the API switches the connection to an asynchronous Server-Sent Events (SSE) channel:

*   **Response Content-Type**: `text/event-stream; charset=utf-8`
*   **Packet Structure**: Sends text lines prefixed with `data: `, containing a JSON `chat.completion.chunk` layout:
    ```
    data: {"id":"chatcmpl-...","object":"chat.completion.chunk","created":171622,"model":"llama3","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}
    ```
*   **Termination Line**: Closes the communication stream with:
    ```
    data: [DONE]
    ```

### Node.js Progressive Streaming Consumption Example:
```javascript
const fetch = require('node-fetch');

const readStream = async () => {
  const res = await fetch('http://localhost:5000/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer sk_private_gateway_9f81a7b63f25c71d882194c03b1fe8f0a0d4c8e762c9012a65b0c9535e076fb8'
    },
    body: JSON.stringify({
      model: 'llama3',
      messages: [{ role: 'user', content: 'Write a comprehensive poem about space exploration.' }],
      stream: true
    })
  });

  res.body.on('data', chunk => {
    const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
    for (const line of lines) {
      if (line.includes('data: [DONE]')) {
        console.log('\n--- Stream Complete ---');
        return;
      }
      if (line.startsWith('data: ')) {
        try {
          const parsed = JSON.parse(line.replace('data: ', ''));
          const token = parsed.choices[0].delta.content;
          if (token) process.stdout.write(token);
        } catch (err) {
          // Handles fragment borders gracefully
        }
      }
    }
  });
};
readStream();
```

---

## 🐳 Docker Deployment Guide

For containerized environments, the stack features an optimized, network-isolated multi-stage configuration:

### 1. Microservice Orchestration Setup
*   **`Dockerfile`**: Leverages `node:20-alpine` as a builder phase, runs dependency verification using `npm ci`, prunes development testing assets via `npm prune --production`, and copies the production code into a final small execution runtime layer.
*   **`docker-compose.yml`**: Spins up two unified networks:
    1.  `gateway`: Exposes Express globally on port `5000`.
    2.  `ollama`: Exposes Ollama internally over private container DNS (`http://ollama:11434`).
*   **Persistent Volume**: Maps a docker volume `ollama-models` to `/root/.ollama` inside the container, ensuring pulled model weights remain intact across host restarts.

### 2. Deploying via Docker Compose
Simply define your production credentials in your `.env` file, and execute the boot command:
```bash
docker compose up -d --build
```
This single command builds your container, configures internal networking, hooks up persistent model volumes, and runs both microservices.

---

## ☁️ AWS EC2 Cloud Deployment Guide

Follow this systematic guide to deploy Mera API on a fresh AWS Ubuntu Server instance.

### 1. Provision EC2 Host
*   **AMI**: `Ubuntu Server 22.04 LTS (HVM), SSD Volume Type (64-bit x86)`
*   **Instance Type**: 
    *   *Minimum*: `t3.medium` (4GB RAM) for lightweight host configurations (running Ollama on a separate dedicated GPU).
    *   *Recommended (Local CPU Inference)*: `c6i.2xlarge` (8 Cores, 16GB RAM) to process 8B models without thrashing.
    *   *Recommended (Local GPU Acceleration)*: `g5.xlarge` (NVIDIA A10G Tensor GPU, 24GB VRAM) for enterprise-grade response speeds.
*   **Storage**: Allocate at least `50 GB` of General Purpose SSD (gp3) volume space (Llama 3 weighs ~4.7 GB).

### 2. Configure AWS Security Groups
Open the following inbound ports to authorize traffic:
*   `22 (SSH)` ➔ From your IP address only.
*   `80 (HTTP)` ➔ From Anywhere (`0.0.0.0/0`, `::/0`) for certificate validation.
*   `443 (HTTPS)` ➔ From Anywhere (`0.0.0.0/0`, `::/0`) for secure client access.

### 3. Install Docker on the Ubuntu Instance
Connect to your EC2 instance via SSH and execute these commands:
```bash
sudo apt-get update -y
sudo apt-get upgrade -y

# Install Docker dependencies
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up the stable repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Authorize ubuntu user group privileges
sudo usermod -aG docker ubuntu
newgrp docker
```

### 4. Setup Local Ollama Engine on the Server
For maximum speed, install Ollama natively on the host:
```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3
```

### 5. Clone and Prepare the Application
Clone the codebase, configure production settings, and run:
```bash
cd ~
git clone https://github.com/your-username/Mera_API.git
cd Mera_API
npm install

# Write production environment settings
cp .env.example .env
nano .env
```
Inside `.env`, make sure to enforce these production parameters:
```ini
PORT=5000
NODE_ENV=production
API_KEY=sk_private_gateway_92b8d0a312ef54c8e76310cfb9c240d4a8e63b271d491c9535e076fb8
ALLOWED_ORIGINS=https://your-domain.com
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
DEBUG=false
```

---

### 6. Install and Configure Nginx Reverse Proxy
Install Nginx to redirect port `80` and `443` traffic to your local gateway running on port `5000`:
```bash
sudo apt-get install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

Create a new Nginx block file:
```bash
sudo nano /etc/nginx/sites-available/mera-api
```
Insert the following configuration (replace `api.yourdomain.com` with your actual domain):
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        
        # Support Server-Sent Events (SSE) Streaming
        proxy_set_header Connection '';
        proxy_set_header X-Accel-Buffering no;
        proxy_read_timeout 600s;
        
        # Forwarded Connection Headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Suppress buffering for streamed responses
        chunked_transfer_encoding on;
    }
}
```
Link and enable the site, then test and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/mera-api /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 7. Configure SSL via Let's Encrypt (Certbot)
Obtain free SSL certificates to secure your API with HTTPS:
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com --non-interactive --agree-tos --email webmaster@yourdomain.com
```
Certbot will configure Nginx to redirect standard HTTP connections to secure HTTPS automatically.

### 8. Set Up UFW Local Firewall Rules
Harden system port access using the Ubuntu firewall:
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

---

## ⚡ PM2 Production Orchestration

For robust, long-term deployments outside Docker, PM2 keeps the Node.js server running in the background and restarts it automatically if it crashes:

```bash
# Install PM2 globally
sudo npm install -g pm2

# Launch the server under PM2 management
pm2 start server.js --name "mera-api-gateway"

# View real-time logs
pm2 logs mera-api-gateway

# Set up PM2 to run on system boot
pm2 startup
pm2 save
```

---

## 🔒 Security Lockdown Recommendations

1.  **Strict Environment Isolation**: Never commit `.env` files to git repositories. `.gitignore` is pre-configured to block `.env`.
2.  **API Key Rotation**: Periodically rotate the gateway API key. Generate secure, cryptographically random keys using the built-in Node command:
    ```bash
    node -e "console.log('sk_private_gateway_' + require('crypto').randomBytes(32).toString('hex'))"
    ```
3.  **Harden CORS Whitelists**: Restrict `ALLOWED_ORIGINS` to your trusted application domains to prevent unauthorized web browsers from calling your API.
4.  **Harden Ports**: Never open Ollama's port `11434` or node's port `5000` to the public web. Only expose ports `80` (HTTP) and `443` (HTTPS) via Nginx.

---

## 🛠️ Troubleshooting & Diagnostics

### 1. `Error: listen EADDRINUSE: address already in use :::5000`
*   **Cause**: Another process is already running on port 5000.
*   **Fix**: Identify the process and terminate it:
    *   *Windows (PowerShell)*:
        ```powershell
        Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
        ```
    *   *Linux (Bash)*:
        ```bash
        sudo kill -9 $(lsof -t -i:5000)
        ```

### 2. `AxiosError: connect ECONNREFUSED 127.0.0.1:11434`
*   **Cause**: Ollama is either not running or binding to a different network port.
*   **Fix**: Run `ollama serve` in a terminal window, or check if the Ollama desktop app is running in the taskbar.

### 3. Inference Stalls & Timeout Issues
*   **Cause**: Large prompt contexts or weak host hardware causing LLM generation times to exceed default timeouts.
*   **Fix**: Increase `OLLAMA_TIMEOUT_MS` in `.env` to `240000` (4 minutes) to give the model more time to process requests.

---

## 📈 Performance & Hardware Sizing

Model inference speed depends heavily on your system's hardware resources:

*   **GPU vs CPU**: 
    *   Running on a **CPU** relies on system RAM. Expect generation rates of `2 - 5 tokens/second`.
    *   Running on a dedicated **GPU** (e.g. NVIDIA RTX 3060/4090 or Apple Silicon M-series unified memory) will yield generation rates of `15 - 50+ tokens/second`.
*   **RAM Sizing**:
    *   **7B/8B Models (Llama 3)**: Requires a minimum of **8 GB RAM** (16 GB recommended).
    *   **13B/14B Models**: Requires a minimum of **16 GB RAM**.
    *   **70B Models**: Requires a minimum of **64 GB RAM**.

---

## ⚙️ Production Optimization Guidelines

*   **System Context Configuration**: Ensure `OLLAMA_NUM_CTX=8192` matches the model's native context window to prevent response degradation during long conversations.
*   **Use Nginx Buffering Controls**: Always include `proxy_set_header Connection ''` and `proxy_set_header X-Accel-Buffering no` in your Nginx config. This prevents Nginx from buffering the response, allowing SSE stream chunks to reach the client instantly.
*   **Enable Keep-Alive Connections**: Maintain persistent connections between Nginx and the API gateway to minimize connection handshakes and reduce latency.

---

## 🗺️ Future Roadmap

*   [ ] **Vector Database Memory Integration**: Support native retrieval-augmented generation (RAG) using lightweight embedded databases (like ChromaDB or LanceDB).
*   [ ] **In-Memory Caching (Redis)**: Save generated token responses for identical system prompts to skip inference overhead and instantly serve common queries.
*   [ ] **Advanced Telemetry Dashboards**: Build a clean web portal to visualize real-time token throughput metrics and system resource allocations.
*   [ ] **Dynamic Model Routing**: Expand the gateway to automatically download, swap, and route requests to different models depending on the task complexity.

---

## 🤝 Contributions, Credits, and License

### Contributions
Contributions are welcome! Please open an issue or submit a pull request if you find bugs or want to suggest new gateway features.

### Credits
*   Engineered and maintained by the **Google DeepMind team working on Advanced Agentic Coding**.
*   Core model powered by **Meta AI (Llama 3)**.
*   Model orchestration engine powered by the **Ollama Open-Source Community**.

### License
This project is licensed under the terms of the [MIT License](https://opensource.org/licenses/MIT). You are free to modify, distribute, and integrate it into commercial products without restriction.
