'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// ─── Configurare hartă ────────────────────────────────────────────────────────
// pitch redus la 35° (față de 54°) → perspectivă mai clară, markere mai precise
const IASI = { lng: 27.5870, lat: 47.1590, zoom: 14.0, pitch: 35, bearing: -14 };
const LIBERTY_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const MARKER_SIZE    = 38; // px — folosit și pentru container și pentru offset

// ─── NPC_HOME: coordonate ACASĂ — DISTINCTE față de locurile de muncă ────────
// CAUZA BUG: anterior NPC_HOME[3] = coordonatele spitalului → Dr. Mihai nu
// se mișca niciodată vizibil (locatie='Spitalul Sf. Spiridon' = locatie='Acasă')
// FIX: fiecare NPC are o adresă rezidențială distinctă geografic față de job.
const NPC_HOME = {
  1:  [27.5688, 47.1748],  // Andrei  — cartier Copou, lângă parc (NU UAIC campus)
  2:  [27.5925, 47.1645],  // Elena   — cartier Tătărași (NU Palas birou!)
  3:  [27.5780, 47.1685],  // Dr Mihai — cartier Centru-Nord (NU spitalul!)
  4:  [27.5760, 47.1762],  // Prof Ioana — cartier Copou superior (NU campus)
  5:  [27.5825, 47.1645],  // Cristi  — cartier Podu Roș (NU restaurant Berărescu)
  6:  [27.5865, 47.1628],  // Raluca  — cartier Centru-Est (NU Palatul Culturii)
  7:  [27.5792, 47.1648],  // Alexandru — cartier Centru-Vest (NU tribunalul)
  8:  [27.6015, 47.1562],  // Bogdan  — cartier Moara de Vânt (NU Palas birou!)
  9:  [27.5948, 47.1488],  // Radu    — cartier Polivalentă (aproape dar DISTINCTE)
  10: [27.5700, 47.1762],  // Gheorghe — Copou superior (DIFERIT de Parcul Copou)
};

// ─── Mapare completă: locație simulare → coordonate GPS ──────────────────────
// Acoperă TOATE locațiile din lib/simulation.js → LOCATII
// Coordonate verificate să fie la intersecții de stradă / puncte de acces,
// NU în interiorul clădirilor sau parcărilor.
const LOCATION_COORDS = {
  // ── Universitate ──
  'UAIC (Copou)':                     [27.5733, 47.1714],
  'Cantina UAIC':                     [27.5728, 47.1709],
  'Biblioteca Centrală Universitară': [27.5740, 47.1688],
  // ── Birouri / business ──
  'Birou (Palas)':                    [27.5885, 47.1522],
  'Hotel Unirea':                     [27.5878, 47.1607],
  'Centrul de Afaceri Moldova':       [27.5883, 47.1519],
  // ── Medical ──
  'Spitalul Sf. Spiridon':            [27.5896, 47.1570],
  'Policlinica Providența':           [27.5872, 47.1635],
  // ── Parcuri / sport ──
  'Parcul Copou':                     [27.5704, 47.1748],
  'Parcul Expoziției':                [27.5978, 47.1462],
  'Sala Polivalentă Iași':            [27.5988, 47.1455],
  'Cantina sportivilor':              [27.5986, 47.1458],
  'Centrul de Recuperare':            [27.5983, 47.1451],
  'Sala Fitness Copou':               [27.5718, 47.1722],
  'Terenul Tătărași':                 [27.6048, 47.1522],
  'Iași Golf Club':                   [27.6195, 47.1402],
  // ── Centru ──
  'Centrul Vechi':                    [27.5868, 47.1601],
  'Palatul Culturii':                 [27.5898, 47.1558],
  // ── Juridic ──
  'Tribunalul Iași':                  [27.5870, 47.1597],
  'Cabinet de Avocatură (Centru)':    [27.5866, 47.1600],
  // ── Artă / cultură ──
  'Atelier de Artă (Palas)':          [27.5881, 47.1524],
  'Galeria de Artă':                  [27.5890, 47.1560],
  'Filarmonica Moldova':              [27.5868, 47.1610],
  'Cinema Ateneu':                    [27.5875, 47.1614],
  // ── Cafenele / baruri ──
  'Cafeneaua Bolta Rece':             [27.5856, 47.1592],
  'Cafeneaua Arkadia':                [27.5871, 47.1614],
  'Vero Café':                        [27.5863, 47.1600],
  'Cafeneaua Boema':                  [27.5860, 47.1596],
  'Berăria Bolta Rece':               [27.5856, 47.1592],
  'Club Underground':                 [27.5862, 47.1598],
  // ── Restaurante ──
  'Restaurant Berărescu':             [27.5853, 47.1591],
  'Restaurant Bolta Rece':            [27.5857, 47.1593],
  'Restaurant Vatra':                 [27.5877, 47.1607],
  'Cantina Palas':                    [27.5884, 47.1520],
  // ── Piețe / cumpărături ──
  'Hala Centrală':                    [27.5870, 47.1591],
  'Piața Centrală':                   [27.5870, 47.1589],
  'Iulius Mall':                      [27.5993, 47.1438],
  // ── Altele ──
  'Catedrala Mitropolitană':          [27.5835, 47.1574],
  'Casa părinților':                  [27.5745, 47.1703],
  // ── Locații dinamice frecvente ──
  'Masa spital':                      [27.5896, 47.1570],   // ~ Spitalul Sf. Spiridon
};

