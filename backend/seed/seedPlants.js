const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Plant = require('../models/Plant');
const plantsData = require('./plantsData.json');

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/phyto_vision_cache';

async function seedDatabase() {
  console.log('==================================================');
  console.log('PhytoVisionAI — Plant Database Seeding');
  console.log('Target MongoDB URI:', mongoUri);
  console.log('Total plants to seed:', plantsData.length);
  console.log('==================================================');

  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('[OK] Connected to MongoDB.');

    let processedCount = 0;

    for (const plant of plantsData) {
      const result = await Plant.findOneAndUpdate(
        { scientificName: plant.scientificName },
        { ...plant, lastUpdated: new Date() },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      if (result) {
        processedCount++;
      }
    }

    const totalInDb = await Plant.countDocuments();
    console.log('[OK] Successfully processed ' + processedCount + ' plant records.');
    console.log('[OK] Total Plant documents in MongoDB collection: ' + totalInDb);

    if (totalInDb >= 40) {
      console.log('[SUCCESS] All 40 medicinal plant classes verified in database.');
    } else {
      console.warn('[WARNING] Expected 40 plants, found ' + totalInDb + '.');
    }

  } catch (error) {
    console.error('[ERROR] Seeding failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('[OK] Disconnected from MongoDB.');
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
