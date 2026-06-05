'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { NPC_INITIALI } from '../../lib/npcs';
import {
  computeAllNPCStates,
  getCurrentDayIndex, getCurrentModule,
  MODULE, MODULE_LABEL, MODULE_ATMOSPHERE, ZILE,
  getWeatherForDay, WEATHER_LABEL, MOOD_CULORI,
} from '../../lib/simulation';
import CityMap from './CityMap';

// ─── Constante ────────────────────────────────────────────────────────────────

const MODULE_TIMES = {
  early_morning:   '06:00', late_morning:    '09:00',
  early_afternoon: '12:00', late_afternoon:  '15:00',
  early_evening:   '18:00', late_evening:    '21:00',
  early_night:     '00:00', late_night:      '03:00',
};

const NPC_COLOR = {
  1:'#a78bfa', 2:'#34d399', 3:'#f87171', 4:'#fbbf24', 5:'#fb923c',
  6:'#f472b6', 7:'#60a5fa', 8:'#2dd4bf', 9:'#4ade80', 10:'#94a3b8',
};

// Mood → valoare numerică pentru bara Dispoziție
const MOOD_VALUE = {
  fericit: 88, normal: 65, obosit: 30,
  foame: 42,  trist: 18, bolnav: 15,
  ingrijorat: 40, epuizat: 8,
};

// Relații → badge color
const REL_BADGE = {
  prieten_bun:         { bg:'rgba(34,197,94,0.13)',  border:'rgba(34,197,94,0.4)',  color:'#4ade80',  label:'Prieten bun' },
  prieten:             { bg:'rgba(74,222,128,0.09)',  border:'rgba(74,222,128,0.25)',color:'#86efac',  label:'Prieten' },
  prietena_buna:       { bg:'rgba(34,197,94,0.13)',  border:'rgba(34,197,94,0.4)',  color:'#4ade80',  label:'Prietenă bună' },
  coleg_de_munca:      { bg:'rgba(59,130,246,0.12)', border:'rgba(59,130,246,0.35)',color:'#93c5fd',  label:'Coleg de muncă' },
  coleg_de_facultate:  { bg:'rgba(59,130,246,0.12)', border:'rgba(59,130,246,0.35)',color:'#93c5fd',  label:'Coleg de facultate' },
  partener_de_afaceri: { bg:'rgba(168,85,247,0.12)', border:'rgba(168,85,247,0.35)',color:'#d8b4fe',  label:'Partener de afaceri' },
  vecin:               { bg:'rgba(107,114,128,0.1)', border:'rgba(107,114,128,0.3)',color:'#d1d5db',  label:'Vecin' },
  cunostinta:          { bg:'rgba(100,116,139,0.09)',border:'rgba(100,116,139,0.25)',color:'#94a3b8',  label:'Cunoștință' },
  prieten_vechi:       { bg:'rgba(249,115,22,0.12)', border:'rgba(249,115,22,0.35)',color:'#fdba74',  label:'Prieten vechi' },
  familie:             { bg:'rgba(249,115,22,0.12)', border:'rgba(249,115,22,0.35)',color:'#fdba74',  label:'Familie' },
};

function getRelBadge(type) {
  return REL_BADGE[type] || {
    bg:'rgba(100,116,139,0.09)', border:'rgba(100,116,139,0.25)',
    color:'#94a3b8', label: type.replace(/_/g,' '),
  };
}

const SIM_WEATHER_ICON = { soare:'☀️', noros:'☁️', ploaie:'🌧️', vant:'💨' };

function wttrIcon(code) {
  if (code === 113) return '☀️';
  if (code === 116) return '⛅';
  if (code <= 122) return '☁️';
  if (code <= 260) return '🌫️';
  if (code <= 232) return '⛈️';
  if (code <= 321) return '🌧️';
  if (code <= 395) return '❄️';
  return '🌤️';
}

// ─── Avatare PNG — poze reale din public/avatars/ ────────────────────────────

function NPCAvatar({ id, size = 40 }) {
  return (
    <img
      src={`/avatars/${id}.png`}
      alt={`avatar-${id}`}
      width={size}
      height={size}
      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
    />
  );
}