// Returnează coordonate [lng, lat] pentru o locație din simulare.
// 'Acasă' → coordonatele rezidențiale ale NPC-ului specific (distincte de job).
// Locație necartografiată → fallback NPC_HOME.
function getLocatieCoords(locatie, npcId) {
  if (!locatie || locatie === 'Acasă') return NPC_HOME[npcId] || null;
  const coords = LOCATION_COORDS[locatie];
  if (coords) return coords;
  // Fallback cu logging pentru locații noi necartografiate
  console.warn(`[LifeSim] locație necartografiată: "${locatie}" (NPC ${npcId}) → NPC_HOME`);
  return NPC_HOME[npcId] || null;
}

// ─── Date de bază NPC pentru markere ────────────────────────────────────────
const NPCS = [
  { id: 1,  name: 'Andrei Popa',           color: '#a78bfa' },
  { id: 2,  name: 'Elena Vasile',           color: '#34d399' },
  { id: 3,  name: 'Dr. Mihai Ionescu',      color: '#f87171' },
  { id: 4,  name: 'Prof. Ioana Constantin', color: '#fbbf24' },
  { id: 5,  name: 'Cristi Popescu',         color: '#fb923c' },
  { id: 6,  name: 'Raluca Stan',            color: '#f472b6' },
  { id: 7,  name: 'Alexandru Dima',         color: '#60a5fa' },
  { id: 8,  name: 'Bogdan Marin',           color: '#2dd4bf' },
  { id: 9,  name: 'Radu Georgescu',         color: '#4ade80' },
  { id: 10, name: 'Gheorghe Lupu',          color: '#94a3b8' },
];

