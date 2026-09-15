/* INVICTUS 2026 — Datos de demostración
 * Este archivo contiene únicamente datos configurables.
 * En la siguiente fase, estos datos serán sustituidos por Firebase.
 */
const CATEGORIES = [
  { id:'preinfantil', name:'Preinfantil', grades:'Transición · 1° · 2°' },
  { id:'infantil',    name:'Infantil',    grades:'3° · 4° · 5°' },
  { id:'prejuvenil',  name:'Prejuvenil',  grades:'6° · 7° · 8°' },
  { id:'profesional', name:'Profesional', grades:'9° · 10° · 11° · Profes' },
];

const SPORTS = [
  { id:'futbol',     name:'Fútbol',     color:'#2f8f4e', cols:['PJ','G','E','P','GF','GC','DG','Pts'] },
  { id:'baloncesto', name:'Baloncesto', color:'#c4122f', cols:['PJ','PG','PP','PF','PC','Dif','Pts'] },
  { id:'voleibol',   name:'Vóleibol',   color:'#0c2547', cols:['PJ','SG','SP','Pts'] },
];

// Standings: standings[categoryId][sportId] = array of team rows
const standings = {
  preinfantil: {
    futbol: [
      {team:'Transición A', pj:3,g:3,e:0,p:0,gf:9,gc:2,pts:9},
      {team:'1° B',         pj:3,g:2,e:0,p:1,gf:6,gc:4,pts:6},
      {team:'2° A',         pj:3,g:1,e:1,p:1,gf:5,gc:5,pts:4},
      {team:'1° A',         pj:3,g:0,e:1,p:2,gf:2,gc:7,pts:1},
    ],
    baloncesto: [
      {team:'2° A', pj:3,pg:3,pp:0,pf:64,pc:40,pts:6},
      {team:'2° B', pj:3,pg:2,pp:1,pf:55,pc:48,pts:4},
      {team:'1° A', pj:3,pg:1,pp:2,pf:41,pc:52,pts:2},
      {team:'1° B', pj:3,pg:0,pp:3,pf:34,pc:60,pts:0},
    ],
    voleibol: [
      {team:'Transición A', pj:3,sg:6,sp:1,pts:9},
      {team:'2° A',         pj:3,sg:4,sp:3,pts:6},
      {team:'1° A',         pj:3,sg:3,sp:4,pts:3},
      {team:'2° B',         pj:3,sg:1,sp:6,pts:0},
    ],
  },
  infantil: {
    futbol: [
      {team:'5° A', pj:4,g:4,e:0,p:0,gf:14,gc:3,pts:12},
      {team:'4° B', pj:4,g:2,e:1,p:1,gf:8,gc:6,pts:7},
      {team:'5° B', pj:4,g:2,e:0,p:2,gf:7,gc:8,pts:6},
      {team:'3° A', pj:4,g:0,e:1,p:3,gf:3,gc:11,pts:1},
    ],
    baloncesto: [
      {team:'5° A', pj:4,pg:4,pp:0,pf:88,pc:52,pts:8},
      {team:'5° B', pj:4,pg:3,pp:1,pf:74,pc:60,pts:6},
      {team:'4° A', pj:4,pg:1,pp:3,pf:58,pc:70,pts:2},
      {team:'3° B', pj:4,pg:0,pp:4,pf:46,pc:82,pts:0},
    ],
    voleibol: [
      {team:'4° A', pj:4,sg:8,sp:2,pts:12},
      {team:'5° A', pj:4,sg:6,sp:4,pts:9},
      {team:'3° A', pj:4,sg:4,sp:6,pts:6},
      {team:'5° B', pj:4,sg:2,sp:8,pts:3},
    ],
  },
  prejuvenil: {
    futbol: [
      {team:'8° A', pj:5,g:4,e:1,p:0,gf:15,gc:4,pts:13},
      {team:'7° A', pj:5,g:3,e:1,p:1,gf:11,gc:7,pts:10},
      {team:'6° B', pj:5,g:2,e:0,p:3,gf:9,gc:10,pts:6},
      {team:'8° B', pj:5,g:0,e:2,p:3,gf:5,gc:13,pts:2},
    ],
    baloncesto: [
      {team:'7° A', pj:5,pg:5,pp:0,pf:112,pc:70,pts:10},
      {team:'8° A', pj:5,pg:3,pp:2,pf:95,pc:85,pts:6},
      {team:'6° A', pj:5,pg:2,pp:3,pf:80,pc:92,pts:4},
      {team:'8° B', pj:5,pg:0,pp:5,pf:60,pc:110,pts:0},
    ],
    voleibol: [
      {team:'6° A', pj:5,sg:10,sp:3,pts:15},
      {team:'8° A', pj:5,sg:8,sp:5,pts:12},
      {team:'7° B', pj:5,sg:5,sp:8,pts:6},
      {team:'8° B', pj:5,sg:2,sp:9,pts:2},
    ],
  },
  profesional: {
    futbol: [
      {team:'11°',   pj:5,g:5,e:0,p:0,gf:18,gc:3,pts:15},
      {team:'10°',   pj:5,g:3,e:1,p:1,gf:12,gc:8,pts:10},
      {team:'9°',    pj:5,g:1,e:1,p:3,gf:7,gc:12,pts:4},
      {team:'Profes',pj:5,g:0,e:2,p:3,gf:6,gc:14,pts:2},
    ],
    baloncesto: [
      {team:'10°',    pj:5,pg:4,pp:1,pf:120,pc:95,pts:8},
      {team:'11°',    pj:5,pg:4,pp:1,pf:115,pc:98,pts:8},
      {team:'9°',     pj:5,pg:2,pp:3,pf:90,pc:105,pts:4},
      {team:'Profes', pj:5,pg:0,pp:5,pf:70,pc:115,pts:0},
    ],
    voleibol: [
      {team:'11°',    pj:5,sg:10,sp:2,pts:15},
      {team:'9°',     pj:5,sg:7,sp:6,pts:9},
      {team:'10°',    pj:5,sg:6,sp:7,pts:6},
      {team:'Profes', pj:5,sg:3,sp:10,pts:3},
    ],
  },
};

