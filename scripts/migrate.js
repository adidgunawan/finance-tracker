const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Load environment variables if not present (simple check)
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: '.env.local' });
}

async function runMigration() {
  console.log('Starting migration...');
  
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not defined');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Supabase in some environments
  });

  try {
    const migrationPath = path.join(__dirname, '../supabase/migrations/002_auth_and_currency.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Executing SQL...');
    await pool.query(sql);
    console.log('Migration completed successfully!');
    
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
