const axios = require('axios');

const CROSSREF_URL =
    'https://api.crossref.org/works';

async function searchResearchPapers(scientificName) {
    if (!scientificName || scientificName === 'Unknown') {
        return {
            available: false,
            source: 'Crossref',
            results: []
        };
    }

    try {
        const response = await axios.get(
            CROSSREF_URL,
            {
                params: {
                    query: `"${scientificName}" medicinal`,
                    rows: 10,
                    select:
                        'DOI,title,author,published,container-title,publisher,type'
                },
                headers: {
                    'User-Agent':
                        'PhytoVisionAI-Research/1.0'
                },
                timeout: 15000
            }
        );

        const items =
            response.data?.message?.items || [];

        return {
            available: true,
            source: 'Crossref',
            query: scientificName,
            results: items.map(item => ({
                doi: item.DOI || null,
                title: item.title?.[0] || null,
                authors: item.author || [],
                published:
                    item.published?.['date-parts']?.[0] || null,
                journal:
                    item['container-title']?.[0] || null,
                publisher: item.publisher || null,
                type: item.type || null
            }))
        };
    } catch (error) {
        console.error(
            '[Crossref] Request failed:',
            error.message
        );

        return {
            available: false,
            source: 'Crossref',
            results: [],
            error: error.message
        };
    }
}

module.exports = {
    searchResearchPapers
};