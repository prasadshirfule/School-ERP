const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const envPath = path.join(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('.env.local does not exist!');
  process.exit(1);
}

const env = fs.readFileSync(envPath, 'utf8');
let dbUrl = '';
let unpooledUrl = '';
for (const line of env.split('\n')) {
  const trimmed = line.trim();
  if (trimmed.startsWith('DATABASE_URL=')) {
    dbUrl = trimmed.substring('DATABASE_URL='.length).trim();
    if ((dbUrl.startsWith('"') && dbUrl.endsWith('"')) || (dbUrl.startsWith("'") && dbUrl.endsWith("'"))) {
      dbUrl = dbUrl.slice(1, -1);
    }
  }
  if (trimmed.startsWith('DATABASE_URL_UNPOOLED=')) {
    unpooledUrl = trimmed.substring('DATABASE_URL_UNPOOLED='.length).trim();
    if ((unpooledUrl.startsWith('"') && unpooledUrl.endsWith('"')) || (unpooledUrl.startsWith("'") && unpooledUrl.endsWith("'"))) {
      unpooledUrl = unpooledUrl.slice(1, -1);
    }
  }
}

if (!dbUrl || !unpooledUrl) {
  console.error('Both DATABASE_URL and DATABASE_URL_UNPOOLED must be set in .env.local');
  process.exit(1);
}

const parsed = new URL(dbUrl);
const parsedUnpooled = new URL(unpooledUrl);

console.log('Pooled Host:', parsed.hostname);
console.log('Unpooled Host:', parsedUnpooled.hostname);
console.log('Target Database:', parsed.pathname.replace(/^\//, ''));

const OLD_ENDPOINTS = ['ep-muddy-butterfly-a16q2j0p', 'ep-muddy-credit-a1avk37z'];
if (OLD_ENDPOINTS.some(oldEp => parsed.hostname.includes(oldEp) || parsedUnpooled.hostname.includes(oldEp))) {
  console.error('FATAL SAFETY VIOLATION: Target database matches old School ERP endpoint!');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: { db: { url: unpooledUrl } }
});

async function main() {
  try {
    const info = await prisma.$queryRaw`SELECT current_database() as db, current_user as usr, version() as ver`;
    console.log('Connected DB:', info[0].db);
    console.log('Connected User:', info[0].usr);
    console.log('PostgreSQL Version:', info[0].ver.split(' ').slice(0, 2).join(' '));

    const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
    console.log('Existing tables in public schema:', tables.map(t => t.table_name));
    console.log('Table count:', tables.length);
  } catch (err) {
    console.error('Connection error:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
