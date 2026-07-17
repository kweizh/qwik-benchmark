import Database from 'better-sqlite3';
import { spawn } from 'child_process';
import http from 'http';

// Reset database for a clean test run
function resetDb() {
  const db = new Database('/home/user/qwik-app/poll.db');
  db.prepare('DELETE FROM votes_log').run();
  db.prepare('UPDATE options SET votes = 0').run();
  db.close();
  console.log('Database reset successfully.');
}

async function waitForServer(url, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          if (res.statusCode === 200 || res.statusCode === 404) {
            resolve();
          } else {
            reject(new Error(`Status: ${res.statusCode}`));
          }
        });
        req.on('error', reject);
        req.end();
      });
      console.log('Server is ready!');
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error('Server timed out');
}

async function runTests() {
  resetDb();

  console.log('Starting Qwik dev server...');
  const devServer = spawn('npm', ['run', 'dev'], {
    cwd: '/home/user/qwik-app',
    stdio: 'inherit',
    env: { ...process.env, PORT: '3000' }
  });

  try {
    // Wait for server to start
    await waitForServer('http://localhost:3000/poll/frameworks');

    console.log('\n--- Running GET /poll/:id Tests ---');
    
    // Test 1: GET existing poll
    const res1 = await fetch('http://localhost:3000/poll/frameworks');
    const html1 = await res1.text();
    
    if (res1.status !== 200) throw new Error('GET /poll/frameworks failed');
    if (!html1.includes('id="poll-question"')) throw new Error('Missing id="poll-question"');
    if (!html1.includes('What is your favorite frontend framework?')) throw new Error('Incorrect question text');
    if (!html1.includes('id="poll-chart"')) throw new Error('Missing id="poll-chart"');
    if (!html1.includes('width="500"')) throw new Error('Missing/incorrect width on chart');
    if (!html1.includes('height="300"')) throw new Error('Missing/incorrect height on chart');
    if (!html1.includes('class="chart-bar"')) throw new Error('Missing class="chart-bar"');
    if (!html1.includes('class="vote-count"')) throw new Error('Missing class="vote-count"');
    if (!html1.includes('class="vote-button"')) throw new Error('Missing class="vote-button"');
    console.log('✅ Test 1: GET /poll/frameworks - PASSED');

    // Test 2: GET non-existent poll
    const res2 = await fetch('http://localhost:3000/poll/nonexistent');
    const html2 = await res2.text();
    if (res2.status !== 404) throw new Error(`GET /poll/nonexistent should return 404, got ${res2.status}`);
    if (!html2.includes('Poll not found')) throw new Error('Should contain "Poll not found"');
    console.log('✅ Test 2: GET /poll/nonexistent (404) - PASSED');

    console.log('\n--- Running POST /poll/:id/vote Tests ---');

    // Test 3: Successful vote
    const res3 = await fetch('http://localhost:3000/poll/frameworks/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '1.1.1.1' },
      body: JSON.stringify({ optionId: 1 })
    });
    const json3 = await res3.json();
    if (res3.status !== 200) throw new Error(`Vote failed: ${res3.status}`);
    if (!json3.success) throw new Error('Vote response success should be true');
    if (json3.votes['1'] !== 1) throw new Error(`Option 1 votes should be 1, got ${json3.votes['1']}`);
    console.log('✅ Test 3: Successful vote - PASSED');

    // Test 4: Rate limit (same IP, same poll within 5 seconds)
    const res4 = await fetch('http://localhost:3000/poll/frameworks/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '1.1.1.1' },
      body: JSON.stringify({ optionId: 2 })
    });
    const json4 = await res4.json();
    if (res4.status !== 429) throw new Error(`Expected 429, got ${res4.status}`);
    if (json4.error !== 'Rate limit exceeded') throw new Error(`Expected "Rate limit exceeded" error, got: ${json4.error}`);
    console.log('✅ Test 4: Rate limit enforcement - PASSED');

    // Test 5: Different IP should be allowed to vote
    const res5 = await fetch('http://localhost:3000/poll/frameworks/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '2.2.2.2' },
      body: JSON.stringify({ optionId: 2 })
    });
    const json5 = await res5.json();
    if (res5.status !== 200) throw new Error(`Expected 200, got ${res5.status}`);
    if (json5.votes['2'] !== 1) throw new Error(`Option 2 votes should be 1, got ${json5.votes['2']}`);
    console.log('✅ Test 5: Different IP allowed to vote - PASSED');

    // Test 6: Missing/invalid optionId (400 Bad Request)
    const res6_1 = await fetch('http://localhost:3000/poll/frameworks/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optionId: 'invalid' })
    });
    if (res6_1.status !== 400) throw new Error(`Expected 400 for invalid optionId, got ${res6_1.status}`);
    const json6_1 = await res6_1.json();
    if (json6_1.error !== 'Invalid option ID') throw new Error(`Expected "Invalid option ID", got: ${json6_1.error}`);

    const res6_2 = await fetch('http://localhost:3000/poll/frameworks/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (res6_2.status !== 400) throw new Error(`Expected 400 for missing optionId, got ${res6_2.status}`);
    const json6_2 = await res6_2.json();
    if (json6_2.error !== 'Invalid option ID') throw new Error(`Expected "Invalid option ID", got: ${json6_2.error}`);
    console.log('✅ Test 6: Missing/invalid optionId validation - PASSED');

    // Test 7: Non-existent option (404 Not Found)
    const res7 = await fetch('http://localhost:3000/poll/frameworks/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '3.3.3.3' },
      body: JSON.stringify({ optionId: 999 })
    });
    if (res7.status !== 404) throw new Error(`Expected 404 for non-existent option, got ${res7.status}`);
    const json7 = await res7.json();
    if (json7.error !== 'Poll or option not found') throw new Error(`Expected "Poll or option not found", got: ${json7.error}`);
    console.log('✅ Test 7: Non-existent option validation - PASSED');

    // Test 8: Non-existent poll (404 Not Found)
    const res8 = await fetch('http://localhost:3000/poll/nonexistent/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '4.4.4.4' },
      body: JSON.stringify({ optionId: 1 })
    });
    if (res8.status !== 404) throw new Error(`Expected 404 for non-existent poll, got ${res8.status}`);
    const json8 = await res8.json();
    if (json8.error !== 'Poll or option not found') throw new Error(`Expected "Poll or option not found", got: ${json8.error}`);
    console.log('✅ Test 8: Non-existent poll validation - PASSED');

    console.log('\n--- Running Concurrency & Reliability Tests ---');
    // Test 9: Concurrent voting requests from different IPs
    const concurrentVotes = 20;
    const promises = [];
    for (let i = 0; i < concurrentVotes; i++) {
      const ip = `100.100.100.${i}`;
      const optionId = (i % 4) + 1; // Distribute votes across options 1, 2, 3, 4
      promises.push(
        fetch('http://localhost:3000/poll/frameworks/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
          body: JSON.stringify({ optionId })
        }).then(async (res) => {
          if (res.status !== 200) {
            const text = await res.text();
            throw new Error(`Concurrent vote failed for IP ${ip}: status ${res.status}, body ${text}`);
          }
          return res.json();
        })
      );
    }

    const results = await Promise.all(promises);
    console.log(`Successfully completed ${results.length} concurrent voting requests without locking!`);

    // Verify final votes in database
    const db = new Database('/home/user/qwik-app/poll.db');
    const options = db.prepare('SELECT id, votes FROM options WHERE poll_id = "frameworks"').all();
    db.close();

    console.log('Final vote counts in database:', options);
    // Initial votes:
    // Option 1: 1 (from Test 3)
    // Option 2: 1 (from Test 5)
    // Concurrent votes: 20 distributed as:
    // i=0: opt 1, i=1: opt 2, i=2: opt 3, i=3: opt 4
    // i=4: opt 1, i=5: opt 2, i=6: opt 3, i=7: opt 4
    // ...
    // Since 20 is divisible by 4, each option gets exactly 5 votes.
    // Total expected votes:
    // Option 1: 1 + 5 = 6
    // Option 2: 1 + 5 = 6
    // Option 3: 0 + 5 = 5
    // Option 4: 0 + 5 = 5
    const expected = { 1: 6, 2: 6, 3: 5, 4: 5 };
    for (const opt of options) {
      if (opt.votes !== expected[opt.id]) {
        throw new Error(`Vote discrepancy for option ${opt.id}: expected ${expected[opt.id]}, got ${opt.votes}`);
      }
    }
    console.log('✅ Test 9: Concurrent and atomic updates - PASSED');

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉\n');

  } catch (error) {
    console.error('\n❌ TEST RUN FAILED:', error.message);
    process.exitCode = 1;
  } finally {
    console.log('Stopping dev server...');
    devServer.kill('SIGINT');
  }
}

runTests();
