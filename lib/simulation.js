// Logica locală de simulare — fără LLM, pur deterministă
// Toate funcțiile returnează același rezultat pentru aceleași inputuri (seeded random)

export const ZILE = ['Luni', 'Marti', 'Miercuri', 'Joi', 'Vineri', 'Sambata', 'Duminica'];

// Cele 8 module — fiecare exact 3 ore, simetrice
export const MODULE = [
  'early_morning',    // 05:00–08:00
  'late_morning',     // 08:00–11:00
  'early_afternoon',  // 11:00–14:00
  'late_afternoon',   // 14:00–17:00
  'early_evening',    // 17:00–20:00
  'late_evening',     // 20:00–23:00
  'early_night',      // 23:00–02:00
  'late_night',       // 02:00–05:00
];

export const MODULE_LABEL = {
  early_morning:   'Sunrise',
  late_morning:    'High Morning',
  early_afternoon: 'High Noon',
  late_afternoon:  'Sun Down',
  early_evening:   'Dusk',
  late_evening:    'Nightfall',
  early_night:     'Deep Dark',
  late_night:      'First Light',
};

// Atmosfera vizuală per modul — pregătit pentru schimbarea automată a iluminării/cerului
export const MODULE_ATMOSPHERE = {
  early_morning:   { label:'Sunrise',      range:'06:00–09:00', brightness:0.60, accent:'#ff8c42', bg:'#1a0e05' },
  late_morning:    { label:'High Morning', range:'09:00–12:00', brightness:0.85, accent:'#4fc3f7', bg:'#0a1520' },
  early_afternoon: { label:'High Noon',    range:'12:00–15:00', brightness:1.00, accent:'#81d4fa', bg:'#0d1a2a' },
  late_afternoon:  { label:'Sun Down',     range:'15:00–18:00', brightness:0.75, accent:'#ffab40', bg:'#1a0e00' },
  early_evening:   { label:'Dusk',         range:'18:00–21:00', brightness:0.35, accent:'#ce93d8', bg:'#120a18' },
  late_evening:    { label:'Nightfall',    range:'21:00–00:00', brightness:0.10, accent:'#5c6bc0', bg:'#05080f' },
  early_night:     { label:'Deep Dark',    range:'00:00–03:00', brightness:0.05, accent:'#1a1030', bg:'#020408' },
  late_night:      { label:'First Light',  range:'03:00–06:00', brightness:0.15, accent:'#4a5568', bg:'#04080f' },
};

// ─── RANDOM DETERMINIST ─────────────────────────────────────────────────────

// Bazat pe sin — același seed → același număr, fără Math.random()
function seededRandom(seed) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

// ─── VREME ──────────────────────────────────────────────────────────────────

export const WEATHER_LABEL = {
  soare:  'Soare',
  noros:  'Noros',
  ploaie: 'Ploaie',
  vant:   'Vant',
};

// Vreme deterministă per zi — aceeași în toată aplicația
export function getWeatherForDay(dayIndex) {
  const r = seededRandom(dayIndex * 137 + 42);
  if (r < 0.25) return 'ploaie';
  if (r < 0.40) return 'noros';
  if (r < 0.50) return 'vant';
  return 'soare';
}

// ─── TIMP REAL → MODUL/ZI (module de exact 3 ore) ───────────────────────────

export function getCurrentModule() {
  const h = new Date().getHours();
  if (h >= 6  && h < 9)  return 'early_morning';   // Sunrise    6–9
  if (h >= 9  && h < 12) return 'late_morning';    // High Morning 9–12
  if (h >= 12 && h < 15) return 'early_afternoon'; // High Noon  12–15
  if (h >= 15 && h < 18) return 'late_afternoon';  // Sun Down   15–18
  if (h >= 18 && h < 21) return 'early_evening';   // Dusk       18–21
  if (h >= 21)           return 'late_evening';    // Nightfall  21–24
  if (h >= 0  && h < 3)  return 'early_night';     // Deep Dark  0–3
  return 'late_night';                             // First Light 3–6
}

export function getCurrentDayIndex() {
  const d = new Date().getDay(); // 0=Duminica
  return d === 0 ? 6 : d - 1;   // 0=Luni, 6=Duminica
}

// ─── ACTIVITĂȚI GENERICE "ACASĂ" → CONCRETE ─────────────────────────────────

// Cheile generice de "acasă" din schedule sunt înlocuite cu activități concrete
const HOME_GENERIC = new Set(['acasa', 'acasa_lenes', 'liber_acasa', 'liber']);

// Pentru fiecare modul, un mic pool de activități casnice concrete
// Se alege determinist (seed) → variație realistă, dar reproductibilă
function resolveHomeActivity(moduleIndex, seed) {
  const pools = {
    0: ['maninca_mic_dejun', 'cafea_acasa', 'asculta_muzica'],   // early_morning
    1: ['lucreaza_de_acasa', 'face_curat', 'citit'],             // late_morning
    2: ['masa_acasa', 'se_relaxeaza', 'face_curat'],             // early_afternoon
    3: ['citit', 'se_odihneste', 'lucreaza_de_acasa'],           // late_afternoon
    4: ['gatit_acasa', 'urmareste_serial', 'asculta_muzica'],    // early_evening
    5: ['urmareste_serial', 'citit', 'se_relaxeaza'],            // late_evening
    6: ['se_relaxeaza', 'citit', 'urmareste_serial'],            // early_night
    7: ['dormit'],                                               // late_night
  };
  const pool = pools[moduleIndex] || ['se_relaxeaza'];
  return pool[Math.floor(seededRandom(seed + 41) * pool.length)];
}

// ─── CLASIFICĂRI DE ACTIVITĂȚI ──────────────────────────────────────────────

