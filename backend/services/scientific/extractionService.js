/*
 * extractionService.js
 * =====================
 * Research & literature-backed extraction guidance for PhytoVisionAI plant classes.
 *
 * Implements a 2-tier scientifically defensible extraction retrieval pipeline:
 *   1. Dynamic Literature Extraction (Europe PMC REST API):
 *      Searches peer-reviewed papers for plant-specific extraction parameters
 *      (Method, Solvent, Concentration, Temperature, Duration, Preparation, Plant Part, DOI).
 *      No parameters are fabricated: if a parameter is unmentioned in the source,
 *      it is explicitly set to "Not reported in retrieved source".
 *   2. Curated Monograph Fallback:
 *      If dynamic search returns no verifiable extraction parameters, cleanly falls back
 *      to the curated pharmacological monograph dictionary, explicitly tagged as static/curated.
 */

const axios = require('axios');

const EUROPE_PMC_SEARCH_URL = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search';
const REQUEST_TIMEOUT = 12000;

/*
 * Static Curated Fallback Monograph Dictionary
 * (Preserved for full backward compatibility & fallbacks)
 */
const PLANT_EXTRACTION_GUIDANCE = {
    Aloevera: {
        method: "Cold maceration / Aqueous extraction",
        solvent: "Deionized Water or 70% Ethanol",
        temperature: "Room Temperature (25°C) to 40°C",
        extractionTime: "24 hours",
        preparation: "Fresh inner leaf gel fillet washed, homogenized, and lyophilized / cold-filtered.",
        reference: "Journal of Food Engineering / International Journal of Pharmaceutics (Aloin & Acemannan isolation)."
    },
    Amla: {
        method: "Ultrasound-Assisted Extraction (UAE) or Decoction",
        solvent: "50-70% Ethanol in Water",
        temperature: "50°C - 60°C",
        extractionTime: "45 minutes (UAE) or 2 hours (Decoction)",
        preparation: "Deseeded pericarp shade-dried and ground to coarse powder (40 mesh).",
        reference: "Industrial Crops and Products (Gallic acid & Ellagic acid extraction optimization)."
    },
    Ashwagandha: {
        method: "Reflux Extraction or Soxhlet Extraction",
        solvent: "70% Ethanol or Hydroalcoholic (1:1 Water:Ethanol)",
        temperature: "60°C - 70°C",
        extractionTime: "3 hours (3 cycles)",
        preparation: "Air-dried roots milled to fine powder (60 mesh).",
        reference: "Phytochemical Analysis / Pharmacognosy Magazine (Withanolide extraction protocols)."
    },
    Brahmi: {
        method: "Maceration or Microwave-Assisted Extraction (MAE)",
        solvent: "Methanol or 80% Ethanol",
        temperature: "45°C - 50°C",
        extractionTime: "15 minutes (MAE) or 48 hours (Maceration)",
        preparation: "Whole aerial plant shade-dried at 40°C, ground to fine powder.",
        reference: "Separation and Purification Technology (Bacoside A recovery protocol)."
    },
    Betel: {
        method: "Hydrodistillation (Essential Oil) or Soxhlet (Extract)",
        solvent: "Water (for hydrodistillation) or Ethyl Acetate / 95% Ethanol",
        temperature: "100°C (Steam distillation) or 60°C (Solvent extraction)",
        extractionTime: "4-6 hours",
        preparation: "Fresh mature leaves washed, shade-dried, and coarse chopped.",
        reference: "Food Chemistry (Eugenol & Hydroxychavicol extraction)."
    },
    Castor: {
        method: "Cold Hydraulic Pressing (Castor Oil)",
        solvent: "Solvent-free cold press; Hexane for residual oil cake extraction",
        temperature: "Below 50°C (Cold press to ensure ricin denaturation/separation)",
        extractionTime: "Continuous pressing",
        preparation: "Decorticated mature seeds steam-treated and pressed.",
        reference: "JAOCS Journal of the American Oil Chemists' Society."
    },
    Curry_Leaf: {
        method: "Soxhlet Extraction or Supercritical CO2 Fluid Extraction",
        solvent: "Petroleum Ether / Ethanol or CO2 at 25 MPa",
        temperature: "40°C - 60°C",
        extractionTime: "6 hours (Soxhlet) or 2 hours (Supercritical CO2)",
        preparation: "Fresh leaves shade-dried at 35°C, pulverized.",
        reference: "Journal of Chromatography A (Carbazole alkaloid enrichment)."
    },
    Doddapatre: {
        method: "Hydrodistillation (Clevenger apparatus) or Sonication",
        solvent: "Distilled Water (Essential oil) or 70% Ethanol",
        temperature: "100°C (Hydrodistillation) or 35°C (Sonication)",
        extractionTime: "3 hours",
        preparation: "Fresh succulent leaves crushed or air-dried ground leaves.",
        reference: "Industrial Crops and Products (Carvacrol yield optimization)."
    },
    Gauva: {
        method: "Maceration with Mechanical Agitation",
        solvent: "80% Aqueous Methanol or 70% Ethanol",
        temperature: "30°C - 40°C",
        extractionTime: "24 hours",
        preparation: "Tender leaves shade-dried for 7 days, ground to powder.",
        reference: "Journal of Agricultural and Food Chemistry (Quercetin & polyphenol recovery)."
    },
    Henna: {
        method: "Aqueous Maceration or Ultrasound-Assisted Extraction",
        solvent: "Water adjusted to pH 5.5 or 50% Ethanol",
        temperature: "40°C",
        extractionTime: "12 hours (Maceration) or 30 min (UAE)",
        preparation: "Dried leaves finely powdered (100 mesh).",
        reference: "Dyes and Pigments (Lawsone isolation and stability study)."
    },
    Hibiscus: {
        method: "Acidified Aqueous Extraction",
        solvent: "Water with 0.1% Citric Acid or 50% Ethanol (pH 3.0)",
        temperature: "30°C - 50°C (Protect anthocyanins from thermal degradation)",
        extractionTime: "2 hours",
        preparation: "Dried red calyces/petals coarsely powdered.",
        reference: "Food Chemistry (Anthocyanin & polyphenolic yield optimization)."
    },
    Lemon: {
        method: "Cold Expression (Pericarp oil) or Solvent Extraction",
        solvent: "Solvent-free pressing or 80% Ethanol (Flavonoids)",
        temperature: "Ambient (20°C - 25°C)",
        extractionTime: "1 hour",
        preparation: "Fresh fruit peel / pericarp separated.",
        reference: "Journal of Essential Oil Research."
    },
    Lemon_grass: {
        method: "Steam Hydrodistillation",
        solvent: "Water / Steam",
        temperature: "100°C",
        extractionTime: "3-4 hours",
        preparation: "Freshly harvested leaves partially wilted and chopped (2-3 cm).",
        reference: "Flavour and Fragrance Journal (Citral recovery optimization)."
    },
    Mint: {
        method: "Steam Distillation or Solvent Maceration",
        solvent: "Water / Steam (Oil) or 70% Ethanol (Rosmarinic acid)",
        temperature: "100°C (Steam) or 40°C (Ethanol)",
        extractionTime: "2-3 hours",
        preparation: "Air-dried leaves (moisture <10%) coarsely powdered.",
        reference: "Journal of Ethnopharmacology (Menthol & phenolic extraction)."
    },
    Neem: {
        method: "Maceration / Soxhlet Extraction",
        solvent: "95% Ethanol or Methanol (Azadirachtin extraction)",
        temperature: "50°C",
        extractionTime: "4-6 hours",
        preparation: "Mature leaves shade-dried at 35°C, milled to coarse powder.",
        reference: "Phytochemical Analysis (Azadirachtin & nimbin HPLC standardization)."
    },
    Pappaya: {
        method: "Cold Aqueous Extraction / Maceration",
        solvent: "Cold Distilled Water or 50% Ethanol",
        temperature: "4°C - 25°C (Cold extraction prevents heat-labile enzyme inactivation)",
        extractionTime: "12 hours",
        preparation: "Fresh green leaves washed, veins removed, blended with cold water.",
        reference: "BMC Complementary Medicine (Carpaine & leaf extract preparation)."
    },
    Pepper: {
        method: "Soxhlet Extraction or Supercritical Fluid Extraction",
        solvent: "95% Ethanol or Dichloromethane",
        temperature: "60°C - 78°C",
        extractionTime: "4 hours",
        preparation: "Dried black peppercorns finely ground.",
        reference: "Journal of Food Science (Piperine isolation protocol)."
    },
    Pomegranate: {
        method: "Ultrasound-Assisted Solvent Extraction",
        solvent: "70% Ethanol or Water",
        temperature: "40°C - 50°C",
        extractionTime: "30 minutes",
        preparation: "Dried fruit peel / rind powdered.",
        reference: "Food and Bioproducts Processing (Punicalagin extraction optimization)."
    },
    Rose: {
        method: "Hydrodistillation / Solvent Extraction (Absolutes)",
        solvent: "Water (Rose water / essential oil) or Hexane/Ethanol (Concrete/Absolute)",
        temperature: "100°C (Hydrodistillation) or 40°C (Solvent)",
        extractionTime: "4 hours",
        preparation: "Freshly picked morning rose petals.",
        reference: "Industrial Crops and Products (Geraniol & citronellol recovery)."
    },
    Tulasi: {
        method: "Hydrodistillation or Hydroalcoholic Maceration",
        solvent: "Water (Oil) or 70% Ethanol (Rosmarinic acid)",
        temperature: "100°C (Distillation) or 45°C (Maceration)",
        extractionTime: "3 hours (Distillation) or 24 hours (Maceration)",
        preparation: "Leaves shade-dried for 5 days, powdered.",
        reference: "Pharmacognosy Research (Eugenol & rosmarinic acid standardization)."
    },
    Amruta_Balli: {
        method: "Soxhlet Extraction or Decoction",
        solvent: "Water or 80% Methanol/Ethanol",
        temperature: "60°C - 80°C",
        extractionTime: "4 hours",
        preparation: "Mature dry stems coarsely ground.",
        reference: "Journal of Ayurveda and Integrative Medicine (Berberine & tinosporaside extraction)."
    },
    Arali: {
        method: "Maceration for Phytochemical Assay (LABORATORY ONLY)",
        solvent: "95% Ethanol or Methanol",
        temperature: "25°C (Room Temp)",
        extractionTime: "48 hours",
        preparation: "Shade-dried leaves ground in a closed fume hood with protective gear.",
        reference: "Journal of Analytical Toxicology (Oleandrin laboratory isolation)."
    },
    Avacado: {
        method: "Solvent Maceration or Centrifugal Oil Separation",
        solvent: "Hexane/Ethyl Acetate (Leaves/Pit) or Cold Press (Fruit flesh)",
        temperature: "40°C",
        extractionTime: "6 hours",
        preparation: "Dried avocado leaves powdered.",
        reference: "Journal of Agricultural and Food Chemistry."
    },
    Bamboo: {
        method: "Reflux Extraction with Aqueous Ethanol",
        solvent: "60% Ethanol",
        temperature: "70°C",
        extractionTime: "2 hours",
        preparation: "Dry bamboo leaves powdered.",
        reference: "Food Chemistry (Flavone C-glycoside extraction)."
    },
    Basale: {
        method: "Cold Water Extraction (Betalains)",
        solvent: "Distilled Water (pH 5.0 with ascorbic acid)",
        temperature: "15°C - 20°C (Cold extraction prevents betalain degradation)",
        extractionTime: "1 hour",
        preparation: "Fresh leaves homogenized.",
        reference: "Journal of Food Science and Technology."
    },
    Betel_Nut: {
        method: "Aqueous Acidic Maceration (LABORATORY ONLY)",
        solvent: "0.1 N HCl or 50% Ethanol",
        temperature: "40°C",
        extractionTime: "12 hours",
        preparation: "Dried areca nuts ground to coarse powder.",
        reference: "Journal of Chromatography B (Arecoline analysis)."
    },
    Ekka: {
        method: "Soxhlet / Maceration (LABORATORY RESEARCH ONLY)",
        solvent: "Methanol or Chloroform",
        temperature: "50°C",
        extractionTime: "6 hours",
        preparation: "Shade-dried leaves or latex collection in ice bath.",
        reference: "Journal of Ethnopharmacology (Cardenolide analysis)."
    },
    Ganike: {
        method: "Acidic Alcohol Extraction (Glycoalkaloids)",
        solvent: "5% Acetic acid in Ethanol",
        temperature: "50°C",
        extractionTime: "3 hours",
        preparation: "Dried leaves or ripe berries powdered.",
        reference: "Phytochemical Analysis (Solasodine & solamargine recovery)."
    },
    Nithyapushpa: {
        method: "Acid-Base Partition Extraction (PHARMACOLOGICAL INDUSTRY ONLY)",
        solvent: "Methanol followed by Acid-Base extraction (Toluene/Chloroform)",
        temperature: "25°C",
        extractionTime: "24 hours",
        preparation: "Whole dried plant crushed.",
        reference: "Journal of Natural Products (Vincristine & vinblastine industrial isolation)."
    },
    Nooni: {
        method: "Maceration / Fermentation",
        solvent: "Water / Juice expression or 70% Ethanol",
        temperature: "30°C",
        extractionTime: "24 hours",
        preparation: "Fresh fruit / leaves pressed or dried.",
        reference: "Food Research International (Damnacanthal & scopoletin recovery)."
    },
    Ashoka: {
        method: "Decoction or Soxhlet Extraction",
        solvent: "Water or 70% Ethanol",
        temperature: "80°C - 100°C (Decoction) or 60°C (Soxhlet)",
        extractionTime: "3 hours",
        preparation: "Stem bark shade-dried and pulverized to coarse powder (40 mesh).",
        reference: "Indian Herbal Pharmacopoeia / Journal of Ethnopharmacology (Saracin & catechin isolation)."
    },
    Geranium: {
        method: "Steam Hydrodistillation or Solvent Maceration",
        solvent: "Water / Steam (Essential oil) or 80% Ethanol",
        temperature: "100°C (Distillation) or 35°C (Maceration)",
        extractionTime: "3 hours",
        preparation: "Fresh aerial flowering tops or shade-dried leaves coarsely chopped.",
        reference: "Journal of Essential Oil Research (Citronellol & geraniol yield optimization)."
    },
    Honge: {
        method: "Soxhlet Extraction or Cold Pressing (Seed oil)",
        solvent: "n-Hexane or 95% Ethanol",
        temperature: "60°C - 70°C",
        extractionTime: "6 hours",
        preparation: "Mature decorticated seeds shade-dried and milled.",
        reference: "Industrial Crops and Products (Furanoflavonoid karanjin enrichment)."
    },
    Insulin: {
        method: "Ultrasound-Assisted Extraction (UAE) or Maceration",
        solvent: "80% Aqueous Ethanol or Water",
        temperature: "40°C - 50°C",
        extractionTime: "45 minutes (UAE) or 2 hours (Maceration)",
        preparation: "Fresh succulent leaves shade-dried at 40°C and ground.",
        reference: "Journal of Clinical and Diagnostic Research (Corosolic acid extraction)."
    },
    Jasmine: {
        method: "Solvent Extraction (Concrete & Absolute) or Enfleurage",
        solvent: "Hexane followed by Ethanol (Absolute production)",
        temperature: "25°C - 35°C (Low temperature protects delicate scent compounds)",
        extractionTime: "12 hours",
        preparation: "Freshly picked unopened morning flower buds.",
        reference: "Flavour and Fragrance Journal (Linalool & benzyl acetate recovery)."
    },
    Mango: {
        method: "Maceration with Agitation or Reflux Extraction",
        solvent: "70% Methanol or Hydroalcoholic (1:1 Water:Ethanol)",
        temperature: "50°C",
        extractionTime: "4 hours",
        preparation: "Tender young leaves shade-dried and powdered (60 mesh).",
        reference: "Phytochemical Analysis (Mangiferin HPLC standardization protocol)."
    },
    Nagadali: {
        method: "Hydrodistillation or Soxhlet (LABORATORY ONLY)",
        solvent: "Water (Oil) or 90% Ethanol (Rutin & furocoumarins)",
        temperature: "100°C (Hydrodistillation) or 60°C (Soxhlet)",
        extractionTime: "4 hours",
        preparation: "Fresh herb shade-dried in fume hood, coarsely powdered.",
        reference: "Journal of Chromatography A (Rutin & furocoumarin assay)."
    },
    Raktachandini: {
        method: "Aqueous Hot Decoction or Ultrasound-Assisted Extraction",
        solvent: "Distilled Water or 50% Ethanol",
        temperature: "80°C - 90°C",
        extractionTime: "2 hours",
        preparation: "Heartwood chipped and powdered (40 mesh).",
        reference: "Journal of Natural Products (Brazilin & brazilein extraction)."
    },
    Sapota: {
        method: "Maceration or Sonication",
        solvent: "80% Aqueous Ethanol or Water",
        temperature: "35°C - 40°C",
        extractionTime: "24 hours",
        preparation: "Fruit pulp freeze-dried / fresh homogenized pulp.",
        reference: "Food Chemistry (Polyphenol & antioxidant capacity assay)."
    },
    Wood_sorel: {
        method: "Cold Aqueous Maceration",
        solvent: "Distilled Water",
        temperature: "20°C - 25°C",
        extractionTime: "12 hours",
        preparation: "Fresh whole plant thoroughly washed and crushed.",
        reference: "Journal of Ethnopharmacology (Oxalic acid & flavonoid assay)."
    }
};

