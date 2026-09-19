const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables: root .env first, then backend/.env with override
const rootEnvPath = path.resolve(__dirname, '../../.env');
const backendEnvPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}
if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath, override: true });
}

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || process.env.BACKEND_PORT || 5000,
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000',
  maxUploadSize: parseInt(process.env.MAX_UPLOAD_SIZE, 10) || 5 * 1024 * 1024, // 5MB default
  allowedMimetypes: ['image/jpeg', 'image/png', 'image/webp'],
  llm: {
    get provider() {
      return (process.env.LLM_PROVIDER || 'gemini').toLowerCase().trim();
    },
    get apiKey() {
      return (process.env.LLM_API_KEY || '').trim();
    },
    get model() {
      const configured = (process.env.LLM_MODEL || '').trim();
      return configured || (this.provider === 'openai' ? 'gpt-4o-mini' : 'gemini-flash-latest');
    },
    get endpoint() {
      return (process.env.LLM_ENDPOINT || '').trim();
    },
    isConfigured() {
      const key = this.apiKey;
      return !!key && key !== '' && key !== 'your_llm_api_key_here';
    }
  }
};
