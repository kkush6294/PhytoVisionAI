const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const client = axios.create({
  baseURL: BASE_URL,
  validateStatus: () => true // Do not throw on HTTP error codes
});

const results = [];

function recordTest(id, name, endpoint, method, auth, expectedStatus, actualStatus, passed, details = '') {
  const result = { id, name, endpoint, method, auth, expectedStatus, actualStatus, passed, details };
  results.push(result);
  const statusIcon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${statusIcon}] Test ${id}: ${name} (${method} ${endpoint}) -> Expected ${expectedStatus}, Got ${actualStatus} ${details ? '(' + details + ')' : ''}`);
}

async function runTests() {
  console.log('================================================================');
  console.log('STARTING PHASE 2.4 RUNTIME VERIFICATION SUITE');
  console.log('Target Gateway:', BASE_URL);
  console.log('================================================================\n');

  try {
    // 1. GET /api/history without token -> 401
    const res1 = await client.get('/api/history');
    recordTest(1, 'GET /api/history without token', '/api/history', 'GET', 'None', 401, res1.status, res1.status === 401);

    // 2. GET /api/saved-plants without token -> 401
    const res2 = await client.get('/api/saved-plants');
    recordTest(2, 'GET /api/saved-plants without token', '/api/saved-plants', 'GET', 'None', 401, res2.status, res2.status === 401);

    // 3. Obtain guest JWT
    const res3 = await client.post('/api/auth/guest');
    const guestToken = res3.data?.token;
    recordTest(3, 'Obtain guest JWT', '/api/auth/guest', 'POST', 'None', 200, res3.status, res3.status === 200 && !!guestToken, `Token obtained: ${!!guestToken}`);

    // 4. Guest POST /api/history -> 403
    const res4 = await client.post('/api/history', {
      scientificName: 'Aloe vera',
      confidence: 0.95
    }, { headers: { Authorization: `Bearer ${guestToken}` } });
    recordTest(4, 'Guest POST /api/history', '/api/history', 'POST', 'Guest', 403, res4.status, res4.status === 403);

    // 5. Guest GET /api/history -> 403
    const res5 = await client.get('/api/history', { headers: { Authorization: `Bearer ${guestToken}` } });
    recordTest(5, 'Guest GET /api/history', '/api/history', 'GET', 'Guest', 403, res5.status, res5.status === 403);

    // 6. Guest POST /api/saved-plants -> 403
    const res6 = await client.post('/api/saved-plants', { plantId: 'Aloevera' }, { headers: { Authorization: `Bearer ${guestToken}` } });
    recordTest(6, 'Guest POST /api/saved-plants', '/api/saved-plants', 'POST', 'Guest', 403, res6.status, res6.status === 403);

    // 7. Guest GET /api/saved-plants -> 403
    const res7 = await client.get('/api/saved-plants', { headers: { Authorization: `Bearer ${guestToken}` } });
    recordTest(7, 'Guest GET /api/saved-plants', '/api/saved-plants', 'GET', 'Guest', 403, res7.status, res7.status === 403);

    // 8. Register User A
    const userAEmail = `user_a_${Date.now()}@example.com`;
    const res8 = await client.post('/api/auth/register', {
      name: 'User A',
      email: userAEmail,
      password: 'Password123!'
    });
    const userAToken = res8.data?.token;
    const userAId = res8.data?.user?.id;
    recordTest(8, 'Register User A', '/api/auth/register', 'POST', 'None', 201, res8.status, res8.status === 201 && !!userAToken, `User A ID: ${userAId}`);

    // Get an actual plant from the catalog to test with
    const plantsListRes = await client.get('/api/plants');
    const samplePlant = plantsListRes.data?.plants?.[0]; // Aloe vera
    if (!samplePlant) {
      throw new Error('Could not retrieve sample plant from /api/plants');
    }
    const samplePlantId = samplePlant._id;
    const samplePlantName = samplePlant.scientificName;
    console.log(`Using sample plant: ID=${samplePlantId}, scientificName=${samplePlantName}, modelClass=${samplePlant.modelClass}`);

    // 9. Record history for an ACTUAL existing plant from MongoDB -> 201
    const res9 = await client.post('/api/history', {
      plantId: samplePlantId,
      scientificName: samplePlantName,
      confidence: 0.9452,
      modelVersion: 'MobileNetV2-1.0.0',
      notes: 'Test identification note'
    }, { headers: { Authorization: `Bearer ${userAToken}` } });
    const historyId = res9.data?.history?._id;
    recordTest(9, 'Record history for actual plant (User A)', '/api/history', 'POST', 'User A', 201, res9.status, res9.status === 201 && !!historyId, `History ID: ${historyId}`);

    // 10. GET User A history -> 200
    const res10 = await client.get('/api/history', { headers: { Authorization: `Bearer ${userAToken}` } });
    const userAHistoryCount = res10.data?.history?.length || 0;
    recordTest(10, 'GET User A history', '/api/history', 'GET', 'User A', 200, res10.status, res10.status === 200 && userAHistoryCount >= 1, `Count: ${userAHistoryCount}`);

    // 11. GET individual history record -> 200
    const res11 = await client.get(`/api/history/${historyId}`, { headers: { Authorization: `Bearer ${userAToken}` } });
    const fetchedHistory = res11.data?.history;
    recordTest(11, 'GET individual history record (User A)', `/api/history/${historyId}`, 'GET', 'User A', 200, res11.status, res11.status === 200 && fetchedHistory?._id === historyId);

    // 12. Register User B
    const userBEmail = `user_b_${Date.now()}@example.com`;
    const res12 = await client.post('/api/auth/register', {
      name: 'User B',
      email: userBEmail,
      password: 'Password123!'
    });
    const userBToken = res12.data?.token;
    const userBId = res12.data?.user?.id;
    recordTest(12, 'Register User B', '/api/auth/register', 'POST', 'None', 201, res12.status, res12.status === 201 && !!userBToken, `User B ID: ${userBId}`);

    // 13. User B attempts to access User A history -> 404
    const res13 = await client.get(`/api/history/${historyId}`, { headers: { Authorization: `Bearer ${userBToken}` } });
    recordTest(13, 'User B attempts to access User A history', `/api/history/${historyId}`, 'GET', 'User B', 404, res13.status, res13.status === 404);

    // 14. User B attempts to delete User A history -> 404
    const res14 = await client.delete(`/api/history/${historyId}`, { headers: { Authorization: `Bearer ${userBToken}` } });
    recordTest(14, 'User B attempts to delete User A history', `/api/history/${historyId}`, 'DELETE', 'User B', 404, res14.status, res14.status === 404);

    // 15. User A deletes history item -> 200
    const res15 = await client.delete(`/api/history/${historyId}`, { headers: { Authorization: `Bearer ${userAToken}` } });
    recordTest(15, 'User A deletes history item', `/api/history/${historyId}`, 'DELETE', 'User A', 200, res15.status, res15.status === 200);

    // 16. Verify deleted history -> 404
    const res16 = await client.get(`/api/history/${historyId}`, { headers: { Authorization: `Bearer ${userAToken}` } });
    recordTest(16, 'Verify deleted history is gone', `/api/history/${historyId}`, 'GET', 'User A', 404, res16.status, res16.status === 404);

    // 17. Save an actual existing plant for User A -> 201
    const res17 = await client.post('/api/saved-plants', { plantId: samplePlantId }, { headers: { Authorization: `Bearer ${userAToken}` } });
    recordTest(17, 'Save actual plant for User A', '/api/saved-plants', 'POST', 'User A', 201, res17.status, res17.status === 201);

    // 18. GET User A saved plants -> 200
    const res18 = await client.get('/api/saved-plants', { headers: { Authorization: `Bearer ${userAToken}` } });
    const userASavedCount = res18.data?.savedPlants?.length || 0;
    recordTest(18, 'GET User A saved plants', '/api/saved-plants', 'GET', 'User A', 200, res18.status, res18.status === 200 && userASavedCount === 1, `Count: ${userASavedCount}`);

    // 19. Verify populated Plant information
    const savedRecord = res18.data?.savedPlants?.[0];
    const populated = savedRecord?.plant?.scientificName === samplePlantName && !!savedRecord?.plant?.modelClass;
    recordTest(19, 'Verify populated Plant information', '/api/saved-plants', 'GET', 'User A', 200, res18.status, populated, `Plant: ${savedRecord?.plant?.scientificName}`);

    // 20. Check saved status -> saved: true
    const res20 = await client.get(`/api/saved-plants/check/${samplePlantId}`, { headers: { Authorization: `Bearer ${userAToken}` } });
    recordTest(20, 'Check saved status (User A)', `/api/saved-plants/check/${samplePlantId}`, 'GET', 'User A', 200, res20.status, res20.status === 200 && res20.data?.saved === true, `Saved: ${res20.data?.saved}`);

    // 21. Get saved plant -> 200
    const res21 = await client.get(`/api/saved-plants/${samplePlantId}`, { headers: { Authorization: `Bearer ${userAToken}` } });
    recordTest(21, 'Get saved plant (User A)', `/api/saved-plants/${samplePlantId}`, 'GET', 'User A', 200, res21.status, res21.status === 200 && res21.data?.saved === true);

    // 22. Save same plant again -> 409 Conflict
    const res22 = await client.post(`/api/saved-plants/${samplePlantId}`, {}, { headers: { Authorization: `Bearer ${userAToken}` } });
    recordTest(22, 'Save same plant again (duplicate check)', `/api/saved-plants/${samplePlantId}`, 'POST', 'User A', 409, res22.status, res22.status === 409);

    // 23. GET User B saved plants -> empty list
    const res23 = await client.get('/api/saved-plants', { headers: { Authorization: `Bearer ${userBToken}` } });
    const userBSavedCount = res23.data?.savedPlants?.length || 0;
    recordTest(23, 'GET User B saved plants (empty list)', '/api/saved-plants', 'GET', 'User B', 200, res23.status, res23.status === 200 && userBSavedCount === 0, `Count: ${userBSavedCount}`);

    // 24. User B must NOT see User A\'s saved plant
    const res24 = await client.get(`/api/saved-plants/check/${samplePlantId}`, { headers: { Authorization: `Bearer ${userBToken}` } });
    recordTest(24, "User B must NOT see User A's saved plant", `/api/saved-plants/check/${samplePlantId}`, 'GET', 'User B', 200, res24.status, res24.status === 200 && res24.data?.saved === false, `User B saved status: ${res24.data?.saved}`);

    // 25. User A removes saved plant -> 200
    const res25 = await client.delete(`/api/saved-plants/${samplePlantId}`, { headers: { Authorization: `Bearer ${userAToken}` } });
    recordTest(25, 'User A removes saved plant', `/api/saved-plants/${samplePlantId}`, 'DELETE', 'User A', 200, res25.status, res25.status === 200);

    // 26. Check saved status again -> saved: false
    const res26 = await client.get(`/api/saved-plants/check/${samplePlantId}`, { headers: { Authorization: `Bearer ${userAToken}` } });
    recordTest(26, 'Check saved status again (User A)', `/api/saved-plants/check/${samplePlantId}`, 'GET', 'User A', 200, res26.status, res26.status === 200 && res26.data?.saved === false, `Saved: ${res26.data?.saved}`);

    // 27. GET removed saved plant -> 404
    const res27 = await client.get(`/api/saved-plants/${samplePlantId}`, { headers: { Authorization: `Bearer ${userAToken}` } });
    recordTest(27, 'GET removed saved plant', `/api/saved-plants/${samplePlantId}`, 'GET', 'User A', 404, res27.status, res27.status === 404 && res27.data?.saved === false);

    // 28. Test invalid plant identifier -> 400 or 404
    const res28 = await client.post('/api/saved-plants/123invalid_id_not_found', {}, { headers: { Authorization: `Bearer ${userAToken}` } });
    recordTest(28, 'Test invalid plant identifier', '/api/saved-plants/123invalid_id_not_found', 'POST', 'User A', [400, 404], res28.status, [400, 404].includes(res28.status));

    // 29. Test nonexistent plant ObjectId -> 404
    const res29 = await client.post('/api/saved-plants/600000000000000000000000', {}, { headers: { Authorization: `Bearer ${userAToken}` } });
    recordTest(29, 'Test nonexistent plant ObjectId', '/api/saved-plants/600000000000000000000000', 'POST', 'User A', 404, res29.status, res29.status === 404);

    // 30. Test history with nonexistent plant -> 404
    const res30 = await client.post('/api/history', {
      scientificName: 'NonExistentPlantSpecies999',
      confidence: 0.88
    }, { headers: { Authorization: `Bearer ${userAToken}` } });
    recordTest(30, 'Test history with nonexistent plant', '/api/history', 'POST', 'User A', 404, res30.status, res30.status === 404);

    // 31. Test clear history DELETE /api/history
    // First create a history item
    await client.post('/api/history', {
      plantId: samplePlantId,
      confidence: 0.91
    }, { headers: { Authorization: `Bearer ${userAToken}` } });
    const res31 = await client.delete('/api/history', { headers: { Authorization: `Bearer ${userAToken}` } });
    recordTest(31, 'Clear all history for user (DELETE /api/history)', '/api/history', 'DELETE', 'User A', 200, res31.status, res31.status === 200 && res31.data?.deletedCount >= 1, `DeletedCount: ${res31.data?.deletedCount}`);

    // ==========================================
    // REGRESSION TESTS (Phase 2.1 - 2.3)
    // ==========================================
    console.log('\n--- EXECUTING REGRESSION TESTS ---');

    // 32. GET /api/plants -> 200 and 40 plants
    const reg1 = await client.get('/api/plants');
    const plantCount = reg1.data?.total || reg1.data?.plants?.length;
    recordTest(32, 'REGRESSION: GET /api/plants (40 plants catalog)', '/api/plants', 'GET', 'None', 200, reg1.status, reg1.status === 200 && plantCount === 40, `Total plants: ${plantCount}`);

    // 33. GET /api/plants/:idOrClass -> 200
    const reg2 = await client.get('/api/plants/Aloevera');
    recordTest(33, 'REGRESSION: GET /api/plants/:idOrClass (Aloevera)', '/api/plants/Aloevera', 'GET', 'None', 200, reg2.status, reg2.status === 200 && reg2.data?.plant?.scientificName === 'Aloe vera');

    // 34. GET /api/plants/search/:query -> 200
    const reg3 = await client.get('/api/plants/search/aloe');
    recordTest(34, 'REGRESSION: GET /api/plants/search/aloe', '/api/plants/search/aloe', 'GET', 'None', 200, reg3.status, reg3.status === 200 && reg3.data?.results?.length > 0, `Results: ${reg3.data?.results?.length}`);

    // 35. GET /api/auth/me with registered JWT -> 200
    const reg4 = await client.get('/api/auth/me', { headers: { Authorization: `Bearer ${userAToken}` } });
    recordTest(35, 'REGRESSION: GET /api/auth/me with registered JWT', '/api/auth/me', 'GET', 'User A', 200, reg4.status, reg4.status === 200 && reg4.data?.user?.email === userAEmail);

    // 36. GET /api/auth/me without JWT -> 401
    const reg5 = await client.get('/api/auth/me');
    recordTest(36, 'REGRESSION: GET /api/auth/me without JWT', '/api/auth/me', 'GET', 'None', 401, reg5.status, reg5.status === 401);

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('\n================================================================');
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    console.log(`TOTAL TESTS EXECUTED: ${totalTests}`);
    console.log(`PASSED: ${passedTests}`);
    console.log(`FAILED: ${failedTests}`);
    console.log('================================================================');

    if (failedTests > 0) {
      console.error('\nFAILURES:');
      results.filter(r => !r.passed).forEach(f => {
        console.error(`- Test ${f.id}: ${f.name} (${f.method} ${f.endpoint}) Expected ${f.expectedStatus}, Got ${f.actualStatus}`);
      });
      process.exit(1);
    } else {
      console.log('\nALL 36 TESTS PASSED FULLY AND UNCONDITIONALLY!');
      process.exit(0);
    }

  } catch (err) {
    console.error('Unhandled testing error:', err);
    process.exit(1);
  }
}

runTests();