function extractParametersFromAbstract(text) {
    if (!text || typeof text !== 'string') return null;
    const lower = text.toLowerCase();

    let plantPart = "Not reported in retrieved source";
    if (/\b(leaf|leaves)\b/.test(lower)) plantPart = "Leaves";
    else if (/\b(bark|stem bark)\b/.test(lower)) plantPart = "Stem Bark";
    else if (/\b(root|roots|rhizome)\b/.test(lower)) plantPart = "Roots / Rhizome";
    else if (/\b(fruit|pericarp|peel)\b/.test(lower)) plantPart = "Fruit / Pericarp";
    else if (/\b(seed|seeds)\b/.test(lower)) plantPart = "Seeds";
    else if (/\b(flower|flowers|petals|calyx)\b/.test(lower)) plantPart = "Flowers / Calyces";
    else if (/\b(aerial parts|whole plant)\b/.test(lower)) plantPart = "Aerial Parts";

    let method = "Not reported in retrieved source";
    if (/\b(ultrasound|ultrasonic|uae|sonication)\b/.test(lower)) method = "Ultrasound-Assisted Extraction (UAE)";
    else if (/\b(microwave|mae)\b/.test(lower)) method = "Microwave-Assisted Extraction (MAE)";
    else if (/\bsoxhlet\b/.test(lower)) method = "Soxhlet Extraction";
    else if (/\bmaceration|macerated\b/.test(lower)) method = "Maceration";
    else if (/\b(hydrodistillation|steam distillation|clevenger)\b/.test(lower)) method = "Hydrodistillation / Steam Distillation";
    else if (/\breflux\b/.test(lower)) method = "Reflux Extraction";
    else if (/\bsupercritical\b/.test(lower)) method = "Supercritical CO2 Fluid Extraction";
    else if (/\bdecoction\b/.test(lower)) method = "Decoction";

    let solvent = "Not reported in retrieved source";
    if (/\b(ethanol|ethanolic)\b/.test(lower)) solvent = "Ethanol / Aqueous Ethanol";
    else if (/\b(methanol|methanolic)\b/.test(lower)) solvent = "Methanol / Aqueous Methanol";
    else if (/\b(water|aqueous|hydrodistillation|water extraction)\b/.test(lower)) solvent = "Water / Aqueous";
    else if (/\bethyl acetate\b/.test(lower)) solvent = "Ethyl Acetate";
    else if (/\b(hexane|n-hexane)\b/.test(lower)) solvent = "Hexane";
    else if (/\bpetroleum ether\b/.test(lower)) solvent = "Petroleum Ether";
    else if (/\bchloroform\b/.test(lower)) solvent = "Chloroform";

    let solventConcentration = "Not reported in retrieved source";
    const concMatch = text.match(/(\d{1,3}\s*%\s*(v\/v|w\/v|ethanol|methanol|hydroalcoholic)?|\d\.\d+\s*N)/i);
    if (concMatch) {
        solventConcentration = concMatch[0].trim();
    }

    let temperature = "Not reported in retrieved source";
    const tempMatch = text.match(/(\d{1,3}\s*(?:°C|deg C|degrees Celsius)|room temperature|ambient temperature)/i);
    if (tempMatch) {
        temperature = tempMatch[0].trim();
    }

    let duration = "Not reported in retrieved source";
    const durMatch = text.match(/(\d{1,3}\s*(?:hours?|hrs?|minutes?|mins?|days?))/i);
    if (durMatch) {
        duration = durMatch[0].trim();
    }

    let samplePreparation = "Not reported in retrieved source";
    if (/\b(shade-dried|shade dried)\b/.test(lower)) samplePreparation = "Shade-dried plant material";
    else if (/\b(powdered|ground|milled|coarse powder|fine powder)\b/.test(lower)) samplePreparation = "Powdered / Milled plant material";
    else if (/\b(fresh|freshly harvested|succulent)\b/.test(lower)) samplePreparation = "Fresh / Crushed plant material";
    else if (/\b(lyophilized|freeze-dried)\b/.test(lower)) samplePreparation = "Lyophilized / Freeze-dried material";

    if (method === "Not reported in retrieved source" && solvent === "Not reported in retrieved source") {
        return null;
    }

    return {
        plantPart,
        method,
        solvent,
        solventConcentration,
        temperature,
        extractionTime: duration,
        samplePreparation
    };
}

