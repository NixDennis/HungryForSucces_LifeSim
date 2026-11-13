# LifeSim: simulator de viață în Iași

10 NPC-uri trăiesc o săptămână în Iași. Logica locală calculează activitățile, stările și
relațiile fiecăruia pentru fiecare modul orar. LLM-ul (prin OpenRouter) e apelat **doar la click**,
iar rezultatele rămân în cache în PostgreSQL (Neon).

## Stack

- Next.js 14 (App Router, JavaScript)
- MapLibre GL JS pentru harta 3D interactivă a Iașului
- PostgreSQL pe [Neon](https://neon.tech) pentru cache-ul descrierilor generate de LLM
- OpenRouter ca furnizor de LLM (`openai/gpt-4o-mini`)

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

> Fără `DATABASE_URL` aplicația merge și fără cache, dar fiecare click face un apel LLM nou.

### 3. Pornește aplicația

```bash
npm run dev
```

Deschide [http://localhost:3000](http://localhost:3000).

## Cum funcționează

- Simularea pornește și se oprește din butonul **▶ Start / ⏸ Pauză**.
- Un modul orar durează 20 de secunde în timp simulat (8 module pe zi, 7 zile).
- NPC-urile se deplasează animat pe hartă între locații, iar drumul durează între 2 și 12 secunde, în funcție de distanță.
- Un click pe un NPC, din listă sau de pe hartă, deschide panoul cu statisticile și relațiile lui.
- Butonul **✨ Generează descriere** apelează LLM-ul și afișează cam 50 de cuvinte despre ce face NPC-ul.
- Dacă ceri din nou descrierea în același context, răspunsul vine instant din cache (PostgreSQL).

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

## Note

- Cheia API din `.env.local` **nu se commitează niciodată**; fișierul e exclus în `.gitignore`.
- NPC-urile aflate în aceeași locație primesc descrierile dintr-un singur apel LLM (batching).
- Dacă apelul comun eșuează, aplicația revine automat la câte un apel pentru fiecare NPC.
