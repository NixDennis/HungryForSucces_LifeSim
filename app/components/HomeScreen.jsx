'use client';

import { useState, useCallback } from 'react';
import Globe from './Globe';

// ─── Orașe disponibile (structură extensibilă) ───────────────────────────────
// Pentru demo, doar Iași e activ. Adăugarea altui oraș = o nouă intrare aici.
const CITIES = [
  { id: 'iasi', name: 'Iași', country: 'România', lat: 47.1585, lon: 27.6014, active: true },
  // Exemple pregătite pentru viitor (inactive):
  { id: 'cluj', name: 'Cluj-Napoca', country: 'România', lat: 46.7712, lon: 23.6236, active: false },
  { id: 'bucuresti', name: 'București', country: 'România', lat: 44.4268, lon: 26.1025, active: false },
];

// CSS (keyframes + hover — nu se pot face inline)
const CSS = `
.hs-root { position: fixed; inset: 0; overflow: hidden; background: #000; font-family: ui-sans-serif, system-ui, sans-serif; }
.hs-globe { position: absolute; inset: 0; z-index: 1; }
.hs-vignette { position: absolute; inset: 0; z-index: 2; pointer-events: none;
  background: radial-gradient(circle at 50% 45%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%); }
.hs-overlay { position: absolute; inset: 0; z-index: 3; display: flex; flex-direction: column;
  align-items: center; justify-content: center; text-align: center; padding: 24px; }

.hs-fade { animation: hsFade 0.7s ease both; }
@keyframes hsFade { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }

.hs-title { margin: 0; font-size: clamp(3rem, 9vw, 6.5rem); font-weight: 800; letter-spacing: 2px;
  background: linear-gradient(180deg, #ffffff 0%, #a78bfa 60%, #7c3aed 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  text-shadow: 0 0 60px rgba(124,58,237,0.5); animation: hsGlow 4s ease-in-out infinite; }
@keyframes hsGlow { 0%,100% { filter: drop-shadow(0 0 18px rgba(124,58,237,0.4)); }
  50% { filter: drop-shadow(0 0 36px rgba(167,139,250,0.7)); } }

.hs-subtitle { margin: 12px 0 36px; color: #b9b6d8; font-size: clamp(0.9rem, 2.4vw, 1.15rem); letter-spacing: 4px; text-transform: uppercase; }

.hs-btn { cursor: pointer; border: none; border-radius: 999px; padding: 16px 44px; font-size: 1.1rem; font-weight: 700;
  color: #fff; letter-spacing: 1px; background: linear-gradient(135deg, #7c3aed, #4c1d95);
  box-shadow: 0 8px 30px rgba(124,58,237,0.5), inset 0 0 0 1px rgba(255,255,255,0.15);
  transition: transform 0.2s ease, box-shadow 0.2s ease; }
.hs-btn:hover { transform: translateY(-3px) scale(1.04); box-shadow: 0 14px 44px rgba(124,58,237,0.75), inset 0 0 0 1px rgba(255,255,255,0.3); }
.hs-btn:active { transform: translateY(-1px) scale(1.0); }

.hs-panel { background: rgba(17, 14, 34, 0.72); backdrop-filter: blur(10px); border: 1px solid rgba(124,58,237,0.35);
  border-radius: 18px; padding: 28px 30px; min-width: 320px; box-shadow: 0 20px 60px rgba(0,0,0,0.6); }
.hs-panel h2 { margin: 0 0 4px; color: #e9d5ff; font-size: 1.5rem; }
.hs-panel p.hint { margin: 0 0 20px; color: #8b88a8; font-size: 0.85rem; }

.hs-city { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 14px;
  padding: 14px 18px; margin-bottom: 10px; border-radius: 12px; cursor: pointer; text-align: left;
  border: 1px solid rgba(124,58,237,0.4); background: rgba(76,29,149,0.25); color: #fff;
  transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease; }
.hs-city:hover { transform: translateX(4px); background: rgba(124,58,237,0.45); border-color: #a78bfa; }
.hs-city .hs-city-name { font-size: 1.1rem; font-weight: 700; }
.hs-city .hs-city-sub { font-size: 0.75rem; color: #c4b5fd; }
.hs-city .hs-coord { font-size: 0.72rem; color: #9d8fd0; font-family: ui-monospace, monospace; }

.hs-city.disabled { cursor: not-allowed; opacity: 0.45; border-style: dashed; background: rgba(40,36,60,0.3); }
.hs-city.disabled:hover { transform: none; background: rgba(40,36,60,0.3); border-color: rgba(124,58,237,0.4); }
.hs-soon { font-size: 0.65rem; padding: 2px 8px; border-radius: 999px; background: #2a2545; color: #8b88a8; letter-spacing: 1px; }

.hs-caption { color: #c4b5fd; font-size: 1rem; letter-spacing: 2px; animation: hsBlink 1.4s ease-in-out infinite; }
@keyframes hsBlink { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }

.hs-back { margin-top: 16px; background: none; border: none; color: #8b88a8; cursor: pointer; font-size: 0.8rem; }
.hs-back:hover { color: #c4b5fd; }

.hs-footer { position: absolute; bottom: 18px; width: 100%; text-align: center; color: #4a4760; font-size: 0.72rem; z-index: 3; letter-spacing: 2px; }
`;