// Obligatorii — nu sunt niciodată anulate de vreme, random sau event personal
const OBLIGATORII = new Set([
  'facultate', 'munca_birou', 'munca_remote', 'consultatie_spital',
  'operatie_spital', 'garda_spital', 'tribunal', 'cursuri_universitate',
  'sedinta_departament', 'meeting_echipa', 'meeting_clienti',
  'meeting_investitori', 'meeting_saptamanal', 'pitch_investitori',
  'client_consultatie', 'antrenament_dimineata', 'sala_echipa',
  'meci_oficial', 'pregatire_meci', 'servit_clienti', 'pregatit_restaurant',
]);

// Sociale — afectate de vreme rea, candidate pentru ieșiri cu prietenii
const SOCIALE = new Set([
  'cafea_cu_prietenii', 'cafea_cu_Raluca', 'cafea_inspiratie', 'cafea_cafenea',
  'cafenea_citit', 'cafea_vechi_prieteni', 'bere_dupa_fotbal', 'bere_dupa_munca',
  'club', 'petrecere_dupa_vernisaj', 'cinema', 'concert_filarmonica',
  'concert_surpriza', 'expozitie_palatul_culturii', 'plimbare_copou',
  'plimbare_lunga_copou', 'plimbare_familie', 'plimbare_dupa_biserica',
  'plimbare_inspiratie', 'iesire_cu_prietenii', 'iesire_cu_Raluca',
  'iesire_cu_Elena', 'iesire_cu_Cristi', 'iesire_cu_Andrei', 'iesire_seara',
  'iesire_cu_familia', 'sah_cu_prietenii', 'vizita_nepoti',
  'centrul_vechi_inspiratie', 'biserica',
]);

// ─── ENERGIE: categorii ──────────────────────────────────────────────────────

const E_DORMIT  = new Set(['dormit', 'dormit_dupa_garda']);
const E_SPORT   = new Set([
  'antrenament_dimineata', 'antrenament_tehnic', 'sala_echipa', 'meci_oficial',
  'meci_antrenament', 'pregatire_meci', 'incalzire_meci', 'sport_sala',
  'sala_fitness', 'alergat_copou', 'alergat_dimineata', 'fotbal_cu_prietenii',
  'fotbal_cu_Andrei', 'golf_club',
]);
const E_MUNCA   = new Set([
  'facultate', 'munca_birou', 'munca_remote', 'lucreaza_de_acasa',
  'consultatie_spital', 'operatie_spital', 'garda_spital', 'tribunal',
  'cursuri_universitate', 'office_hours', 'sedinta_departament', 'meeting_echipa',
  'meeting_clienti', 'meeting_investitori', 'meeting_saptamanal', 'birou',
  'birou_tarziu', 'birou_proiecte', 'pitch_investitori', 'client_consultatie',
  'dosar_cabinet', 'negocieri_contract', 'networking', 'networking_eveniment',
  'pregatit_restaurant', 'servit_clienti', 'inchis_restaurant', 'corectat_lucrari',
  'pregatit_curs', 'proiect_personal', 'curs_online', 'atelier_pictura',
  'atelier_noaptea', 'teme_acasa', 'biblioteca', 'liber_biblioteca',
  'intalnire_galerie', 'vernisaj_expozitie', 'strategie_saptamana',
]);
const E_CASNICE = new Set([
  'gatit', 'gatit_acasa', 'gatit_experimente', 'gatit_acasa_pentru_placere',
  'gradina', 'trezit_gradina', 'pregatit_iesire', 'pregatit_saptamana',
  'face_curat', 'piata_hala', 'piata_specii', 'piata_centrala',
  'piata_obiecte_vintage', 'cumparaturi',
]);
const E_MANCAT  = new Set([
  'cantina', 'masa_acasa', 'masa_cu_colegii', 'masa_cu_Andrei', 'masa_cu_Mihai',
  'masa_cu_Bogdan', 'masa_cu_Alexandru', 'masa_cu_parteneri', 'masa_cu_Ioana',
  'masa_la_parinti', 'masa_familie', 'masa_cu_familia', 'masa_echipa',
  'masa_restaurant', 'masa_restaurant_cu_familia', 'masa_rapida', 'masa_rapida_birou',
  'masa_proteica', 'masa_spital', 'masa_universitate', 'trezit_masa',
  'trezit_masa_acasa', 'maninca_mic_dejun', 'restaurant',
]);
const E_RELAX   = new Set([
  'cafea_acasa', 'trezit_cafea', 'trezit_devreme_cafea', 'email_cafea',
  'email_acasa', 'trezit_stiri', 'relaxare', 'se_relaxeaza', 'se_odihneste',
  'recuperare', 'recuperare_masaj', 'liber_recuperare', 'trezit_lenes',
]);
const E_SOCIALE = SOCIALE; // ieșiri sociale: -15
const E_USOARE  = new Set([
  'citit', 'citit_medicinal', 'televizor', 'film_acasa', 'gaming_acasa',
  'asculta_muzica', 'urmareste_serial', 'medic_control',
]);

// Returnează modificarea de energie pentru o activitate (per modul de 3 ore)
function energyDelta(key) {
  if (E_DORMIT.has(key))  return +50;  // somn
  if (E_SPORT.has(key))   return -30;  // sport intens
  if (E_MUNCA.has(key))   return -25;  // muncă / facultate
  if (E_CASNICE.has(key)) return -15;  // casnice
  if (E_MANCAT.has(key))  return 0;    // masă: -5 efort + 5 hrană = neutru
  if (E_RELAX.has(key))   return +10;  // cafea / relaxare scurtă
  if (E_SOCIALE.has(key)) return -15;  // ieșiri sociale
  if (E_USOARE.has(key))  return -10;  // activități ușoare
  return -10;                          // default: efort ușor
}

// ─── LOCAȚII SPECIFICE IAȘI ──────────────────────────────────────────────────

