const mongoose = require('mongoose');

const identificationHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plant', required: true },
  modelClass: { type: String },
  scientificName: { type: String, required: true },
  commonName: { type: String },
  localName: { type: String },
  taxonomy: { type: mongoose.Schema.Types.Mixed },
  confidence: { type: Number, required: true },
  rejected: { type: Boolean, default: false },
  modelVersion: { type: String },
  imageUrl: { type: String },
  notes: { type: String },
  uploadedAt: { type: Date, default: Date.now }
}, { timestamps: true });

identificationHistorySchema.index({ userId: 1, uploadedAt: -1 });

module.exports = mongoose.model('IdentificationHistory', identificationHistorySchema);