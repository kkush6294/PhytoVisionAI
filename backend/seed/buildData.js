const fs = require('fs');
const path = require('path');

const safety = require('../services/scientific/safetyService');
const extraction = require('../services/scientific/extractionService');
const evidence = require('./plantEvidenceData');
const classMapping = require('../../training/models/mobilenetv2/class_mapping.json');
const scientificMap = require('./scientific_map.json');

const pubchemContent = fs.readFileSync(path.join(__dirname, '../services/scientific/pubchemService.js'), 'utf8');
const matchCandidates = pubchemContent.match(/const PLANT_COMPOUND_CANDIDATES = ({[\s\S]*?\n};)/);
const candidates = eval('(' + matchCandidates[1].replace(/;$/, '') + ')');

const catalog = Object.keys(classMapping)
  .sort((a, b) => Number(a) - Number(b))
  .map(k => {
    const modelClass = classMapping[k];
    const sciInfo = scientificMap[modelClass] || {};
    const scientificName = sciInfo.scientificName || (Array.isArray(sciInfo) ? sciInfo[0] : modelClass);
    const commonName = sciInfo.commonName || (Array.isArray(sciInfo) ? sciInfo[1] : modelClass);
    const localName = sciInfo.localName || (Array.isArray(sciInfo) ? sciInfo[2] : modelClass);
    const family = sciInfo.family || (Array.isArray(sciInfo) ? sciInfo[3] : 'Magnoliophyta');
    const genus = sciInfo.genus || scientificName.split(' ')[0] || null;
    const species = sciInfo.species || scientificName.split(' ')[1] || null;
    const safe = safety.PLANT_SAFETY_EVIDENCE[modelClass] || {};
    const ext = extraction.PLANT_EXTRACTION_GUIDANCE[modelClass] || {};
    const comp = candidates[modelClass] || [];
    const ev = evidence[modelClass] || {};

    return {
      scientificName: scientificName,
      commonName: commonName,
      localName: localName,
      alternateNames: [modelClass, commonName, localName].filter((v, i, a) => v && a.indexOf(v) === i),
      taxonomy: {
        family: family,
        genus: genus,
        species: species
      },
      medicinalProperties: ev.medicinalProperties || [],
      indications: ev.indications || [],
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
