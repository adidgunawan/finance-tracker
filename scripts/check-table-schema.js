const { Pool } = require('pg');

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

async function checkSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('supabase') 
      ? { rejectUnauthorized: false } 
      : undefined
  });

  try {
    console.log('Checking verification table schema...\n');
    
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'verification'
      ORDER BY ordinal_position;
    `);

    console.log('Current columns in verification table:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });

    console.log('\nChecking if better-auth expects different names...');
    console.log('Better-auth typically uses snake_case for database columns.\n');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkSchema();