// Păstrat pentru compatibilitate cu CityMap (HTML string) — folosit ca fallback
const NPC_AVATAR_SVG = {

  1: ( // Student Andrei — păr negru scurt, șapcă absolvire violet
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="19" fill="#1e1b4b"/>
      {/* Față */}
      <circle cx="20" cy="25" r="11" fill="#fcd5a8"/>
      {/* Păr negru care umple sus */}
      <path d="M9 24 Q9 12 20 11 Q31 12 31 24 Q29 17 20 17 Q11 17 9 24Z" fill="#1c1917"/>
      {/* Șapcă — platformă */}
      <rect x="10" y="17" width="20" height="2.5" fill="#4c1d95" rx="0.8"/>
      {/* Șapcă — top trapezoidal */}
      <path d="M13 17 Q13 10 20 10 Q27 10 27 17Z" fill="#5b21b6"/>
      {/* Ciucure */}
      <circle cx="27.5" cy="12.5" r="2" fill="#fbbf24"/>
      <line x1="27.5" y1="14.5" x2="27.5" y2="17" stroke="#fbbf24" strokeWidth="1.4"/>
      {/* Sprâncene */}
      <path d="M14.5 22 Q16.5 20.8 18.5 22" stroke="#3d1f0a" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
      <path d="M21.5 22 Q23.5 20.8 25.5 22" stroke="#3d1f0a" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
      {/* Ochi: sclera albă + pupilă */}
      <circle cx="16" cy="24.5" r="3" fill="white"/>
      <circle cx="24" cy="24.5" r="3" fill="white"/>
      <circle cx="16" cy="24.5" r="1.8" fill="#312e81"/>
      <circle cx="24" cy="24.5" r="1.8" fill="#312e81"/>
      <circle cx="16.9" cy="23.6" r="0.8" fill="white"/>
      <circle cx="24.9" cy="23.6" r="0.8" fill="white"/>
      {/* Obrăjori roz */}
      <ellipse cx="12.5" cy="27.5" rx="2.8" ry="1.7" fill="#fb7185" opacity="0.4"/>
      <ellipse cx="27.5" cy="27.5" rx="2.8" ry="1.7" fill="#fb7185" opacity="0.4"/>
      {/* Gură zâmbitoare */}
      <path d="M16 29.5 Q20 33.5 24 29.5" stroke="#c27c5a" strokeWidth="1.7" fill="none" strokeLinecap="round"/>
    </svg>
  ),

  2: ( // Programatoare Elena — coc înalt negru, ochelari subțiri
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="19" fill="#0f172a"/>
      {/* Față */}
      <circle cx="20" cy="25" r="11" fill="#fddcb5"/>
      {/* Păr lung întunecat */}
      <path d="M9 24 Q9 12 20 11 Q31 12 31 24 Q29 17 20 17 Q11 17 9 24Z" fill="#1e293b"/>
      {/* Coc drept sus */}
      <ellipse cx="25" cy="10" rx="5" ry="4.5" fill="#1e293b"/>
      <ellipse cx="25" cy="10" rx="3.5" ry="3" fill="#334155"/>
      {/* Ochelari subțiri */}
      <rect x="12.5" y="22.5" width="6" height="4.5" fill="none" stroke="#475569" strokeWidth="1.4" rx="1.5"/>
      <rect x="21.5" y="22.5" width="6" height="4.5" fill="none" stroke="#475569" strokeWidth="1.4" rx="1.5"/>
      <line x1="18.5" y1="24.5" x2="21.5" y2="24.5" stroke="#475569" strokeWidth="1.4"/>
      <line x1="12.5" y1="24" x2="11" y2="23.2" stroke="#475569" strokeWidth="1.2"/>
      {/* Sprâncene */}
      <path d="M13.5 21.5 Q15.5 20.3 17.5 21.5" stroke="#4a3728" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
      <path d="M22.5 21.5 Q24.5 20.3 26.5 21.5" stroke="#4a3728" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
      {/* Ochi */}
      <circle cx="15.5" cy="25" r="2.2" fill="white"/>
      <circle cx="24.5" cy="25" r="2.2" fill="white"/>
      <circle cx="15.5" cy="25" r="1.3" fill="#0f172a"/>
      <circle cx="24.5" cy="25" r="1.3" fill="#0f172a"/>
      <circle cx="16.1" cy="24.3" r="0.55" fill="white"/>
      <circle cx="25.1" cy="24.3" r="0.55" fill="white"/>
      {/* Obrăjori */}
      <ellipse cx="12" cy="27.5" rx="2.5" ry="1.5" fill="#f9a8d4" opacity="0.4"/>
      <ellipse cx="28" cy="27.5" rx="2.5" ry="1.5" fill="#f9a8d4" opacity="0.4"/>
      {/* Gură */}
      <path d="M16.5 29 Q20 32 23.5 29" stroke="#b27650" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  ),

  3: ( // Medic Dr. Mihai — păr grizonat scurt, stetoscop roșu
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="19" fill="#450a0a"/>
      {/* Față */}
      <circle cx="20" cy="25" r="11" fill="#fde8d8"/>
      {/* Halat alb — guler vizibil */}
      <path d="M10 38 L13 27 L20 30 L27 27 L30 38" fill="#f8fafc"/>
      {/* Păr gri scurt */}
      <path d="M9 23 Q9 13 20 12 Q31 13 31 23 Q29 17.5 20 17.5 Q11 17.5 9 23Z" fill="#9ca3af"/>
      {/* Tâmple mai deschise */}
      <path d="M9 23 Q9 18 11 16 Q10 19 10 23Z" fill="#d1d5db"/>
      <path d="M31 23 Q31 18 29 16 Q30 19 30 23Z" fill="#d1d5db"/>
      {/* Stetoscop */}
      <path d="M24 28 Q29 23 28 16" stroke="#374151" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <circle cx="28" cy="15.5" r="2.5" fill="#ef4444" stroke="#374151" strokeWidth="0.8"/>
      {/* Sprâncene */}
      <path d="M14.5 22 Q16.5 21 18.5 22" stroke="#6b7280" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
      <path d="M21.5 22 Q23.5 21 25.5 22" stroke="#6b7280" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
      {/* Ochi */}
      <circle cx="16" cy="24.5" r="2.8" fill="white"/>
      <circle cx="24" cy="24.5" r="2.8" fill="white"/>
      <circle cx="16" cy="24.5" r="1.7" fill="#374151"/>
      <circle cx="24" cy="24.5" r="1.7" fill="#374151"/>
      <circle cx="16.8" cy="23.7" r="0.7" fill="white"/>
      <circle cx="24.8" cy="23.7" r="0.7" fill="white"/>
      {/* Obrăjori */}
      <ellipse cx="12.5" cy="27.5" rx="2.5" ry="1.5" fill="#fca5a5" opacity="0.35"/>
      <ellipse cx="27.5" cy="27.5" rx="2.5" ry="1.5" fill="#fca5a5" opacity="0.35"/>
      {/* Gură */}
      <path d="M16.5 29 Q20 32 23.5 29" stroke="#b45309" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
    </svg>
  ),

  4: ( // Profesor Prof. Ioana — păr castaniu în coc mare, ochelari rotunzi
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="19" fill="#451a03"/>
      {/* Față */}
      <circle cx="20" cy="25" r="11" fill="#fef3c7"/>
      {/* Păr castaniu */}
      <path d="M9 23 Q9 12 20 11 Q31 12 31 23 Q29 17 20 17 Q11 17 9 23Z" fill="#92400e"/>
      {/* Coc mare rotund în dreapta-sus */}
      <circle cx="29" cy="12" r="5.5" fill="#92400e"/>
      <circle cx="29" cy="12" r="4" fill="#b45309"/>
      {/* Ace de păr */}
      <line x1="27" y1="9" x2="31" y2="9" stroke="#78350f" strokeWidth="1"/>
      {/* Ochelari rotunzi mari */}
      <circle cx="15.5" cy="25" r="3.5" fill="none" stroke="#78350f" strokeWidth="1.8"/>
      <circle cx="24.5" cy="25" r="3.5" fill="none" stroke="#78350f" strokeWidth="1.8"/>
      <line x1="19" y1="25" x2="21" y2="25" stroke="#78350f" strokeWidth="1.8"/>
      <line x1="12" y1="24.5" x2="10.5" y2="23.8" stroke="#78350f" strokeWidth="1.5"/>
      {/* Ochi prin ochelari */}
      <circle cx="15.5" cy="25" r="2" fill="white"/>
      <circle cx="24.5" cy="25" r="2" fill="white"/>
      <circle cx="15.5" cy="25" r="1.2" fill="#78350f"/>
      <circle cx="24.5" cy="25" r="1.2" fill="#78350f"/>
      <circle cx="16.2" cy="24.3" r="0.5" fill="white"/>
      <circle cx="25.2" cy="24.3" r="0.5" fill="white"/>
      {/* Sprâncene deasupra ochelarilor */}
      <path d="M13 21.8 Q15.5 20.5 17.5 21.8" stroke="#78350f" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M22.5 21.8 Q24.5 20.5 27 21.8" stroke="#78350f" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Obrăjori */}
      <ellipse cx="11.5" cy="27.5" rx="2.5" ry="1.5" fill="#fbbf24" opacity="0.35"/>
      <ellipse cx="28.5" cy="27.5" rx="2.5" ry="1.5" fill="#fbbf24" opacity="0.35"/>
      {/* Gură */}
      <path d="M16 29.5 Q20 33 24 29.5" stroke="#a16207" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  ),

  5: ( // Bucătar Cristi — păr blond, tocă albă înaltă, obrăjori mari
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="19" fill="#431407"/>
      {/* Față */}
      <circle cx="20" cy="26" r="11" fill="#fde9c9"/>
      {/* Tocă albă înaltă */}
      <rect x="12" y="6" width="16" height="14" fill="#f8fafc" rx="1"/>
      <ellipse cx="20" cy="6" rx="9" ry="3.5" fill="#e2e8f0"/>
      <ellipse cx="20" cy="20" rx="10" ry="3" fill="#e2e8f0"/>
      {/* Dungă decorativă tocă */}
      <rect x="12" y="17" width="16" height="1.5" fill="#cbd5e1"/>
      {/* Păr blond lateral */}
      <path d="M12 20.5 Q9 22 9 25" stroke="#fbbf24" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <path d="M28 20.5 Q31 22 31 25" stroke="#fbbf24" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      {/* Sprâncene */}
      <path d="M14.5 23.5 Q16.5 22.2 18.5 23.5" stroke="#a16207" strokeWidth="1.7" fill="none" strokeLinecap="round"/>
      <path d="M21.5 23.5 Q23.5 22.2 25.5 23.5" stroke="#a16207" strokeWidth="1.7" fill="none" strokeLinecap="round"/>
      {/* Ochi fericiți mari */}
      <circle cx="16" cy="25.5" r="3" fill="white"/>
      <circle cx="24" cy="25.5" r="3" fill="white"/>
      <circle cx="16" cy="25.5" r="1.8" fill="#374151"/>
      <circle cx="24" cy="25.5" r="1.8" fill="#374151"/>
      <circle cx="16.9" cy="24.6" r="0.8" fill="white"/>
      <circle cx="24.9" cy="24.6" r="0.8" fill="white"/>
      {/* Obrăjori mari roșii */}
      <ellipse cx="12" cy="28" rx="3" ry="2" fill="#f87171" opacity="0.55"/>
      <ellipse cx="28" cy="28" rx="3" ry="2" fill="#f87171" opacity="0.55"/>
      {/* Zâmbet larg */}
      <path d="M15 30 Q20 35 25 30" stroke="#b45309" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  ),

  6: ( // Artistă Raluca — păr roșcat lung cu ondulații, beret roz
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="19" fill="#500724"/>
      {/* Față */}
      <circle cx="20" cy="24" r="11" fill="#fce7f3"/>
      {/* Păr lung roșcat (cade pe lături) */}
      <path d="M9 22 Q9 12 20 11 Q31 12 31 22 Q30 15 20 15 Q10 15 9 22Z" fill="#b45309"/>
      <path d="M9 22 Q7 28 8 35" stroke="#b45309" strokeWidth="5" fill="none" strokeLinecap="round"/>
      <path d="M31 22 Q33 28 32 35" stroke="#b45309" strokeWidth="5" fill="none" strokeLinecap="round"/>
      {/* Șuviță frontală */}
      <path d="M13 15 Q14 18 13 21" stroke="#92400e" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Beret roz mare */}
      <ellipse cx="20" cy="13.5" rx="12" ry="5.5" fill="#ec4899"/>
      <circle cx="28" cy="11" r="3" fill="#be185d"/>
      {/* Sprâncene ridicate */}
      <path d="M13.5 21 Q15.5 19.5 17.5 21" stroke="#831843" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M22.5 21 Q24.5 19.5 26.5 21" stroke="#831843" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Ochi */}
      <circle cx="16" cy="23.5" r="2.8" fill="white"/>
      <circle cx="24" cy="23.5" r="2.8" fill="white"/>
      <circle cx="16" cy="23.5" r="1.7" fill="#831843"/>
      <circle cx="24" cy="23.5" r="1.7" fill="#831843"/>
      <circle cx="16.8" cy="22.7" r="0.7" fill="white"/>
      <circle cx="24.8" cy="22.7" r="0.7" fill="white"/>
      {/* Obrăjori */}
      <ellipse cx="12" cy="26" rx="2.6" ry="1.6" fill="#f9a8d4" opacity="0.55"/>
      <ellipse cx="28" cy="26" rx="2.6" ry="1.6" fill="#f9a8d4" opacity="0.55"/>
      {/* Pată vopsea pe obraz */}
      <ellipse cx="12" cy="28" rx="1.8" ry="1.2" fill="#a855f7" opacity="0.65"/>
      {/* Gură */}
      <path d="M15.5 28 Q20 32 24.5 28" stroke="#be185d" strokeWidth="1.7" fill="none" strokeLinecap="round"/>
    </svg>
  ),

  7: ( // Avocat Alexandru — păr negru pieptănat cu cărare, cravată roșie
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="19" fill="#0f172a"/>
      {/* Față */}
      <circle cx="20" cy="25" r="11" fill="#dde4f0"/>
      {/* Costum negru — guler */}
      <path d="M10 38 L13 27 L20 31 L27 27 L30 38" fill="#1e293b"/>
      {/* Cămașă albă */}
      <path d="M17 27 L20 31 L23 27 L21.5 25.5 L20 27.5 L18.5 25.5Z" fill="#f8fafc"/>
      {/* Cravată roșie */}
      <polygon points="20,25.5 21.5,30 20,38 18.5,30" fill="#dc2626"/>
      {/* Păr negru pieptănat */}
      <path d="M9 23 Q9 12 20 11 Q31 12 31 23 Q29 17 20 17 Q11 17 9 23Z" fill="#0f172a"/>
      {/* Cărare pe stânga */}
      <path d="M14 11 L16 17" stroke="#1f2937" strokeWidth="1.8"/>
      {/* Sprâncene serioase */}
      <path d="M14 21.5 Q16 20.5 18.5 21.5" stroke="#0f172a" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M21.5 21.5 Q24 20.5 26 21.5" stroke="#0f172a" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Ochi */}
      <circle cx="16" cy="24" r="2.8" fill="white"/>
      <circle cx="24" cy="24" r="2.8" fill="white"/>
      <circle cx="16" cy="24" r="1.7" fill="#1e1b4b"/>
      <circle cx="24" cy="24" r="1.7" fill="#1e1b4b"/>
      <circle cx="16.8" cy="23.2" r="0.7" fill="white"/>
      <circle cx="24.8" cy="23.2" r="0.7" fill="white"/>
      {/* Obrăjori */}
      <ellipse cx="12.5" cy="26.5" rx="2.2" ry="1.4" fill="#a5b4fc" opacity="0.3"/>
      <ellipse cx="27.5" cy="26.5" rx="2.2" ry="1.4" fill="#a5b4fc" opacity="0.3"/>
      {/* Gură serioasă */}
      <path d="M16.5 28.5 Q20 31 23.5 28.5" stroke="#6366f1" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  ),

  8: ( // Antreprenor Bogdan — păr ondulat șaten, expresie energică
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="19" fill="#052e16"/>
      {/* Față */}
      <circle cx="20" cy="25" r="11" fill="#d1fae5"/>
      {/* Păr șaten ondulat */}
      <path d="M9 23 Q9 11 20 10 Q31 11 31 23 Q29 15 20 15 Q11 15 9 23Z" fill="#92400e"/>
      {/* Ondulații vizibile */}
      <path d="M11 16 Q13.5 13.5 16 16 Q18.5 13.5 20 15 Q21.5 13.5 24 16 Q26.5 13.5 29 16"
            stroke="#78350f" strokeWidth="1.5" fill="none"/>
      {/* Sprâncene entuziaste (ridicate) */}
      <path d="M14.5 21.5 Q16.5 20 18.5 21.5" stroke="#713f12" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
      <path d="M21.5 21.5 Q23.5 20 25.5 21.5" stroke="#713f12" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
      {/* Ochi */}
      <circle cx="16" cy="24" r="2.9" fill="white"/>
      <circle cx="24" cy="24" r="2.9" fill="white"/>
      <circle cx="16" cy="24" r="1.8" fill="#065f46"/>
      <circle cx="24" cy="24" r="1.8" fill="#065f46"/>
      <circle cx="16.9" cy="23.1" r="0.8" fill="white"/>
      <circle cx="24.9" cy="23.1" r="0.8" fill="white"/>
      {/* Obrăjori */}
      <ellipse cx="12.5" cy="27" rx="2.6" ry="1.6" fill="#6ee7b7" opacity="0.45"/>
      <ellipse cx="27.5" cy="27" rx="2.6" ry="1.6" fill="#6ee7b7" opacity="0.45"/>
      {/* Zâmbet confident */}
      <path d="M16 29 Q20 33.5 24 29" stroke="#065f46" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
    </svg>
  ),

  9: ( // Sportiv Radu — păr blond scurt, bandană verde cu linie albă
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="19" fill="#14532d"/>
      {/* Față */}
      <circle cx="20" cy="25" r="11" fill="#dcfce7"/>
      {/* Păr blond scurt */}
      <path d="M9 23 Q9 12 20 11 Q31 12 31 23 Q29 17 20 17 Q11 17 9 23Z" fill="#fbbf24"/>
      {/* Bandană verde */}
      <rect x="9.5" y="19" width="21" height="4.5" fill="#15803d" rx="1.5"/>
      <rect x="9.5" y="19" width="21" height="1.8" fill="#4ade80" rx="1.5"/>
      {/* Sprâncene hotărâte */}
      <path d="M14.5 23 Q16.5 21.8 18.5 23" stroke="#166534" strokeWidth="1.9" fill="none" strokeLinecap="round"/>
      <path d="M21.5 23 Q23.5 21.8 25.5 23" stroke="#166534" strokeWidth="1.9" fill="none" strokeLinecap="round"/>
      {/* Ochi */}
      <circle cx="16" cy="25.5" r="2.9" fill="white"/>
      <circle cx="24" cy="25.5" r="2.9" fill="white"/>
      <circle cx="16" cy="25.5" r="1.8" fill="#14532d"/>
      <circle cx="24" cy="25.5" r="1.8" fill="#14532d"/>
      <circle cx="16.9" cy="24.6" r="0.8" fill="white"/>
      <circle cx="24.9" cy="24.6" r="0.8" fill="white"/>
      {/* Obrăjori */}
      <ellipse cx="12.5" cy="28" rx="2.6" ry="1.6" fill="#bbf7d0" opacity="0.5"/>
      <ellipse cx="27.5" cy="28" rx="2.6" ry="1.6" fill="#bbf7d0" opacity="0.5"/>
      {/* Zâmbet energic */}
      <path d="M15.5 29.5 Q20 34 24.5 29.5" stroke="#166534" strokeWidth="1.9" fill="none" strokeLinecap="round"/>
    </svg>
  ),

  10: ( // Pensionar Gheorghe — păr alb, pălărie maro, mustață albă groasă
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="19" fill="#292524"/>
      {/* Față */}
      <circle cx="20" cy="25" r="11" fill="#fef9c3"/>
      {/* Pălărie — boruri largi */}
      <rect x="6" y="16.5" width="28" height="3.5" fill="#92400e" rx="2"/>
      {/* Pălărie — corp */}
      <rect x="12" y="7" width="16" height="10.5" fill="#78350f" rx="2.5"/>
      {/* Dungă pălărie */}
      <rect x="12" y="15" width="16" height="2" fill="#a16207"/>
      {/* Păr alb lateral */}
      <path d="M9 22 Q8 19 10 17.5 Q10 20.5 9 22Z" fill="#e7e5e4"/>
      <path d="M31 22 Q32 19 30 17.5 Q30 20.5 31 22Z" fill="#e7e5e4"/>
      {/* Sprâncene groase, ușor căzute */}
      <path d="M13 22.5 Q15.5 21 18 22" stroke="#78350f" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M22 22 Q24.5 21 27 22.5" stroke="#78350f" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      {/* Ochi înțelepți */}
      <circle cx="16" cy="24.5" r="2.7" fill="white"/>
      <circle cx="24" cy="24.5" r="2.7" fill="white"/>
      <circle cx="16" cy="24.5" r="1.6" fill="#4b3621"/>
      <circle cx="24" cy="24.5" r="1.6" fill="#4b3621"/>
      <circle cx="16.7" cy="23.7" r="0.6" fill="white"/>
      <circle cx="24.7" cy="23.7" r="0.6" fill="white"/>
      {/* Obrăjori calzi */}
      <ellipse cx="12.5" cy="27.5" rx="2.4" ry="1.5" fill="#fbbf24" opacity="0.3"/>
      <ellipse cx="27.5" cy="27.5" rx="2.4" ry="1.5" fill="#fbbf24" opacity="0.3"/>
      {/* Mustată albă groasă */}
      <path d="M13.5 28.5 Q16.5 26.5 20 28 Q23.5 26.5 26.5 28.5"
            stroke="#f5f5f4" strokeWidth="3.2" fill="none" strokeLinecap="round"/>
      {/* Gură sub mustată */}
      <path d="M16.5 31 Q20 34 23.5 31" stroke="#a16207" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
    </svg>
  ),
};

