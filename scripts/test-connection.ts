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
        // Remove quotes if present
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

async function testConnection() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Error: DATABASE_URL is not set in environment or .env file');
    process.exit(1);
  }

  console.log('Testing connection to database...');
  // Obfuscate password in printed connection string
  const obfuscatedUrl = connectionString.replace(/:([^:@\s]+)@/, ':****@');
  console.log(`URL: ${obfuscatedUrl}`);

  const useSSL = !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1');

  const client = new Client({
    connectionString,
    ssl: useSSL ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    console.log('Successfully connected to the database!');

    const res = await client.query('SELECT version(), now();');
    console.log('\n--- Database Info ---');
    console.log(`Server Version: ${res.rows[0].version}`);
    console.log(`Current DB Time: ${res.rows[0].now}`);

    // Query public tables list
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('\n--- Public Tables ---');
    if (tablesRes.rows.length === 0) {
      console.log('(No tables found in public schema. They will be created when the NestJS application starts)');
    } else {
      tablesRes.rows.forEach(row => {
        console.log(`- ${row.table_name}`);
      });
    }

    await client.end();
    console.log('\nConnection closed successfully.');
  } catch (err) {
    console.error('Failed to connect to the database:', err);
    process.exit(1);
  }
}

testConnection();
