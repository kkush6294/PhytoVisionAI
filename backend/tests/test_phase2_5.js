const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const client = axios.create({
  baseURL: BASE_URL,
  validateStatus: () => true
});

const results = [];

function recordTest(id, name, endpoint, method, expectedStatus, actualStatus, passed, details = '') {
  results.push({ id, name, endpoint, method, expectedStatus, actualStatus, passed, details });
  const statusIcon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${statusIcon}] Test ${id}: ${name} (${method} ${endpoint}) -> Expected ${expectedStatus}, Got ${actualStatus} ${details ? '(' + details + ')' : ''}`);
}

async function runPhase25Tests() {
  console.log('================================================================');
  console.log('STARTING PHASE 2.5 RUNTIME VERIFICATION SUITE');
  console.log('Target Gateway:', BASE_URL);
  console.log('================================================================\n');

  try {
    // 1. GET /api/extraction/:idOrClass for valid plant by modelClass -> 200
    const res1 = await client.get('/api/extraction/Aloevera');
    const hasExtraction = res1.data?.extraction?.available === true;
    const mode1 = res1.data?.extraction?.retrievedMode;
    recordTest(1, 'GET /api/extraction/:idOrClass (Aloevera)', '/api/extraction/Aloevera', 'GET', 200, res1.status, res1.status === 200 && hasExtraction, `Mode: ${mode1}`);

    // 2. GET /api/plants/:idOrClass/extraction subroute -> 200
    const res2 = await client.get('/api/plants/Aloevera/extraction');
    recordTest(2, 'GET /api/plants/:idOrClass/extraction (Aloevera)', '/api/plants/Aloevera/extraction', 'GET', 200, res2.status, res2.status === 200 && res2.data?.plant?.scientificName === 'Aloe vera');

    // 3. GET /api/extraction/:idOrClass by valid ObjectId -> 200
    const plantsList = await client.get('/api/plants');
    const samplePlant = plantsList.data?.plants?.[0];
    const samplePlantId = samplePlant?._id;
    const res3 = await client.get(`/api/extraction/${samplePlantId}`);
    recordTest(3, 'GET /api/extraction/:idOrClass by ObjectId', `/api/extraction/${samplePlantId}`, 'GET', 200, res3.status, res3.status === 200 && res3.data?.plant?.id === samplePlantId);

    // 4. GET /api/extraction/:idOrClass for nonexistent plant -> 404
    const res4 = await client.get('/api/extraction/NonExistentPlantSpecies999');
    recordTest(4, 'GET /api/extraction/:idOrClass (nonexistent plant)', '/api/extraction/NonExistentPlantSpecies999', 'GET', 404, res4.status, res4.status === 404);

    // 5. Verify dynamic extraction vs curated monograph fallback
    // Test a plant known to return monograph fallback
    const res5 = await client.get('/api/extraction/Ashoka');
    const mode5 = res5.data?.extraction?.retrievedMode;
    const isFallback = res5.data?.extraction?.isStaticFallback;
    recordTest(5, 'Verify extraction pipeline returns valid guidance (Ashoka)', '/api/extraction/Ashoka', 'GET', 200, res5.status, res5.status === 200 && res5.data?.extraction?.available === true, `Mode: ${mode5}, Fallback: ${isFallback}`);

    // 6. GET /api/safety/:idOrClass for valid plant -> 200
    const res6 = await client.get('/api/safety/Aloevera');
    const hasSafety = !!res6.data?.safety?.recommendedDosage && !!res6.data?.safety?.toxicityLevel;
    recordTest(6, 'GET /api/safety/:idOrClass (Aloevera)', '/api/safety/Aloevera', 'GET', 200, res6.status, res6.status === 200 && hasSafety, `Toxicity: ${res6.data?.safety?.toxicityLevel}`);

    // 7. GET /api/plants/:idOrClass/safety subroute -> 200
    const res7 = await client.get('/api/plants/Aloevera/safety');
    recordTest(7, 'GET /api/plants/:idOrClass/safety (Aloevera)', '/api/plants/Aloevera/safety', 'GET', 200, res7.status, res7.status === 200 && res7.data?.plant?.scientificName === 'Aloe vera');

    // 8. GET /api/safety/:idOrClass by ObjectId -> 200
    const res8 = await client.get(`/api/safety/${samplePlantId}`);
    recordTest(8, 'GET /api/safety/:idOrClass by ObjectId', `/api/safety/${samplePlantId}`, 'GET', 200, res8.status, res8.status === 200 && res8.data?.plant?.id === samplePlantId);

    // 9. GET /api/safety/:idOrClass for nonexistent plant -> 404
    const res9 = await client.get('/api/safety/NonExistentPlantSpecies999');
    recordTest(9, 'GET /api/safety/:idOrClass (nonexistent plant)', '/api/safety/NonExistentPlantSpecies999', 'GET', 404, res9.status, res9.status === 404);

    // 10. GET /api/recommendations/condition/:condition -> 200
    const res10 = await client.get('/api/recommendations/condition/digestive');
    const count10 = res10.data?.count || 0;
    recordTest(10, 'GET /api/recommendations/condition/digestive', '/api/recommendations/condition/digestive', 'GET', 200, res10.status, res10.status === 200 && count10 > 0, `Matched plants: ${count10}`);

    // 11. POST /api/recommendations/condition with body -> 200
    const res11 = await client.post('/api/recommendations/condition', { condition: 'skin' });
    const count11 = res11.data?.count || 0;
    recordTest(11, 'POST /api/recommendations/condition ({ condition: "skin" })', '/api/recommendations/condition', 'POST', 200, res11.status, res11.status === 200 && count11 > 0, `Matched plants: ${count11}`);

    // 12. POST /api/recommendations/symptoms with body -> 200
    const res12 = await client.post('/api/recommendations/symptoms', { symptom: 'inflammatory' });
    const count12 = res12.data?.count || 0;
    recordTest(12, 'POST /api/recommendations/symptoms ({ symptom: "inflammatory" })', '/api/recommendations/symptoms', 'POST', 200, res12.status, res12.status === 200 && count12 > 0, `Matched plants: ${count12}`);

    // 13. GET /api/recommendations/condition/:condition for non-matching query -> 200 with empty list
    const res13 = await client.get('/api/recommendations/condition/nonexistentmedicalconditionxyz');
    recordTest(13, 'GET /api/recommendations for unmatched condition', '/api/recommendations/condition/nonexistentmedicalconditionxyz', 'GET', 200, res13.status, res13.status === 200 && res13.data?.count === 0, `Count: ${res13.data?.count}`);

    // 14. POST /api/recommendations/condition without query -> 400 Bad Request
    const res14 = await client.post('/api/recommendations/condition', {});
    recordTest(14, 'POST /api/recommendations/condition with missing query', '/api/recommendations/condition', 'POST', 400, res14.status, res14.status === 400);

    // ==========================================
    // REGRESSION TESTS (Phase 2.1 - 2.4)
    // ==========================================
    console.log('\n--- EXECUTING REGRESSION TESTS (PHASES 2.1 - 2.4) ---');

    // 15. GET /api/plants -> 200 and 40 plants
    const reg1 = await client.get('/api/plants');
    const plantCount = reg1.data?.total || reg1.data?.plants?.length;
    recordTest(15, 'REGRESSION: GET /api/plants (40 plants catalog)', '/api/plants', 'GET', 200, reg1.status, reg1.status === 200 && plantCount === 40, `Total plants: ${plantCount}`);

    // 16. GET /api/plants/:idOrClass -> 200
    const reg2 = await client.get('/api/plants/Aloevera');
    recordTest(16, 'REGRESSION: GET /api/plants/:idOrClass', '/api/plants/Aloevera', 'GET', 200, reg2.status, reg2.status === 200 && reg2.data?.plant?.scientificName === 'Aloe vera');

    // 17. GET /api/plants/search/:query -> 200
    const reg3 = await client.get('/api/plants/search/aloe');
    recordTest(17, 'REGRESSION: GET /api/plants/search/:query', '/api/plants/search/aloe', 'GET', 200, reg3.status, reg3.status === 200 && reg3.data?.results?.length > 0);

    // 18. GET /api/auth/me without token -> 401
    const reg4 = await client.get('/api/auth/me');
    recordTest(18, 'REGRESSION: GET /api/auth/me without token', '/api/auth/me', 'GET', 401, reg4.status, reg4.status === 401);

    // Register user for Phase 2.4 regression checks
    const userEmail = `reg_p25_${Date.now()}@example.com`;
    const regAuthRes = await client.post('/api/auth/register', {
      name: 'P25 Reg User',
      email: userEmail,
      password: 'Password123!'
    });
    const userToken = regAuthRes.data?.token;

    // 19. GET /api/auth/me with registered JWT -> 200
    const reg5 = await client.get('/api/auth/me', { headers: { Authorization: `Bearer ${userToken}` } });
    recordTest(19, 'REGRESSION: GET /api/auth/me with registered JWT', '/api/auth/me', 'GET', 200, reg5.status, reg5.status === 200 && reg5.data?.user?.email === userEmail);

    // 20. Guest POST /api/history -> 403
    const guestRes = await client.post('/api/auth/guest');
    const guestToken = guestRes.data?.token;
    const reg6 = await client.post('/api/history', { scientificName: 'Aloe vera', confidence: 0.9 }, { headers: { Authorization: `Bearer ${guestToken}` } });
    recordTest(20, 'REGRESSION: Guest POST /api/history blocked', '/api/history', 'POST', 403, reg6.status, reg6.status === 403);

    // 21. Guest POST /api/saved-plants -> 403
    const reg7 = await client.post('/api/saved-plants', { plantId: 'Aloevera' }, { headers: { Authorization: `Bearer ${guestToken}` } });
    recordTest(21, 'REGRESSION: Guest POST /api/saved-plants blocked', '/api/saved-plants', 'POST', 403, reg7.status, reg7.status === 403);

    // 22. Phase 2.4 History operations for registered user -> 201 & 200
    const reg8 = await client.post('/api/history', {
      plantId: samplePlantId,
      scientificName: samplePlant.scientificName,
      confidence: 0.9321
    }, { headers: { Authorization: `Bearer ${userToken}` } });
    const histId = reg8.data?.history?._id;
    recordTest(22, 'REGRESSION: Phase 2.4 Record history', '/api/history', 'POST', 201, reg8.status, reg8.status === 201 && !!histId);

    // 23. Phase 2.4 Get History -> 200
    const reg9 = await client.get('/api/history', { headers: { Authorization: `Bearer ${userToken}` } });
    recordTest(23, 'REGRESSION: Phase 2.4 GET history', '/api/history', 'GET', 200, reg9.status, reg9.status === 200 && reg9.data?.history?.length >= 1);

    // 24. Phase 2.4 Save plant -> 201
    const reg10 = await client.post('/api/saved-plants', { plantId: samplePlantId }, { headers: { Authorization: `Bearer ${userToken}` } });
    recordTest(24, 'REGRESSION: Phase 2.4 Save plant', '/api/saved-plants', 'POST', 201, reg10.status, reg10.status === 201);

    // 25. Phase 2.4 Check saved status -> 200 (saved: true)
    const reg11 = await client.get(`/api/saved-plants/check/${samplePlantId}`, { headers: { Authorization: `Bearer ${userToken}` } });
    recordTest(25, 'REGRESSION: Phase 2.4 Check saved status', `/api/saved-plants/check/${samplePlantId}`, 'GET', 200, reg11.status, reg11.status === 200 && reg11.data?.saved === true);

    // 26. Phase 2.4 Remove saved plant -> 200
    const reg12 = await client.delete(`/api/saved-plants/${samplePlantId}`, { headers: { Authorization: `Bearer ${userToken}` } });
    recordTest(26, 'REGRESSION: Phase 2.4 Remove saved plant', `/api/saved-plants/${samplePlantId}`, 'DELETE', 200, reg12.status, reg12.status === 200);

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('\n================================================================');
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    console.log(`TOTAL PHASE 2.5 & REGRESSION TESTS EXECUTED: ${totalTests}`);
    console.log(`PASSED: ${passedTests}`);
    console.log(`FAILED: ${failedTests}`);
    console.log('================================================================');

    if (failedTests > 0) {
      console.error('\nFAILURES:');
      results.filter(r => !r.passed).forEach(f => {
        console.error(`- Test ${f.id}: ${f.name} Expected ${f.expectedStatus}, Got ${f.actualStatus}`);
      });
      process.exit(1);
    } else {
      console.log('\nALL 26 PHASE 2.5 AND REGRESSION TESTS PASSED FULLY!');
      process.exit(0);
    }

  } catch (err) {
    console.error('Unhandled testing error:', err);
    process.exit(1);
  }
}

runPhase25Tests();