// ─── Stat Bar ────────────────────────────────────────────────────────────────

function StatBar({ label, value, color, icon }) {
  const barColor = color || (value > 60 ? '#22c55e' : value > 30 ? '#f59e0b' : '#ef4444');
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 4 }}>
        <span style={{ fontSize:'0.68rem', color:'#64748b', fontWeight:500, display:'flex', alignItems:'center', gap:4 }}>
          {icon && <span style={{ fontSize:'0.75rem', opacity:0.8 }}>{icon}</span>}
          {label}
        </span>
        <span style={{ fontSize:'0.7rem', color: barColor, fontWeight:700 }}>{value}%</span>
      </div>
      <div style={{ height: 6, background:'rgba(255,255,255,0.07)', borderRadius:6, overflow:'hidden' }}>
        <div style={{
          height:'100%', width:`${value}%`, borderRadius:6,
          background: `linear-gradient(90deg, ${barColor}cc, ${barColor})`,
          transition:'width 0.6s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: `0 0 8px ${barColor}44`,
        }}/>
      </div>
    </div>
  );
}

// ─── TopBar ──────────────────────────────────────────────────────────────────

function TopBar({ dayIndex, moduleIndex, moduleProgress, simRunning, weather,
                  cityStats, onToggleSim, onBack }) {
  const moduleKey  = MODULE[moduleIndex];
  const atmo       = MODULE_ATMOSPHERE[moduleKey] || {};
  const time       = MODULE_TIMES[moduleKey];
  const label      = MODULE_LABEL[moduleKey];
  const secsLeft   = Math.ceil((100 - moduleProgress) * 0.2);
  const accent     = atmo.accent || '#00e5ff';

  return (
    <header style={{ ...TS.bar, borderBottom:`1px solid ${accent}18` }}>
      <button style={TS.backBtn} onClick={onBack}>← Glob</button>

      <div style={TS.logo}>
        Life<span style={{ color: accent }}>●</span>Sim
        <span style={TS.logoCity}>· Iași</span>
      </div>

      <div style={TS.sep} />

      {/* Zi */}
      <div style={TS.dayDisplay}>
        <span style={TS.dayLabel}>ZI</span>
        <span style={TS.dayValue}>{ZILE[dayIndex]}</span>
      </div>

      <div style={TS.sep} />

      {/* Modul + oră */}
      <div style={TS.clockBox}>
        <span style={{ ...TS.clockTime, color: accent }}>{time}</span>
        <span style={{ ...TS.clockLabel, color: accent + 'aa' }}>{label}</span>
      </div>

      {/* Progress bar */}
      <div style={TS.progressWrap}>
        <div style={TS.progressTrack}>
          <div style={{
            ...TS.progressFill,
            width: `${moduleProgress}%`,
            background: `linear-gradient(90deg, ${accent}77, ${accent})`,
            boxShadow: simRunning ? `0 0 10px ${accent}55` : 'none',
          }}/>
        </div>
        {simRunning && <span style={TS.progressLabel}>{secsLeft}s</span>}
      </div>

      {/* Start / Pauză */}
      <button style={TS.simBtn(simRunning)} onClick={onToggleSim}>
        {simRunning ? '⏸ Pauză' : '▶ Start'}
      </button>

      <div style={TS.sep} />

      {/* City Stats */}
      {cityStats && (
        <div style={TS.cityStats}>
          <div style={TS.statChip} title="Persoane active în oraș">
            <span style={TS.chipIcon}>👥</span>
            <span style={{ ...TS.chipVal, color:'#94a3b8' }}>{cityStats.outside} afară</span>
          </div>
          <div style={TS.statChip} title="Energie medie">
            <span style={TS.chipIcon}>⚡</span>
            <span style={{
              ...TS.chipVal,
              color: cityStats.avgEnergy > 60 ? '#4ade80' : cityStats.avgEnergy > 35 ? '#fbbf24' : '#f87171',
            }}>{cityStats.avgEnergy}%</span>
          </div>
          <div style={TS.statChip} title="Dispoziție medie">
            <span style={TS.chipIcon}>😊</span>
            <span style={{
              ...TS.chipVal,
              color: cityStats.avgMood > 60 ? '#a78bfa' : cityStats.avgMood > 40 ? '#fbbf24' : '#f87171',
            }}>{cityStats.avgMood}%</span>
          </div>
          <div style={TS.statChip} title="Starea economiei">
            <span style={TS.chipIcon}>💼</span>
            <span style={{ ...TS.chipVal, color:'#94a3b8' }}>{cityStats.economy}</span>
          </div>
        </div>
      )}

      <div style={{ flex:1 }} />

      {/* Vreme */}
      <div style={TS.weather}>
        <span style={{ fontSize:18, lineHeight:1 }}>{weather.icon}</span>
        <div>
          <div style={TS.wTemp}>{weather.temp}</div>
          <div style={TS.wDesc}>{weather.desc}</div>
        </div>
      </div>
    </header>
  );
}

