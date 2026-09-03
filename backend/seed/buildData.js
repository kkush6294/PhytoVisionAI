const fs = require('fs');
const path = require('path');

const safety = require('../services/scientific/safetyService');
const extraction = require('../services/scientific/extractionService');
const classMapping = require('../../training/models/mobilenetv2/class_mapping.json');
const scientificMap = require('./scientific_map.json');

const pubchemContent = fs.readFileSync(path.join(__dirname, '../services/scientific/pubchemService.js'), 'utf8');
const matchCandidates = pubchemContent.match(/const PLANT_COMPOUND_CANDIDATES = ({[\s\S]*?\n};)/);
const candidates = eval('(' + matchCandidates[1].replace(/;$/, '') + ')');

const catalog = Object.keys(classMapping)
  .sort((a, b) => Number(a) - Number(b))
  .map(k => {
    const modelClass = classMapping[k];
    const sciInfo = scientificMap[modelClass] || [modelClass, modelClass];
    const scientificName = sciInfo[0];
    const commonName = sciInfo[1];
    const safe = safety.PLANT_SAFETY_EVIDENCE[modelClass] || {};
    const ext = extraction.PLANT_EXTRACTION_GUIDANCE[modelClass] || {};
    const comp = candidates[modelClass] || [];

    return {
      scientificName: scientificName,
      commonName: commonName,
      alternateNames: [modelClass, commonName].filter((v, i, a) => a.indexOf(v) === i),
      taxonomy: {
        genus: scientificName.split(' ')[0] || null,
        species: scientificName.split(' ')[1] || null
      },
      medicinalProperties: safe.safetyNotes ? [safe.safetyNotes] : [],
      compounds: comp,
      safety: {
        recommendedDosage: safe.recommendedDosage || null,
        toxicityLevel: safe.toxicityLevel || null,
        precautions: safe.precautions || [],
        safetyNotes: safe.safetyNotes || null,
        source: safe.source || null
      },
      extraction: {
        method: ext.method || null,
        solvent: ext.solvent || null,
        temperature: ext.temperature || null,
        extractionTime: ext.extractionTime || null,
        preparation: ext.preparation || null,
        reference: ext.reference || null
      },
      literature: safe.source ? [{ title: 'Botanical and Safety Monograph', source: safe.source }] : [],
      source: safe.source || 'Curated Botanical & Pharmacological Monographs',
      sourceType: 'Monograph',
      modelClass: modelClass
    };
  });

fs.writeFileSync(path.join(__dirname, 'plantsData.json'), JSON.stringify(catalog, null, 2));
console.log('Successfully wrote plantsData.json with ' + catalog.length + ' plant records.');
