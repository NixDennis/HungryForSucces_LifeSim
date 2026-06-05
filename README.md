# LifeSim — Simulator de viață în Iași

10 NPC-uri trăiesc o săptămână în Iași. Logica locală calculează activitățile, stările și
relațiile pentru fiecare modul orar. LLM-ul (OpenRouter) este apelat **doar la click** și
rezultatele sunt cached în PostgreSQL (Neon).

---

## Stack

- **Next.js 14** (App Router, JavaScript)
- **MapLibre GL JS** — hartă interactivă 3D a orașului Iași
- **PostgreSQL** pe [Neon](https://neon.tech) — caching descrieri LLM
- **OpenRouter** — LLM (`openai/gpt-4o-mini`)

---

## Instalare

### 1. Clonează proiectul

```bash
git clone https://github.com/NixDennis/HungryForSucces_LifeSim.git
cd HungryForSucces_LifeSim
npm install
```

### 2. Configurează variabilele de mediu

Creează un fișier `.env.local` în rădăcina proiectului:

```env
OPENROUTER_API_KEY=sk-or-v1-...     # cheia ta de la openrouter.ai
DATABASE_URL=postgresql://...        # connection string de la neon.tech
```

> Fără `DATABASE_URL`, aplicația funcționează fără cache — fiecare click = apel LLM nou.

### 3. Pornește aplicația

```bash
npm run dev
```

Deschide [http://localhost:3000](http://localhost:3000)

---

## Cum funcționează

- Simularea pornește/se oprește cu butonul **▶ Start / ⏸ Pauză**
- Fiecare **modul orar** durează 20 de secunde în timp simulat (8 module/zi × 7 zile)
- NPC-urile se **deplasează animat** pe hartă între locații — durata depinde de distanță (2–12s)
- **Click pe un NPC** (din listă sau de pe hartă) → panou detalii cu statistici și relații
- Butonul **✨ Generează descriere** → apelează LLM și afișează ~50 de cuvinte despre ce face NPC-ul
- A doua oară în același context → răspuns instant din cache (PostgreSQL)

---

## Structura proiectului

```
lifesim/
├── app/
│   ├── components/
│   │   ├── Dashboard.jsx    # UI principal: topbar, listă NPC, hartă, panou detalii
│   │   ├── CityMap.jsx      # Hartă MapLibre cu markere animate
│   │   ├── Globe.jsx        # Ecranul glob 3D de intro
│   │   └── HomeScreen.jsx   # Ecranul de start
│   ├── api/npc/route.js     # POST /api/npc — LLM + caching + batching
│   ├── layout.jsx
│   └── page.jsx
├── lib/
│   ├── npcs.js              # Date NPC-uri: schedule, relații, profesii
│   ├── simulation.js        # Logică deterministă: activități, energie, mood
│   └── db.js                # Neon PostgreSQL wrapper pentru cache
├── public/
│   └── avatars/             # Avatare PNG (1.png – 10.png)
├── .env.local               # NU se commitează — chei API
└── .gitignore
```

---

## Note

- Cheia API din `.env.local` **nu se commitează niciodată** (exclusă din `.gitignore`)
- NPC-urile de la aceeași locație sunt generate împreună într-un singur apel LLM (batching)
- Dacă batch-ul eșuează, se face fallback automat la apel individual
