const fs = require('fs');
const getHost = (file) => {
  if (!fs.existsSync(file)) return 'none';
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  for (const line of lines) {
    if (line.trim().startsWith('DATABASE_URL=')) {
      let val = line.trim().substring('DATABASE_URL='.length).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      try { return new URL(val).hostname; } catch(e) { return 'invalid'; }
    }
  }
  return 'not_found';
};
console.log('.env host:', getHost('.env'));
console.log('.env.local host:', getHost('.env.local'));