// Fiecare activitate are o locație concretă din Iași. "Acasă" pentru activități casnice.
const LOCATII = {
  // ── Acasă ──
  dormit: 'Acasă', dormit_dupa_garda: 'Acasă', trezit_lenes: 'Acasă',
  trezit_masa_acasa: 'Acasă', trezit_cafea: 'Acasă', trezit_stiri: 'Acasă',
  trezit_devreme_cafea: 'Acasă', trezit_gradina: 'Acasă', trezit_masa: 'Acasă',
  email_cafea: 'Acasă', email_acasa: 'Acasă', cafea_acasa: 'Acasă',
  masa_acasa: 'Acasă', gaming_acasa: 'Acasă', citit: 'Acasă',
  citit_medicinal: 'Acasă', film_acasa: 'Acasă', relaxare: 'Acasă',
  teme_acasa: 'Acasă', pregatit_iesire: 'Acasă', pregatit_saptamana: 'Acasă',
  pregatit_curs: 'Acasă', proiect_personal: 'Acasă', curs_online: 'Acasă',
  gatit_acasa: 'Acasă', gatit_acasa_pentru_placere: 'Acasă', gatit_experimente: 'Acasă',
  gatit: 'Acasă', corectat_lucrari: 'Acasă', strategie_saptamana: 'Acasă',
  gradina: 'Acasă', televizor: 'Acasă', masa_proteica: 'Acasă',
  recuperare: 'Acasă', liber_recuperare: 'Acasă', masa_familie: 'Acasă',
  masa_cu_familia: 'Acasă', vizita_nepoti: 'Acasă', munca_remote: 'Acasă',
  lucreaza_de_acasa: 'Acasă', maninca_mic_dejun: 'Acasă', face_curat: 'Acasă',
  se_relaxeaza: 'Acasă', se_odihneste: 'Acasă', asculta_muzica: 'Acasă',
  urmareste_serial: 'Acasă',

  // ── Universitate / studii ──
  facultate: 'UAIC (Copou)', cantina: 'Cantina UAIC',
  biblioteca: 'Biblioteca Centrală Universitară',
  liber_biblioteca: 'Biblioteca Centrală Universitară',
  masa_universitate: 'Cantina UAIC', cursuri_universitate: 'UAIC (Copou)',
  office_hours: 'UAIC (Copou)', sedinta_departament: 'UAIC (Copou)',

  // ── Parcuri / sport ──
  alergat_copou: 'Parcul Copou', alergat_dimineata: 'Parcul Expoziției',
  plimbare_copou: 'Parcul Copou', plimbare_lunga_copou: 'Parcul Copou',
  plimbare_dupa_biserica: 'Parcul Copou', plimbare_familie: 'Parcul Copou',
  plimbare_inspiratie: 'Centrul Vechi', sah_cu_prietenii: 'Parcul Copou',
  sport_sala: 'Sala Fitness Copou', sala_fitness: 'Sala Fitness Copou',
  antrenament_dimineata: 'Sala Polivalentă Iași', antrenament_tehnic: 'Sala Polivalentă Iași',
  sala_echipa: 'Sala Polivalentă Iași', meci_oficial: 'Sala Polivalentă Iași',
  meci_antrenament: 'Sala Polivalentă Iași', pregatire_meci: 'Sala Polivalentă Iași',
  incalzire_meci: 'Sala Polivalentă Iași', masa_echipa: 'Cantina sportivilor',
  recuperare_masaj: 'Centrul de Recuperare', fotbal_cu_prietenii: 'Terenul Tătărași',
  fotbal_cu_Andrei: 'Terenul Tătărași', golf_club: 'Iași Golf Club',

  // ── Birou / business ──
  munca_birou: 'Birou (Palas)', meeting_echipa: 'Birou (Palas)',
  meeting_clienti: 'Birou (Palas)', meeting_saptamanal: 'Birou (Palas)',
  birou: 'Birou (Palas)', birou_tarziu: 'Birou (Palas)', birou_proiecte: 'Birou (Palas)',
  meeting_investitori: 'Hotel Unirea', pitch_investitori: 'Hotel Unirea',
  networking: 'Centrul de Afaceri Moldova', networking_eveniment: 'Centrul de Afaceri Moldova',

  // ── Cafenele / ieșiri ──
  cafea_cu_prietenii: 'Cafeneaua Bolta Rece', cafea_cu_Raluca: 'Cafeneaua Arkadia',
  cafea_inspiratie: 'Cafeneaua Arkadia', cafea_cafenea: 'Vero Café',
  cafenea_citit: 'Vero Café', cafea_vechi_prieteni: 'Cafeneaua Boema',
  bere_dupa_fotbal: 'Berăria Bolta Rece', bere_dupa_munca: 'Berăria Bolta Rece',
  iesire_cu_prietenii: 'Centrul Vechi', iesire_cu_Raluca: 'Centrul Vechi',
  iesire_cu_Elena: 'Centrul Vechi', iesire_cu_Cristi: 'Centrul Vechi',
  iesire_cu_Andrei: 'Centrul Vechi', iesire_seara: 'Centrul Vechi',
  iesire_cu_familia: 'Centrul Vechi', centrul_vechi_inspiratie: 'Centrul Vechi',
  club: 'Club Underground', petrecere_dupa_vernisaj: 'Palatul Culturii',
  cinema: 'Cinema Ateneu', concert_filarmonica: 'Filarmonica Moldova',
  concert_surpriza: 'Filarmonica Moldova',

  // ── Restaurante / mese ──
  restaurant: 'Restaurant Bolta Rece', masa_restaurant: 'Restaurant Bolta Rece',
  masa_restaurant_cu_familia: 'Restaurant Bolta Rece', masa_cu_colegii: 'Restaurant Vatra',
  masa_cu_Andrei: 'Restaurant Vatra', masa_cu_Mihai: 'Restaurant Vatra',
  masa_cu_Bogdan: 'Restaurant Vatra', masa_cu_Alexandru: 'Restaurant Vatra',
  masa_cu_parteneri: 'Restaurant Vatra', masa_cu_Ioana: 'Restaurant Vatra',
  masa_rapida: 'Restaurant Vatra', masa_rapida_birou: 'Cantina Palas',
  masa_la_parinti: 'Casa părinților',

  // ── Spital / medical ──
  consultatie_spital: 'Spitalul Sf. Spiridon', operatie_spital: 'Spitalul Sf. Spiridon',
  garda_spital: 'Spitalul Sf. Spiridon', masa_spital: 'Spitalul Sf. Spiridon',
  urgenta_medicala_in_familie: 'Spitalul Sf. Spiridon', medic_control: 'Policlinica Providența',

  // ── Juridic ──
  tribunal: 'Tribunalul Iași', client_consultatie: 'Cabinet de Avocatură (Centru)',
  dosar_cabinet: 'Cabinet de Avocatură (Centru)', negocieri_contract: 'Cabinet de Avocatură (Centru)',

  // ── Artă / cultură ──
  atelier_pictura: 'Atelier de Artă (Palas)', atelier_noaptea: 'Atelier de Artă (Palas)',
  expozitie_palatul_culturii: 'Palatul Culturii', vernisaj_expozitie: 'Palatul Culturii',
  intalnire_galerie: 'Galeria de Artă',

  // ── Piață / cumpărături ──
  piata_obiecte_vintage: 'Piața Centrală', piata_hala: 'Hala Centrală',
  piata_specii: 'Piața Centrală', piata_centrala: 'Piața Centrală',
  cumparaturi: 'Iulius Mall',

  // ── Bucătar (restaurant propriu) ──
  pregatit_restaurant: 'Restaurant Berărescu', servit_clienti: 'Restaurant Berărescu',
  inchis_restaurant: 'Restaurant Berărescu',

  // ── Biserică ──
  biserica: 'Catedrala Mitropolitană',
};

