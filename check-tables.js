const postgres = require('postgres');

// Use the POSTGRES_URL from environment
const client = postgres(process.env.POSTGRES_URL);

async function checkTables() {
  try {
    console.log('Checking all tables in the database...');
    
    // Check all tables in the public schema
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    console.log('📋 All tables in public schema:');
    for (const table of tables) {
      console.log(`  - ${table.table_name}`);
    }
    
    // Check if Agent table exists with different case
    const agentCheck = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND LOWER(table_name) = 'agent';
    `;
    console.log('\n🔍 Agent table check (case insensitive):', agentCheck);
    
    // Check migration history
    const migrations = await client`
      SELECT * FROM drizzle.__drizzle_migrations
      ORDER BY created_at DESC;
    `;
    console.log('\n📈 Migration history:');
    for (const migration of migrations) {
      console.log(`  - ${migration.hash}: ${migration.created_at}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database error:', error);
    process.exit(1);
  }
}

checkTables();