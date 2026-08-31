const { Client } = require('pg');
const fs = require('fs');

const migrationSql = fs.readFileSync('./prisma/migrations/20260618000832_add_settings_professional_seo_fields/migration.sql', 'utf8')
  .split('\n')
  .filter(line => line.trim() && !line.trim().startsWith('--'))
  .join('\n');

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

(async () => {
  try {
    await client.connect();
    console.log('✓ Connected to database');
    
    // Remove SQL comments
    const statements = migrationSql.split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement) {
        console.log(`Executing: ${statement.substring(0, 80)}...`);
        await client.query(statement);
        console.log('✓ Done');
      }
    }
    
    console.log('\n✓✓✓ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('✓ Columns already exist');
      process.exit(0);
    }
    console.error('✗ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