// ─── Avatare SVG (HTML string — stil cartoon pixel-art, identice cu Dashboard) ─
const NPC_AVATAR_HTML = {
  1: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="19" fill="#1e1b4b"/><circle cx="20" cy="25" r="11" fill="#fcd5a8"/><path d="M9 24 Q9 12 20 11 Q31 12 31 24 Q29 17 20 17 Q11 17 9 24Z" fill="#1c1917"/><rect x="10" y="17" width="20" height="2.5" fill="#4c1d95" rx="0.8"/><path d="M13 17 Q13 10 20 10 Q27 10 27 17Z" fill="#5b21b6"/><circle cx="27.5" cy="12.5" r="2" fill="#fbbf24"/><line x1="27.5" y1="14.5" x2="27.5" y2="17" stroke="#fbbf24" stroke-width="1.4"/><path d="M14.5 22 Q16.5 20.8 18.5 22" stroke="#3d1f0a" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M21.5 22 Q23.5 20.8 25.5 22" stroke="#3d1f0a" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="16" cy="24.5" r="3" fill="white"/><circle cx="24" cy="24.5" r="3" fill="white"/><circle cx="16" cy="24.5" r="1.8" fill="#312e81"/><circle cx="24" cy="24.5" r="1.8" fill="#312e81"/><circle cx="16.9" cy="23.6" r="0.8" fill="white"/><circle cx="24.9" cy="23.6" r="0.8" fill="white"/><ellipse cx="12.5" cy="27.5" rx="2.8" ry="1.7" fill="#fb7185" opacity="0.4"/><ellipse cx="27.5" cy="27.5" rx="2.8" ry="1.7" fill="#fb7185" opacity="0.4"/><path d="M16 29.5 Q20 33.5 24 29.5" stroke="#c27c5a" stroke-width="1.7" fill="none" stroke-linecap="round"/></svg>`,
  2: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="19" fill="#0f172a"/><circle cx="20" cy="25" r="11" fill="#fddcb5"/><path d="M9 24 Q9 12 20 11 Q31 12 31 24 Q29 17 20 17 Q11 17 9 24Z" fill="#1e293b"/><ellipse cx="25" cy="10" rx="5" ry="4.5" fill="#1e293b"/><ellipse cx="25" cy="10" rx="3.5" ry="3" fill="#334155"/><rect x="12.5" y="22.5" width="6" height="4.5" fill="none" stroke="#475569" stroke-width="1.4" rx="1.5"/><rect x="21.5" y="22.5" width="6" height="4.5" fill="none" stroke="#475569" stroke-width="1.4" rx="1.5"/><line x1="18.5" y1="24.5" x2="21.5" y2="24.5" stroke="#475569" stroke-width="1.4"/><line x1="12.5" y1="24" x2="11" y2="23.2" stroke="#475569" stroke-width="1.2"/><path d="M13.5 21.5 Q15.5 20.3 17.5 21.5" stroke="#4a3728" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M22.5 21.5 Q24.5 20.3 26.5 21.5" stroke="#4a3728" stroke-width="1.4" fill="none" stroke-linecap="round"/><circle cx="15.5" cy="25" r="2.2" fill="white"/><circle cx="24.5" cy="25" r="2.2" fill="white"/><circle cx="15.5" cy="25" r="1.3" fill="#0f172a"/><circle cx="24.5" cy="25" r="1.3" fill="#0f172a"/><circle cx="16.1" cy="24.3" r="0.55" fill="white"/><circle cx="25.1" cy="24.3" r="0.55" fill="white"/><ellipse cx="12" cy="27.5" rx="2.5" ry="1.5" fill="#f9a8d4" opacity="0.4"/><ellipse cx="28" cy="27.5" rx="2.5" ry="1.5" fill="#f9a8d4" opacity="0.4"/><path d="M16.5 29 Q20 32 23.5 29" stroke="#b27650" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>`,
  3: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="19" fill="#450a0a"/><circle cx="20" cy="25" r="11" fill="#fde8d8"/><path d="M10 38 L13 27 L20 30 L27 27 L30 38" fill="#f8fafc"/><path d="M9 23 Q9 13 20 12 Q31 13 31 23 Q29 17.5 20 17.5 Q11 17.5 9 23Z" fill="#9ca3af"/><path d="M9 23 Q9 18 11 16 Q10 19 10 23Z" fill="#d1d5db"/><path d="M31 23 Q31 18 29 16 Q30 19 30 23Z" fill="#d1d5db"/><path d="M24 28 Q29 23 28 16" stroke="#374151" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="28" cy="15.5" r="2.5" fill="#ef4444" stroke="#374151" stroke-width="0.8"/><path d="M14.5 22 Q16.5 21 18.5 22" stroke="#6b7280" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M21.5 22 Q23.5 21 25.5 22" stroke="#6b7280" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="16" cy="24.5" r="2.8" fill="white"/><circle cx="24" cy="24.5" r="2.8" fill="white"/><circle cx="16" cy="24.5" r="1.7" fill="#374151"/><circle cx="24" cy="24.5" r="1.7" fill="#374151"/><circle cx="16.8" cy="23.7" r="0.7" fill="white"/><circle cx="24.8" cy="23.7" r="0.7" fill="white"/><ellipse cx="12.5" cy="27.5" rx="2.5" ry="1.5" fill="#fca5a5" opacity="0.35"/><ellipse cx="27.5" cy="27.5" rx="2.5" ry="1.5" fill="#fca5a5" opacity="0.35"/><path d="M16.5 29 Q20 32 23.5 29" stroke="#b45309" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>`,
  4: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="19" fill="#451a03"/><circle cx="20" cy="25" r="11" fill="#fef3c7"/><path d="M9 23 Q9 12 20 11 Q31 12 31 23 Q29 17 20 17 Q11 17 9 23Z" fill="#92400e"/><circle cx="29" cy="12" r="5.5" fill="#92400e"/><circle cx="29" cy="12" r="4" fill="#b45309"/><line x1="27" y1="9" x2="31" y2="9" stroke="#78350f" stroke-width="1"/><circle cx="15.5" cy="25" r="3.5" fill="none" stroke="#78350f" stroke-width="1.8"/><circle cx="24.5" cy="25" r="3.5" fill="none" stroke="#78350f" stroke-width="1.8"/><line x1="19" y1="25" x2="21" y2="25" stroke="#78350f" stroke-width="1.8"/><line x1="12" y1="24.5" x2="10.5" y2="23.8" stroke="#78350f" stroke-width="1.5"/><circle cx="15.5" cy="25" r="2" fill="white"/><circle cx="24.5" cy="25" r="2" fill="white"/><circle cx="15.5" cy="25" r="1.2" fill="#78350f"/><circle cx="24.5" cy="25" r="1.2" fill="#78350f"/><circle cx="16.2" cy="24.3" r="0.5" fill="white"/><circle cx="25.2" cy="24.3" r="0.5" fill="white"/><path d="M13 21.8 Q15.5 20.5 17.5 21.8" stroke="#78350f" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M22.5 21.8 Q24.5 20.5 27 21.8" stroke="#78350f" stroke-width="1.5" fill="none" stroke-linecap="round"/><ellipse cx="11.5" cy="27.5" rx="2.5" ry="1.5" fill="#fbbf24" opacity="0.35"/><ellipse cx="28.5" cy="27.5" rx="2.5" ry="1.5" fill="#fbbf24" opacity="0.35"/><path d="M16 29.5 Q20 33 24 29.5" stroke="#a16207" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>`,
  5: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="19" fill="#431407"/><circle cx="20" cy="26" r="11" fill="#fde9c9"/><rect x="12" y="6" width="16" height="14" fill="#f8fafc" rx="1"/><ellipse cx="20" cy="6" rx="9" ry="3.5" fill="#e2e8f0"/><ellipse cx="20" cy="20" rx="10" ry="3" fill="#e2e8f0"/><rect x="12" y="17" width="16" height="1.5" fill="#cbd5e1"/><path d="M12 20.5 Q9 22 9 25" stroke="#fbbf24" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M28 20.5 Q31 22 31 25" stroke="#fbbf24" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M14.5 23.5 Q16.5 22.2 18.5 23.5" stroke="#a16207" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M21.5 23.5 Q23.5 22.2 25.5 23.5" stroke="#a16207" stroke-width="1.7" fill="none" stroke-linecap="round"/><circle cx="16" cy="25.5" r="3" fill="white"/><circle cx="24" cy="25.5" r="3" fill="white"/><circle cx="16" cy="25.5" r="1.8" fill="#374151"/><circle cx="24" cy="25.5" r="1.8" fill="#374151"/><circle cx="16.9" cy="24.6" r="0.8" fill="white"/><circle cx="24.9" cy="24.6" r="0.8" fill="white"/><ellipse cx="12" cy="28" rx="3" ry="2" fill="#f87171" opacity="0.55"/><ellipse cx="28" cy="28" rx="3" ry="2" fill="#f87171" opacity="0.55"/><path d="M15 30 Q20 35 25 30" stroke="#b45309" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`,
  6: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="19" fill="#500724"/><circle cx="20" cy="24" r="11" fill="#fce7f3"/><path d="M9 22 Q9 12 20 11 Q31 12 31 22 Q30 15 20 15 Q10 15 9 22Z" fill="#b45309"/><path d="M9 22 Q7 28 8 35" stroke="#b45309" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M31 22 Q33 28 32 35" stroke="#b45309" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M13 15 Q14 18 13 21" stroke="#92400e" stroke-width="2" fill="none" stroke-linecap="round"/><ellipse cx="20" cy="13.5" rx="12" ry="5.5" fill="#ec4899"/><circle cx="28" cy="11" r="3" fill="#be185d"/><path d="M13.5 21 Q15.5 19.5 17.5 21" stroke="#831843" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M22.5 21 Q24.5 19.5 26.5 21" stroke="#831843" stroke-width="1.5" fill="none" stroke-linecap="round"/><circle cx="16" cy="23.5" r="2.8" fill="white"/><circle cx="24" cy="23.5" r="2.8" fill="white"/><circle cx="16" cy="23.5" r="1.7" fill="#831843"/><circle cx="24" cy="23.5" r="1.7" fill="#831843"/><circle cx="16.8" cy="22.7" r="0.7" fill="white"/><circle cx="24.8" cy="22.7" r="0.7" fill="white"/><ellipse cx="12" cy="26" rx="2.6" ry="1.6" fill="#f9a8d4" opacity="0.55"/><ellipse cx="28" cy="26" rx="2.6" ry="1.6" fill="#f9a8d4" opacity="0.55"/><ellipse cx="12" cy="28" rx="1.8" ry="1.2" fill="#a855f7" opacity="0.65"/><path d="M15.5 28 Q20 32 24.5 28" stroke="#be185d" stroke-width="1.7" fill="none" stroke-linecap="round"/></svg>`,
  7: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="19" fill="#0f172a"/><circle cx="20" cy="25" r="11" fill="#dde4f0"/><path d="M10 38 L13 27 L20 31 L27 27 L30 38" fill="#1e293b"/><path d="M17 27 L20 31 L23 27 L21.5 25.5 L20 27.5 L18.5 25.5Z" fill="#f8fafc"/><polygon points="20,25.5 21.5,30 20,38 18.5,30" fill="#dc2626"/><path d="M9 23 Q9 12 20 11 Q31 12 31 23 Q29 17 20 17 Q11 17 9 23Z" fill="#0f172a"/><path d="M14 11 L16 17" stroke="#1f2937" stroke-width="1.8"/><path d="M14 21.5 Q16 20.5 18.5 21.5" stroke="#0f172a" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M21.5 21.5 Q24 20.5 26 21.5" stroke="#0f172a" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="16" cy="24" r="2.8" fill="white"/><circle cx="24" cy="24" r="2.8" fill="white"/><circle cx="16" cy="24" r="1.7" fill="#1e1b4b"/><circle cx="24" cy="24" r="1.7" fill="#1e1b4b"/><circle cx="16.8" cy="23.2" r="0.7" fill="white"/><circle cx="24.8" cy="23.2" r="0.7" fill="white"/><ellipse cx="12.5" cy="26.5" rx="2.2" ry="1.4" fill="#a5b4fc" opacity="0.3"/><ellipse cx="27.5" cy="26.5" rx="2.2" ry="1.4" fill="#a5b4fc" opacity="0.3"/><path d="M16.5 28.5 Q20 31 23.5 28.5" stroke="#6366f1" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>`,
  8: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="19" fill="#052e16"/><circle cx="20" cy="25" r="11" fill="#d1fae5"/><path d="M9 23 Q9 11 20 10 Q31 11 31 23 Q29 15 20 15 Q11 15 9 23Z" fill="#92400e"/><path d="M11 16 Q13.5 13.5 16 16 Q18.5 13.5 20 15 Q21.5 13.5 24 16 Q26.5 13.5 29 16" stroke="#78350f" stroke-width="1.5" fill="none"/><path d="M14.5 21.5 Q16.5 20 18.5 21.5" stroke="#713f12" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M21.5 21.5 Q23.5 20 25.5 21.5" stroke="#713f12" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="16" cy="24" r="2.9" fill="white"/><circle cx="24" cy="24" r="2.9" fill="white"/><circle cx="16" cy="24" r="1.8" fill="#065f46"/><circle cx="24" cy="24" r="1.8" fill="#065f46"/><circle cx="16.9" cy="23.1" r="0.8" fill="white"/><circle cx="24.9" cy="23.1" r="0.8" fill="white"/><ellipse cx="12.5" cy="27" rx="2.6" ry="1.6" fill="#6ee7b7" opacity="0.45"/><ellipse cx="27.5" cy="27" rx="2.6" ry="1.6" fill="#6ee7b7" opacity="0.45"/><path d="M16 29 Q20 33.5 24 29" stroke="#065f46" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>`,
  9: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="19" fill="#14532d"/><circle cx="20" cy="25" r="11" fill="#dcfce7"/><path d="M9 23 Q9 12 20 11 Q31 12 31 23 Q29 17 20 17 Q11 17 9 23Z" fill="#fbbf24"/><rect x="9.5" y="19" width="21" height="4.5" fill="#15803d" rx="1.5"/><rect x="9.5" y="19" width="21" height="1.8" fill="#4ade80" rx="1.5"/><path d="M14.5 23 Q16.5 21.8 18.5 23" stroke="#166534" stroke-width="1.9" fill="none" stroke-linecap="round"/><path d="M21.5 23 Q23.5 21.8 25.5 23" stroke="#166534" stroke-width="1.9" fill="none" stroke-linecap="round"/><circle cx="16" cy="25.5" r="2.9" fill="white"/><circle cx="24" cy="25.5" r="2.9" fill="white"/><circle cx="16" cy="25.5" r="1.8" fill="#14532d"/><circle cx="24" cy="25.5" r="1.8" fill="#14532d"/><circle cx="16.9" cy="24.6" r="0.8" fill="white"/><circle cx="24.9" cy="24.6" r="0.8" fill="white"/><ellipse cx="12.5" cy="28" rx="2.6" ry="1.6" fill="#bbf7d0" opacity="0.5"/><ellipse cx="27.5" cy="28" rx="2.6" ry="1.6" fill="#bbf7d0" opacity="0.5"/><path d="M15.5 29.5 Q20 34 24.5 29.5" stroke="#166534" stroke-width="1.9" fill="none" stroke-linecap="round"/></svg>`,
  10: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="19" fill="#292524"/><circle cx="20" cy="25" r="11" fill="#fef9c3"/><rect x="6" y="16.5" width="28" height="3.5" fill="#92400e" rx="2"/><rect x="12" y="7" width="16" height="10.5" fill="#78350f" rx="2.5"/><rect x="12" y="15" width="16" height="2" fill="#a16207"/><path d="M9 22 Q8 19 10 17.5 Q10 20.5 9 22Z" fill="#e7e5e4"/><path d="M31 22 Q32 19 30 17.5 Q30 20.5 31 22Z" fill="#e7e5e4"/><path d="M13 22.5 Q15.5 21 18 22" stroke="#78350f" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M22 22 Q24.5 21 27 22.5" stroke="#78350f" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="16" cy="24.5" r="2.7" fill="white"/><circle cx="24" cy="24.5" r="2.7" fill="white"/><circle cx="16" cy="24.5" r="1.6" fill="#4b3621"/><circle cx="24" cy="24.5" r="1.6" fill="#4b3621"/><circle cx="16.7" cy="23.7" r="0.6" fill="white"/><circle cx="24.7" cy="23.7" r="0.6" fill="white"/><ellipse cx="12.5" cy="27.5" rx="2.4" ry="1.5" fill="#fbbf24" opacity="0.3"/><ellipse cx="27.5" cy="27.5" rx="2.4" ry="1.5" fill="#fbbf24" opacity="0.3"/><path d="M13.5 28.5 Q16.5 26.5 20 28 Q23.5 26.5 26.5 28.5" stroke="#f5f5f4" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M16.5 31 Q20 34 23.5 31" stroke="#a16207" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>`,
};

