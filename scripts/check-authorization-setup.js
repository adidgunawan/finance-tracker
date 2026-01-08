/**
 * Script to check if authorization system is set up correctly
 * Run: node scripts/check-authorization-setup.js
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkAuthorizationSetup() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set in .env.local');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('supabase.co')
      ? { rejectUnauthorized: false }
      : false,
  });

  try {
    console.log('🔍 Checking authorization setup...\n');

    // Check if authorized_users table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'authorized_users'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.error('❌ authorized_users table does not exist!');
      console.log('   Run the migration: supabase/migrations/007_authorized_users.sql\n');
      process.exit(1);
    }

    console.log('✅ authorized_users table exists');

    // Check table structure
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'authorized_users'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Table structure:');
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    // Count authorized users
    const count = await pool.query('SELECT COUNT(*) FROM authorized_users');
    console.log(`\n👥 Authorized users: ${count.rows[0].count}`);

    if (parseInt(count.rows[0].count) === 0) {
      console.warn('\n⚠️  WARNING: No authorized users in the table!');
      console.log('   Add users with: INSERT INTO authorized_users (email) VALUES (\'[email protected]\');\n');
    } else {
      // List authorized users (first 10)
      const users = await pool.query('SELECT email, created_at FROM authorized_users LIMIT 10');
      console.log('\n📧 Authorized emails:');
      users.rows.forEach(user => {
        console.log(`   - ${user.email} (added: ${user.created_at})`);
      });
      if (parseInt(count.rows[0].count) > 10) {
        console.log(`   ... and ${parseInt(count.rows[0].count) - 10} more`);
      }
    }

    console.log('\n✅ Authorization system is set up correctly!\n');
  } catch (error) {
    console.error('❌ Error checking authorization setup:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkAuthorizationSetup();






