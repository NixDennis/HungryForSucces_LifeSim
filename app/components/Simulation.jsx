'use client';

import { useState, useEffect, useCallback } from 'react';
import { NPC_INITIALI } from '../../lib/npcs';
import {
  computeAllNPCStates,
  getCurrentDayIndex,
  getCurrentModule,
  MODULE,
  MODULE_LABEL,
  ZILE,
  getWeatherForDay,
  WEATHER_LABEL,
  MOOD_CULORI,
} from '../../lib/simulation';

// ─── STILURI INLINE (urât dar funcțional) ────────────────────────────────────

const S = {
  header: {
    background: '#1a1a2e',
    padding: '16px 24px',
    borderBottom: '2px solid #333',
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    flexWrap: 'wrap',
  },
  title: { margin: 0, fontSize: '1.4rem', color: '#a78bfa' },
  badge: (bg) => ({
    background: bg,
    color: '#fff',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '0.85rem',
    fontWeight: 'bold',
  }),
  nav: {
    display: 'flex',
    gap: '8px',
    padding: '12px 24px',
    background: '#161625',
    borderBottom: '1px solid #333',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  btn: (active) => ({
    padding: '4px 12px',
    border: '1px solid #555',
    borderRadius: '4px',
    background: active ? '#4c1d95' : '#1f1f3a',
    color: active ? '#e9d5ff' : '#aaa',
    cursor: 'pointer',
    fontSize: '0.8rem',
  }),
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
    padding: '20px 24px',
  },
  card: (clickable) => ({
    background: '#1f1f3a',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '14px',
    cursor: clickable ? 'pointer' : 'default',
    transition: 'border-color 0.2s',
  }),
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px',
  },
  name: { margin: 0, fontSize: '1rem', color: '#e9d5ff' },
  prof: { margin: 0, fontSize: '0.75rem', color: '#888' },
  moodBadge: (color) => ({
    background: color,
    color: '#fff',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    whiteSpace: 'nowrap',
  }),
  row: { display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '4px', color: '#ccc' },
  label: { color: '#777' },
  energyBar: (e) => ({
    height: '4px',
    background: e > 60 ? '#22c55e' : e > 30 ? '#f59e0b' : '#ef4444',
    width: `${e}%`,
    borderRadius: '2px',
    marginTop: '6px',
  }),
  desc: {
    marginTop: '10px',
    padding: '8px',
    background: '#0f0f1a',
    borderRadius: '4px',
    fontSize: '0.82rem',
    color: '#c4b5fd',
    lineHeight: '1.5',
    borderLeft: '3px solid #7c3aed',
  },
  loading: {
    marginTop: '10px',
    padding: '8px',
    background: '#0f0f1a',
    borderRadius: '4px',
    fontSize: '0.8rem',
    color: '#666',
    fontStyle: 'italic',
  },
  hint: {
    marginTop: '10px',
    fontSize: '0.72rem',
    color: '#555',
    textAlign: 'center',
  },
  friend: { marginTop: '4px', fontSize: '0.75rem', color: '#6ee7b7' },
  eventBadge: {
    marginTop: '4px',
    fontSize: '0.75rem',
    color: '#fbbf24',
    fontWeight: 'bold',
  },
  backBtn: {
    marginLeft: 'auto',
    padding: '4px 12px',
    border: '1px solid #555',
    borderRadius: '4px',
    background: '#1f1f3a',
    color: '#aaa',
    cursor: 'pointer',
    fontSize: '0.75rem',
  },
};

// ─── COMPONENT ───────────────────────────────────────────────────────────────

