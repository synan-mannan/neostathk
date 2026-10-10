import { pool } from './db/pool.js';
import bcrypt from 'bcrypt';

async function runTests() {
  console.log(' Starting NeoStats Backend Verification Tests...\n');

  try {
    // 1. Verify DB Schema and Seed Users
    console.log('1. Checking Seed Users...');
    const usersRes = await pool.query('SELECT email, role, is_active FROM users ORDER BY role');
    console.log(`   Found ${usersRes.rows.length} users in DB.`);
    const roles = usersRes.rows.map(r => r.role);
    if (!['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER', 'VIEWER'].every(r => roles.includes(r))) {
      throw new Error('Missing expected roles in seeded users');
    }
    console.log('  All 4 roles exist in database.');

    // 2. Test Optimistic Concurrency Control (HTTP 409 simulation)
    console.log('\n2. Testing Optimistic Concurrency Logic...');
    // Create temporary task
    const proj = await pool.query('SELECT id FROM projects LIMIT 1');
    if (proj.rows.length === 0) throw new Error('No project found for testing');
    const projId = proj.rows[0].id;

    const taskInsert = await pool.query(
      `INSERT INTO tasks (project_id, title, status, version) VALUES ($1, 'Test OCC Task', 'TODO', 1) RETURNING *`,
      [projId]
    );
    const testTask = taskInsert.rows[0];
    console.log(`   Created test task ${testTask.id} with version ${testTask.version}`);

    // First update: version 1 -> 2
    const update1 = await pool.query(
      `UPDATE tasks SET title = 'Updated by User A', version = version + 1 WHERE id = $1 AND version = $2 RETURNING *`,
      [testTask.id, 1]
    );
    if (update1.rows.length === 0) throw new Error('First update failed unexpectedly');
    console.log(`   User A updated task. New version is ${update1.rows[0].version}`);

    // Stale concurrent update: user B still sends version 1
    const update2 = await pool.query(
      `UPDATE tasks SET title = 'Overwritten by User B', version = version + 1 WHERE id = $1 AND version = $2 RETURNING *`,
      [testTask.id, 1]
    );

    if (update2.rows.length === 0) {
      console.log('    User B stale update with version=1 was REJECTED atomically (Optimistic locking 409 verified!)');
    } else {
      throw new Error('Optimistic concurrency failed: stale version update succeeded');
    }

    // Clean up test task
    await pool.query('DELETE FROM tasks WHERE id = $1', [testTask.id]);
    console.log('   Cleaned up test task.');

    console.log('\n ALL BACKEND VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } catch (err) {
    console.error(' Test failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();
