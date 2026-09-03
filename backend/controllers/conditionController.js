const { searchDiseaseEvidence } = require('../services/scientific/conditionService');

exports.searchCondition = async (req, res) => {
  try {
    const { scientificName, condition } = req.body;

    if (!scientificName || typeof scientificName !== 'string' || scientificName.trim() === '') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Valid plant scientific name is required.'
      });
    }

    if (!condition || typeof condition !== 'string' || condition.trim() === '') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Please provide a health condition or disease to search.'
      });
    }

    const evidenceData = await searchDiseaseEvidence(scientificName, condition);

    return res.status(200).json(evidenceData);
  } catch (error) {
    console.error('[Condition Controller Error]', error.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve scientific disease evidence.',
      details: error.message
    });
  }
};
