/*
 * INVICTUS — Disciplinas y grupos de competencia
 *
 * Una persona puede participar en varias disciplinas.
 * Por ahora usamos el catálogo de demostración de data.js.
 */

export const COURSE_GROUPS = {
  // Códigos oficiales para CSV / datos internos.
  '0': 'Preinfantil',
  '0P': 'Preinfantil',
  '0K': 'Preinfantil',
  '0T': 'Preinfantil',
  '1': 'Preinfantil',
  '2': 'Preinfantil',
  '3': 'Infantil',
  '4': 'Infantil',
  '5': 'Infantil',
  '6': 'Prejuvenil',
  '7': 'Prejuvenil',
  '8': 'Prejuvenil',
  '9': 'Profesional',
  '10': 'Profesional',
  '11': 'Profesional',

  // Compatibilidad con registros existentes.
  'Párvulos': 'Preinfantil',
  'Prekínder': 'Preinfantil',
  'Kínder': 'Preinfantil',
  'Transición': 'Preinfantil',
  '1°': 'Preinfantil',
  '2°': 'Preinfantil',
  '3°': 'Infantil',
  '4°': 'Infantil',
  '5°': 'Infantil',
  '6°': 'Prejuvenil',
  '7°': 'Prejuvenil',
  '8°': 'Prejuvenil',
  '9°': 'Profesional',
  '10°': 'Profesional',
  '11°': 'Profesional'
};

export const COURSE_LABELS = {
  '0': 'Párvulos',
  '0P': 'Prekínder',
  '0K': 'Kínder',
  '0T': 'Transición',
  '1': '1°',
  '2': '2°',
  '3': '3°',
  '4': '4°',
  '5': '5°',
  '6': '6°',
  '7': '7°',
  '8': '8°',
  '9': '9°',
  '10': '10°',
  '11': '11°'
};

export function normalizeCourseCode(course) {
  const value = String(course || '').trim();
  if (COURSE_GROUPS[value]) {
    return Object.prototype.hasOwnProperty.call(COURSE_LABELS, value) ? value : value;
  }

  const normalized = value.toLocaleLowerCase('es-CO');
  const legacyMap = {
    'párvulos': '0',
    'parvulos': '0',
    'prekínder': '0P',
    'prekindér': '0P',
    'prekinder': '0P',
    'kínder': '0K',
    'kinder': '0K',
    'transición': '0T',
    'transicion': '0T'
  };

  if (legacyMap[normalized]) return legacyMap[normalized];

  const gradeMatch = normalized.match(/^(10|11|[1-9])°?$/);
  return gradeMatch ? gradeMatch[1] : '';
}

export function groupForCourse(course) {
  const code = normalizeCourseCode(course);
  return COURSE_GROUPS[code] || COURSE_GROUPS[String(course || '').trim()] || '';
}


export function disciplineCatalog(SPORTS = [], VJ_GAMES = []) {
  return [
    ...SPORTS.map(sport => ({
      id: sport.id,
      name: sport.name,
      type: 'Deporte',
      mode: 'Equipo'
    })),
    ...VJ_GAMES.map(game => ({
      id: game.id,
      name: game.name,
      type: 'Videojuego',
      mode: 'Individual / pareja'
    }))
  ];
}


export const TOURNAMENT_DISCIPLINES = Object.freeze([
  { key:'futbol', id:'futbol', name:'Fútbol', type:'Deporte', mode:'Equipo', calendarDay:'Lunes', rounds:'idaVuelta' },
  { key:'voleibol', id:'voleibol', name:'Voleibol', type:'Deporte', mode:'Equipo', calendarDay:'Miércoles', rounds:'unaVuelta' },
  { key:'baloncesto', id:'baloncesto', name:'Baloncesto', type:'Deporte', mode:'Equipo', calendarDay:'Viernes', rounds:'unaVuelta' },
  { key:'marioParty', id:'marioParty', name:'Mario Party', type:'Videojuego', mode:'Pareja', calendarDay:'Martes', rounds:'unaVuelta' },
  { key:'fifa', id:'fifa', name:'FIFA', type:'Videojuego', mode:'Pareja', calendarDay:'Martes', rounds:'unaVuelta' },
  { key:'marioKart', id:'marioKart', name:'Mario Kart', type:'Videojuego', mode:'Pareja', calendarDay:'Jueves', rounds:'unaVuelta' },
  { key:'superSmashBros', id:'superSmashBros', name:'Super Smash Bros', type:'Videojuego', mode:'Pareja', calendarDay:'Jueves', rounds:'unaVuelta' }
]);

export const DEFAULT_DISCIPLINES = TOURNAMENT_DISCIPLINES.map(({key,id,name,type,mode}) => ({ id, name, type, mode, active:true, key }));

export function tournamentDisciplineKey(value) {
  const candidate = (typeof value === 'object' && value !== null)
    ? (value.key || value.name || value.id || '')
    : value;
  const raw = String(candidate || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  const aliases = {
    futbol:'futbol', 'futbol sala':'futbol', soccer:'futbol', 'disc001':'futbol',
    voleibol:'voleibol', volleyball:'voleibol', 'disc002':'voleibol',
    baloncesto:'baloncesto', basket:'baloncesto', basketball:'baloncesto', 'disc003':'baloncesto',
    fifA:'fifa', fifa:'fifa', 'disc005':'fifa', 'mario party':'marioParty', marioparty:'marioParty', mario:'marioParty', 'disc004':'marioParty',
    'mario kart':'marioKart', mariokart:'marioKart', 'disc006':'marioKart',
    'super smash bros':'superSmashBros', supersmashbros:'superSmashBros', smash:'superSmashBros', 'disc007':'superSmashBros'
  };
  return aliases[raw] || String(value?.key || '').trim() || raw;
}

export function tournamentDisciplineRule(value) {
  const key = tournamentDisciplineKey(value);
  return TOURNAMENT_DISCIPLINES.find(item => item.key === key) || null;
}

export function normalizeDiscipline(item) {
  return {
    id: String(item?.id || '').trim().toUpperCase(),
    name: String(item?.name || '').trim(),
    type: item?.type === 'Videojuego' ? 'Videojuego' : 'Deporte',
    mode: String(item?.mode || 'Equipo').trim(),
    active: item?.active !== false,
    key: tournamentDisciplineKey(item)
  };
}
