import Database from 'better-sqlite3';

const DB_PATH = '/home/user/qwik-app/kanban.db';
const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('--- Starting Kanban Board API Tests ---');

  // 1. Reset database
  const db = new Database(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      column TEXT NOT NULL CHECK(column IN ('TODO', 'IN_PROGRESS', 'DONE')),
      position INTEGER NOT NULL
    );
  `);
  db.exec('DELETE FROM tasks;');
  console.log('Database cleared.');

  // 2. Add some tasks
  console.log('\n--- Adding Tasks ---');
  const tasksToAdd = ['Task 1', 'Task 2', 'Task 3', 'Task 4'];
  const createdTasks = [];

  for (const title of tasksToAdd) {
    const res = await fetch(`${BASE_URL}/kanban/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });

    if (res.status !== 201) {
      throw new Error(`Failed to add task: ${title}. Status: ${res.status}`);
    }

    const task = await res.json();
    console.log('Created task:', task);
    createdTasks.push(task);
  }

  // 3. Verify tasks are added in 'TODO' column sequentially
  console.log('\n--- Verifying Initial State (GET /kanban/tasks) ---');
  let res = await fetch(`${BASE_URL}/kanban/tasks`);
  let tasks = await res.json();
  console.log('All tasks:', tasks);

  // Check TODO tasks
  const todoTasks = tasks.filter(t => t.column === 'TODO').sort((a, b) => a.position - b.position);
  if (todoTasks.length !== 4) {
    throw new Error(`Expected 4 tasks in TODO, found ${todoTasks.length}`);
  }
  for (let i = 0; i < todoTasks.length; i++) {
    if (todoTasks[i].position !== i) {
      throw new Error(`Task ${todoTasks[i].title} has incorrect position: ${todoTasks[i].position}, expected: ${i}`);
    }
  }
  console.log('Initial positions verified successfully!');

  // 4. Move a task to a different column (Task 2 to IN_PROGRESS at position 0)
  // Task 2 is at position 1. (Task 1: 0, Task 2: 1, Task 3: 2, Task 4: 3)
  console.log('\n--- Move Task 2 to IN_PROGRESS at position 0 ---');
  const task2 = todoTasks[1];
  res = await fetch(`${BASE_URL}/kanban/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      taskId: task2.id,
      targetColumn: 'IN_PROGRESS',
      targetPosition: 0
    }),
  });

  if (res.status !== 200) {
    throw new Error(`Failed to move task. Status: ${res.status}`);
  }
  console.log('Move request returned 200 OK');

  // Verify positions
  res = await fetch(`${BASE_URL}/kanban/tasks`);
  tasks = await res.json();
  console.log('Tasks after move:', tasks);

  const todoAfterMove = tasks.filter(t => t.column === 'TODO').sort((a, b) => a.position - b.position);
  const inProgressAfterMove = tasks.filter(t => t.column === 'IN_PROGRESS').sort((a, b) => a.position - b.position);

  console.log('TODO tasks:', todoAfterMove);
  console.log('IN_PROGRESS tasks:', inProgressAfterMove);

  if (todoAfterMove.length !== 3) {
    throw new Error(`Expected 3 tasks in TODO, found ${todoAfterMove.length}`);
  }
  // Positions should be 0, 1, 2
  todoAfterMove.forEach((t, index) => {
    if (t.position !== index) {
      throw new Error(`Task ${t.title} has incorrect position: ${t.position}, expected: ${index}`);
    }
  });

  if (inProgressAfterMove.length !== 1 || inProgressAfterMove[0].id !== task2.id || inProgressAfterMove[0].position !== 0) {
    throw new Error(`Task 2 was not moved correctly to IN_PROGRESS at position 0`);
  }
  console.log('Different column move verified!');

  // 5. Move Task 4 (currently position 2 in TODO) to IN_PROGRESS at position 0 (before Task 2)
  console.log('\n--- Move Task 4 to IN_PROGRESS at position 0 ---');
  const task4 = todoAfterMove.find(t => t.title === 'Task 4');
  res = await fetch(`${BASE_URL}/kanban/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      taskId: task4.id,
      targetColumn: 'IN_PROGRESS',
      targetPosition: 0
    }),
  });

  if (res.status !== 200) {
    throw new Error(`Failed to move Task 4. Status: ${res.status}`);
  }

  res = await fetch(`${BASE_URL}/kanban/tasks`);
  tasks = await res.json();
  const inProgressAfterMove2 = tasks.filter(t => t.column === 'IN_PROGRESS').sort((a, b) => a.position - b.position);
  console.log('IN_PROGRESS tasks after moving Task 4 to pos 0:', inProgressAfterMove2);

  if (inProgressAfterMove2.length !== 2) {
    throw new Error(`Expected 2 tasks in IN_PROGRESS, found ${inProgressAfterMove2.length}`);
  }
  if (inProgressAfterMove2[0].id !== task4.id || inProgressAfterMove2[0].position !== 0) {
    throw new Error(`Task 4 is not at position 0 in IN_PROGRESS`);
  }
  if (inProgressAfterMove2[1].id !== task2.id || inProgressAfterMove2[1].position !== 1) {
    throw new Error(`Task 2 did not shift to position 1 in IN_PROGRESS`);
  }
  console.log('Insertion order shifting verified!');

  // 6. Move within the same column (Move Task 4 from position 0 to position 1 in IN_PROGRESS)
  console.log('\n--- Move Task 4 from position 0 to position 1 in IN_PROGRESS ---');
  res = await fetch(`${BASE_URL}/kanban/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      taskId: task4.id,
      targetColumn: 'IN_PROGRESS',
      targetPosition: 1
    }),
  });

  if (res.status !== 200) {
    throw new Error(`Failed to move Task 4. Status: ${res.status}`);
  }

  res = await fetch(`${BASE_URL}/kanban/tasks`);
  tasks = await res.json();
  const inProgressAfterMove3 = tasks.filter(t => t.column === 'IN_PROGRESS').sort((a, b) => a.position - b.position);
  console.log('IN_PROGRESS tasks after same column move (0 -> 1):', inProgressAfterMove3);

  if (inProgressAfterMove3[0].id !== task2.id || inProgressAfterMove3[0].position !== 0) {
    throw new Error(`Task 2 did not shift back to position 0`);
  }
  if (inProgressAfterMove3[1].id !== task4.id || inProgressAfterMove3[1].position !== 1) {
    throw new Error(`Task 4 is not at position 1`);
  }
  console.log('Same column move (0 -> 1) verified!');

  // 7. Validation: Invalid column
  console.log('\n--- Testing Validation: Invalid Column ---');
  res = await fetch(`${BASE_URL}/kanban/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      taskId: task4.id,
      targetColumn: 'INVALID_COLUMN',
      targetPosition: 0
    }),
  });
  console.log('Response status for invalid column:', res.status);
  if (res.status !== 400) {
    throw new Error(`Expected 400 for invalid column, got ${res.status}`);
  }

  // 8. Validation: Out of bounds position (same column)
  console.log('\n--- Testing Validation: Out of bounds (same column, pos = 2) ---');
  res = await fetch(`${BASE_URL}/kanban/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      taskId: task4.id,
      targetColumn: 'IN_PROGRESS',
      targetPosition: 2 // Max position is 1 since there are 2 tasks in this column
    }),
  });
  console.log('Response status for out of bounds same column:', res.status);
  if (res.status !== 400) {
    throw new Error(`Expected 400 for out of bounds same column, got ${res.status}`);
  }

  // 9. Validation: Out of bounds position (different column)
  console.log('\n--- Testing Validation: Out of bounds (different column, pos = 3) ---');
  res = await fetch(`${BASE_URL}/kanban/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      taskId: task4.id,
      targetColumn: 'TODO',
      targetPosition: 3 // Max position is 2 (todo has 2 tasks, so valid is 0, 1, 2) Wait! Let's check how many tasks todo has currently.
      // Wait, todo has 2 tasks (Task 1 and Task 3). So count is 2. Valid targetPositions are 0, 1, 2. So targetPosition: 3 is indeed out of bounds!
    }),
  });
  console.log('Response status for out of bounds different column:', res.status);
  if (res.status !== 400) {
    throw new Error(`Expected 400 for out of bounds different column, got ${res.status}`);
  }

  // 10. Validation: Non-existent task
  console.log('\n--- Testing Validation: Non-existent Task ---');
  res = await fetch(`${BASE_URL}/kanban/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      taskId: 99999,
      targetColumn: 'TODO',
      targetPosition: 0
    }),
  });
  console.log('Response status for non-existent task:', res.status);
  if (res.status !== 404) {
    throw new Error(`Expected 404 for non-existent task, got ${res.status}`);
  }

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉');
  db.close();
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
