// Conexiune Neon PostgreSQL pentru caching descrieri LLM
// Server-side only — nu importa în componente client

import { neon } from '@neondatabase/serverless';

let sql;

function getDb() {
  if (!sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL lipseste din .env.local');
    }
    sql = neon(process.env.DATABASE_URL);
  }
  return sql;
}

// Creează tabelul dacă nu există (rulat la primul apel)
export async function initDb() {
  const db = getDb();
  await db`
    CREATE TABLE IF NOT EXISTS npc_cache (
      cache_key TEXT PRIMARY KEY,
      descriere TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

// Caută în cache — returnează string sau null
export async function getCached(key) {
  try {
    const db = getDb();
    const rows = await db`
      SELECT descriere FROM npc_cache WHERE cache_key = ${key}
    `;
    return rows[0]?.descriere ?? null;
  } catch {
    // Dacă DB e down, nu blocăm — mergem direct la LLM
    return null;
  }
}

// Salvează în cache
export async function setCached(key, descriere) {
  try {
    const db = getDb();
    await db`
      INSERT INTO npc_cache (cache_key, descriere)
      VALUES (${key}, ${descriere})
      ON CONFLICT (cache_key) DO UPDATE SET descriere = EXCLUDED.descriere
    `;
  } catch {
    // Eșec la cache → ignorăm, nu e critic
  }
}

// Construiește cheia de cache din contextul NPC
// Aceeași cheie = aceeași descriere (evităm apeluri duplicate)
export function buildCacheKey(npcId, ziua, modul, locatie, mood, event, weather) {
  return `${npcId}|${ziua}|${modul}|${locatie}|${mood}|${event ?? 'none'}|${weather}`;
}