// ─── Animație deplasare NPC ───────────────────────────────────────────────────
// Distanță Haversine între două coordonate [lng, lat] — rezultat în metri
function haversineDist([lng1, lat1], [lng2, lat2]) {
  const R  = 6371000;
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  const a  = Math.sin(Δφ/2)**2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
// Durată deplasare în ms, proporțională cu distanța
function travelDuration(m) {
  if (m < 300)  return 2000 + (m / 300) * 2000;             // 2–4 s
  if (m < 800)  return 4000 + ((m - 300) / 500) * 4000;    // 4–8 s
  return Math.min(8000 + ((m - 800) / 1200) * 4000, 12000); // 8–12 s
}
// Easing smooth (ease-in-out quadratic)
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// ─── Tema de joc ─────────────────────────────────────────────────────────────
function applyGameTheme(map) {
  map.getStyle().layers.forEach(lyr => {
    const { id, type } = lyr;
    try {
      if (type === 'background') { map.setPaintProperty(id, 'background-color', '#0d1117'); return; }
      if (type === 'fill' && /water|ocean|lake|sea/.test(id)) {
        map.setPaintProperty(id, 'fill-color', '#07111f');
        map.setPaintProperty(id, 'fill-opacity', 1); return;
      }
      if (type === 'line' && /water|river|stream|canal/.test(id)) {
        map.setPaintProperty(id, 'line-color', '#0a1e38'); return;
      }
      if (type === 'fill' && /park|grass|wood|forest|garden|nature|scrub|meadow/.test(id)) {
        map.setPaintProperty(id, 'fill-color', '#091808'); return;
      }
      if (type === 'fill' && /land|residential|commercial|industrial|area|suburb/.test(id)) {
        map.setPaintProperty(id, 'fill-color', '#0b1320'); return;
      }
      if (type === 'line' && /road|highway|street|path|track|rail/.test(id)) {
        if (/motorway|trunk/.test(id))        { map.setPaintProperty(id, 'line-color', '#00e5ff'); return; }
        if (/primary|major/.test(id))         { map.setPaintProperty(id, 'line-color', '#0097a7'); return; }
        if (/secondary/.test(id))             { map.setPaintProperty(id, 'line-color', '#00606a'); return; }
        if (/tertiary|residential/.test(id))  { map.setPaintProperty(id, 'line-color', '#00363d'); return; }
        if (/rail|tram|subway/.test(id))      { map.setPaintProperty(id, 'line-color', '#1a3a4a'); return; }
        map.setPaintProperty(id, 'line-color', '#001e24'); return;
      }
      if (type === 'line' && /casing|outline/.test(id)) {
        map.setPaintProperty(id, 'line-color', '#060c15'); return;
      }
      if (type === 'fill' && /building/.test(id)) {
        map.setPaintProperty(id, 'fill-opacity', 0); return;
      }
      if (type === 'symbol' && /road|street|bridge|tunnel/.test(id)) {
        map.setPaintProperty(id, 'text-color', '#112230');
        map.setPaintProperty(id, 'text-halo-color', '#0d1117'); return;
      }
      if (type === 'symbol' && /place|city|town|village/.test(id)) {
        map.setPaintProperty(id, 'text-color', '#2a5a6a');
        map.setPaintProperty(id, 'text-halo-color', '#0d1117');
        map.setPaintProperty(id, 'text-halo-width', 1.5); return;
      }
      if (type === 'symbol') {
        map.setPaintProperty(id, 'text-color', '#1a2e3a');
        map.setPaintProperty(id, 'text-halo-color', '#0d1117');
      }
    } catch (_) {}
  });
}

// ─── Clădiri 3D ──────────────────────────────────────────────────────────────
function add3DBuildings(map) {
  const firstSymbolId = map.getStyle().layers.find(l => l.type === 'symbol')?.id;
  try {
    map.addLayer({
      id: 'lifesim-buildings-3d',
      type: 'fill-extrusion',
      source: 'openmaptiles',
      'source-layer': 'building',
      minzoom: 13,
      paint: {
        'fill-extrusion-color': [
          'interpolate', ['linear'],
          ['coalesce', ['get', 'render_height'], ['get', 'height'], 4],
          0, '#0e1826', 10, '#121f32', 25, '#162540', 50, '#1a2b4e', 100, '#1f315a',
        ],
        'fill-extrusion-height': [
          'interpolate', ['linear'], ['zoom'],
          13, 0,
          14.5, ['coalesce', ['get', 'render_height'], ['get', 'height'], 4],
        ],
        'fill-extrusion-base': [
          'interpolate', ['linear'], ['zoom'],
          13, 0,
          14.5, ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0],
        ],
        'fill-extrusion-opacity': [
          'interpolate', ['linear'], ['zoom'],
          13, 0, 14.5, 0.82,
        ],
      },
    }, firstSymbolId);
  } catch (e) {
    console.warn('[LifeSim] 3d buildings:', e.message);
  }
}

