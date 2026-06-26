import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Load env variables
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const delimiterIndex = trimmed.indexOf('=');
      if (delimiterIndex !== -1) {
        const key = trimmed.substring(0, delimiterIndex).trim();
        let val = trimmed.substring(delimiterIndex + 1).trim();
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1);
        } else if (val.startsWith("'") && val.endsWith("'")) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  });
}

async function listUsers() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Error: DATABASE_URL is not set');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    
    console.log('\n--- USERS ---');
    const usersRes = await client.query('SELECT id, email, name FROM users;');
    usersRes.rows.forEach(row => {
      console.log(`User ID: ${row.id} | Email: ${row.email} | Name: ${row.name}`);
    });

    console.log('\n--- WORKSPACES ---');
    const wsRes = await client.query('SELECT id, name, slug FROM workspaces;');
    wsRes.rows.forEach(row => {
      console.log(`Workspace ID: ${row.id} | Name: ${row.name} | Slug: ${row.slug}`);
    });

    console.log('\n--- WORKSPACE MEMBERS ---');
    const membersRes = await client.query(`
      SELECT wm.id, wm.role, u.email, w.slug 
      FROM workspace_members wm 
      JOIN users u ON wm.userId = u.id 
      JOIN workspaces w ON wm.workspaceId = w.id;
    `);
    membersRes.rows.forEach(row => {
      console.log(`Member ID: ${row.id} | Role: ${row.role} | User: ${row.email} | Workspace: ${row.slug}`);
    });

    await client.end();
  } catch (err) {
    console.error('Database query failed:', err);
    process.exit(1);
  }
}

listUsers();
