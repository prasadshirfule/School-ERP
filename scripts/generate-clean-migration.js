const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Generating clean UTF-8 DDL via prisma migrate diff...');
const sql = execSync('npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script', {
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024
});

const migDir = path.join(process.cwd(), 'prisma', 'migrations', '0_init');
fs.mkdirSync(migDir, { recursive: true });
fs.writeFileSync(path.join(migDir, 'migration.sql'), sql, 'utf8');

const lockPath = path.join(process.cwd(), 'prisma', 'migrations', 'migration_lock.toml');
fs.writeFileSync(lockPath, 'provider = "postgresql"\n', 'utf8');

console.log('Verified migration.sql written with UTF-8 encoding. Length:', sql.length);
