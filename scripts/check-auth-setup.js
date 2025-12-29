/**
 * Script to check better-auth database setup
 * Run with: node scripts/check-auth-setup.js
 */

// Try to load from .env.local first, then .env
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

async function checkAuthSetup() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔍 Checking database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');

    console.log('🔍 Checking for better-auth tables...\n');
    
    const requiredTables = ['user', 'session', 'account', 'verification'];
    
    for (const table of requiredTables) {
      try {
        const result = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          );
        `, [table]);
        
        const exists = result.rows[0].exists;
        if (exists) {
          const countResult = await pool.query(`SELECT COUNT(*) FROM "${table}"`);
          console.log(`✅ Table "${table}" exists (${countResult.rows[0].count} rows)`);
        } else {
          console.log(`❌ Table "${table}" does NOT exist`);
        }
      } catch (error) {
        console.log(`❌ Error checking table "${table}":`, error.message);
      }
    }

    console.log('\n🔍 Checking environment variables...\n');
    const requiredEnvVars = [
      'DATABASE_URL',
      'BETTER_AUTH_SECRET',
      'BETTER_AUTH_URL',
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
    ];

    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar];
      if (value) {
        const displayValue = envVar.includes('SECRET') || envVar.includes('SECRET') 
          ? value.substring(0, 10) + '...' 
          : value;
        console.log(`✅ ${envVar} is set: ${displayValue}`);
      } else {
        console.log(`❌ ${envVar} is NOT set`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await pool.end();
  }
}

checkAuthSetup();