const VJ_GAMES = [
  { id:'fifa',      name:'FIFA',             color:'#2f8f4e', day:'Martes' },
  { id:'mario',     name:'Mario Party',      color:'#f2b705', day:'Martes' },
  { id:'mariokart', name:'Mario Kart',       color:'#c4122f', day:'Jueves' },
  { id:'smash',     name:'Super Smash Bros', color:'#0c2547', day:'Jueves' },
];

const vjBoards = {
  primaria: {
    fifa:      [{n:'Samuel Rueda',w:6},{n:'Isabella Gómez',w:5},{n:'Tomás Cala',w:4}],
    mariokart: [{n:'Valentina Ortiz',w:5},{n:'Emilio Suárez',w:4},{n:'Luciana Prada',w:3}],
    mario:     [{n:'María José Duarte',w:7},{n:'Andrés Villamizar',w:5},{n:'Gabriela Niño',w:4}],
    smash:     [{n:'Nicolás Barrera',w:6},{n:'Sofía Ardila',w:4},{n:'Simón Delgado',w:3}],
  },
  bachillerato: {
    fifa:      [{n:'Juan Pablo Mendoza',w:8},{n:'Santiago Rey',w:6},{n:'Camilo Duarte',w:5}],
    mariokart: [{n:'Sara Sofía Perico',w:6},{n:'Mariana Osorio',w:5},{n:'David Sepúlveda',w:4}],
    mario:     [{n:'Laura Camila Rangel',w:7},{n:'Sebastián Amaya',w:5},{n:'Julián Cárdenas',w:4}],
    smash:     [{n:'Daniel Peñaranda',w:9},{n:'Valeria Angarita',w:6},{n:'Kevin Rojas',w:5}],
  },
};

// Cronograma — cada partido: fecha (YYYY-MM-DD), hora, deporte, categoría/sección, rival A vs rival B.
// Para videojuegos, "a" y "b" son PAREJAS (dupla de estudiantes), no equipos completos.
const SCHEDULE = {
  futbol: [
    { date:'2026-09-01', time:'7:00 AM',  cat:'Preinfantil', a:'Transición A', b:'1° B' },
    { date:'2026-09-01', time:'8:00 AM',  cat:'Infantil',    a:'5° A',         b:'4° B' },
    { date:'2026-09-02', time:'7:00 AM',  cat:'Prejuvenil',  a:'8° A',         b:'7° A' },
    { date:'2026-09-02', time:'8:00 AM',  cat:'Profesional', a:'11°',          b:'10°' },
  ],
  baloncesto: [
    { date:'2026-09-03', time:'7:00 AM', cat:'Preinfantil', a:'2° A', b:'2° B' },
    { date:'2026-09-03', time:'8:00 AM', cat:'Infantil',    a:'5° A', b:'5° B' },
    { date:'2026-09-04', time:'7:00 AM', cat:'Prejuvenil',  a:'7° A', b:'8° A' },
    { date:'2026-09-04', time:'8:00 AM', cat:'Profesional', a:'10°', b:'11°' },
  ],
  voleibol: [
    { date:'2026-09-08', time:'7:00 AM', cat:'Preinfantil', a:'Transición A', b:'2° A' },
    { date:'2026-09-08', time:'8:00 AM', cat:'Infantil',    a:'4° A',         b:'5° A' },
    { date:'2026-09-09', time:'7:00 AM', cat:'Prejuvenil',  a:'6° A',         b:'8° A' },
    { date:'2026-09-09', time:'8:00 AM', cat:'Profesional', a:'11°',          b:'9°' },
  ],
  // Videojuegos: parejas del mismo grado (o de grados distintos si no hay pareja disponible).
  // Dos partidos por día: martes FIFA + Mario Party, jueves Mario Kart + Super Smash Bros.
  videojuegos: [
    { date:'2026-09-01', time:'2:00 PM', game:'fifa',      sec:'Bachillerato', a:'Juan Pablo Mendoza · 11°',  b:'Santiago Rey · 10°' },
    { date:'2026-09-01', time:'2:30 PM', game:'mario',     sec:'Primaria',     a:'María José Duarte · 4°',    b:'Andrés Villamizar · 4°' },
    { date:'2026-09-03', time:'2:00 PM', game:'mariokart', sec:'Bachillerato', a:'Sara Sofía Perico · 11°',   b:'Mariana Osorio · 10°' },
    { date:'2026-09-03', time:'2:30 PM', game:'smash',     sec:'Primaria',     a:'Nicolás Barrera · 5°',      b:'Sofía Ardila · 5°' },
  ],
};

