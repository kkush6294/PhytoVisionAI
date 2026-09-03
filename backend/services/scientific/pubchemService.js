const axios = require('axios');

const PUBCHEM_BASE_URL =
    'https://pubchem.ncbi.nlm.nih.gov/rest/pug';

const REQUEST_TIMEOUT = 15000;
const MAX_COMPOUNDS = 8;

/*
 * Known phytochemical candidates for the plants
 * in the PhytoVisionAI dataset.
 *
 * These are candidate names only.
 * Every compound is verified against PubChem
 * before it is returned to the frontend.
 */
const PLANT_COMPOUND_CANDIDATES = {

    Aloevera: [
        'Aloin',
        'Aloesin',
        'Acemannan',
        'Emodin',
        'Anthraquinone'
    ],

    Neem: [
        'Azadirachtin',
        'Nimbin',
        'Nimbolide',
        'Quercetin',
        'Catechin',
        'Azadirone'
    ],

    Amla: [
        'Emblicanin A',
        'Emblicanin B',
        'Gallic acid',
        'Ellagic acid',
        'Ascorbic acid'
    ],

    Ashoka: [
        'Quercetin',
        'Kaempferol',
        'Catechin',
        'Epicatechin',
        'Gallic acid'
    ],

    Ashwagandha: [
        'Withaferin A',
        'Withanolide A',
        'Withanolide D',
        'Withanone',
        'Withanoside IV'
    ],

    Brahmi: [
        'Bacoside A',
        'Bacopaside I',
        'Bacopaside II',
        'Bacopasaponin C',
        'Brahmine'
    ],

    Betel: [
        'Eugenol',
        'Hydroxychavicol',
        'Chavibetol',
        'Chavicol',
        'Estragole'
    ],

    Castor: [
        'Ricinoleic acid',
        'Linoleic acid',
        'Oleic acid',
        'Palmitic acid',
        'Stearic acid'
    ],

    Curry_Leaf: [
        'Mahanimbine',
        'Girinimbine',
        'Murrayanine',
        'Murrayafoline A',
        'Carbazole'
    ],

    Doddapatre: [
        'Carvacrol',
        'Thymol',
        'Rosmarinic acid',
        'Caffeic acid',
        'Ursolic acid'
    ],

    Gauva: [
        'Quercetin',
        'Guavin B',
        'Lycopene',
        'Gallic acid',
        'Catechin'
    ],

    Geranium: [
        'Citronellol',
        'Geraniol',
        'Citral',
        'Linalool',
        'Eugenol'
    ],

    Henna: [
        'Lawsone',
        'Gallic acid',
        'Quercetin',
        'Kaempferol',
        'Coumarin'
    ],

    Hibiscus: [
        'Delphinidin',
        'Cyanidin',
        'Quercetin',
        'Kaempferol',
        'Hibiscetin'
    ],

    Honge: [
        'Karanjin',
        'Pongamol',
        'Pongapin',
        'Glabrachalcone',
        'Quercetin'
    ],

    Insulin: [
        'Corosolic acid',
        'Oleanolic acid',
        'Ursolic acid',
        'Quercetin',
        'Kaempferol'
    ],

    Jasmine: [
        'Linalool',
        'Benzyl acetate',
        'Benzyl alcohol',
        'Indole',
        'Jasmone'
    ],

    Lemon: [
        'Limonene',
        'Citral',
        'Hesperidin',
        'Eriocitrin',
        'Naringin'
    ],

    Lemon_grass: [
        'Citral',
        'Geraniol',
        'Limonene',
        'Myrcene',
        'Linalool'
    ],

    Mint: [
        'Menthol',
        'Menthone',
        'Menthyl acetate',
        'Rosmarinic acid',
        'Eriocitrin'
    ],

    Nagadali: [
        'Rutin',
        'Quercetin',
        'Kaempferol',
        'Skimmianine',
        'Graveoline'
    ],

    Pappaya: [
        'Papain',
        'Carpaine',
        'Benzyl isothiocyanate',
        'Quercetin',
        'Kaempferol'
    ],

    Pomegranate: [
        'Punicalagin',
        'Ellagic acid',
        'Punicalin',
        'Gallic acid',
        'Anthocyanin'
    ],

    Pepper: [
        'Piperine',
        'Chavicine',
        'Piperidine',
        'β-Caryophyllene',
        'Limonene'
    ],

    Raktachandini: [
        'Brazilin',
        'Brazilein',
        'Protosappanin A',
        'Sappanchalcone',
        'Quercetin'
    ],

    Rose: [
        'Geraniol',
        'Citronellol',
        'Nerol',
        'Kaempferol',
        'Quercetin'
    ],

    Sapota: [
        'Catechin',
        'Quercetin',
        'Gallic acid',
        'Tannic acid',
        'Lupeol'
    ],

    Tulasi: [
        'Eugenol',
        'Rosmarinic acid',
        'Ursolic acid',
        'Apigenin',
        'Linalool'
    ],

    Mango: [
        'Mangiferin',
        'Quercetin',
        'Gallic acid',
        'Catechin',
        'Mangiferin'
    ],

    Wood_sorel: [
        'Oxalic acid',
        'Quercetin',
        'Kaempferol',
        'Luteolin',
        'Ascorbic acid'
    ],

    Amruta_Balli: [
        'Berberine',
        'Tinosporaside',
        'Cordifolioside A',
        'Magnoflorine',
        'Palmatine'
    ],

    Arali: [
        'Oleandrin',
        'Oleandrigenin',
        'Neriin',
        'Adynerin',
        'Ursolic acid'
    ],

    Avacado: [
        'Persin',
        'Avocadene',
        'Avocadyne',
        'Lutein',
        'Oleic acid'
    ],

    Bamboo: [
        'Orientin',
        'Isoorientin',
        'Vitexin',
        'Chlorogenic acid',
        'Caffeic acid'
    ],

    Basale: [
        'Gomphrenin',
        'Ascorbic acid',
        'Quercetin',
        'Kaempferol',
        'Beta-carotene'
    ],

    Betel_Nut: [
        'Arecoline',
        'Arecaidine',
        'Guvacine',
        'Guvacoline',
        'Procyanidin'
    ],

    Ekka: [
        'Calotropin',
        'Uscharin',
        'Calactin',
        'Giganteol',
        'Alpha-amyrin'
    ],

    Ganike: [
        'Solamargine',
        'Solasonine',
        'Solanine',
        'Diosgenin',
        'Quercetin'
    ],

    Nithyapushpa: [
        'Vinblastine',
        'Vincristine',
        'Vindoline',
        'Catharanthine',
        'Ajmalicine'
    ],

    Nooni: [
        'Damnacanthal',
        'Scopoletin',
        'Nordamnacanthal',
        'Morindone',
        'Alizarin'
    ]
};