// Locație implicită pentru activitățile de grup generate dinamic (prefix_cu_Nume)
const PREFIX_LOCATIE = {
  masa:   'Restaurant Vatra',
  cafea:  'Cafeneaua Arkadia',
  iesire: 'Centrul Vechi',
  fotbal: 'Terenul Tătărași',
  bere:   'Berăria Bolta Rece',
};

function getLocatie(activitate) {
  if (LOCATII[activitate]) return LOCATII[activitate];
  // Activitate de grup sincronizată dinamic: "masa_cu_Elena" → Restaurant Vatra
  const m = String(activitate).match(/^([a-z]+)_cu_[A-Z]/);
  if (m && PREFIX_LOCATIE[m[1]]) return PREFIX_LOCATIE[m[1]];
  return 'Centrul Vechi';
}

// ─── ETICHETE FRUMOASE (verbe la prezent, literă mare) ──────────────────────

const ACTIVITATE_LABEL = {
  // Acasă — trezire / rutină
  dormit: 'Doarme',
  dormit_dupa_garda: 'Doarme după gardă',
  trezit_lenes: 'Se trezește, lenevește în pat',
  trezit_masa_acasa: 'Se trezește și ia micul dejun',
  trezit_cafea: 'Se trezește la o cafea',
  trezit_stiri: 'Se trezește, citește știrile',
  trezit_devreme_cafea: 'Se trezește devreme la o cafea',
  trezit_gradina: 'Se trezește, iese în grădină',
  trezit_masa: 'Se trezește și mănâncă',
  email_cafea: 'Verifică emailurile la o cafea',
  email_acasa: 'Răspunde la emailuri de acasă',
  cafea_acasa: 'Bea o cafea acasă',
  maninca_mic_dejun: 'Mănâncă micul dejun',
  masa_acasa: 'Mănâncă acasă',
  gaming_acasa: 'Joacă jocuri video',
  citit: 'Citește',
  citit_medicinal: 'Citește literatură medicală',
  film_acasa: 'Urmărește un film acasă',
  relaxare: 'Se relaxează',
  se_relaxeaza: 'Se relaxează',
  se_odihneste: 'Se odihnește',
  asculta_muzica: 'Ascultă muzică',
  urmareste_serial: 'Urmărește un serial',
  face_curat: 'Face curat în casă',
  teme_acasa: 'Își face temele',
  pregatit_iesire: 'Se pregătește de ieșire',
  pregatit_saptamana: 'Își planifică săptămâna',
  pregatit_curs: 'Pregătește cursul',
  proiect_personal: 'Lucrează la un proiect personal',
  curs_online: 'Urmează un curs online',
  gatit_acasa: 'Gătește acasă',
  gatit_acasa_pentru_placere: 'Gătește de plăcere',
  gatit_experimente: 'Experimentează rețete noi',
  gatit: 'Gătește',
  corectat_lucrari: 'Corectează lucrări',
  strategie_saptamana: 'Pune la punct strategia săptămânii',
  gradina: 'Are grijă de grădină',
  televizor: 'Se uită la televizor',
  masa_proteica: 'Mănâncă o masă proteică',
  recuperare: 'Se recuperează',
  liber_recuperare: 'Zi liberă, se recuperează',
  masa_familie: 'Mănâncă în familie',
  masa_cu_familia: 'Mănâncă cu familia',
  vizita_nepoti: 'Își vizitează nepoții',
  munca_remote: 'Lucrează de acasă',
  lucreaza_de_acasa: 'Lucrează de acasă',

  // Universitate
  facultate: 'Este la cursuri',
  cantina: 'Mănâncă la cantină',
  biblioteca: 'Studiază la bibliotecă',
  liber_biblioteca: 'Studiază liber la bibliotecă',
  masa_universitate: 'Mănâncă la cantina universității',
  cursuri_universitate: 'Ține cursuri',
  office_hours: 'Ține ore de consultații',
  sedinta_departament: 'Participă la ședința de departament',

  // Sport
  alergat_copou: 'Aleargă prin Copou',
  alergat_dimineata: 'Aleargă de dimineață',
  sport_sala: 'Se antrenează la sală',
  sala_fitness: 'Se antrenează la sală',
  antrenament_dimineata: 'Antrenament de dimineață',
  antrenament_tehnic: 'Antrenament tehnic',
  sala_echipa: 'Se antrenează cu echipa',
  meci_oficial: 'Joacă meciul oficial',
  meci_antrenament: 'Joacă un meci de antrenament',
  pregatire_meci: 'Se pregătește pentru meci',
  incalzire_meci: 'Se încălzește înainte de meci',
  masa_echipa: 'Mănâncă cu echipa',
  recuperare_masaj: 'Merge la masaj de recuperare',
  fotbal_cu_prietenii: 'Joacă fotbal cu prietenii',
  fotbal_cu_Andrei: 'Joacă fotbal cu Andrei',
  golf_club: 'Joacă golf',

  // Birou / business
  munca_birou: 'Lucrează la birou',
  meeting_echipa: 'Are o ședință cu echipa',
  meeting_clienti: 'Se întâlnește cu clienții',
  meeting_investitori: 'Are o întâlnire cu investitorii',
  meeting_saptamanal: 'Participă la ședința săptămânală',
  birou: 'Lucrează la birou',
  birou_tarziu: 'Lucrează până târziu la birou',
  birou_proiecte: 'Lucrează la proiecte',
  pitch_investitori: 'Prezintă pitch-ul în fața investitorilor',
  networking: 'Face networking',
  networking_eveniment: 'Participă la un eveniment de networking',

  // Cafenele / ieșiri
  cafea_cu_prietenii: 'Bea o cafea cu prietenii',
  cafea_cu_Raluca: 'Bea o cafea cu Raluca',
  cafea_inspiratie: 'Bea o cafea în căutare de inspirație',
  cafea_cafenea: 'Bea o cafea la cafenea',
  cafenea_citit: 'Citește la cafenea',
  cafea_vechi_prieteni: 'Bea o cafea cu prietenii vechi',
  bere_dupa_fotbal: 'Bea o bere după fotbal',
  bere_dupa_munca: 'Bea o bere după muncă',
  iesire_cu_prietenii: 'Iese cu prietenii',
  iesire_cu_Raluca: 'Iese cu Raluca',
  iesire_cu_Elena: 'Iese cu Elena',
  iesire_cu_Cristi: 'Iese cu Cristi',
  iesire_cu_Andrei: 'Iese cu Andrei',
  iesire_seara: 'Iese în oraș',
  iesire_cu_familia: 'Iese cu familia',
  centrul_vechi_inspiratie: 'Caută inspirație în Centrul Vechi',
  club: 'Petrece la club',
  petrecere_dupa_vernisaj: 'Petrece după vernisaj',
  cinema: 'Merge la cinema',
  concert_filarmonica: 'Ascultă un concert la Filarmonică',
  concert_surpriza: 'Merge la un concert surpriză',

  // Restaurante / mese
  restaurant: 'Cinează la restaurant',
  masa_restaurant: 'Mănâncă la restaurant',
  masa_restaurant_cu_familia: 'Mănâncă la restaurant cu familia',
  masa_cu_colegii: 'Mănâncă cu colegii',
  masa_cu_Andrei: 'Mănâncă cu Andrei',
  masa_cu_Mihai: 'Mănâncă cu Mihai',
  masa_cu_Bogdan: 'Mănâncă cu Bogdan',
  masa_cu_Alexandru: 'Mănâncă cu Alexandru',
  masa_cu_parteneri: 'Mănâncă cu partenerii',
  masa_cu_Ioana: 'Mănâncă cu Ioana',
  masa_rapida: 'Ia o masă rapidă',
  masa_rapida_birou: 'Mănâncă rapid la birou',
  masa_la_parinti: 'Mănâncă la părinți',

  // Spital / medical
  consultatie_spital: 'Consultă pacienți',
  operatie_spital: 'Operează în sala de operație',
  garda_spital: 'Este de gardă',
  masa_spital: 'Mănâncă la spital',
  medic_control: 'Merge la un control medical',

  // Juridic
  tribunal: 'Pledează la tribunal',
  client_consultatie: 'Consultă un client',
  dosar_cabinet: 'Lucrează la dosare',
  negocieri_contract: 'Negociază un contract',

  // Artă / cultură
  atelier_pictura: 'Pictează în atelier',
  atelier_noaptea: 'Pictează noaptea în atelier',
  expozitie_palatul_culturii: 'Vizitează o expoziție',
  vernisaj_expozitie: 'Participă la un vernisaj',
  intalnire_galerie: 'Are o întâlnire la galerie',

  // Piață / cumpărături
  piata_obiecte_vintage: 'Caută obiecte vintage în piață',
  piata_hala: 'Face cumpărături la Hală',
  piata_specii: 'Cumpără condimente din piață',
  piata_centrala: 'Face cumpărături în Piața Centrală',
  cumparaturi: 'Face cumpărături',

  // Bucătar
  pregatit_restaurant: 'Pregătește restaurantul',
  servit_clienti: 'Servește clienții',
  inchis_restaurant: 'Închide restaurantul',

  // Biserică
  biserica: 'Merge la slujbă',

  // Evenimente injectate
  urgenta_medicala_in_familie: 'Urgență medicală în familie',
};