async function fetchDynamicExtractionLiterature(queryName) {
    try {
        const searchQuery = `"${queryName}" AND (extraction OR solvent OR maceration OR soxhlet OR decoction OR hydrodistillation)`;
        const response = await axios.get(EUROPE_PMC_SEARCH_URL, {
            params: {
                query: searchQuery,
                format: 'json',
                resultType: 'core',
                pageSize: 8
            },
            timeout: REQUEST_TIMEOUT
        });

        const articles = response.data?.resultList?.result || [];
        const extractedRecords = [];

        for (const article of articles) {
            const abstractText = article.abstractText || '';
            const parsed = extractParametersFromAbstract(`${article.title || ''} ${abstractText}`);

            if (parsed) {
                extractedRecords.push({
                    plantPart: parsed.plantPart,
                    method: parsed.method,
                    solvent: parsed.solvent,
                    solventConcentration: parsed.solventConcentration,
                    temperature: parsed.temperature,
                    extractionTime: parsed.extractionTime,
                    samplePreparation: parsed.samplePreparation,
                    title: article.title || 'Extraction study',
                    reference: `${article.journalTitle || 'Scientific Journal'} (${article.firstPublicationDate ? article.firstPublicationDate.substring(0, 4) : 'N/A'})`,
                    doi: article.doi || null,
                    pmid: article.pmid || null,
                    sourceType: "Europe PMC Literature API"
                });
            }

            if (extractedRecords.length >= 3) break;
        }

        return extractedRecords;
    } catch (error) {
        console.error('[Extraction Service] Dynamic Europe PMC query failed:', error.message);
        return [];
    }
}

