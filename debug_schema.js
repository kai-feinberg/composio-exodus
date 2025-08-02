require('dotenv').config({ path: '.env.local' });
const postgres = require('postgres');

async function debugSchema() {
  console.log('Connecting to:', `${process.env.POSTGRES_URL?.substring(0, 50)}...`);
  const sql = postgres(process.env.POSTGRES_URL);
  
  try {
    // Check current column types
    console.log('=== Column Types ===');
    const userIdType = await sql`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'User' AND column_name = 'id'
    `;
    console.log('User.id:', userIdType);
    
    const agentUserIdType = await sql`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'Agent' AND column_name = 'userId'
    `;
    console.log('Agent.userId:', agentUserIdType);
    
    // Check existing constraints
    console.log('\n=== Existing Constraints ===');
    const constraints = await sql`
      SELECT constraint_name, table_name, column_name, constraint_type
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name IN ('Agent', 'User')
      AND tc.constraint_type = 'FOREIGN KEY'
    `;
    console.log('Foreign key constraints:', constraints);
    
    // Check if there are any agents
    console.log('\n=== Data Count ===');
    const agentCount = await sql`SELECT COUNT(*) as count FROM "Agent"`;
    console.log('Agent count:', agentCount);
    
    const userCount = await sql`SELECT COUNT(*) as count FROM "User"`;
    console.log('User count:', userCount);
    
    if (agentCount[0].count > 0) {
      console.log('\n=== Sample Agent Data ===');
      const sampleAgents = await sql`SELECT id, "userId" FROM "Agent" LIMIT 3`;
      console.log('Sample agents:', sampleAgents);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.end();
  }
}

debugSchema();