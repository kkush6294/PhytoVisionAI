const express = require('express');
const cors = require('cors');
const config = require('./config/config');
const predictRoutes = require('./routes/predict');
const db = require('./db');
const helmet = require('helmet');
const authRoutes = require('./routes/auth');
const plantRoutes = require('./routes/plant');
const conditionRoutes = require('./routes/condition');
const historyRoutes = require('./routes/history');
const savedPlantRoutes = require('./routes/savedPlant');
const extractionRoutes = require('./routes/extraction');
const safetyRoutes = require('./routes/safety');
const recommendationRoutes = require('./routes/recommendation');
const app = express();

app.use(helmet());

// Allowed Origins for Security
const allowedOrigins = process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [];

// CORS Configuration
app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Dev flexible fallback
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// HTTP Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/plants', plantRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/saved-plants', savedPlantRoutes);
app.use('/api/extraction', extractionRoutes);
app.use('/api/safety', safetyRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api', conditionRoutes);
app.use('/api', predictRoutes);
// Root routes
app.get('/', (req, res) => {
  res.json({
    name: 'PhytoVisionAI API Gateway',
    status: 'online',
    version: '1.0.0'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[ERROR] Unhandled server error:', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred.'
  });
});

// Listen
const server = app.listen(config.port, () => {
  console.log(`==================================================`);
  console.log(`PhytoVisionAI Backend listening on port ${config.port}`);
  console.log(`AI Inference URL target: ${config.aiServiceUrl}`);
  console.log(`==================================================`);
});

module.exports = server;