// ─── CSS animații (NUMAI pentru pulse + hover transition) ───────────────────
// NU afectează dimensiunile / poziționarea — acestea sunt inline pe element.
let cssInjected = false;
function injectMarkerCSS() {
  if (cssInjected || typeof document === 'undefined') return;
  cssInjected = true;
  const s = document.createElement('style');
  s.textContent = `
    @keyframes ls-pulse {
      0%   { transform: scale(1);   opacity: 0.65; }
      70%  { transform: scale(2.0); opacity: 0;    }
      100% { transform: scale(2.0); opacity: 0;    }
    }
    .ls-marker.selected .ls-avatar-inner {
      transform: scale(1.35) !important;
      outline: 2px solid rgba(255,255,255,0.3);
    }
  `;
  document.head.appendChild(s);
}

// ─── Creează element DOM marker ───────────────────────────────────────────────
// TOATE dimensiunile și pozițiile sunt inline → independente de CSS loading.
// MapLibre setează `style.transform` pe container pentru poziționare geografică.
// FIX DRIFT: folosim anchor:'top-left' + offset:[-MARKER_SIZE/2, -MARKER_SIZE/2]
//   → centrul elementului este exact la coordonată, fără `%` sau offsetWidth.
function createMarkerEl(npc, onClickFn) {
  const SZ = MARKER_SIZE;  // 38px

  // Container — dimensiuni inline, overflow visible pentru pulse
  const container = document.createElement('div');
  container.setAttribute('data-npc-id', npc.id);
  Object.assign(container.style, {
    width:    `${SZ}px`,
    height:   `${SZ}px`,
    cursor:   'pointer',
    overflow: 'visible',
    // position va fi setat 'absolute' de MapLibre — ok
  });

  // Pulse ring — centrat absolut față de container, non-layout
  const pulse = document.createElement('div');
  Object.assign(pulse.style, {
    position:        'absolute',
    top:             '50%', left: '50%',
    width:           '50px', height: '50px',
    marginTop:       '-25px', marginLeft: '-25px',
    borderRadius:    '50%',
    border:          `2px solid ${npc.color}`,
    opacity:         '0',
    pointerEvents:   'none',
    animation:       `ls-pulse 2.5s ease-out ${((npc.id * 0.37) % 2.4).toFixed(2)}s infinite`,
  });

  // Avatar circle — dimensiuni fixe inline
  const avatar = document.createElement('div');
  avatar.className = 'ls-avatar-inner';
  Object.assign(avatar.style, {
    position:     'absolute',
    top:          '0', left: '0',
    width:        `${SZ}px`, height: `${SZ}px`,
    borderRadius: '50%',
    border:       `2.5px solid ${npc.color}`,
    background:   npc.color + '22',
    boxShadow:    `0 0 14px ${npc.color}55, 0 2px 8px rgba(0,0,0,0.6)`,
    overflow:     'hidden',
    transition:   'transform 0.18s ease, box-shadow 0.18s ease',
  });
  // Folosim PNG din public/avatars/
  const img = document.createElement('img');
  img.src = `/avatars/${npc.id}.png`;
  img.alt = npc.name;
  img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
  avatar.appendChild(img);

  // Tooltip label — apare la hover
  const label = document.createElement('div');
  Object.assign(label.style, {
    position:    'absolute',
    bottom:      `${SZ + 7}px`,
    left:        '50%',
    transform:   'translateX(-50%)',
    background:  'rgba(6,10,18,0.94)',
    border:      '1px solid rgba(255,255,255,0.14)',
    borderRadius:'5px',
    padding:     '3px 9px',
    fontSize:    '11px',
    fontWeight:  '600',
    whiteSpace:  'nowrap',
    color:       '#e2e8f0',
    pointerEvents:'none',
    opacity:     '0',
    transition:  'opacity 0.16s',
    fontFamily:  'system-ui, sans-serif',
    zIndex:      '20',
  });
  label.textContent = npc.name;

  container.appendChild(pulse);
  container.appendChild(avatar);
  container.appendChild(label);

  // Hover handlers via JS (nu CSS — nu depind de class)
  container.addEventListener('mouseenter', () => {
    label.style.opacity = '1';
    avatar.style.transform = 'scale(1.22)';
    avatar.style.boxShadow = `0 0 20px ${npc.color}88, 0 2px 12px rgba(0,0,0,0.7)`;
  });
  container.addEventListener('mouseleave', () => {
    label.style.opacity = '0';
    avatar.style.transform = 'scale(1)';
    avatar.style.boxShadow = `0 0 14px ${npc.color}55, 0 2px 8px rgba(0,0,0,0.6)`;
  });

  container.addEventListener('click', (e) => { e.stopPropagation(); onClickFn(npc); });

  return container;
}

