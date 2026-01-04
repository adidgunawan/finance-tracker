const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Load environment variables
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

async function runMigration(migrationFile) {
  console.log(`Running migration: ${migrationFile}...`);
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not defined');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('supabase') 
      ? { rejectUnauthorized: false } 
      : undefined
  });

  try {
    const migrationPath = path.join(__dirname, '../supabase/migrations', migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationPath}`);
      process.exit(1);
    }
    
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Executing SQL...');
    await pool.query(sql);
    console.log('✅ Migration completed successfully!');
    
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    if (err.code === '42703') {
      console.error('\n💡 This might be because the column already has the correct name.');
      console.error('   You can safely ignore this if the migration has already been run.');
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Get migration file from command line argument
const migrationFile = process.argv[2] || '003_fix_better_auth_schema.sql';

runMigration(migrationFile);



