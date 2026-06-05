// API Route: POST /api/npc
// Primește starea unui NPC, returnează descriere LLM (cu caching + batching)

import { buildPrompt, buildBatchPrompt } from '../../../lib/simulation';
import { getCached, setCached, buildCacheKey, initDb } from '../../../lib/db';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'openai/gpt-4o-mini';

// ─── LLM ─────────────────────────────────────────────────────────────────────

async function callLLM(prompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY lipseste din .env.local');

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'LifeSim',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 220,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

// ─── BATCH ───────────────────────────────────────────────────────────────────

// Încearcă să parseze JSON din răspunsul LLM pentru batch
// Returnează Map<npcId, descriere> sau null la eșec
function parseBatchResponse(text, states) {
  try {
    // Extrage primul array JSON din răspuns
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return null;
    const arr = JSON.parse(match[0]);
    if (!Array.isArray(arr)) return null;
    const result = new Map();
    for (const item of arr) {
      if (item.id && item.descriere) {
        result.set(Number(item.id), String(item.descriere));
      }
    }
    // Validare: trebuie să avem răspuns pentru fiecare NPC
    if (result.size !== states.length) return null;
    return result;
  } catch {
    return null;
  }
}

// ─── HANDLER ─────────────────────────────────────────────────────────────────

export async function POST(request) {
  try {
    // initDb este opțional — dacă DB-ul e down, mergem direct la LLM
    try { await initDb(); } catch (dbErr) {
      console.warn('[/api/npc] DB init ignorat:', dbErr.message);
    }

    const body = await request.json();
    const { npcId, allStates } = body;
    // allStates = array cu stările tuturor NPC-urilor (trimis de client)

    if (!npcId || !allStates) {
      return Response.json({ error: 'npcId si allStates sunt obligatorii' }, { status: 400 });
    }

    const targetState = allStates.find(s => s.id === npcId);
    if (!targetState) {
      return Response.json({ error: 'NPC negasit' }, { status: 404 });
    }

    // ── Verifică cache pentru NPC-ul țintă ────────────────────────────────
    const targetKey = buildCacheKey(
      targetState.id,
      targetState.ziua,
      targetState.modul,
      targetState.locatie,
      targetState.mood,
      targetState.event,
      targetState.weather
    );
    const cached = await getCached(targetKey);
    if (cached) {
      return Response.json({ descriere: cached, fromCache: true });
    }

    // ── Batching: găsim toți NPC-urile la aceeași locație ─────────────────
    // Dacă mai mulți NPC sunt la aceeași locație, generăm pentru toți
    // și salvăm în cache — viitoarele click-uri vor fi instant
    // NPC-urile "Acasă" nu se batchează (fiecare are activitate casnică proprie)
    const statesLaAceeaLocatie = allStates.filter(
      s => s.locatie === targetState.locatie && s.locatie !== 'Acasă'
    );

    // Filtrăm cei care nu sunt deja în cache
    const uncachedStates = [];
    const cacheKeys = new Map();

    for (const s of statesLaAceeaLocatie) {
      const k = buildCacheKey(s.id, s.ziua, s.modul, s.locatie, s.mood, s.event, s.weather);
      cacheKeys.set(s.id, k);
      const c = await getCached(k);
      if (!c) uncachedStates.push(s);
    }

    let descriereTarget = null;

    if (uncachedStates.length > 1) {
      // ── Apel batch: un singur prompt pentru toți NPC-urile uncached ─────
      const batchPrompt = buildBatchPrompt(uncachedStates);
      const batchText = await callLLM(batchPrompt);
      const batchResult = parseBatchResponse(batchText, uncachedStates);

      if (batchResult) {
        // Salvăm toate rezultatele în cache
        for (const s of uncachedStates) {
          const desc = batchResult.get(s.id);
          if (desc) {
            await setCached(cacheKeys.get(s.id), desc);
            if (s.id === npcId) descriereTarget = desc;
          }
        }
      }
    }

    // Fallback: dacă batch-ul a eșuat sau NPC-ul țintă nu e la o locație publică
    if (!descriereTarget) {
      const prompt = buildPrompt(targetState);
      descriereTarget = await callLLM(prompt);
      await setCached(targetKey, descriereTarget);
    }

    return Response.json({ descriere: descriereTarget, fromCache: false });

  } catch (err) {
    console.error('[/api/npc]', err.message);
    return Response.json(
      { error: 'Eroare la generarea descrierii', details: err.message },
      { status: 500 }
    );
  }
}
