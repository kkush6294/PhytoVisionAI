const mongoose = require('mongoose');

const savedPlantSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plant', required: true },
  savedAt: { type: Date, default: Date.now }
}, { timestamps: true });

savedPlantSchema.index({ userId: 1, plantId: 1 }, { unique: true });

module.exports = mongoose.model('SavedPlant', savedPlantSchema);