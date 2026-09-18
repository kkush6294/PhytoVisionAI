const Plant = require('../models/Plant');
const { getPlantEvidence } = require('../services/evidence/evidenceService');

/**
 * Controller for Factual Plant Comparison (PhytoVisionAI)
 *
 * CRITICAL SCIENTIFIC & SAFETY RULES:
 * 1. Side-by-side factual differences ONLY.
 * 2. NO overall "best plant" score.
 * 3. NO medical effectiveness ranking.
 * 4. Grounded strictly in canonical database records and retrieved evidence.
 */
exports.comparePlants = async (req, res) => {
  try {
    const { plantIds, modelClasses } = req.body;

    // Collect query identifiers
    const targets = [];
    if (Array.isArray(plantIds)) {
      targets.push(...plantIds.filter(id => id && typeof id === 'string'));
    }
    if (Array.isArray(modelClasses)) {
      targets.push(...modelClasses.filter(c => c && typeof c === 'string'));
    }

    if (targets.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'At least 2 distinct plant identifiers (plantIds or modelClasses) are required for comparison.'
      });
    }

    if (targets.length > 4) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'A maximum of 4 plants may be compared simultaneously.'
      });
    }

    // Resolve plants from DB
    const plants = [];
    for (const target of targets) {
      let plant = null;
      try {
        plant = await Plant.findById(target);
      } catch {
        // Not a valid ObjectId, search by modelClass or scientificName
      }
      if (!plant) {
        const escaped = (target || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        plant = await Plant.findOne({
          $or: [
            { modelClass: target.trim() },
            { scientificName: new RegExp(`^${escaped}$`, 'i') },
            { localName: new RegExp(`^${escaped}$`, 'i') }
          ]
        });
      }

      if (plant && !plants.some(p => p._id.toString() === plant._id.toString())) {
        plants.push(plant);
      }
    }

    if (plants.length < 2) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Could not resolve at least 2 valid plant records from the provided identifiers.'
      });
    }

    // Retrieve evidence summary for each plant concurrently
    const comparisonCards = await Promise.all(plants.map(async (plant) => {
      const evidence = await getPlantEvidence({
        plantId: plant._id,
        modelClass: plant.modelClass,
        scientificName: plant.scientificName,
        localName: plant.localName
      }).catch(() => null);

      return {
        id: plant._id,
        modelClass: plant.modelClass,
        localName: plant.localName || plant.modelClass,
        scientificName: plant.scientificName,
        commonName: plant.commonName,
        family: plant.taxonomy?.family || 'Not reported',
        genus: plant.taxonomy?.genus || 'Not reported',
        reportedMedicinalUses: (plant.indications || []).map(ind => ({
          term: ind.term,
          category: ind.category,
          evidenceType: ind.evidenceType || 'traditional_use'
        })),
        reportedCompounds: (plant.compounds || []).map(c => typeof c === 'string' ? c : c.name),
        safety: {
          hasSafetyData: Boolean(plant.safety?.toxicityLevel || (plant.safety?.precautions && plant.safety.precautions.length > 0)),
          toxicityLevel: plant.safety?.toxicityLevel || 'Not specified',
          precautionsCount: plant.safety?.precautions?.length || 0
        },
        extraction: {
          hasProtocol: Boolean(plant.extraction?.method || plant.extraction?.solvent),
          method: plant.extraction?.method || null,
          solvent: plant.extraction?.solvent || null
        },
        evidenceSummary: {
          totalEvidenceCount: evidence?.summary?.totalEvidenceCount || 0,
          categories: evidence?.summary?.byCategory || {},
          levels: evidence?.summary?.byLevel || {}
        }
      };
    }));

    return res.status(200).json({
      success: true,
      comparisonCount: comparisonCards.length,
      disclaimer: 'Plant comparison displays factual botanical, chemical, and literature differences side-by-side. It does not rank medical efficacy or recommend treatments.',
      plants: comparisonCards
    });

  } catch (err) {
    console.error('[Comparison Controller Error] comparePlants:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to generate factual plant comparison.',
      details: err.message
    });
  }
};
