const axios = require('axios');

const GBIF_BASE_URL = 'https://api.gbif.org/v1';

async function getTaxonomy(scientificName) {
    if (!scientificName || scientificName === 'Unknown') {
        return {
            available: false,
            source: 'GBIF',
            message: 'Scientific name unavailable.'
        };
    }

    try {
        const matchResponse = await axios.get(
            `${GBIF_BASE_URL}/species/match`,
            {
                params: {
                    name: scientificName
                },
                timeout: 10000
            }
        );

        const match = matchResponse.data;

        if (!match || !match.usageKey) {
            return {
                available: false,
                source: 'GBIF',
                searchedName: scientificName
            };
        }

        const speciesResponse = await axios.get(
            `${GBIF_BASE_URL}/species/${match.usageKey}`,
            {
                timeout: 10000
            }
        );

        const species = speciesResponse.data;

        return {
            available: true,
            source: 'GBIF',
            retrievedName: match.scientificName || scientificName,
            usageKey: match.usageKey,
            confidence: match.confidence ?? null,
            matchType: match.matchType ?? null,
            taxonomy: {
                kingdom: species.kingdom || null,
                phylum: species.phylum || null,
                class: species.class || null,
                order: species.order || null,
                family: species.family || null,
                genus: species.genus || null,
                species: species.species || null
            },
            rank: species.rank || null
        };
    } catch (error) {
        console.error('[GBIF] Request failed:', error.message);

        return {
            available: false,
            source: 'GBIF',
            searchedName: scientificName,
            error: error.message
        };
    }
}

module.exports = {
    getTaxonomy
};