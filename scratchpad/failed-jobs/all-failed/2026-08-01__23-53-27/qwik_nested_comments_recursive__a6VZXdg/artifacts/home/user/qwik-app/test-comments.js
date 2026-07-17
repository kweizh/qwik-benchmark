import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';

const DB_PATH = '/home/user/qwik-app/database.sqlite';
const PORT = 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('--- STARTING COMMENTS SYSTEM TESTS ---');

  // 1. Clean slate: Delete database file if it exists
  try {
    await fs.unlink(DB_PATH);
    console.log('Cleared existing database file.');
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('Failed to delete database file:', err);
    }
  }

  // 2. Start Qwik City dev server
  console.log('Starting dev server on port 3000...');
  const devServer = spawn('npm', ['run', 'dev'], {
    cwd: '/home/user/qwik-app',
    stdio: 'pipe', // Let's capture stdout/stderr to log errors if any
    env: { ...process.env, PORT: String(PORT) }
  });

  devServer.stdout.on('data', (data) => {
    console.log(`[Server]: ${data.toString().trim()}`);
  });

  devServer.stderr.on('data', (data) => {
    console.error(`[Server Error]: ${data.toString().trim()}`);
  });

  // Wait for the dev server to start
  let serverReady = false;
  let lastError = null;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${BASE_URL}/posts/1/comments`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.status === 200) {
        serverReady = true;
        break;
      } else {
        console.log(`Waiting... Server returned status ${res.status}`);
      }
    } catch (e) {
      lastError = e;
    }
    await sleep(1000);
  }

  if (!serverReady) {
    console.error('Error: Dev server failed to start or respond on port 3000. Last fetch error:', lastError);
    devServer.kill();
    process.exit(1);
  }
  console.log('Dev server is up and running!');

  try {
    const postId = 'test-post-123';

    // Test 1: GET empty comments
    console.log('\n--- Test 1: GET empty comments ---');
    const res1 = await fetch(`${BASE_URL}/posts/${postId}/comments`, {
      headers: { 'Accept': 'application/json' }
    });
    if (res1.status !== 200) {
      throw new Error(`Expected 200, got ${res1.status}`);
    }
    const data1 = await res1.json();
    if (!Array.isArray(data1) || data1.length !== 0) {
      throw new Error(`Expected empty array [], got ${JSON.stringify(data1)}`);
    }
    console.log('✓ Pass: Returned empty array with 200 OK');

    // Test 2: POST top-level comment A
    console.log('\n--- Test 2: POST top-level comment A ---');
    const res2 = await fetch(`${BASE_URL}/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parentId: null,
        text: 'This is comment A',
        author: 'Alice'
      })
    });
    if (res2.status !== 201) {
      throw new Error(`Expected 201, got ${res2.status}`);
    }
    const commentA = await res2.json();
    console.log('Created Comment A:', commentA);
    if (!commentA.id || commentA.postId !== postId || commentA.parentId !== null || commentA.text !== 'This is comment A' || commentA.author !== 'Alice' || !commentA.createdAt) {
      throw new Error('Comment A properties mismatch');
    }
    console.log('✓ Pass: Created top-level comment A successfully');

    // Test 3: POST top-level comment B
    console.log('\n--- Test 3: POST top-level comment B ---');
    await sleep(1000);
    const res3 = await fetch(`${BASE_URL}/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'This is comment B',
        author: 'Bob'
      })
    });
    if (res3.status !== 201) {
      throw new Error(`Expected 201, got ${res3.status}`);
    }
    const commentB = await res3.json();
    console.log('Created Comment B:', commentB);
    if (commentB.parentId !== null || commentB.author !== 'Bob' || commentB.text !== 'This is comment B') {
      throw new Error('Comment B properties mismatch');
    }
    console.log('✓ Pass: Created top-level comment B successfully');

    // Test 4: POST reply C to comment A
    console.log('\n--- Test 4: POST reply C to comment A ---');
    await sleep(1000);
    const res4 = await fetch(`${BASE_URL}/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parentId: commentA.id,
        text: 'This is reply C to comment A',
        author: 'Charlie'
      })
    });
    if (res4.status !== 201) {
      throw new Error(`Expected 201, got ${res4.status}`);
    }
    const commentC = await res4.json();
    console.log('Created Comment C:', commentC);
    if (commentC.parentId !== commentA.id || commentC.author !== 'Charlie' || commentC.text !== 'This is reply C to comment A') {
      throw new Error('Comment C properties mismatch');
    }
    console.log('✓ Pass: Created reply C successfully');

    // Test 5: POST reply D to reply C
    console.log('\n--- Test 5: POST reply D to reply C ---');
    await sleep(1000);
    const res5 = await fetch(`${BASE_URL}/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parentId: commentC.id,
        text: 'This is reply D to reply C',
        author: 'Dave'
      })
    });
    if (res5.status !== 201) {
      throw new Error(`Expected 201, got ${res5.status}`);
    }
    const commentD = await res5.json();
    console.log('Created Comment D:', commentD);
    if (commentD.parentId !== commentC.id || commentD.author !== 'Dave' || commentD.text !== 'This is reply D to reply C') {
      throw new Error('Comment D properties mismatch');
    }
    console.log('✓ Pass: Created nested reply D successfully');

    // Test 6: POST reply with non-existent parentId
    console.log('\n--- Test 6: POST reply with non-existent parentId ---');
    const res6 = await fetch(`${BASE_URL}/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parentId: 999999,
        text: 'Should fail',
        author: 'Eve'
      })
    });
    if (res6.status !== 400 && res6.status !== 404) {
      throw new Error(`Expected 400 or 404, got ${res6.status}`);
    }
    const errData = await res6.json();
    console.log('Error Response:', errData);
    if (!errData.error) {
      throw new Error('Expected error message in response');
    }
    console.log('✓ Pass: Correctly rejected non-existent parentId');

    // Test 7: GET full comment tree (JSON)
    console.log('\n--- Test 7: GET full comment tree (JSON) ---');
    const res7 = await fetch(`${BASE_URL}/posts/${postId}/comments`, {
      headers: { 'Accept': 'application/json' }
    });
    if (res7.status !== 200) {
      throw new Error(`Expected 200, got ${res7.status}`);
    }
    const tree = await res7.json();
    console.log('Comment Tree:', JSON.stringify(tree, null, 2));

    // Validations:
    if (tree.length !== 2) {
      throw new Error(`Expected 2 top-level comments, got ${tree.length}`);
    }
    const [treeA, treeB] = tree;
    if (treeA.id !== commentA.id || treeB.id !== commentB.id) {
      throw new Error('Top level sorting or IDs mismatch');
    }
    if (treeA.replies.length !== 1) {
      throw new Error(`Expected 1 reply for A, got ${treeA.replies.length}`);
    }
    const treeC = treeA.replies[0];
    if (treeC.id !== commentC.id) {
      throw new Error('Reply C ID mismatch');
    }
    if (treeC.replies.length !== 1) {
      throw new Error(`Expected 1 reply for C, got ${treeC.replies.length}`);
    }
    const treeD = treeC.replies[0];
    if (treeD.id !== commentD.id) {
      throw new Error('Reply D ID mismatch');
    }
    if (treeD.replies.length !== 0) {
      throw new Error('Reply D should have 0 replies');
    }
    console.log('✓ Pass: Comment tree structure and chronological sorting are perfect!');

    // Test 8: GET HTML page
    console.log('\n--- Test 8: GET HTML page ---');
    const res8 = await fetch(`${BASE_URL}/posts/${postId}/comments`);
    if (res8.status !== 200) {
      throw new Error(`Expected 200 for HTML, got ${res8.status}`);
    }
    const htmlText = await res8.text();
    if (!htmlText.includes('Comments Thread') || !htmlText.includes('Alice') || !htmlText.includes('This is comment A')) {
      throw new Error('HTML content does not match expected output');
    }
    console.log('✓ Pass: HTML page rendered perfectly with the comments');

    console.log('\n=======================================');
    console.log('ALL TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('=======================================');
    devServer.kill();
    process.exit(0);

  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    devServer.kill();
    process.exit(1);
  }
}

runTests();