// onEnterCity() — semnal către pagina principală că intrăm în simulare
export default function HomeScreen({ onEnterCity }) {
  // phase: 'title' → 'cities' → 'focusing' → 'arrived'
  const [phase, setPhase] = useState('title');
  const [city, setCity] = useState(null);     // orașul selectat
  const [target, setTarget] = useState(null); // {lat, lon} pasat globului

  const selectCity = useCallback((c) => {
    if (!c.active) return;
    setCity(c);
    setTarget({ lat: c.lat, lon: c.lon }); // declanșează animația globului
    setPhase('focusing');
  }, []);

  const onArrived = useCallback(() => {
    setPhase('arrived'); // pinul a aterizat → arătăm „Intră în oraș"
  }, []);

  return (
    <div className="hs-root">
      <style>{CSS}</style>

      {/* Globul 3D (fundal) */}
      <div className="hs-globe">
        <Globe target={target} onArrived={onArrived} />
      </div>
      <div className="hs-vignette" />

      {/* Conținut suprapus */}
      <div className="hs-overlay">
        {phase === 'title' && (
          <div className="hs-fade">
            <h1 className="hs-title">LifeSim</h1>
            <p className="hs-subtitle">Un oraș · Zece vieți · O săptămână</p>
            <button className="hs-btn" onClick={() => setPhase('cities')}>Start Game</button>
          </div>
        )}

        {phase === 'cities' && (
          <div className="hs-fade hs-panel">
            <h2>Alege orașul</h2>
            <p className="hint">Selectează destinația simulării</p>
            {CITIES.map((c) => (
              <div
                key={c.id}
                className={`hs-city${c.active ? '' : ' disabled'}`}
                onClick={() => selectCity(c)}
              >
                <div>
                  <div className="hs-city-name">{c.name}</div>
                  <div className="hs-city-sub">{c.country}</div>
                </div>
                {c.active
                  ? <div className="hs-coord">{c.lat}, {c.lon}</div>
                  : <span className="hs-soon">ÎN CURÂND</span>}
              </div>
            ))}
            <button className="hs-back" onClick={() => setPhase('title')}>← înapoi</button>
          </div>
        )}

        {phase === 'focusing' && (
          <div className="hs-fade" style={{ alignSelf: 'flex-end', marginBottom: '12vh' }}>
            <p className="hs-caption">Se localizează {city?.name}…</p>
          </div>
        )}

        {phase === 'arrived' && (
          <div className="hs-fade hs-panel" style={{ marginTop: '38vh' }}>
            <h2>{city?.name}</h2>
            <p className="hint" style={{ fontFamily: 'ui-monospace, monospace' }}>
              {city?.lat}, {city?.lon}
            </p>
            <button className="hs-btn" onClick={onEnterCity}>Intră în oraș →</button>
          </div>
        )}
      </div>

      <div className="hs-footer">LIFESIM · DEMO v1.0</div>
    </div>
  );
}