const TS = {
  bar: {
    height: 56, flexShrink: 0,
    display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px',
    background: 'linear-gradient(180deg, #111827 0%, #0d1117 100%)',
    borderBottom: '1px solid #1e2535',
    fontFamily: 'system-ui,sans-serif', zIndex: 30,
    transition: 'border-color 0.8s',
    boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
  },
  backBtn: {
    padding: '4px 10px', background: 'rgba(139,92,246,0.08)',
    border: '1px solid rgba(139,92,246,0.22)', borderRadius: 7,
    color: '#a78bfa', cursor: 'pointer', fontSize: '0.75rem',
    whiteSpace: 'nowrap', transition: 'all 0.15s', flexShrink: 0,
  },
  logo: { fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', flexShrink: 0 },
  logoCity: { color: '#334155', fontWeight: 400, marginLeft: 4 },
  sep: { width: 1, height: 22, background: 'rgba(255,255,255,0.07)', margin: '0 2px', flexShrink: 0 },
  dayDisplay: { display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', flexShrink: 0 },
  dayLabel: { fontSize: '0.58rem', color: '#4b5563', letterSpacing: '0.08em', fontWeight: 600 },
  dayValue: { fontSize: '0.88rem', fontWeight: 700, color: '#e2e8f0' },
  clockBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 },
  clockTime: { fontSize: '1.1rem', fontWeight: 700, lineHeight: 1.15, transition: 'color 0.8s' },
  clockLabel: { fontSize: '0.58rem', lineHeight: 1, whiteSpace: 'nowrap', transition: 'color 0.8s' },
  progressWrap: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 110, maxWidth: 150, flexShrink: 0 },
  progressTrack: { height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, transition: 'width 0.18s linear' },
  progressLabel: { fontSize: '0.57rem', color: '#4b5563', textAlign: 'right', lineHeight: 1 },
  simBtn: (r) => ({
    padding: '5px 14px', borderRadius: 7, cursor: 'pointer',
    fontWeight: 700, fontSize: '0.78rem', border: '1px solid', whiteSpace: 'nowrap',
    background:  r ? 'rgba(249,115,22,0.12)' : 'rgba(139,92,246,0.12)',
    borderColor: r ? 'rgba(249,115,22,0.4)'  : 'rgba(139,92,246,0.4)',
    color:       r ? '#fb923c'               : '#a78bfa',
    transition: 'all 0.2s', flexShrink: 0,
  }),
  cityStats: { display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 },
  statChip: {
    display: 'flex', alignItems: 'center', gap: 3,
    padding: '3px 8px', borderRadius: 6,
    background: 'rgba(255,255,255,0.03)', border: '1px solid #1e2535',
    whiteSpace: 'nowrap',
  },
  chipIcon: { fontSize: '0.78rem', opacity: 0.85, lineHeight: 1 },
  chipVal:  { fontSize: '0.7rem', fontWeight: 600 },
  weather: { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 },
  wTemp: { fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0' },
  wDesc: { fontSize: '0.6rem', color: '#4b5563' },
};

// ─── NPC Card (lista stângă) ──────────────────────────────────────────────────

function NPCCard({ npc, selected, onClick, traveling }) {
  const color = NPC_COLOR[npc.id] || '#6b7280';
  const mc    = MOOD_CULORI[npc.mood] || '#6b7280';

  return (
    <div style={CS.card(selected, color)} onClick={() => onClick(npc.id)}>
      <div style={CS.avatar(color, selected)}>
        <NPCAvatar id={npc.id} size={38} />
      </div>
      <div style={CS.info}>
        <div style={CS.name}>{npc.nume}</div>
        <div style={CS.prof}>{npc.profesie.split('(')[0].trim()}</div>
        <div style={traveling ? CS.activTravel : CS.activ}>
          {traveling ? `🚶 Spre ${npc.locatie}` : npc.activitateLabel}
        </div>
        <div style={CS.miniBars}>
          <MiniBar value={npc.energie} color={npc.energie > 60 ? '#22c55e' : npc.energie > 30 ? '#f59e0b' : '#ef4444'} title="Energie"/>
          <MiniBar value={npc.foame}   color="#f97316" title="Foame"/>
        </div>
      </div>
      <div style={CS.right}>
        <span style={CS.moodDot(mc)} title={npc.mood}/>
        <span style={{ ...CS.moodText, color: mc }}>{npc.mood}</span>
      </div>
    </div>
  );
}

function MiniBar({ value, color, title }) {
  return (
    <div title={title} style={{ flex:1, height:3, background:'rgba(255,255,255,0.07)', borderRadius:3, overflow:'hidden' }}>
      <div style={{ height:'100%', width:`${value}%`, background:color, borderRadius:3, transition:'width 0.5s' }}/>
    </div>
  );
}

const CS = {
  card: (sel, col) => ({
    display:'flex', alignItems:'center', gap:10, padding:'9px 12px', cursor:'pointer',
    borderLeft:`3px solid ${sel ? col : 'transparent'}`,
    background: sel ? `${col}0d` : 'transparent',
    transition:'background 0.15s, border-color 0.15s',
    borderBottom:'1px solid #1a1f2e',
  }),
  avatar: (c, sel) => ({
    width:38, height:38, borderRadius:'50%', flexShrink:0,
    background:`${c}12`, border:`2px solid ${sel ? c+'aa' : c+'44'}`,
    overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center',
    boxShadow: sel ? `0 0 14px ${c}40` : `0 0 6px ${c}18`,
    transition:'border-color 0.15s, box-shadow 0.15s',
  }),
  info: { flex:1, minWidth:0 },
  name: { fontSize:'0.8rem', fontWeight:600, color:'#dde4f0', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  prof: { fontSize:'0.64rem', color:'#6b7280', marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  activ:      { fontSize:'0.62rem', color:'#4b5563', marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginBottom:4 },
  activTravel:{ fontSize:'0.62rem', color:'#f97316', marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginBottom:4, fontStyle:'italic' },
  miniBars: { display:'flex', gap:3 },
  right: { display:'flex', flexDirection:'column', alignItems:'center', gap:4, flexShrink:0 },
  moodDot: (c) => ({ width:7, height:7, borderRadius:'50%', background:c, boxShadow:`0 0 6px ${c}cc` }),
  moodText: { fontSize:'0.55rem', whiteSpace:'nowrap' },
};

// ─── Panou detalii NPC (dreapta) ─────────────────────────────────────────────

function NPCDetailPanel({ npc, description, loading, errorMsg, onClose, onFetchDesc, traveling }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 10); return () => clearTimeout(t); }, []);

  if (!npc) return null;
  const color   = NPC_COLOR[npc.id] || '#6b7280';
  const mc      = MOOD_CULORI[npc.mood] || '#6b7280';
  const npcData = NPC_INITIALI.find(n => n.id === npc.id);
  const rels    = npcData?.relatii || {};
  const moodVal = MOOD_VALUE[npc.mood] || 60;

  return (
    <aside style={{ ...PS.panel, transform: mounted ? 'translateX(0)' : 'translateX(100%)', opacity: mounted ? 1 : 0 }}>
      <div style={{ ...PS.headerGrad, background:`linear-gradient(160deg, ${color}22 0%, #1a1f2e 55%, #111827 100%)`, borderBottom:`1px solid ${color}20` }}>
        <button style={PS.closeBtn} onClick={onClose}>✕</button>
        <div style={PS.avatarWrap}>
          <div style={{ ...PS.ringOuter, borderColor: color+'22' }}/>
          <div style={{ ...PS.ringInner, borderColor: color+'44' }}/>
          <div style={PS.bigAvatar(color)}>
            <NPCAvatar id={npc.id} size={80} />
          </div>
        </div>
        <h2 style={PS.name}>{npc.nume}</h2>
        <p style={PS.prof}>{npc.profesie}</p>
        <p style={PS.age}>{npc.varsta} ani</p>
        <span style={{ ...PS.moodBadge, background:`${mc}18`, borderColor:`${mc}44`, color:mc }}>{npc.mood}</span>
      </div>

      <div style={PS.body}>
        <div style={PS.section}>
          <div style={PS.sTitle}>📍 ACUM</div>
          <div style={PS.activCard}>
            {traveling && (
              <div style={{ fontSize:'0.72rem', color:'#f97316', fontStyle:'italic', marginBottom:8,
                            display:'flex', alignItems:'center', gap:6,
                            background:'rgba(249,115,22,0.08)', borderRadius:7,
                            padding:'5px 9px', border:'1px solid rgba(249,115,22,0.2)' }}>
                <span style={{ animation:'psBlink 0.9s ease-in-out infinite', display:'inline-block', fontSize:'0.85rem' }}>🚶</span>
                <span>Se deplasează spre <strong style={{ color:'#fb923c' }}>{npc.locatie}</strong>…</span>
              </div>
            )}
            <div style={{ ...PS.activText, opacity: traveling ? 0.45 : 1 }}>{npc.activitateLabel}</div>
            <div style={PS.locText}><span style={{ color:'#60a5fa', fontSize:'0.78rem' }}>📌</span><span>{npc.locatie}</span></div>
            {npc.prietenIesire && <div style={PS.tagGreen}>👥 Cu {npc.prietenIesire}</div>}
            {npc.event          && <div style={PS.tagAmber}>⚡ {npc.event}</div>}
          </div>
        </div>

        <div style={PS.section}>
          <div style={PS.sTitle}>📊 STATISTICI</div>
          <StatBar label="Energie"    value={npc.energie}      color="#22c55e" icon="⚡"/>
          <StatBar label="Dispoziție" value={moodVal}          color={mc}      icon="💫"/>
          <StatBar label="Foame"      value={npc.foame ?? 70}  color="#f97316" icon="🍽"/>
          <StatBar label="Social"     value={npc.social ?? 60} color="#818cf8" icon="💬"/>
        </div>

        {Object.keys(rels).length > 0 && (
          <div style={PS.section}>
            <div style={PS.sTitle}>🤝 RELAȚII</div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {Object.entries(rels).map(([name, type]) => {
                const badge = getRelBadge(type);
                return (
                  <div key={name} style={PS.relCard}>
                    <div style={PS.relName}>{name}</div>
                    <span style={{
                      display:'inline-block', marginTop:3,
                      padding:'2px 9px', borderRadius:12,
                      fontSize:'0.62rem', fontWeight:600, letterSpacing:'0.02em',
                      background:badge.bg, border:`1px solid ${badge.border}`, color:badge.color,
                    }}>{badge.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={PS.section}>
          <div style={PS.sTitle}>✨ DESCRIERE AI</div>
          {loading && <div style={PS.aiLoading}><span style={PS.aiDot}/>Se generează…</div>}
          {description && !loading && <div style={PS.aiDesc}>{description}</div>}
          {errorMsg && !loading && (
            <div style={{ fontSize:'0.72rem', color:'#f87171', background:'rgba(239,68,68,0.08)',
                          border:'1px solid rgba(239,68,68,0.25)', borderRadius:8,
                          padding:'8px 11px', marginBottom:8, lineHeight:1.5 }}>
              ⚠️ {errorMsg}
            </div>
          )}
          {!description && !loading && <button style={PS.genBtn} onClick={onFetchDesc}>
            {errorMsg ? '↩ Încearcă din nou' : '✨ Generează descriere'}
          </button>}
        </div>
      </div>
    </aside>
  );
}

const PS = {
  panel: {
    width:300, flexShrink:0, background:'#111827', borderLeft:'1px solid #1a1f2e',
    display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:'system-ui,sans-serif',
    transition:'transform 0.32s cubic-bezier(0.16,1,0.3,1), opacity 0.22s',
    boxShadow:'-12px 0 40px rgba(0,0,0,0.5)',
  },
  headerGrad: { padding:'24px 16px 20px', display:'flex', flexDirection:'column', alignItems:'center', position:'relative' },
  closeBtn: {
    position:'absolute', top:12, right:12, background:'rgba(255,255,255,0.05)',
    border:'1px solid #20263a', borderRadius:6, color:'#6b7280', cursor:'pointer',
    fontSize:'0.82rem', padding:'2px 7px', zIndex:2, lineHeight:'1.4',
  },
  avatarWrap: { position:'relative', marginBottom:14, width:86, height:86 },
  ringOuter: { position:'absolute', inset:-8, borderRadius:'50%', border:'1.5px solid transparent', animation:'psGlow 3s ease-in-out infinite' },
  ringInner: { position:'absolute', inset:-3, borderRadius:'50%', border:'1.5px solid transparent', animation:'psGlow 2.2s ease-in-out infinite reverse' },
  bigAvatar: (c) => ({
    width:80, height:80, borderRadius:'50%',
    background:`linear-gradient(145deg, ${c}1e 0%, ${c}0a 100%)`,
    border:`2.5px solid ${c}66`, overflow:'hidden',
    display:'flex', alignItems:'center', justifyContent:'center',
    boxShadow:`0 0 30px ${c}30, 0 6px 20px rgba(0,0,0,0.6)`,
    position:'relative', zIndex:1,
  }),
  name: { margin:0, fontSize:'1.05rem', fontWeight:700, color:'#edf2f7', textAlign:'center', letterSpacing:'-0.01em' },
  prof: { margin:'5px 0 2px', fontSize:'0.72rem', color:'#6b7280', textAlign:'center' },
  age:  { margin:'0 0 10px', fontSize:'0.64rem', color:'#4b5563', textAlign:'center' },
  moodBadge: { borderRadius:20, padding:'4px 16px', border:'1px solid', fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.04em' },
  body: { flex:1, overflowY:'auto', overflowX:'hidden' },
  section: { padding:'14px 16px', borderBottom:'1px solid #1a1f2e' },
  sTitle: { fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.12em', color:'#475569', marginBottom:11, textTransform:'uppercase', display:'flex', alignItems:'center', gap:5 },
  activCard: { background:'#1a1f2e', borderRadius:10, padding:'11px 13px', border:'1px solid #20263a', boxShadow:'inset 0 1px 0 rgba(255,255,255,0.03)' },
  activText: { fontSize:'0.86rem', color:'#c9d4e8', lineHeight:1.55, marginBottom:6, fontWeight:500 },
  locText: { fontSize:'0.72rem', color:'#60a5fa', display:'flex', alignItems:'center', gap:5 },
  tagGreen: { fontSize:'0.7rem', color:'#4ade80', marginTop:6 },
  tagAmber: { fontSize:'0.7rem', color:'#fbbf24', marginTop:6, fontWeight:600 },
  relCard: { background:'#1a1f2e', borderRadius:9, padding:'8px 12px', border:'1px solid #20263a', marginBottom:0 },
  relName: { fontSize:'0.78rem', color:'#c4cfe0', fontWeight:600 },
  aiLoading: { display:'flex', alignItems:'center', gap:8, fontSize:'0.77rem', color:'#4b5563', fontStyle:'italic' },
  aiDot: { display:'inline-block', width:7, height:7, borderRadius:'50%', background:'#8b5cf6', animation:'psBlink 1s ease-in-out infinite', flexShrink:0 },
  aiDesc: { fontSize:'0.8rem', color:'#c4b5fd', lineHeight:1.72, background:'rgba(139,92,246,0.08)', borderRadius:9, padding:'11px 13px', borderLeft:'3px solid #8b5cf6' },
  genBtn: {
    width:'100%', padding:'10px 0', borderRadius:9,
    background:'linear-gradient(135deg, rgba(139,92,246,0.14), rgba(99,102,241,0.09))',
    border:'1px solid rgba(139,92,246,0.32)', color:'#a78bfa',
    cursor:'pointer', fontSize:'0.82rem', fontWeight:600,
    transition:'all 0.2s', letterSpacing:'0.02em',
    boxShadow:'0 2px 10px rgba(139,92,246,0.12)',
  },
};

// ─── DASHBOARD PRINCIPAL ──────────────────────────────────────────────────────

export default function Dashboard({ onBack }) {
  const [dayIndex,       setDayIndex]       = useState(0);
  const [moduleIndex,    setModuleIndex]    = useState(0);
  const [simRunning,     setSimRunning]     = useState(false);
  const [moduleProgress, setModuleProgress] = useState(0);
  const progressRef = useRef(0);

  const [selectedNPCId,   setSelectedNPCId]   = useState(null);
  const [npcDescriptions, setNpcDescriptions] = useState({});
  const [loadingDesc,     setLoadingDesc]     = useState({});
  const [descErrors,      setDescErrors]      = useState({});
  // { [npcId]: true } — NPC-uri care se deplasează activ pe hartă
  const [travelState, setTravelState] = useState({});

  const handleTravelStateChange = useCallback((updates) => {
    setTravelState(prev => {
      const next = { ...prev };
      Object.entries(updates).forEach(([id, traveling]) => {
        if (traveling) next[Number(id)] = true;
        else delete next[Number(id)];
      });
      return next;
    });
  }, []);

  const [weather, setWeather] = useState(() => {
    const w = getWeatherForDay(0);
    return { icon: SIM_WEATHER_ICON[w], temp:'—', desc: WEATHER_LABEL[w] };
  });

  const npcStates = useMemo(
    () => computeAllNPCStates(NPC_INITIALI, dayIndex, moduleIndex),
    [dayIndex, moduleIndex]
  );

  const selectedNPC = useMemo(
    () => selectedNPCId ? (npcStates.find(n => n.id === selectedNPCId) ?? null) : null,
    [selectedNPCId, npcStates]
  );

  const cityStats = useMemo(() => {
    if (!npcStates.length) return null;
    const avgEnergy = Math.round(npcStates.reduce((s,n) => s+n.energie, 0) / npcStates.length);
    const avgMood   = Math.round(npcStates.reduce((s,n) => s+(MOOD_VALUE[n.mood]||60), 0) / npcStates.length);
    const outside   = npcStates.filter(n => n.locatie !== 'Acasă').length;
    const moduleKey = MODULE[moduleIndex];
    const workModules = ['late_morning','early_afternoon','late_afternoon'];
    const economy = workModules.includes(moduleKey) ? 'Activă'
                  : moduleKey === 'early_morning' ? 'Trezire'
                  : (moduleKey === 'early_night' || moduleKey === 'late_night') ? 'Liniște'
                  : 'Stabilă';
    return { avgEnergy, avgMood, outside, economy };
  }, [npcStates, moduleIndex]);

  useEffect(() => {
    if (!simRunning) { progressRef.current = 0; setModuleProgress(0); return; }
    const id = setInterval(() => {
      progressRef.current += 1;
      setModuleProgress(progressRef.current);
      if (progressRef.current >= 100) {
        progressRef.current = 0;
        setModuleIndex(prev => {
          if (prev + 1 >= MODULE.length) { setDayIndex(d => (d+1)%7); return 0; }
          return prev + 1;
        });
      }
    }, 200);
    return () => clearInterval(id);
  }, [simRunning]);

  const handleToggleSim = () => { progressRef.current = 0; setModuleProgress(0); setSimRunning(r => !r); };
  useEffect(() => { setNpcDescriptions({}); }, [dayIndex, moduleIndex]);

  useEffect(() => {
    const sim = getWeatherForDay(dayIndex);
    fetch('https://wttr.in/Iasi?format=j1', { signal: AbortSignal.timeout(4000) })
      .then(r => r.json())
      .then(d => {
        const c = d.current_condition[0];
        setWeather({ icon: wttrIcon(Number(c.weatherCode)), temp:`${c.temp_C}°C`, desc:c.weatherDesc[0].value });
      })
      .catch(() => setWeather({ icon: SIM_WEATHER_ICON[sim], temp:'—', desc: WEATHER_LABEL[sim] }));
  }, [dayIndex]);

  const handleNPCSelect = (npcId) => {
    if (!npcId) { setSelectedNPCId(null); return; }
    setSelectedNPCId(prev => prev === npcId ? null : npcId);
  };

  const fetchDescription = async () => {
    if (!selectedNPCId || loadingDesc[selectedNPCId]) return;
    setLoadingDesc(prev => ({ ...prev, [selectedNPCId]: true }));
    setDescErrors(prev => ({ ...prev, [selectedNPCId]: null }));
    try {
      const res  = await fetch('/api/npc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ npcId: selectedNPCId, allStates: npcStates }),
      });
      const data = await res.json();
      if (res.ok && data.descriere) {
        setNpcDescriptions(prev => ({ ...prev, [selectedNPCId]: data.descriere }));
      } else {
        const msg = data.details || data.error || `Eroare HTTP ${res.status}`;
        setDescErrors(prev => ({ ...prev, [selectedNPCId]: msg }));
        console.error('[fetchDescription]', msg);
      }
    } catch (err) {
      setDescErrors(prev => ({ ...prev, [selectedNPCId]: err.message }));
      console.error('[fetchDescription]', err);
    }
    setLoadingDesc(prev => ({ ...prev, [selectedNPCId]: false }));
  };

  const atmo = MODULE_ATMOSPHERE[MODULE[moduleIndex]] || {};

  return (
    <>
      <style>{`
        @keyframes psGlow { 0%,100%{opacity:0.3;transform:scale(1)} 50%{opacity:0.8;transform:scale(1.06)} }
        @keyframes psBlink { 0%,100%{opacity:0.3} 50%{opacity:1} }
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#2a3147;border-radius:4px}
        ::-webkit-scrollbar-thumb:hover{background:#3d4e68}
      `}</style>
      <div style={{ ...DS.root, '--atmo-accent': atmo.accent || '#00e5ff' }}>
        <TopBar dayIndex={dayIndex} moduleIndex={moduleIndex} moduleProgress={moduleProgress}
          simRunning={simRunning} weather={weather} cityStats={cityStats}
          onBack={onBack} onToggleSim={handleToggleSim}/>
        <div style={DS.main}>
          <aside style={DS.left}>
            <div style={DS.listHeader}>
              <span style={DS.listTitle}>Persoane</span>
              <span style={DS.listCount}>{npcStates.length}</span>
            </div>
            <div style={DS.listScroll}>
              {npcStates.map(npc => (
                <NPCCard key={npc.id} npc={npc} selected={selectedNPCId===npc.id}
                  onClick={handleNPCSelect} traveling={!!travelState[npc.id]}/>
              ))}
            </div>
          </aside>
          <main style={DS.center}>
            <CityMap embedded selectedNPCId={selectedNPCId}
              onNPCClick={(npc) => handleNPCSelect(npc?.id ?? null)}
              npcStates={npcStates}
              onTravelStateChange={handleTravelStateChange}/>
          </main>
          {selectedNPC && (
            <NPCDetailPanel npc={selectedNPC}
              description={npcDescriptions[selectedNPCId]}
              loading={loadingDesc[selectedNPCId] || false}
              errorMsg={descErrors[selectedNPCId] || null}
              onClose={() => setSelectedNPCId(null)}
              onFetchDesc={fetchDescription}
              traveling={!!travelState[selectedNPCId]}/>
          )}
        </div>
      </div>
    </>
  );
}

const DS = {
  root: { display:'flex', flexDirection:'column', width:'100vw', height:'100vh', background:'#0d1117', fontFamily:'system-ui,sans-serif', color:'#dde4f0', overflow:'hidden' },
  main: { flex:1, display:'flex', overflow:'hidden' },
  left: { width:224, flexShrink:0, background:'#111827', borderRight:'1px solid #1a1f2e', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'2px 0 12px rgba(0,0,0,0.25)' },
  listHeader: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px 9px', borderBottom:'1px solid #1a1f2e', background:'rgba(0,0,0,0.2)' },
  listTitle: { fontSize:'0.62rem', fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.14em' },
  listCount: { fontSize:'0.62rem', color:'#475569', background:'#1a1f2e', borderRadius:10, padding:'1px 7px', border:'1px solid #20263a' },
  listScroll: { flex:1, overflowY:'auto', overflowX:'hidden' },
  center: { flex:1, position:'relative', overflow:'hidden' },
};
