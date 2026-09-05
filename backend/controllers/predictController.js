const {
  getResearchData
} = require('../services/scientific/researchService');

const Plant = require('../models/Plant');
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
        message: `File size exceeds the limit of ${
          config.maxUploadSize / (1024 * 1024)
        }MB.`
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

    // 6) Get AI prediction response
    const predictionResponse = response.data;

    // 7) Extract prediction information
    const prediction = predictionResponse.prediction;

    // If the model rejected the prediction, don't query scientific
    // information for an Unknown result.
    if (
      prediction &&
      !prediction.rejected &&
      prediction.class &&
      prediction.class !== 'Unknown'
    ) {
      try {
        // 8) Retrieve scientific research information
        const researchData = await getResearchData({
          className: prediction.class,
          commonName: prediction.commonName,
          scientificName: prediction.scientificName
        });

        // 9) Merge research information into AI response
        predictionResponse.taxonomy =
          researchData.taxonomy || {};

        predictionResponse.botanical =
          researchData.botanical || {};

        predictionResponse.compounds =
          researchData.compounds || [];

        predictionResponse.medicinalEvidence =
          researchData.medicinalEvidence || [];

        predictionResponse.extractionGuidance =
          researchData.extractionGuidance || { available: false, message: "Information unavailable from retrieved scientific sources." };

        predictionResponse.safetyInfo =
          researchData.safetyInfo || { available: false, message: "Information unavailable from retrieved scientific sources." };

        predictionResponse.researchPapers =
          researchData.researchPapers || [];

        predictionResponse.sources =
          researchData.sources || [];

        // 10) Merge verified plant database properties, taxonomy, and local names
        try {
          const plantDoc = await Plant.findOne({
            $or: [
              { modelClass: prediction.class },
              { scientificName: prediction.scientificName }
            ]
          }).select('localName commonName scientificName taxonomy medicinalProperties indications modelClass');

          if (plantDoc) {
            if (plantDoc.localName) {
              prediction.localName = plantDoc.localName;
              predictionResponse.localName = plantDoc.localName;
            }
            if (plantDoc.commonName) {
              prediction.commonName = plantDoc.commonName;
              predictionResponse.commonName = plantDoc.commonName;
            }
            if (plantDoc.scientificName) {
              prediction.scientificName = plantDoc.scientificName;
              predictionResponse.scientificName = plantDoc.scientificName;
            }
            if (plantDoc.modelClass) {
              prediction.modelClass = plantDoc.modelClass;
              predictionResponse.modelClass = plantDoc.modelClass;
            }
            if (plantDoc.taxonomy) {
              prediction.taxonomy = plantDoc.taxonomy;
              prediction.family = plantDoc.taxonomy.family;
              prediction.genus = plantDoc.taxonomy.genus;
              prediction.species = plantDoc.taxonomy.species;

              const existingTax = predictionResponse.taxonomy || {};
              predictionResponse.taxonomy = {
                ...existingTax,
                family: plantDoc.taxonomy.family,
                genus: plantDoc.taxonomy.genus,
                species: plantDoc.taxonomy.species,
                taxonomy: {
                  ...(existingTax.taxonomy || {}),
                  family: plantDoc.taxonomy.family,
                  genus: plantDoc.taxonomy.genus,
                  species: plantDoc.taxonomy.species
                }
              };
            }
            predictionResponse.medicinalProperties = plantDoc.medicinalProperties || [];
            predictionResponse.indications = plantDoc.indications || [];
          } else {
            predictionResponse.medicinalProperties = [];
            predictionResponse.indications = [];
          }
        } catch (dbErr) {
          console.debug('[Predict Controller] Plant record lookup skipped:', dbErr.message);
          predictionResponse.medicinalProperties = [];
          predictionResponse.indications = [];
        }
      } catch (researchError) {
        console.error(
          '[RESEARCH ERROR] Scientific research retrieval failed:',
          researchError.message
        );

        // Prediction remains valid even when external research
        // services are unavailable.
        predictionResponse.taxonomy = {};
        predictionResponse.botanical = {};
        predictionResponse.compounds = [];
        predictionResponse.medicinalEvidence = [];
        predictionResponse.extractionGuidance = { available: false, message: "Information unavailable from retrieved scientific sources." };
        predictionResponse.safetyInfo = { available: false, message: "Information unavailable from retrieved scientific sources." };
        predictionResponse.researchPapers = [];
        predictionResponse.sources = [];

        predictionResponse.warnings =
          predictionResponse.warnings || [];

        predictionResponse.warnings.push(
          'Scientific research information could not be retrieved at this time.'
        );
      }
    } else {
      // 10) Rejected / unknown prediction
      predictionResponse.taxonomy = {};
      predictionResponse.botanical = {};
      predictionResponse.compounds = [];
      predictionResponse.medicinalEvidence = [];
      predictionResponse.extractionGuidance = { available: false, message: "Information unavailable from retrieved scientific sources." };
      predictionResponse.safetyInfo = { available: false, message: "Information unavailable from retrieved scientific sources." };
      predictionResponse.researchPapers = [];
      predictionResponse.sources = [];
    }

    // 11) Return complete response to frontend
    return res.status(200).json(predictionResponse);

  } catch (error) {
    console.error(
      '[ERROR] Backend predictImage controller failed:',
      error.message
    );

    // 12) AI service unavailable
    if (
      error.code === 'ECONNREFUSED' ||
      (error.response && error.response.status >= 500)
    ) {
      return res.status(502).json({
        error: 'Bad Gateway',
        message:
          'The AI Inference Service is currently unavailable. Please verify it is running.',
        details: error.message
      });
    }

    // 13) AI service returned an error
    if (error.response) {
      return res.status(error.response.status).json({
        error:
          error.response.data?.error ||
          'AI Service Error',

        message:
          error.response.data?.detail ||
          error.response.data?.message ||
          'Error from AI Inference Service'
      });
    }

    // 14) Unexpected backend error
    return res.status(500).json({
      error: 'Internal Server Error',
      message:
        'Failed to process plant identification request.',
      details: error.message
    });
  }
};