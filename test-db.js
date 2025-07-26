const postgres = require('postgres');

// Use the POSTGRES_URL from environment
const client = postgres(process.env.POSTGRES_URL);

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const result = await client`SELECT 1 as test`;
    console.log('✅ Database connection successful:', result);
    
    // Test if Chat table exists
    const tableCheck = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('Chat', 'User', 'agent');
    `;
    console.log('✅ Found tables:', tableCheck);
    
    // Test a simple query on Chat table
    const chatTest = await client`SELECT COUNT(*) as count FROM "Chat" LIMIT 1`;
    console.log('✅ Chat table query successful:', chatTest);
    
    // Test user query
    const userTest = await client`SELECT COUNT(*) as count FROM "User" LIMIT 1`;
    console.log('✅ User table query successful:', userTest);
    
    // Test agent query
    const agentTest = await client`SELECT COUNT(*) as count FROM "agent" LIMIT 1`;
    console.log('✅ Agent table query successful:', agentTest);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database error:', error);
    process.exit(1);
  }
}

testConnection();