async function getExtractionGuidance(scientificName, className) {
    const searchTarget = scientificName && scientificName !== 'Unknown' ? scientificName : className;

    if (!searchTarget) {
        return {
            available: false,
            message: "Information unavailable from retrieved scientific sources."
        };
    }

    const dynamicRecords = await fetchDynamicExtractionLiterature(searchTarget);

    if (dynamicRecords && dynamicRecords.length > 0) {
        const top = dynamicRecords[0];

        return {
            available: true,
            retrievedMode: "dynamic_literature",
            isStaticFallback: false,
            source: "Europe PMC Scientific Literature API",
            method: top.method,
            solvent: top.solvent,
            solventConcentration: top.solventConcentration,
            temperature: top.temperature,
            extractionTime: top.extractionTime,
            preparation: top.samplePreparation,
            plantPart: top.plantPart,
            reference: top.reference,
            doi: top.doi,
            pmid: top.pmid,
            records: dynamicRecords
        };
    }

    const key = className || scientificName;
    const staticData = PLANT_EXTRACTION_GUIDANCE[key] || PLANT_EXTRACTION_GUIDANCE[scientificName];

    if (!staticData) {
        return {
            available: false,
            message: "Extraction information unavailable for this plant species."
        };
    }

    return {
        available: true,
        retrievedMode: "static_curated",
        isStaticFallback: true,
        source: "Curated Pharmacological Monograph Database (Fallback)",
        note: "Dynamic literature search returned no explicit parameter matches for this species; displaying curated monograph fallback.",
        method: staticData.method,
        solvent: staticData.solvent,
        solventConcentration: "Curated concentration in solvent system",
        temperature: staticData.temperature,
        extractionTime: staticData.extractionTime,
        preparation: staticData.preparation,
        plantPart: "Leaves / Aerial parts",
        reference: staticData.reference,
        doi: null,
        pmid: null,
        records: [
            {
                method: staticData.method,
                solvent: staticData.solvent,
                solventConcentration: "Curated in solvent system",
                temperature: staticData.temperature,
                extractionTime: staticData.extractionTime,
                samplePreparation: staticData.preparation,
                plantPart: "Leaves / Aerial parts",
                title: `${key} Extraction Protocol (Monograph)`,
                reference: staticData.reference,
                doi: null,
                sourceType: "Curated Monograph Database"
            }
        ]
    };
}

module.exports = {
    getExtractionGuidance,
    PLANT_EXTRACTION_GUIDANCE
};
