# LifeSim — Simulator de viață în Iași

10 NPC-uri hardcodate trăiesc o săptămână în Iași. Logica locală calculează activitățile,
stările și relațiile. LLM-ul (OpenRouter) este apelat **doar la click** și rezultatele
sunt cached în PostgreSQL (Neon).

---

## Stack

- **Next.js 14** (App Router)
- **PostgreSQL** pe [Neon](https://neon.tech) — caching descrieri
- **OpenRouter** — LLM (`mistralai/mistral-7b-instruct`)

---

## Instalare

### 1. Clonează / copiază proiectul

```bash
cd lifesim
npm install
```

### 2. Configurează variabilele de mediu

Editează `.env.local`:

```env
OPENROUTER_API_KEY=sk-or-v1-...     # cheia ta de la openrouter.ai
DATABASE_URL=postgresql://...        # connection string de la neon.tech
```

#### Cum obții `DATABASE_URL` de la Neon:
1. Creează cont gratuit pe [neon.tech](https://neon.tech)
2. Creează un nou proiect
3. **Connection Details** → **Connection string** → copiaz-o în `.env.local`

### 3. Inițializează baza de date

Creează tabelul de cache:

```bash
node --experimental-vm-modules scripts/init-db.js
```

Sau alternativ, rulează manual în consola Neon:

```sql
CREATE TABLE IF NOT EXISTS npc_cache (
  cache_key TEXT PRIMARY KEY,
  descriere TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4. Pornește aplicația

```bash
npm run dev
```

Deschide [http://localhost:3000](http://localhost:3000)

---

## Utilizare

- Aplicația detectează automat ziua și ora reală și afișează modulul corespunzător
- Poți naviga liber între **zile** (Luni–Duminică) și **module** (8 intervale orare)
- **Click pe orice card** → generează o descriere de ~30 cuvinte cu LLM
- A doua oară când dai click pe același NPC în același context → răspuns instant din cache
- NPC-urile aflate la aceeași locație sunt generate împreună (batching)

---

## Structura proiectului

```
lifesim/
├── app/
│   ├── layout.jsx           # HTML wrapper
│   ├── page.jsx             # UI client — grid 10 carduri
│   └── api/npc/route.js     # POST: LLM + caching
├── lib/
│   ├── npcs.js              # Date NPC-uri (schedule, relații)
│   ├── simulation.js        # Logică locală deterministă
│   └── db.js                # Neon PostgreSQL wrapper
├── scripts/
│   └── init-db.js           # Script creare tabel
├── .env.local               # NU se commitează
└── .gitignore
```

---

## Note

- Cheia API OpenRouter din `.env.local` **nu se commitează niciodată** (`.gitignore` o exclude)
- Fără `DATABASE_URL` valid, aplicația funcționează fără cache (fiecare click = apel LLM nou)
- Dacă LLM-ul returnează JSON invalid la batch, se face fallback la apel individual
