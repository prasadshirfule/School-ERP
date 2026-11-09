const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const envPath = path.join(process.cwd(), '.env.local');
const env = fs.readFileSync(envPath, 'utf8');

const envVars = {};
for (const line of env.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const idx = trimmed.indexOf('=');
    let k = trimmed.substring(0, idx).trim();
    let v = trimmed.substring(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    envVars[k] = v;
  }
}

const dbUrl = envVars['DATABASE_URL'];
const unpooledUrl = envVars['DATABASE_URL_UNPOOLED'];

const runEnv = {
  ...process.env,
  DATABASE_URL: dbUrl,
  DATABASE_URL_UNPOOLED: unpooledUrl,
  NODE_ENV: 'development',
  ALLOW_DEV_SEED: 'true'
};

try {
  console.log('Running synthetic dev seed against staging database...');
  const out = execSync('npx ts-node prisma/seed.ts', { env: runEnv, stdio: 'inherit' });
  console.log('Seed execution completed successfully.');
} catch (err) {
  console.error('Seed execution failed:', err.message);
  process.exit(1);
}
