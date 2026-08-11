const express = require('express');
const cors = require('cors');
const config = require('./config/config');
const predictRoutes = require('./routes/predict');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes
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
