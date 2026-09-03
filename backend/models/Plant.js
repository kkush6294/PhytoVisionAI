const mongoose = require('mongoose');

const plantSchema = new mongoose.Schema({
  scientificName: { type: String, required: true, unique: true },
  commonName: { type: String },
  alternateNames: [{ type: String }],
  taxonomy: { type: Object }, // e.g., family, order, genus
  medicinalProperties: [{ type: String }],
  compounds: [{ type: String }],
  safety: { type: Object }, // toxicity, dosage, contraindications
  extraction: { type: Object }, // methods, yields
  literature: [{ type: Object }], // title, url, source
  source: { type: String }, // where data originated
  sourceType: { type: String }, // API name
  modelClass: { type: String }, // class label from model
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Plant', plantSchema);
