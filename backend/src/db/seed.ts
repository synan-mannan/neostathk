import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import { pool } from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initDb() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

  console.log(' Executing schema.sql to ensure tables and indexes exist...');
  await pool.query(schemaSql);
  console.log(' Database schema initialized successfully.');
}

export async function seedDb() {
  await initDb();

  console.log(' Seeding initial demo data...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Password hashing
    const defaultPassword = 'Password123!';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    // 2. Demo Users
    const usersData = [
      {
        name: 'Alice Admin',
        email: 'admin@neostats.com',
        role: 'ADMIN',
      },
      {
        name: 'Bob Manager',
        email: 'manager@neostats.com',
        role: 'PROJECT_MANAGER',
      },
      {
        name: 'Charlie Member',
        email: 'member@neostats.com',
        role: 'TEAM_MEMBER',
      },
      {
        name: 'Diana Viewer',
        email: 'viewer@neostats.com',
        role: 'VIEWER',
      },
    ];

    const userMap: Record<string, string> = {};

    for (const u of usersData) {
      const res = await client.query(
        `INSERT INTO users (name, email, password_hash, role, is_active)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (email) DO UPDATE
         SET name = EXCLUDED.name,
             password_hash = EXCLUDED.password_hash,
             role = EXCLUDED.role,
             is_active = true
         RETURNING id, email`,
        [u.name, u.email, passwordHash, u.role]
      );
      userMap[u.email] = res.rows[0].id;
    }

    const adminId = userMap['admin@neostats.com'];
    const managerId = userMap['manager@neostats.com'];
    const memberId = userMap['member@neostats.com'];
    const viewerId = userMap['viewer@neostats.com'];

    // 3. Projects
    // Check if Project Alpha exists
    const proj1Res = await client.query(
      `SELECT id FROM projects WHERE name = $1 LIMIT 1`,
      ['Project Apollo - Real-time Core']
    );

    let proj1Id: string;
    if (proj1Res.rows.length === 0) {
      const insertProj = await client.query(
        `INSERT INTO projects (name, description, status, created_by)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          'Project Apollo - Real-time Core',
          'Next-generation collaborative platform with real-time websocket synchronization and conflict resolution.',
          'ACTIVE',
          adminId,
        ]
      );
      proj1Id = insertProj.rows[0].id;
    } else {
      proj1Id = proj1Res.rows[0].id;
    }

    const proj2Res = await client.query(
      `SELECT id FROM projects WHERE name = $1 LIMIT 1`,
      ['Project Horizon - Analytics Engine']
    );

    let proj2Id: string;
    if (proj2Res.rows.length === 0) {
      const insertProj = await client.query(
        `INSERT INTO projects (name, description, status, created_by)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          'Project Horizon - Analytics Engine',
          'High throughput metrics tracking and dashboard visualizations.',
          'ACTIVE',
          adminId,
        ]
      );
      proj2Id = insertProj.rows[0].id;
    } else {
      proj2Id = proj2Res.rows[0].id;
    }

    // 4. Project Members
    // For Apollo: Manager is manager, Charlie is member, Diana is viewer
    const apolloMembers = [
      { userId: managerId, role: 'MANAGER' },
      { userId: memberId, role: 'MEMBER' },
      { userId: viewerId, role: 'VIEWER' },
    ];

    for (const m of apolloMembers) {
      await client.query(
        `INSERT INTO project_members (project_id, user_id, project_role)
         VALUES ($1, $2, $3)
         ON CONFLICT (project_id, user_id) DO UPDATE
         SET project_role = EXCLUDED.project_role`,
        [proj1Id, m.userId, m.role]
      );
    }

    // For Horizon: Manager is manager, Charlie is member
    await client.query(
      `INSERT INTO project_members (project_id, user_id, project_role)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id, user_id) DO UPDATE
       SET project_role = EXCLUDED.project_role`,
      [proj2Id, managerId, 'MANAGER']
    );

    // 5. Tasks for Apollo
    const existingTasks = await client.query(
      `SELECT id FROM tasks WHERE project_id = $1`,
      [proj1Id]
    );

    let sampleTaskId: string;
    if (existingTasks.rows.length === 0) {
      const task1 = await client.query(
        `INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, created_by, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 1) RETURNING id`,
        [
          proj1Id,
          'Setup Socket.IO Project Rooms',
          'Establish authenticated websocket connections and room scoped subscriptions.',
          'IN_PROGRESS',
          'HIGH',
          memberId,
          managerId,
        ]
      );
      sampleTaskId = task1.rows[0].id;

      await client.query(
        `INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, created_by, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 1)`,
        [
          proj1Id,
          'Optimistic Concurrency Control with HTTP 409',
          'Verify version column checking during updates to prevent stale overwrites.',
          'TODO',
          'URGENT',
          memberId,
          managerId,
        ]
      );

      await client.query(
        `INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, created_by, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 1)`,
        [
          proj1Id,
          'Prepare Interactive Hackathon Demo Script',
          'Document demo accounts, testing flows, and verify role-based permissions.',
          'DONE',
          'MEDIUM',
          adminId,
          adminId,
        ]
      );
    } else {
      sampleTaskId = existingTasks.rows[0].id;
    }

    // 6. Comments
    const commentCount = await client.query(
      `SELECT count(*) FROM comments WHERE task_id = $1`,
      [sampleTaskId]
    );

    if (parseInt(commentCount.rows[0].count, 10) === 0) {
      await client.query(
        `INSERT INTO comments (task_id, user_id, content)
         VALUES ($1, $2, $3)`,
        [sampleTaskId, managerId, 'Looking great! Please ensure room authentication is verified.']
      );
      await client.query(
        `INSERT INTO comments (task_id, user_id, content)
         VALUES ($1, $2, $3)`,
        [sampleTaskId, memberId, 'Working on the cookie extraction in the Socket.IO handshake now.']
      );
    }

    // 7. Activity Logs
    const actCount = await client.query(
      `SELECT count(*) FROM activity_logs WHERE project_id = $1`,
      [proj1Id]
    );

    if (parseInt(actCount.rows[0].count, 10) === 0) {
      await client.query(
        `INSERT INTO activity_logs (user_id, project_id, action, entity_type, entity_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          adminId,
          proj1Id,
          'PROJECT_CREATED',
          'PROJECT',
          proj1Id,
          JSON.stringify({ name: 'Project Apollo - Real-time Core' }),
        ]
      );
      await client.query(
        `INSERT INTO activity_logs (user_id, project_id, action, entity_type, entity_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          managerId,
          proj1Id,
          'MEMBER_ADDED',
          'PROJECT_MEMBER',
          memberId,
          JSON.stringify({ user: 'Charlie Member', role: 'MEMBER' }),
        ]
      );
    }

    // 8. Notifications
    const notifCount = await client.query(
      `SELECT count(*) FROM notifications WHERE user_id = $1`,
      [memberId]
    );

    if (parseInt(notifCount.rows[0].count, 10) === 0) {
      await client.query(
        `INSERT INTO notifications (user_id, project_id, type, message, entity_type, entity_id, is_read)
         VALUES ($1, $2, $3, $4, $5, $6, false)`,
        [
          memberId,
          proj1Id,
          'TASK_ASSIGNED',
          'You were assigned task: Setup Socket.IO Project Rooms',
          'TASK',
          sampleTaskId,
        ]
      );
    }

    await client.query('COMMIT');
    console.log('Demo seed data created successfully!');
    console.log('----------------------------------------------------');
    console.log('Demo Accounts:');
    console.log('  Admin:           admin@neostats.com   / Password123!');
    console.log('  Project Manager: manager@neostats.com / Password123!');
    console.log('  Team Member:     member@neostats.com  / Password123!');
    console.log('  Viewer:          viewer@neostats.com  / Password123!');
    console.log('----------------------------------------------------');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(' Error seeding database:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Allow direct execution: node --import tsx src/db/seed.ts
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seedDb()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (e) => {
      console.error(e);
      await pool.end();
      process.exit(1);
    });
}
