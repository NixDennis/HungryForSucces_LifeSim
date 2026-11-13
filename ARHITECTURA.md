# Arhitectura LifeSim

## 1. Cum e construită aplicația

### Logica locală (fără LLM)

Toată simularea e deterministă și rulează în browser (și pe server, când e nevoie),
fără niciun apel de rețea. Funcția `computeAllNPCStates()` din `lib/simulation.js`
returnează același rezultat pentru aceleași date de intrare: în loc de `Math.random()`
folosește un LCG bazat pe `Math.sin(seed)`.

Fluxul de calcul pentru fiecare NPC, în fiecare modul:

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
LLM-ul nu e apelat niciodată automat. Fiecare NPC pornește cu descrierea `null`,
iar apelul are loc doar când utilizatorul dă click. La încărcarea paginii se fac
deci 0 apeluri LLM.

#### 2. Caching în PostgreSQL (Neon)
Înainte de orice apel LLM, aplicația construiește o cheie de cache:

```
{npc_id}|{ziua}|{modul}|{locatie}|{mood}|{event}|{vreme}
```

Dacă cheia există deja în tabelul `npc_cache`, descrierea vine direct din baza de date,
fără apel LLM. Un NPC în același context (aceeași zi, modul, locație, mood și vreme,
fără event) primește mereu aceeași descriere, instant.

#### 3. Batching
Când mai multe NPC-uri sunt în aceeași locație publică în același modul
(de exemplu 3 prieteni pe același teren de fotbal), un singur apel LLM generează
descrierile pentru toate. Prompt-ul cere un array JSON:

```json
[{"id": 1, "descriere": "..."}, {"id": 9, "descriere": "..."}]
```

Toate rezultatele ajung în cache, așa că următoarele click-uri pe oricare dintre
aceste NPC-uri răspund instant. Dacă JSON-ul primit e invalid, aplicația face
câte un apel separat pentru fiecare NPC.

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

## 2. Cum ai scala la sute de NPC-uri

### Problema

La peste 100 de NPC-uri apar trei probleme:
1. **Date statice masive**: sute de schedule-uri hardcodate nu scalează.
2. **Apeluri LLM costisitoare**: fiecare NPC unic înseamnă un apel separat.
3. **Cache ineficient**: există prea multe combinații de chei.

### Soluția: Dynamic Population

#### Tipuri de NPC, nu indivizi
În loc de 100 de schedule-uri unice, definim 10-15 arhetipuri (student,
muncitor, pensionar, noctambul etc.) cu parametri care variază:

```js
const ARHETIPURI = {
  student: { schedule_template, mood_weights, social_factor: 0.8 },
  medic:   { schedule_template, mood_weights, social_factor: 0.3 },
  // ...
};

// NPC-ul real e generat procedural:
function generateNPC(id, arhetip, seed) { ... }
```

Astfel, 500 de NPC-uri înseamnă 15 template-uri plus parametri de variație.

#### Caching agresiv

Cheia de cache devine una de grup: NPC-urile cu același arhetip, locație, modul,
mood și vreme împart aceeași descriere, în care se înlocuiește doar numele:

```
cache_key: {arhetip}|{locatie}|{modul}|{mood}|{weather}
```

Un singur apel LLM acoperă astfel zeci de NPC-uri asemănătoare.

Cache-ul se poate și pre-încălzi: la pornire, un job de background generează
descrierile pentru toate combinațiile arhetip × locație × modul × mood × vreme
(~15 × 30 × 8 × 7 × 4 = ~100.000 combinații). La runtime, costul e O(1) per NPC.

#### Batching extins

Când sute de NPC-uri sunt în aceeași locație (de exemplu 80 de studenți la universitate),
un singur prompt generează toate descrierile deodată. Structura promptului:

```
La Universitatea Cuza, Luni dimineața:
- 80 studenți (varste 19-25, stări variate: fericit × 40, obosit × 30, normal × 10)
Genereaza 5 descrieri reprezentative (30 cuvinte fiecare) pentru studentii:
- fericit, la facultate
- obosit, la facultate
- normal, la facultate
...
```

Descrierile rezultate se împart aleatoriu NPC-urilor din același grup.

#### LLM o singură dată la setup

La generarea inițială a populației, LLM-ul rulează offline (prin batch API)
și creează un "vocabular de descrieri" pentru fiecare context. La runtime aplicația
doar caută descrierea potrivită în baza de date, așa că LLM-ul costă o singură dată,
la setup, indiferent câți utilizatori are aplicația.

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
| Cache invalidation | TTL per modul (4h); descrierile expiră automat |
| Streaming | Server-Sent Events pentru actualizări live ale NPC-urilor |