/*
 * Normalize plant class names.
 */
function normalizePlantClass(scientificName) {

    if (!scientificName) {
        return null;
    }

    const normalized = scientificName
        .toLowerCase()
        .trim();

    const mappings = {
        'aloe vera': 'Aloevera',
        'azadirachta indica': 'Neem',
        'phyllanthus emblica': 'Amla',
        'saraca asoca': 'Ashoka',
        'withania somnifera': 'Ashwagandha',
        'bacopa monnieri': 'Brahmi',
        'piper betle': 'Betel',
        'ricinus communis': 'Castor',
        'murraya koenigii': 'Curry_Leaf',
        'coleus amboinicus': 'Doddapatre',
        'psidium guajava': 'Gauva',
        'pelargonium graveolens': 'Geranium',
        'lawsonia inermis': 'Henna',
        'hibiscus rosa-sinensis': 'Hibiscus',
        'pongamia pinnata': 'Honge',
        'costus igneus': 'Insulin',
        'jasminum auriculatum': 'Jasmine',
        'citrus limon': 'Lemon',
        'cymbopogon citratus': 'Lemon_grass',
        'mentha arvensis': 'Mint',
        'ruta graveolens': 'Nagadali',
        'carica papaya': 'Pappaya',
        'punica granatum': 'Pomegranate',
        'piper nigrum': 'Pepper',
        'caesalpinia sappan': 'Raktachandini',
        'rosa indica': 'Rose',
        'manilkara zapota': 'Sapota',
        'ocimum tenuiflorum': 'Tulasi',
        'mangifera indica': 'Mango',
        'oxalis corniculata': 'Wood_sorel',
        'tinospora cordifolia': 'Amruta_Balli',
        'nerium oleander': 'Arali',
        'persea americana': 'Avacado',
        'bambusa vulgaris': 'Bamboo',
        'basella alba': 'Basale',
        'areca catechu': 'Betel_Nut',
        'calotropis gigantea': 'Ekka',
        'solanum nigrum': 'Ganike',
        'catharanthus roseus': 'Nithyapushpa',
        'morinda citrifolia': 'Nooni'
    };

    return mappings[normalized] || null;
}


/*
 * Resolve scientific name to PubChem taxonomy ID.
 */
async function getTaxonomyId(scientificName) {

    const url =
        `${PUBCHEM_BASE_URL}/taxonomy/synonym/` +
        `${encodeURIComponent(scientificName)}/summary/JSON`;

    try {

        const response = await axios.get(url, {
            timeout: REQUEST_TIMEOUT
        });

        const information =
            response.data?.InformationList?.Information || [];

        if (!information.length) {
            return null;
        }

        return information[0]?.TaxonomyID || null;

    } catch (error) {

        console.error(
            '[PubChem] Taxonomy lookup failed:',
            error.message
        );

        return null;
    }
}


/*
 * Search PubChem for a compound name.
 *
 * Example:
 *
 * Azadirachtin
 *      ↓
 * CID 5281303
 */
async function searchCompoundByName(compoundName) {

    const url =
        `${PUBCHEM_BASE_URL}/compound/name/` +
        `${encodeURIComponent(compoundName)}/cids/JSON`;

    try {

        const response = await axios.get(url, {
            timeout: REQUEST_TIMEOUT
        });

        const cids =
            response.data?.IdentifierList?.CID || [];

        return cids
            .map(Number)
            .filter(Number.isInteger);

    } catch (error) {

        console.log(
            `[PubChem] Compound not found: ${compoundName}`
        );

        return [];
    }
}


