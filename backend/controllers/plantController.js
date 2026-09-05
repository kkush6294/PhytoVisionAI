const Plant = require('../models/Plant');

// GET /api/plants
// Retrieves all plants with optional search, pagination, and sorting
exports.getAllPlants = async (req, res) => {
  try {
    const { search, limit, page, sort } = req.query;
    const query = {};

    if (search && typeof search === 'string' && search.trim() !== '') {
      const term = search.trim();
      const regex = new RegExp(term, 'i');
      query.$or = [
        { commonName: regex },
        { localName: regex },
        { scientificName: regex },
        { modelClass: regex },
        { alternateNames: regex },
        { compounds: regex }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    let sortOption = { commonName: 1 };
    if (sort === 'scientificName') {
      sortOption = { scientificName: 1 };
    } else if (sort === 'modelClass') {
      sortOption = { modelClass: 1 };
    }

    const [total, plants] = await Promise.all([
      Plant.countDocuments(query),
      Plant.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .select('-__v')
    ]);

    return res.status(200).json({
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      plants
    });
  } catch (error) {
    console.error('[Plant Controller Error] getAllPlants:', error.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve plants.',
      details: error.message
    });
  }
};

// GET /api/plants/:idOrClass
// Retrieves a single plant document by MongoDB _id, modelClass, or exact scientificName
exports.getPlantByIdOrClass = async (req, res) => {
  try {
    const { idOrClass } = req.params;

    if (!idOrClass || typeof idOrClass !== 'string' || idOrClass.trim() === '') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Plant identifier parameter is required.'
      });
    }

    const identifier = idOrClass.trim();
    let plant = null;

    // Check if it is a valid ObjectId
    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      plant = await Plant.findById(identifier).select('-__v');
    }

    // If not found by ID, lookup by modelClass (case-insensitive) or exact scientificName
    if (!plant) {
      plant = await Plant.findOne({
        $or: [
          { modelClass: new RegExp('^' + identifier + '$', 'i') },
          { scientificName: new RegExp('^' + identifier + '$', 'i') },
          { commonName: new RegExp('^' + identifier + '$', 'i') },
          { localName: new RegExp('^' + identifier + '$', 'i') }
        ]
      }).select('-__v');
    }

    if (!plant) {
      return res.status(404).json({
        error: 'Not Found',
        message: `No plant record found matching identifier '${identifier}'.`
      });
    }

    return res.status(200).json({
      success: true,
      plant
    });
  } catch (error) {
    console.error('[Plant Controller Error] getPlantByIdOrClass:', error.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve plant details.',
      details: error.message
    });
  }
};

// GET /api/plants/search/:query
// Quick search by scientific name, common name, or phytochemical compound
exports.searchPlants = async (req, res) => {
  try {
    const { query } = req.params;

    if (!query || typeof query !== 'string' || query.trim() === '') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Search query parameter is required.'
      });
    }

    const term = query.trim();
    const regex = new RegExp(term, 'i');

    const plants = await Plant.find({
      $or: [
        { commonName: regex },
        { scientificName: regex },
        { modelClass: regex },
        { alternateNames: regex },
        { compounds: regex }
      ]
    })
      .sort({ commonName: 1 })
      .limit(20)
      .select('scientificName commonName modelClass compounds safety.toxicityLevel taxonomy');

    return res.status(200).json({
      success: true,
      count: plants.length,
      query: term,
      results: plants
    });
  } catch (error) {
    console.error('[Plant Controller Error] searchPlants:', error.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to perform plant search.',
      details: error.message
    });
  }
};