// Player roster (demo sample — extend this array with the full 185 students)
// Campo opcional "photo": URL a la foto del estudiante. Si no se pone, se muestran las iniciales.
const PLAYERS = [
  { name:'Juan Pablo Mendoza', category:'profesional', grade:'11°',
    sports:{ futbol:{games:2,goals:5,assists:3,wins:2}, videojuegos:{games:8,goals:0,assists:0,wins:8} } },
  { name:'Sara Sofía Perico', category:'profesional', grade:'11°',
    sports:{ voleibol:{games:5,goals:38,assists:12,wins:4}, baloncesto:{games:3,goals:22,assists:5,wins:2}, videojuegos:{games:6,goals:0,assists:0,wins:6} } },
  { name:'Santiago Rey', category:'profesional', grade:'10°',
    sports:{ futbol:{games:5,goals:6,assists:2,wins:3}, videojuegos:{games:6,goals:0,assists:0,wins:6} } },
  { name:'Laura Camila Rangel', category:'prejuvenil', grade:'8°',
    sports:{ voleibol:{games:5,goals:20,assists:8,wins:4}, videojuegos:{games:7,goals:0,assists:0,wins:7} } },
  { name:'Nicolás Barrera', category:'infantil', grade:'5°',
    sports:{ futbol:{games:4,goals:7,assists:1,wins:3}, baloncesto:{games:4,goals:18,assists:2,wins:3} } },
  { name:'María José Duarte', category:'infantil', grade:'4°',
    sports:{ voleibol:{games:4,goals:15,assists:4,wins:3}, videojuegos:{games:7,goals:0,assists:0,wins:7} } },
  { name:'Emilio Suárez', category:'preinfantil', grade:'2°',
    sports:{ futbol:{games:3,goals:3,assists:1,wins:2} } },
  { name:'Daniel Peñaranda', category:'prejuvenil', grade:'7°',
    sports:{ baloncesto:{games:5,goals:30,assists:6,wins:4}, videojuegos:{games:9,goals:0,assists:0,wins:9} } },
];
const SPORT_META = { futbol:{icon:'⚽',label:'Fútbol'}, baloncesto:{icon:'🏀',label:'Baloncesto'}, voleibol:{icon:'🏐',label:'Vóleibol'}, videojuegos:{icon:'🎮',label:'Videojuegos'} };

const CAT_META = Object.fromEntries(CATEGORIES.map(c=>[c.id,c]));

const POS_SPORTS = [...SPORTS, { id:'videojuegos', name:'Videojuegos', icon:'🎮' }];

const SCHED_SPORTS = [
  {id:'futbol',name:'Fútbol',icon:'⚽'},
  {id:'baloncesto',name:'Baloncesto',icon:'🏀'},
  {id:'voleibol',name:'Vóleibol',icon:'🏐'},
  {id:'videojuegos',name:'Videojuegos',icon:'🎮'},
];


const APP_CONFIG = {
  name: 'INVICTUS 2026',
  school: 'Beth Shalom Gimnasio Campestre',
  studentIdPrefix: 'BS',
  studentIdDigits: 3
};

export {
  CATEGORIES,
  SPORTS,
  VJ_GAMES,
  standings,
  vjBoards,
  SCHEDULE,
  PLAYERS,
  SPORT_META,
  CAT_META,
  POS_SPORTS,
  SCHED_SPORTS,
  APP_CONFIG
};
