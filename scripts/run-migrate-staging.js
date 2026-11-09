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

const parsed = new URL(dbUrl);
const parsedUnpooled = new URL(unpooledUrl);

console.log('Target Staging Host (Pooled):', parsed.hostname);
console.log('Target Staging Host (Unpooled):', parsedUnpooled.hostname);

const OLD_ENDPOINTS = ['ep-muddy-butterfly-a16q2j0p', 'ep-muddy-credit-a1avk37z', 'plain-surf-10645492'];
if (OLD_ENDPOINTS.some(old => parsed.hostname.includes(old) || parsedUnpooled.hostname.includes(old))) {
  console.error('FATAL: Attempting to run migration against legacy/production database! Aborting.');
  process.exit(1);
}

console.log('Safety check passed. Applying fresh baseline migration 0_init to Vidyora staging database...');

const runEnv = {
  ...process.env,
  DATABASE_URL: dbUrl,
  DATABASE_URL_UNPOOLED: unpooledUrl
};

try {
  const output = execSync('npx prisma migrate deploy', { env: runEnv, stdio: 'pipe' });
  console.log(output.toString());
  console.log('Migration deployed successfully!');
} catch (err) {
  console.error('Migration failed:');
  if (err.stdout) console.log('STDOUT:\n', err.stdout.toString());
  if (err.stderr) console.error('STDERR:\n', err.stderr.toString());
  console.error('ERROR MESSAGE:', err.message);
  process.exit(1);
}
