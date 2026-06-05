'use client';

import { useState } from 'react';
import HomeScreen from './components/HomeScreen';
import Dashboard  from './components/Dashboard';

// Router de nivel înalt:
//   'home'      → HomeScreen cu globul 3D (intro + selecție oraș)
//   'dashboard' → Dashboard unificat (hartă + NPC list + detalii + simulare)
export default function Page() {
  const [screen, setScreen] = useState('home');

  if (screen === 'dashboard') {
    return <Dashboard onBack={() => setScreen('home')} />;
  }

  return <HomeScreen onEnterCity={() => setScreen('dashboard')} />;
}
