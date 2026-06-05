# Arhitectura LifeSim

---

## 1. Cum e construită aplicația

### Logica locală (fără LLM)

Toată simularea rulează **pur determinist** în browser (și pe server la nevoie),
fără niciun apel de rețea. Funcția `computeAllNPCStates()` din `lib/simulation.js`
returnează același rezultat pentru aceleași inputuri — nu există `Math.random()`,
ci un LCG bazat pe `Math.sin(seed)`.

**Fluxul de calcul per NPC, per modul:**

```
schedule de bază
      │
      ▼
EVENT SYSTEM
  - urgent (2%/modul)   → anulează orice activitate
  - personal (3%/modul) → înlocuiește activitățile non-obligatorii
      │
      ▼
WEATHER SYSTEM
  - ploaie → 50% șansă să anuleze activitățile SOCIALE
  - vânt   → 20% șansă să anuleze activitățile SOCIALE
  - obligatoriile (munca, facultate, spital...) nu sunt niciodată afectate
      │
      ▼
RELATIONSHIP SYSTEM
  - prieten_bun la aceeași locație → 70% șansă să iasă împreună
      │
      ▼
RANDOM 10%
  - schimbare fără motiv (nu pentru activități obligatorii)
      │
      ▼
MOOD SYSTEM
  - bolnav:     5% determinist per zi
  - obosit:     dacă a stat la club noaptea precedentă
  - foame:      3+ module consecutive fără masă
  - fericit:    10% determinist
  - îngrijorat: 5% determinist
      │
      ▼
ENERGIE
  - pornește de la 100, scade per modul activ
  - activități intense (club, antrenament) scad mai mult
  - somn/relaxare recuperează energie
```

### Optimizările LLM

#### 1. Lazy Evaluation
LLM-ul **nu este apelat niciodată automat**. Starea inițială a fiecărui NPC
este `null` (fără descriere). Apelul are loc strict la click-ul utilizatorului.
Asta înseamnă 0 apeluri LLM la încărcarea paginii.

#### 2. Caching în PostgreSQL (Neon)
Înainte de orice apel LLM se construiește o **cheie de cache**:

```
{npc_id}|{ziua}|{modul}|{locatie}|{mood}|{event}|{vreme}
```

Dacă această cheie există în tabelul `npc_cache`, se returnează direct din DB —
fără apel LLM. Un NPC cu același context (aceeași zi, modul, locație, mood,
vreme, fără event) primește mereu aceeași descriere, instant.

#### 3. Batching
Când mai mulți NPC-uri se află **la aceeași locație publică** în același modul
(ex: 3 prieteni la același teren de fotbal), un singur apel LLM generează
descrieri pentru **toți**. Prompt-ul cere un array JSON:

```json
[{"id": 1, "descriere": "..."}, {"id": 9, "descriere": "..."}]
```

Toate rezultatele se salvează în cache. Următoarele click-uri pe oricare
din acești NPC-uri vor fi instant. Dacă JSON-ul e invalid, se face fallback
la un apel individual.

### Fluxul complet la click

```
User click pe NPC
      │
      ▼
page.jsx → POST /api/npc { npcId, allStates }
      │
      ▼
route.js → buildCacheKey(npcId, context)
      │
      ├── Cache HIT  → return descriere din DB (instant)
      │
      └── Cache MISS
            │
            ▼
         Găsește NPC-uri la aceeași locație
            │
            ├── > 1 NPC uncached la locație publică
            │       → buildBatchPrompt()
            │       → callLLM() → parseBatchResponse()
            │       → setCached() pentru toți
            │
            └── 1 NPC sau batch eșuat
                    → buildPrompt()
                    → callLLM()
                    → setCached()
            │
            ▼
         Return { descriere, fromCache }
```

---

## 2. Cum ai scala la sute de NPC-uri

### Problema

La 100+ NPC-uri apar trei probleme:
1. **Date statice masive** — sute de schedule-uri hardcodate nu scalează
2. **Apeluri LLM costisitoare** — fiecare NPC unic = apel separat
3. **Cache ineficient** — prea multe combinații de chei

### Soluția: Dynamic Population

#### Tipuri de NPC, nu indivizi
În loc de 100 schedule-uri unice, definim **10–15 arhetipuri** (student,
muncitor, pensionar, noctambul etc.) cu variații de parametri:

```js
const ARHETIPURI = {
  student: { schedule_template, mood_weights, social_factor: 0.8 },
  medic:   { schedule_template, mood_weights, social_factor: 0.3 },
  // ...
};

// NPC-ul real e generat procedural:
function generateNPC(id, arhetip, seed) { ... }
```

Astfel, 500 de NPC-uri = 15 template-uri + parametri de variație.

#### Caching agresiv

**Cheie de grup** în loc de cheie individuală — NPC-urile cu același
arhetip + locație + modul + mood + vreme împart aceeași descriere
(cu substituție de nume):

```
cache_key: {arhetip}|{locatie}|{modul}|{mood}|{weather}
```

Un singur apel LLM acoperă zeci de NPC-uri similare.

**Pre-warming** al cache-ului: la pornire, un job de background generează
descrierile pentru toate combinațiile arhetip × locație × modul × mood × vreme
(~15 × 30 × 8 × 7 × 4 = ~100.000 combinații). Costul e O(1) per NPC la runtime.

#### Batching extins

Cu sute de NPC-uri la aceeași locație (ex: 80 de studenți la universitate),
un singur prompt generează toate descrierile în paralel. Structura promptului:

```
La Universitatea Cuza, Luni dimineața:
- 80 studenți (varste 19-25, stări variate: fericit × 40, obosit × 30, normal × 10)
Genereaza 5 descrieri reprezentative (30 cuvinte fiecare) pentru studentii:
- fericit, la facultate
- obosit, la facultate
- normal, la facultate
...
```

Rezultatele se aplică aleatoriu NPC-urilor din același grup.

#### LLM o singură dată la setup

La generarea inițială a populației, LLM-ul rulează **offline** (batch API)
pentru a crea un "vocabular de descrieri" per context. La runtime, aplicația
face **lookup**, nu generare. Costul LLM devine un cost fix de setup,
nu un cost per utilizator.

```
Setup (o dată): LLM → 100k descrieri → DB
Runtime:        User click → DB lookup (sub 10ms)
```

#### Infrastructure

| Component | Tool |
|-----------|------|
| State management | Redis (în loc de simplu useState) |
| DB | Neon cu connection pooling (PgBouncer) |
| LLM batching | Anthropic Batch API / OpenAI Batch |
| Cache invalidation | TTL per modul (4h) — descrierile expiră automat |
| Streaming | Server-Sent Events pentru actualizări live ale NPC-urilor |