// ─── Adaugă markere pe hartă ──────────────────────────────────────────────────
function addNPCMarkers(map, onNPCClick, markersRef, initialNpcStates) {
  injectMarkerCSS();
  const HALF = MARKER_SIZE / 2;  // 19

  markersRef.current = NPCS.map(npc => {
    const state  = initialNpcStates?.find(n => n.id === npc.id);
    const coords = state ? getLocatieCoords(state.locatie, npc.id) : NPC_HOME[npc.id];
    const el     = createMarkerEl(npc, onNPCClick);

    // FIX DEFINITIV pentru drift:
    // anchor:'top-left' + offset:[-HALF, -HALF]
    // → transform aplicat pe container = translate(pos.x - HALF, pos.y - HALF) translate(0,0)
    // → top-left al elementului la (pos.x - HALF, pos.y - HALF)
    // → centrul elementului (la +HALF, +HALF față de top-left) = exact (pos.x, pos.y)
    // Calcul pur în pixeli, fără % și fără offsetWidth query!
    const marker = new maplibregl.Marker({
      element: el,
      anchor:  'top-left',
      offset:  [-HALF, -HALF],
    })
      .setLngLat(coords || NPC_HOME[npc.id])
      .addTo(map);

    return { marker, el, npcId: npc.id };
  });
}