// onExit (opțional) — revine la Home Screen / glob
export default function Simulation({ onExit }) {
  const [dayIndex, setDayIndex]       = useState(getCurrentDayIndex());
  const [moduleIndex, setModuleIndex] = useState(MODULE.indexOf(getCurrentModule()));
  const [npcStates, setNpcStates]     = useState([]);
  const [descriptions, setDescriptions] = useState({});  // npcId → string
  const [loading, setLoading]         = useState({});     // npcId → bool
  const [errors, setErrors]           = useState({});     // npcId → string

  // Recalculează stările locale ori de câte ori se schimbă ziua/modulul
  useEffect(() => {
    const states = computeAllNPCStates(NPC_INITIALI, dayIndex, moduleIndex);
    setNpcStates(states);
    // Resetăm descrierile când schimbăm contextul
    setDescriptions({});
    setErrors({});
  }, [dayIndex, moduleIndex]);

  // Click pe card → apelează LLM (cu caching)
  const handleClick = useCallback(async (npcId) => {
    if (loading[npcId]) return;

    setLoading(prev => ({ ...prev, [npcId]: true }));
    setErrors(prev => ({ ...prev, [npcId]: null }));

    try {
      const res = await fetch('/api/npc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ npcId, allStates: npcStates }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.details || data.error || 'Eroare necunoscuta');
      }

      setDescriptions(prev => ({ ...prev, [npcId]: data.descriere }));
    } catch (err) {
      setErrors(prev => ({ ...prev, [npcId]: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, [npcId]: false }));
    }
  }, [loading, npcStates]);

  const weather = getWeatherForDay(dayIndex);

  return (
    <div>
      {/* ── Header ── */}
      <header style={S.header}>
        <h1 style={S.title}>LifeSim — Iași</h1>
        <span style={S.badge('#4c1d95')}>{ZILE[dayIndex]}</span>
        <span style={S.badge('#1e3a5f')}>{MODULE_LABEL[MODULE[moduleIndex]]}</span>
        <span style={S.badge(weather === 'ploaie' ? '#1e3a5f' : weather === 'soare' ? '#92400e' : '#374151')}>
          {WEATHER_LABEL[weather]}
        </span>
        {onExit && (
          <button style={S.backBtn} onClick={onExit}>← Înapoi la hartă</button>
        )}
      </header>

      {/* ── Navigare Zile ── */}
      <nav style={S.nav}>
        <span style={{ color: '#666', fontSize: '0.8rem' }}>Zi:</span>
        {ZILE.map((z, i) => (
          <button key={z} style={S.btn(dayIndex === i)} onClick={() => setDayIndex(i)}>{z}</button>
        ))}
        <span style={{ color: '#666', fontSize: '0.8rem', marginLeft: '16px' }}>Modul:</span>
        {MODULE.map((m, i) => (
          <button key={m} style={S.btn(moduleIndex === i)} onClick={() => setModuleIndex(i)}>
            {m.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </nav>

      {/* ── Grid NPC-uri ── */}
      <main style={S.grid}>
        {npcStates.map(npc => (
          <div
            key={npc.id}
            style={S.card(!loading[npc.id])}
            onClick={() => handleClick(npc.id)}
            title="Click pentru descriere generată de AI"
          >
            {/* Antet card */}
            <div style={S.cardHeader}>
              <div>
                <p style={S.name}>{npc.nume}</p>
                <p style={S.prof}>{npc.varsta} ani • {npc.profesie}</p>
              </div>
              <span style={S.moodBadge(MOOD_CULORI[npc.mood])}>{npc.mood}</span>
            </div>

            {/* Activitate + locatie */}
            <div style={S.row}>
              <span style={S.label}>Activitate:</span>
              <span style={{ textAlign: 'right', maxWidth: '170px' }}>{npc.activitateLabel}</span>
            </div>
            <div style={S.row}>
              <span style={S.label}>Locatie:</span>
              <span style={{ textAlign: 'right', maxWidth: '170px' }}>{npc.locatie}</span>
            </div>
            <div style={S.row}>
              <span style={S.label}>Energie:</span>
              <span>{npc.energie}%</span>
            </div>

            {/* Bara de energie */}
            <div style={{ background: '#333', borderRadius: '2px', marginTop: '6px' }}>
              <div style={S.energyBar(npc.energie)} />
            </div>

            {/* Context suplimentar */}
            {npc.prietenIesire && (
              <p style={S.friend}>Cu {npc.prietenIesire}</p>
            )}
            {npc.event && (
              <p style={S.eventBadge}>! {npc.event}</p>
            )}

            {/* Stare descriere */}
            {loading[npc.id] && (
              <p style={S.loading}>Se genereaza descrierea...</p>
            )}
            {descriptions[npc.id] && !loading[npc.id] && (
              <p style={S.desc}>{descriptions[npc.id]}</p>
            )}
            {errors[npc.id] && !loading[npc.id] && (
              <p style={{ ...S.desc, borderLeftColor: '#ef4444', color: '#fca5a5' }}>
                Eroare: {errors[npc.id]}
              </p>
            )}
            {!descriptions[npc.id] && !loading[npc.id] && !errors[npc.id] && (
              <p style={S.hint}>click pentru descriere AI</p>
            )}
          </div>
        ))}
      </main>
    </div>
  );
}