/*
 * Retrieve chemical properties for CIDs.
 */
async function getCompoundProperties(cids) {

    if (!cids.length) {
        return [];
    }

    const url =
        `${PUBCHEM_BASE_URL}/compound/cid/` +
        `${cids.join(',')}/property/` +
        `Title,IUPACName,ConnectivitySMILES/JSON`;

    try {

        const response = await axios.get(url, {
            timeout: REQUEST_TIMEOUT
        });

        const properties =
            response.data?.PropertyTable?.Properties || [];

        return properties.map((compound, index) => ({

            rank: index + 1,

            cid:
                compound.CID || null,

            name:
                compound.Title || null,

            iupacName:
                compound.IUPACName || null,

            connectivitySMILES:
                compound.ConnectivitySMILES || null,

            pubchemUrl:
                compound.CID
                    ? `https://pubchem.ncbi.nlm.nih.gov/compound/${compound.CID}`
                    : null
        }));

    } catch (error) {

        console.error(
            '[PubChem] Property lookup failed:',
            error.message
        );

        return [];
    }
}


/*
 * Get candidate phytochemicals for the detected plant.
 */
function getCandidateCompounds(scientificName) {

    const plantClass =
        normalizePlantClass(scientificName);

    if (!plantClass) {
        return [];
    }

    return [
        ...new Set(
            PLANT_COMPOUND_CANDIDATES[plantClass] || []
        )
    ];
}


/*
 * Main compound search function.
 */
async function searchCompounds(scientificName) {

    if (
        !scientificName ||
        scientificName === 'Unknown'
    ) {

        return {
            available: false,
            source: 'PubChem',
            compounds: []
        };
    }

    try {

        console.log(
            `[PubChem] Searching compounds for: ${scientificName}`
        );

        /*
         * --------------------------------------------------
         * 1. Resolve plant taxonomy
         * --------------------------------------------------
         */

        const taxonomyId =
            await getTaxonomyId(scientificName);

        console.log(
            `[PubChem] Taxonomy ID: ${taxonomyId}`
        );


        /*
         * --------------------------------------------------
         * 2. Get known candidate phytochemicals
         * --------------------------------------------------
         */

        const candidateNames =
            getCandidateCompounds(scientificName);

        console.log(
            `[PubChem] Candidate compounds: ${candidateNames.join(', ')}`
        );


        /*
         * --------------------------------------------------
         * 3. Resolve candidates to PubChem CIDs
         *
         * Sequential requests are intentionally used to
         * avoid sending too many requests to PubChem.
         * --------------------------------------------------
         */

        const verifiedCids = [];

        for (const candidateName of candidateNames) {

            if (
                verifiedCids.length >= MAX_COMPOUNDS
            ) {
                break;
            }

            const cids =
                await searchCompoundByName(
                    candidateName
                );

            if (cids.length) {

                const cid = cids[0];

                if (
                    !verifiedCids.some(
                        item => item.cid === cid
                    )
                ) {

                    verifiedCids.push({
                        cid,
                        requestedName: candidateName
                    });

                    console.log(
                        `[PubChem] Verified: ${candidateName} → CID ${cid}`
                    );
                }
            }
        }


        /*
         * --------------------------------------------------
         * 4. No verified compounds
         * --------------------------------------------------
         */

        if (!verifiedCids.length) {

            return {

                available: true,

                source: 'PubChem',

                query: scientificName,

                taxonomyId,

                compounds: [],

                message:
                    'No verified PubChem compound records were found for the configured phytochemical candidates.'
            };
        }


        /*
         * --------------------------------------------------
         * 5. Retrieve actual chemical properties
         * --------------------------------------------------
         */

        const compounds =
            await getCompoundProperties(
                verifiedCids.map(item => item.cid)
            );


        /*
         * --------------------------------------------------
         * 6. Preserve candidate names when PubChem
         * does not provide a Title.
         * --------------------------------------------------
         */

        const finalCompounds =
            compounds.map(compound => {

                const matchingCandidate =
                    verifiedCids.find(
                        item =>
                            item.cid === compound.cid
                    );

                return {

                    ...compound,

                    name:
                        compound.name ||
                        matchingCandidate?.requestedName ||
                        'Unknown compound'
                };
            });


        console.log(
            `[PubChem] Successfully retrieved ${finalCompounds.length} compounds`
        );


        /*
         * --------------------------------------------------
         * 7. Return final response
         * --------------------------------------------------
         */

        return {

            available: true,

            source: 'PubChem',

            query: scientificName,

            taxonomyId,

            compounds: finalCompounds,

            message:
                'Compounds were resolved from configured phytochemical candidates and verified against PubChem.'
        };

    } catch (error) {

        console.error(
            '[PubChem] Request failed:',
            error.message
        );

        return {

            available: false,

            source: 'PubChem',

            query: scientificName,

            compounds: [],

            error: error.message
        };
    }
}


module.exports = {
    searchCompounds
};