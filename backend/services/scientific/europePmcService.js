const axios = require('axios');

const EUROPE_PMC_URL =
    'https://www.ebi.ac.uk/europepmc/webservices/rest/search';

async function searchMedicinalEvidence(scientificName) {
    if (!scientificName || scientificName === 'Unknown') {
        return {
            available: false,
            source: 'Europe PMC',
            results: []
        };
    }

    try {
        const query =
            `"${scientificName}" AND (medicinal OR medicinal plant OR pharmacological OR therapeutic)`;

        const response = await axios.get(
            EUROPE_PMC_URL,
            {
                params: {
                    query,
                    format: 'json',
                    resultType: 'core',
                    pageSize: 10
                },
                timeout: 15000
            }
        );

        const results =
            response.data?.resultList?.result || [];

        return {
            available: true,
            source: 'Europe PMC',
            query,
            results: results.map(article => ({
                id: article.id || null,
                source: article.source || null,
                title: article.title || null,
                authors: article.authorString || null,
                journal: article.journalTitle || null,
                publicationDate: article.firstPublicationDate || null,
                doi: article.doi || null,
                pmid: article.pmid || null,
                abstract: article.abstractText || null,
                citedByCount: article.citedByCount || 0
            }))
        };
    } catch (error) {
        console.error(
            '[Europe PMC] Request failed:',
            error.message
        );

        return {
            available: false,
            source: 'Europe PMC',
            results: [],
            error: error.message
        };
    }
}

module.exports = {
    searchMedicinalEvidence
};