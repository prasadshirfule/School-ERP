const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const envPath = path.join(process.cwd(), '.env.local');
const env = fs.readFileSync(envPath, 'utf8');

let unpooledUrl = '';
for (const line of env.split('\n')) {
  const trimmed = line.trim();
  if (trimmed.startsWith('DATABASE_URL_UNPOOLED=')) {
    let v = trimmed.substring('DATABASE_URL_UNPOOLED='.length).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    unpooledUrl = v;
  }
}

const prisma = new PrismaClient({
  datasources: { db: { url: unpooledUrl } }
});

async function main() {
  try {
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    console.log('Total Tables Created:', tables.length);
    console.table(tables);

    const enums = await prisma.$queryRaw`
      SELECT t.typname as enum_name, string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as values
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      GROUP BY t.typname
      ORDER BY t.typname;
    `;
    console.log('Enums Created:');
    console.table(enums);

    const fks = await prisma.$queryRaw`
      SELECT count(*) as count FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY';
    `;
    console.log('Total Foreign Keys Created:', fks[0].count);

    const migs = await prisma.$queryRaw`
      SELECT migration_name, finished_at, applied_steps_count FROM _prisma_migrations;
    `;
    console.log('Applied Migrations:');
    console.table(migs);

  } catch (err) {
    console.error('Error inspecting database:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
