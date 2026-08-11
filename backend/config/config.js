const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || process.env.BACKEND_PORT || 5000,
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000',
  maxUploadSize: parseInt(process.env.MAX_UPLOAD_SIZE, 10) || 5 * 1024 * 1024, // 5MB default
  allowedMimetypes: ['image/jpeg', 'image/png', 'image/webp']
};