// ─── Stiluri React ────────────────────────────────────────────────────────────
const S = {
  root: (embedded) => ({
    position: 'relative', width: '100%',
    height: embedded ? '100%' : '100vh',
    overflow: 'hidden', background: '#0d1117',
    fontFamily: 'system-ui, sans-serif',
  }),
  mapContainer: { position: 'absolute', inset: 0 },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    background: 'linear-gradient(180deg, rgba(6,10,18,0.95) 0%, rgba(6,10,18,0) 100%)',
    padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px',
  },
  backBtn: {
    padding: '6px 14px', background: 'rgba(10,15,25,0.8)',
    border: '1px solid rgba(139,92,246,0.3)', borderRadius: '6px',
    color: '#a78bfa', cursor: 'pointer', fontSize: '0.82rem',
    backdropFilter: 'blur(8px)',
  },
  title: {
    flex: 1, textAlign: 'center', color: '#e2e8f0',
    fontSize: '1rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
  },
  titleDot: { color: '#8b5cf6' },
  simBtn: {
    padding: '6px 14px', background: 'rgba(139,92,246,0.12)',
    border: '1px solid rgba(139,92,246,0.4)', borderRadius: '6px',
    color: '#a78bfa', cursor: 'pointer', fontSize: '0.82rem',
    backdropFilter: 'blur(8px)', fontWeight: 600,
  },
  closeBtn: {
    position: 'absolute', top: 10, right: 10,
    background: 'none', border: 'none', color: '#475569',
    cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: 2,
  },
};

