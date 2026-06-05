// Rulează o dată pentru a crea tabelul de cache în Neon
// Comanda: node scripts/init-db.js

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Încarcă .env.local manual (nu avem Next.js context)
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const [key, ...rest] = line.split('=');
  if (key && rest.length && !key.startsWith('#')) {
    process.env[key.trim()] = rest.join('=').trim();
  }
}

const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS npc_cache (
    cache_key TEXT PRIMARY KEY,
    descriere TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )
`;

console.log('Tabel npc_cache creat cu succes.');
process.exit(0);
