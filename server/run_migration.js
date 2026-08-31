const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const migrationPath = './prisma/migrations/20260618000832_add_settings_professional_seo_fields/migration.sql';
const migrationSql = fs.readFileSync(migrationPath, 'utf8');

const prisma = new PrismaClient();

(async () => {
  try {
    console.log('Executing migration...');
    const result = await prisma.$executeRawUnsafe(migrationSql);
    console.log('✓ Migration executed successfully!');
    process.exit(0);
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('✓ Columns already exist (already migrated)');
      process.exit(0);
    }
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
