import assert from 'assert';

async function runTests() {
  const baseUrl = 'http://localhost:3000';

  console.log('Starting tests...');

  // Test 1: GET /poll/frameworks
  console.log('\n--- Test 1: GET /poll/frameworks ---');
  const getRes = await fetch(`${baseUrl}/poll/frameworks`);
  assert.strictEqual(getRes.status, 200, 'GET /poll/frameworks should return 200');
  const getHtml = await getRes.text();
  assert.ok(getHtml.includes('id="poll-question"'), 'Should contain poll-question element');
  assert.ok(getHtml.includes('What is your favorite frontend framework?'), 'Should contain the question text');
  assert.ok(getHtml.includes('id="poll-chart"'), 'Should contain poll-chart SVG');
  assert.ok(getHtml.includes('width="500"'), 'SVG width should be 500');
  assert.ok(getHtml.includes('height="300"'), 'SVG height should be 300');
  assert.ok(getHtml.includes('class="chart-bar"'), 'Should contain chart-bar class');
  assert.ok(getHtml.includes('class="vote-count"'), 'Should contain vote-count class');
  assert.ok(getHtml.includes('class="vote-button"'), 'Should contain vote-button class');
  console.log('Test 1 Passed!');

  // Test 2: GET /poll/invalid_poll (404)
  console.log('\n--- Test 2: GET /poll/invalid_poll ---');
  const getRes404 = await fetch(`${baseUrl}/poll/invalid_poll`);
  assert.strictEqual(getRes404.status, 404, 'GET /poll/invalid_poll should return 404');
  const getHtml404 = await getRes404.text();
  assert.strictEqual(getHtml404, 'Poll not found', 'Should return "Poll not found" text');
  console.log('Test 2 Passed!');

  // Test 3: POST /poll/frameworks/vote with valid optionId
  console.log('\n--- Test 3: POST /poll/frameworks/vote (valid) ---');
  const uniqueIp1 = '192.168.1.1';
  const postRes1 = await fetch(`${baseUrl}/poll/frameworks/vote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': uniqueIp1,
    },
    body: JSON.stringify({ optionId: 1 }),
  });
  assert.strictEqual(postRes1.status, 200, 'POST vote should return 200');
  const postData1 = await postRes1.json();
  assert.strictEqual(postData1.success, true, 'Response should contain success: true');
  assert.ok(postData1.votes, 'Response should contain votes object');
  assert.strictEqual(postData1.votes['1'], 1, 'Qwik vote count should be 1');
  assert.strictEqual(postData1.votes['2'], 0, 'React vote count should be 0');
  console.log('Test 3 Passed!');

  // Test 4: POST /poll/frameworks/vote from same IP (Rate Limit 429)
  console.log('\n--- Test 4: POST /poll/frameworks/vote (Rate Limit) ---');
  const postRes2 = await fetch(`${baseUrl}/poll/frameworks/vote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': uniqueIp1,
    },
    body: JSON.stringify({ optionId: 1 }),
  });
  assert.strictEqual(postRes2.status, 429, 'POST vote within 5s should return 429');
  const postData2 = await postRes2.json();
  assert.strictEqual(postData2.error, 'Rate limit exceeded', 'Should return Rate limit exceeded error');
  console.log('Test 4 Passed!');

  // Test 5: POST /poll/frameworks/vote with invalid optionId (404)
  console.log('\n--- Test 5: POST /poll/frameworks/vote (Invalid option) ---');
  const uniqueIp2 = '192.168.1.2';
  const postRes3 = await fetch(`${baseUrl}/poll/frameworks/vote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': uniqueIp2,
    },
    body: JSON.stringify({ optionId: 999 }),
  });
  assert.strictEqual(postRes3.status, 404, 'Invalid option should return 404');
  const postData3 = await postRes3.json();
  assert.strictEqual(postData3.error, 'Poll or option not found', 'Should return Poll or option not found');
  console.log('Test 5 Passed!');

  // Test 6: POST /poll/colors/vote with optionId belonging to frameworks (404)
  console.log('\n--- Test 6: POST /poll/colors/vote (Option from other poll) ---');
  const uniqueIp3 = '192.168.1.3';
  const postRes4 = await fetch(`${baseUrl}/poll/colors/vote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': uniqueIp3,
    },
    body: JSON.stringify({ optionId: 1 }), // Option 1 belongs to frameworks, not colors
  });
  assert.strictEqual(postRes4.status, 404, 'Option from other poll should return 404');
  const postData4 = await postRes4.json();
  assert.strictEqual(postData4.error, 'Poll or option not found', 'Should return Poll or option not found');
  console.log('Test 6 Passed!');

  // Test 7: POST /poll/frameworks/vote with missing/invalid optionId (400)
  console.log('\n--- Test 7: POST /poll/frameworks/vote (Bad Request) ---');
  const uniqueIp4 = '192.168.1.4';
  const postRes5 = await fetch(`${baseUrl}/poll/frameworks/vote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': uniqueIp4,
    },
    body: JSON.stringify({ optionId: 'not-a-number' }),
  });
  assert.strictEqual(postRes5.status, 400, 'Invalid optionId type should return 400');
  const postData5 = await postRes5.json();
  assert.strictEqual(postData5.error, 'Invalid option ID', 'Should return Invalid option ID');
  console.log('Test 7 Passed!');

  // Test 8: Concurrency & Reliability
  console.log('\n--- Test 8: Concurrency & Reliability ---');
  // Send 10 concurrent requests from 10 different IPs to option 2 (React)
  const concurrentIps = Array.from({ length: 10 }, (_, i) => `10.0.0.${i + 1}`);
  
  console.log('Sending 10 concurrent votes to Option 2 (React) from 10 different IPs...');
  const promises = concurrentIps.map(ip => {
    return fetch(`${baseUrl}/poll/frameworks/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': ip,
      },
      body: JSON.stringify({ optionId: 2 }),
    });
  });

  const results = await Promise.all(promises);
  
  // Verify all returned 200
  results.forEach((res, i) => {
    assert.strictEqual(res.status, 200, `Concurrent vote from IP ${concurrentIps[i]} should succeed (200)`);
  });

  // Fetch the final vote counts
  const finalGetRes = await fetch(`${baseUrl}/poll/frameworks`);
  const finalGetHtml = await finalGetRes.text();
  
  // We can fetch updated vote counts via a single vote from another unique IP to check JSON response
  const checkRes = await fetch(`${baseUrl}/poll/frameworks/vote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': '192.168.100.100',
    },
    body: JSON.stringify({ optionId: 2 }),
  });
  
  const checkData = await checkRes.json();
  // React (option 2) started at 0. We cast 10 concurrent votes, and 1 check vote. Total should be 11.
  assert.strictEqual(checkData.votes['2'], 11, 'React option votes should be exactly 11');
  console.log('Test 8 Passed! All 10 concurrent votes and the check vote were correctly recorded without any locks or lost updates.');

  console.log('\nAll tests passed successfully! 🎉');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