// ─── COMPONENTĂ PRINCIPALĂ ────────────────────────────────────────────────────
export default function CityMap({
  onBack, onOpenSimulation,
  embedded    = false,
  selectedNPCId,
  onNPCClick,
  npcStates,
  onTravelStateChange,
}) {
  const mapContainerRef = useRef(null);
  const mapRef          = useRef(null);
  const markersRef      = useRef([]);
  const [selectedNPC,   setSelectedNPC] = useState(null);
  const [mapReady,      setMapReady]    = useState(false);

  // ── Refs pentru animația de deplasare ────────────────────────────────────
  // travelsRef:    { [npcId]: { from, to, startTime, duration } }
  // currentPosRef: { [npcId]: [lng, lat] } — poziția afișată în orice moment
  // rAFRef:        handle rAF activ (null = oprit)
  const travelsRef       = useRef({});
  const currentPosRef    = useRef({});
  const rAFRef           = useRef(null);
  const onTravelChgRef   = useRef(onTravelStateChange);
  onTravelChgRef.current = onTravelStateChange;

  // Ref stabil pentru npcStates — accesibil din closure doSetup
  const npcStatesRef = useRef(npcStates);
  npcStatesRef.current = npcStates;

  // Ref stabil pentru handler click
  const npcClickRef = useRef(null);
  npcClickRef.current = (npc) => {
    if (embedded && onNPCClick) onNPCClick(npc ?? null);
    else setSelectedNPC(prev => npc && prev?.id !== npc.id ? npc : null);
  };

  // ── Buclă RAF — interpolează pozițiile markerelor frame-by-frame ─────────
  function startRAFLoop() {
    if (rAFRef.current) return; // deja rulează

    const tick = () => {
      const now  = performance.now();
      const keys = Object.keys(travelsRef.current);
      if (keys.length === 0) { rAFRef.current = null; return; }

      const finishedIds   = [];
      const travelUpdate  = {};

      keys.forEach(key => {
        const npcId    = Number(key);
        const t        = travelsRef.current[npcId];
        const progress = Math.min((now - t.startTime) / t.duration, 1);
        const eased    = easeInOut(progress);

        const lng = t.from[0] + (t.to[0] - t.from[0]) * eased;
        const lat = t.from[1] + (t.to[1] - t.from[1]) * eased;

        currentPosRef.current[npcId] = [lng, lat];
        const entry = markersRef.current.find(m => m.npcId === npcId);
        if (entry) entry.marker.setLngLat([lng, lat]);

        if (progress >= 1) {
          finishedIds.push(npcId);
          travelUpdate[npcId] = false; // a ajuns
        }
      });

      finishedIds.forEach(id => { delete travelsRef.current[id]; });

      if (Object.keys(travelUpdate).length > 0) {
        onTravelChgRef.current?.(travelUpdate);
      }

      if (Object.keys(travelsRef.current).length > 0) {
        rAFRef.current = requestAnimationFrame(tick);
      } else {
        rAFRef.current = null;
      }
    };

    rAFRef.current = requestAnimationFrame(tick);
  }

  const effectiveId = embedded ? selectedNPCId : selectedNPC?.id;

  // ── Actualizează .selected state pe marker ────────────────────────────────
  useEffect(() => {
    markersRef.current.forEach(({ el, npcId }) => {
      const avatarInner = el.querySelector('.ls-avatar-inner');
      if (!avatarInner) return;
      if (effectiveId === npcId) {
        avatarInner.style.transform  = 'scale(1.32)';
        avatarInner.style.boxShadow  = `0 0 0 2.5px rgba(255,255,255,0.25), 0 0 20px ${NPCS.find(n=>n.id===npcId)?.color||'#888'}88`;
      } else {
        avatarInner.style.transform  = 'scale(1)';
        const npc = NPCS.find(n => n.id === npcId);
        avatarInner.style.boxShadow = npc ? `0 0 14px ${npc.color}55, 0 2px 8px rgba(0,0,0,0.6)` : '';
      }
    });

    // Fly to NPC selectat
    if (embedded && effectiveId && mapRef.current) {
      const state  = npcStatesRef.current?.find(n => n.id === effectiveId);
      const coords = state ? getLocatieCoords(state.locatie, effectiveId) : NPC_HOME[effectiveId];
      if (coords) {
        mapRef.current.flyTo({
          center: coords,
          zoom:   Math.max(mapRef.current.getZoom(), 15.5),
          duration: 700, essential: true,
        });
      }
    }
  }, [effectiveId, embedded]);

  // ── Actualizează pozițiile markerelor — cu animație fluidă ──────────────
  // Detectează schimbări de locație și pornește interpolări RAF
  // în loc de teleportare instantanee.
  useEffect(() => {
    if (!mapReady || !npcStates) return;
    const travelUpdate = {};

    npcStates.forEach(state => {
      const npcId  = state.id;
      const target = getLocatieCoords(state.locatie, npcId);
      if (!target) return;

      const current = currentPosRef.current[npcId];
      if (!current) {
        // Prima inițializare — plasare directă, fără animație
        currentPosRef.current[npcId] = target;
        const entry = markersRef.current.find(m => m.npcId === npcId);
        if (entry) entry.marker.setLngLat(target);
        return;
      }

      // Destinația efectivă (fie animație în curs, fie poziția curentă)
      const ongoing     = travelsRef.current[npcId];
      const effectiveTo = ongoing ? ongoing.to : current;
      const EPS = 1e-5;
      if (Math.abs(effectiveTo[0] - target[0]) < EPS &&
          Math.abs(effectiveTo[1] - target[1]) < EPS) return; // deja acolo

      // Pornește o nouă animație de la poziția reală curentă
      const dist     = haversineDist(current, target);
      const duration = travelDuration(dist);

      travelsRef.current[npcId] = {
        from:      [...current],
        to:        target,
        startTime: performance.now(),
        duration,
      };
      travelUpdate[npcId] = true; // a pornit deplasarea
      startRAFLoop();
    });

    if (Object.keys(travelUpdate).length > 0) {
      onTravelChgRef.current?.(travelUpdate);
    }
  }, [npcStates, mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Inițializare hartă ────────────────────────────────────────────────────
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    const map = new maplibregl.Map({
      container,
      style:     LIBERTY_STYLE,
      center:    [IASI.lng, IASI.lat],
      zoom:      IASI.zoom,
      pitch:     IASI.pitch,
      bearing:   IASI.bearing,
      antialias: true,
      maxZoom:   18,
      minZoom:   11,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

    let setupDone = false;
    const doSetup = () => {
      if (setupDone) return;
      setupDone = true;
      try { applyGameTheme(map); }    catch(e) { console.warn('[LifeSim] theme:', e.message); }
      try { add3DBuildings(map); }    catch(e) { console.warn('[LifeSim] 3d:', e.message); }
      try {
        addNPCMarkers(map, (npc) => npcClickRef.current(npc), markersRef, npcStatesRef.current);
        // Inițializează currentPosRef cu pozițiile inițiale ale markerelor
        npcStatesRef.current?.forEach(state => {
          const coords = getLocatieCoords(state.locatie, state.id);
          if (coords) currentPosRef.current[state.id] = coords;
        });
      } catch(e) { console.warn('[LifeSim] markers:', e.message); }
      setMapReady(true);
    };

    map.on('load', doSetup);
    const pollId = setInterval(() => {
      if (map.isStyleLoaded()) { clearInterval(pollId); doSetup(); }
    }, 250);

    map.on('click', () => npcClickRef.current(null));
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(container);

    return () => {
      clearInterval(pollId);
      if (rAFRef.current) { cancelAnimationFrame(rAFRef.current); rAFRef.current = null; }
      ro.disconnect();
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current     = [];
      travelsRef.current     = {};
      currentPosRef.current  = {};
      map.remove();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={S.root(embedded)}>
      <div ref={mapContainerRef} style={S.mapContainer} />

      {!embedded && (
        <header style={S.header}>
          <button style={S.backBtn} onClick={onBack}>← Glob</button>
          <span style={S.title}>
            Life<span style={S.titleDot}>●</span>Sim{' '}
            <span style={{ color:'#374151', fontWeight:400 }}>· Iași</span>
          </span>
          <button style={S.simBtn} onClick={onOpenSimulation}>Persoane →</button>
        </header>
      )}

      {!mapReady && (
        <div style={{
          position:'absolute', inset:0, zIndex:20, background:'#0d1117',
          display:'flex', alignItems:'center', justifyContent:'center',
          flexDirection:'column', gap:12,
        }}>
          <div style={{
            width:40, height:40, border:'3px solid #1a1f2e',
            borderTop:'3px solid #8b5cf6', borderRadius:'50%',
            animation:'spin 0.8s linear infinite',
          }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{ color:'#334155', fontSize:'0.82rem', margin:0 }}>Se încarcă harta…</p>
        </div>
      )}
    </div>
  );
}
