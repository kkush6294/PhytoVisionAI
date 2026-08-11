const axios = require('axios');
const FormData = require('form-data');
const config = require('../config/config');

exports.predictImage = async (req, res) => {
  try {
    // 1) Verify that a file was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No image file uploaded.'
      });
    }

    // 2) Validate MIME type
    if (!config.allowedMimetypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Unsupported file type: ${req.file.mimetype}. Allowed formats: JPG, JPEG, PNG, WebP.`
      });
    }

    // 3) Validate File Size
    if (req.file.size > config.maxUploadSize) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `File size exceeds the limit of ${config.maxUploadSize / (1024 * 1024)}MB.`
      });
    }

    // 4) Build multipart form data for FastAPI AI service
    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    // 5) Forward request to AI service
    const aiServiceUrl = `${config.aiServiceUrl}/predict`;
    const response = await axios.post(aiServiceUrl, form, {
      headers: {
        ...form.getHeaders()
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    // 6) Return standardized response matching the architecture
    return res.status(200).json(response.data);

  } catch (error) {
    console.error('[ERROR] Backend predictImage controller failed:', error.message);
    
    // Check if error is from Axios connection to AI service
    if (error.code === 'ECONNREFUSED' || (error.response && error.response.status >= 500)) {
      return res.status(502).json({
        error: 'Bad Gateway',
        message: 'The AI Inference Service is currently unavailable. Please verify it is running.',
        details: error.message
      });
    }

    // Pass AI service bad requests (e.g. invalid dimensions, corrupt image) directly to client
    if (error.response) {
      return res.status(error.response.status).json({
        error: error.response.data.error || 'AI Service Error',
        message: error.response.data.detail || error.response.data.message || 'Error from AI Inference Service'
      });
    }

    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process plant identification request.',
      details: error.message
    });
  }
};