// Etichete frumoase pentru activitățile de grup generate dinamic (prefix_cu_Nume)
const PREFIX_LABEL = {
  masa:   (n) => `Mănâncă cu ${n}`,
  cafea:  (n) => `Bea o cafea cu ${n}`,
  iesire: (n) => `Iese cu ${n}`,
  fotbal: (n) => `Joacă fotbal cu ${n}`,
  bere:   (n) => `Bea o bere cu ${n}`,
};

// Asigură literă mare la început
function capitalizeFirst(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// Formatare frumoasă: map explicit → pattern grup → prettify (mereu literă mare)
function formatActivitate(key) {
  if (ACTIVITATE_LABEL[key]) return ACTIVITATE_LABEL[key];
  const m = String(key).match(/^([a-z]+)_cu_([A-Z][a-zăâîșțĂÂÎȘȚ]+)$/);
  if (m && PREFIX_LABEL[m[1]]) return PREFIX_LABEL[m[1]](m[2]);
  return capitalizeFirst(String(key).replace(/_/g, ' '));
}

// Activitate de bază a unui NPC într-un modul, cu rezolvarea cheilor generice "acasă"
function getResolvedBaseActivity(npc, dayIndex, moduleIndex) {
  const seed = npc.id * 10000 + dayIndex * 100 + moduleIndex;
  let act = npc.schedule[ZILE[dayIndex]]?.[MODULE[moduleIndex]] ?? 'acasa';
  if (HOME_GENERIC.has(act)) act = resolveHomeActivity(moduleIndex, seed);
  return act;
}

// ─── MOOD ────────────────────────────────────────────────────────────────────

export const MOOD_CULORI = {
  normal:     '#6b7280', // gri
  fericit:    '#d97706', // galben
  obosit:     '#3b82f6', // albastru
  bolnav:     '#ef4444', // rosu
  foame:      '#f97316', // portocaliu
  trist:      '#6366f1', // indigo
  ingrijorat: '#8b5cf6', // violet
  epuizat:    '#991b1b', // visiniu inchis
};

// Activități care includ mâncare (pentru detectarea stării de foame)
const CU_MANCARE = new Set([...E_MANCAT]);

function calcMood(npc, dayIndex, moduleIndex) {
  const prevZiua = ZILE[(dayIndex - 1 + 7) % 7];
  const seed = npc.id * 1000 + dayIndex;

  // 5% șansă de boală per zi (deterministă)
  if (seededRandom(seed + 7) < 0.05) return 'bolnav';

  // Dacă a petrecut la club noaptea trecută → obosit dimineata
  const prevNight = npc.schedule[prevZiua];
  if (prevNight) {
    const acteNoapte = [prevNight.early_night, prevNight.late_night];
    if (acteNoapte.includes('club') || acteNoapte.includes('petrecere_dupa_vernisaj')) {
      if (moduleIndex <= 1) return 'obosit';
    }
  }

  // Foame: niciun fel de masă în modulele anterioare ale zilei
  if (moduleIndex >= 3) {
    let meals = 0;
    for (let i = 0; i < moduleIndex; i++) {
      if (CU_MANCARE.has(getResolvedBaseActivity(npc, dayIndex, i))) meals++;
    }
    if (meals === 0) return 'foame';
  }

  // 10% fericit
  if (seededRandom(seed + 3) < 0.10) return 'fericit';
  // 5% îngrijorat
  if (seededRandom(seed + 9) < 0.05) return 'ingrijorat';

  return 'normal';
}

// ─── FACTOR DE PERSONALITATE (consum/refacere energie) ──────────────────────

// Fiecare NPC consumă și se reface diferit, în funcție de profesie și vârstă.
// Asta produce o distribuție realistă: nu toți se epuizează în același timp.
function energyFactors(npc) {
  // Baza < 1: majoritatea oamenilor sunt rezistenți; doar profesiile active
  // se apropie de prag. Asta creează o distribuție realistă (nu toți deodată).
  let consume = 0.85, recover = 1.0;
  const p = npc.profesie;
  // Activi (sportiv, medic): consumă mai repede, se refac mai greu
  if (/sportiv|medic/i.test(p)) { consume += 0.45; recover *= 0.85; }
  // Sedentari (pensionar, avocat): consumă mai lent
  if (/pensionar|avocat/i.test(p)) { consume -= 0.20; }
  // Tineri (21–30): se refac mai rapid după odihnă
  if (npc.varsta >= 21 && npc.varsta <= 30) { recover *= 1.20; }
  // Vârstnici (50+): se refac mai lent
  if (npc.varsta >= 50) { recover *= 0.80; }
  return { consume, recover };
}

// Delta de energie scalată cu factorul de personalitate
function scaledDelta(key, f) {
  let d = energyDelta(key);
  if (d < 0) d *= f.consume;
  else if (d > 0) d *= f.recover;
  return Math.round(d);
}

// ─── ENERGIE cu PRAG MINIM GARANTAT de 20% ──────────────────────────────────

// Aplică un modul. Dacă efortul ar duce energia sub 20%, NPC-ul e forțat
// să se odihnească (corpul îl oprește) → recuperează în loc să consume.
function applyModuleEnergy(e, npc, d, m, f) {
  const act = getResolvedBaseActivity(npc, d, m);
  const delta = scaledDelta(act, f);
  if (delta < 0 && e + delta < 20) {
    // Odihnă forțată: somn noaptea (+50), repaus ziua (+10), scalate cu refacerea
    const restBase = (m === 6 || m === 7) ? 50 : 10;
    return Math.min(100, e + Math.max(1, Math.round(restBase * f.recover)));
  }
  return Math.max(20, Math.min(100, e + delta));
}

// Simulează energia de la începutul săptămânii până la modulul cerut.
// Întoarce energia la intrarea în modul + dacă modulul curent forțează odihna.
function simulateNPC(npc, dayIndex, moduleIndex) {
  const f = energyFactors(npc);
  let e = 100; // luni dimineata, odihnit
  for (let d = 0; d <= dayIndex; d++) {
    const lastM = d === dayIndex ? moduleIndex : MODULE.length;
    for (let m = 0; m < lastM; m++) {
      e = applyModuleEnergy(e, npc, d, m, f); // mereu ≥ 20
    }
  }
  // Odihnă forțată la modulul curent? (dacă activitatea l-ar duce sub 20%)
  const targetAct = getResolvedBaseActivity(npc, dayIndex, moduleIndex);
  const delta = scaledDelta(targetAct, f);
  const forcedRest = delta < 0 && e + delta < 20;
  return { energie: Math.round(e), forcedRest };
}

// ─── EVENTS ──────────────────────────────────────────────────────────────────

function calcEvent(npc, dayIndex, moduleIndex) {
  const seed = npc.id * 10000 + dayIndex * 100 + moduleIndex;
  // Urgent: 2% pe modul — anulează totul
  if (seededRandom(seed + 11) < 0.02) {
    return { tip: 'urgent', descriere: 'Urgență în familie', anuleazaOrice: true };
  }
  // Personal: 3% — anulează activitățile opționale
  if (seededRandom(seed + 13) < 0.03) {
    return { tip: 'personal', descriere: 'Concert surpriză la Filarmonică', anuleazaOrice: false };
  }
  return null;
}

// ─── RELAȚII ─────────────────────────────────────────────────────────────────

function calcPrietenIesire(npc, allNpcs, ziua, modul, locatieNpc) {
  for (const [numePrieten, tip] of Object.entries(npc.relatii)) {
    if (tip !== 'prieten_bun') continue;
    const prieten = allNpcs.find(n => n.nume.includes(numePrieten) || numePrieten.includes(n.nume.split(' ')[0]));
    if (!prieten) continue;
    const actPrieten = getResolvedBaseActivity(prieten, ZILE.indexOf(ziua), MODULE.indexOf(modul));
    if (getLocatie(actPrieten) === locatieNpc) return numePrieten;
  }
  return null;
}

// ─── SINCRONIZARE ACTIVITĂȚI DE GRUP (bidirecțional) ────────────────────────

const GROUP_PREFIXES = new Set(['masa', 'cafea', 'iesire', 'fotbal', 'bere']);

// Prenumele unui NPC (ignoră titlul: "Dr. Mihai Ionescu" → "Mihai")
function firstNameOf(npc) {
  const tokens = npc.nume.split(' ');
  return tokens.find(t => !t.endsWith('.')) || tokens[0];
}

// Activitate solo de rezervă când partenerul nu e disponibil (e la muncă)
function soloFallback(prefix, moduleIndex) {
  switch (prefix) {
    case 'masa':   return 'masa_acasa';
    case 'cafea':  return 'cafea_cafenea';
    case 'iesire': return moduleIndex >= 6 ? 'se_relaxeaza' : 'plimbare_copou';
    case 'fotbal': return 'sport_sala';
    default:       return 'se_relaxeaza';
  }
}

// Un NPC nu poate participa la o activitate de grup dacă: are o obligație
// (muncă/curs), are o urgență, sau e forțat să se odihnească (epuizat).
function indisponibilPentruGrup(npc, baseAct, dayIndex, moduleIndex) {
  if (OBLIGATORII.has(baseAct)) return true;
  if (calcEvent(npc, dayIndex, moduleIndex)?.anuleazaOrice) return true;
  if (simulateNPC(npc, dayIndex, moduleIndex).forcedRest) return true;
  return false;
}

// Detectează activitățile de grup ("masa_cu_Ioana") și forțează simetria:
// dacă A iese cu B, atunci B iese cu A, la aceeași locație, în același modul.
// Întoarce Map<npcId, activitateKey> doar pentru NPC-urile afectate.
function resolveGroupOverrides(npcs, dayIndex, moduleIndex) {
  const overrides = new Map();
  const locked = new Set();
  const base = new Map();
  for (const n of npcs) base.set(n.id, getResolvedBaseActivity(n, dayIndex, moduleIndex));

  // Strânge invitațiile (prefix_cu_Nume unde Nume e alt NPC)
  const invites = [];
  for (const n of npcs) {
    const m = String(base.get(n.id)).match(/^([a-z]+)_cu_([A-Z][a-z]+)$/);
    if (!m || !GROUP_PREFIXES.has(m[1])) continue;
    const partner = npcs.find(p => p.id !== n.id && firstNameOf(p) === m[2]);
    if (partner) invites.push({ a: n, b: partner, prefix: m[1] });
  }
  // Procesează determinist, în ordinea id-ului inițiatorului
  invites.sort((x, y) => x.a.id - y.a.id);

  for (const { a, b, prefix } of invites) {
    if (locked.has(a.id) || locked.has(b.id)) continue;
    // Inițiatorul indisponibil (urgență/odihnă) → e gestionat de propria stare,
    // nu mai forțăm partenerul într-un grup unilateral.
    if (indisponibilPentruGrup(a, base.get(a.id), dayIndex, moduleIndex)) continue;
    // Partenerul indisponibil (muncă/urgență/odihnă) → inițiatorul merge solo
    if (indisponibilPentruGrup(b, base.get(b.id), dayIndex, moduleIndex)) {
      overrides.set(a.id, soloFallback(prefix, moduleIndex));
      locked.add(a.id);
      continue;
    }
    // Ambii disponibili → activitate reciprocă, la aceeași locație
    overrides.set(a.id, `${prefix}_cu_${firstNameOf(b)}`);
    overrides.set(b.id, `${prefix}_cu_${firstNameOf(a)}`);
    locked.add(a.id);
    locked.add(b.id);
  }
  return overrides;
}

// ─── STATISTICI NOI: FOAME + SOCIAL ─────────────────────────────────────────

// Foame = sațietate (100% = bine hrănit, 0% = înfometat)
// Scade cu ~12 puncte per modul fără mâncare, crește cu +40 când mănâncă
function calcFoame(npc, dayIndex, moduleIndex) {
  let v = 80; // dimineața, nu e înfometat
  for (let m = 0; m <= moduleIndex; m++) {
    const act = getResolvedBaseActivity(npc, dayIndex, m);
    if (CU_MANCARE.has(act)) {
      v = Math.min(100, v + 40);
    } else {
      v = Math.max(5, v - 12);
    }
  }
  return Math.round(v);
}

// Social = nivel de socializare (100% = activ social, 0% = izolat)
// Crește cu +25 la activități sociale, scade cu -8 la muncă solo / dormit excesiv
function calcSocial(npc, dayIndex, moduleIndex) {
  let v = 60;
  for (let m = 0; m <= moduleIndex; m++) {
    const act = getResolvedBaseActivity(npc, dayIndex, m);
    if (SOCIALE.has(act)) {
      v = Math.min(100, v + 25);
    } else if (E_DORMIT.has(act) || act === 'lucreaza_de_acasa' || act === 'munca_remote') {
      v = Math.max(0, v - 8);
    } else if (E_MUNCA.has(act)) {
      v = Math.max(0, v - 4);
    }
  }
  return Math.round(v);
}

// ─── STARE COMPLETĂ NPC ──────────────────────────────────────────────────────

export function computeNPCState(npc, allNpcs, dayIndex, moduleIndex, weather, baseOverride) {
  const ziua = ZILE[dayIndex];
  const modul = MODULE[moduleIndex];
  const seed = npc.id * 10000 + dayIndex * 100 + moduleIndex;
  const committed = baseOverride != null; // activitate de grup deja sincronizată

  // Activitate de bază (sau override de grup); generice "acasă" → concrete
  let activitate = baseOverride ?? npc.schedule[ziua]?.[modul] ?? 'acasa';
  if (HOME_GENERIC.has(activitate)) activitate = resolveHomeActivity(moduleIndex, seed);

  // Energie + odihnă forțată — energia nu scade niciodată sub 20%
  const { energie, forcedRest } = simulateNPC(npc, dayIndex, moduleIndex);
  if (forcedRest) {
    // Corpul îl oprește: doarme noaptea, se odihnește ziua
    activitate = moduleIndex >= 6 ? 'dormit' : 'se_odihneste';
  }

  // Eveniment
  const event = calcEvent(npc, dayIndex, moduleIndex);
  if (event?.anuleazaOrice) {
    activitate = 'urgenta_medicala_in_familie'; // urgența are prioritate peste tot
  } else if (!forcedRest && !committed) {
    // Activitățile de grup (committed) și odihna forțată nu sunt modificate
    if (event && !OBLIGATORII.has(activitate)) activitate = 'concert_surpriza';

    // Vreme rea anulează parțial activitățile sociale → rămâne acasă
    if (!OBLIGATORII.has(activitate) && SOCIALE.has(activitate)) {
      if (weather === 'ploaie' && seededRandom(seed + 17) < 0.50) {
        activitate = resolveHomeActivity(moduleIndex, seed + 101);
      } else if (weather === 'vant' && seededRandom(seed + 17) < 0.20) {
        activitate = resolveHomeActivity(moduleIndex, seed + 101);
      }
    }

    // Random 10% — schimbă planul fără motiv
    if (!OBLIGATORII.has(activitate) && seededRandom(seed + 23) < 0.10) {
      const optiuni = ['plimbare_copou', 'cafea_cafenea', 'citit', 'cumparaturi', 'se_relaxeaza'];
      activitate = optiuni[Math.floor(seededRandom(seed + 29) * optiuni.length)];
    }
  }

  const locatie = getLocatie(activitate);

  // Partener pentru badge ("Cu X") — din activitatea de grup sau din relații
  let prietenIesire = null;
  const cuMatch = String(activitate).match(/_cu_([A-Z][a-z]+)$/);
  if (cuMatch) {
    prietenIesire = cuMatch[1];
  } else if (SOCIALE.has(activitate)) {
    const p = calcPrietenIesire(npc, allNpcs, ziua, modul, locatie);
    if (p && seededRandom(seed + 19) < 0.70) prietenIesire = p;
  }

  let mood = calcMood(npc, dayIndex, moduleIndex);
  // Odihnă forțată (corpul l-a oprit la prag) → epuizat. Doar cine chiar
  // s-a oprit din epuizare, nu oricine are energie joasă → max 2-3 simultan.
  if (forcedRest) mood = 'epuizat';

  return {
    ...npc,
    activitateActuala: activitate,
    activitateLabel: formatActivitate(activitate),
    locatie,
    mood,
    energie,
    foame:  calcFoame(npc, dayIndex, moduleIndex),
    social: calcSocial(npc, dayIndex, moduleIndex),
    event: event?.descriere ?? null,
    ziua,
    modul,
    weather,
    prietenIesire,
  };
}

// Calculează starea tuturor NPC-urilor pentru un modul (cu sincronizare de grup)
export function computeAllNPCStates(npcs, dayIndex, moduleIndex) {
  const weather = getWeatherForDay(dayIndex);
  const overrides = resolveGroupOverrides(npcs, dayIndex, moduleIndex);
  return npcs.map(npc =>
    computeNPCState(npc, npcs, dayIndex, moduleIndex, weather, overrides.get(npc.id))
  );
}

// ─── PROMPTURI LLM ───────────────────────────────────────────────────────────

// Frază naturală pentru locație ("acasă" vs "la X")
function frazaLocatie(locatie) {
  return locatie === 'Acasă' ? 'e acasă' : `e la ${locatie}`;
}

// Coboară prima literă (pentru a lega fraza: "și gătește")
function lowerFirst(s) {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

// Prompt individual — include locația specifică și activitatea concretă
export function buildPrompt(state) {
  const contextEvent = state.event ? ` ${state.event}.` : '';
  const contextRelatie = state.prietenIesire ? ` E cu ${state.prietenIesire}.` : '';

  return (
    `${state.nume} e ${state.profesie}, e ${state.mood}.` +
    `${contextEvent}` +
    ` E ${state.ziua} ${MODULE_LABEL[state.modul]}, ${frazaLocatie(state.locatie)} și ${lowerFirst(state.activitateLabel)}.` +
    `${contextRelatie}` +
    ` Descrie ce face în MAXIM 50 de cuvinte. Fii specific și natural.`
  );
}

// Prompt batchat — mai mulți NPC la aceeași locație
export function buildBatchPrompt(states) {
  const { ziua, modul, locatie } = states[0];
  const lista = states.map((s, i) => {
    const ev = s.event ? ` (${s.event})` : '';
    return `${i + 1}. [id=${s.id}] ${s.nume} (${s.profesie}, ${s.mood}) — ${lowerFirst(s.activitateLabel)}${ev}`;
  }).join('\n');

  return (
    `Descrie ce face fiecare persoană în MAXIM 50 de cuvinte. ` +
    `Toți sunt la ${locatie}, ${ziua} ${MODULE_LABEL[modul]}. ` +
    `Răspunde DOAR cu un array JSON, fără explicații: ` +
    `[{"id": 1, "descriere": "..."}]\n\n${lista}`
  );
}
