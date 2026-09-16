/* INVICTUS — Datos públicos del torneo V11.6
 *
 * Fuente única de jugadores: /students.
 * Los nombres, apellidos, curso/tipo y fotografía son datos públicos del
 * torneo según el modelo aprobado. La colección no contiene datos sensibles.
 */
import { db } from '../firebase.js';
import { TOURNAMENT_DISCIPLINES, tournamentDisciplineKey } from '../modules/disciplines.js';
import {
  collection, doc, getDocs, setDoc, deleteDoc
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const COLLECTIONS = {
  teams: 'teams',
  matches: 'matches',
  students: 'students'
};

async function readCollection(name) {
  const snapshot = await getDocs(collection(db, name));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function readCollectionPublic(name) {
  try {
    return await readCollection(name);
  } catch (error) {
    console.warn(
      `[INVICTUS] No fue posible leer /${name} para la vista pública:`,
      error.message
    );
    return [];
  }
}

function normalizeKey(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function normalizeId(value) {
  return String(value ?? '').trim().toUpperCase();
}
function normalizePlayerCompetitionGroup(player) {
  const raw = normalizeKey(player?.competitionGroup);
  if (player?.playerType === 'Profesor' || ['mayor', 'profesores', 'invitados'].includes(raw)) {
    return 'Profesional';
  }
  return String(player?.competitionGroup || '').trim();
}

function resolveDisciplineId(value) {
  const raw = value?.disciplineId ?? value?.discipline ?? value?.sportId ?? value?.sport ?? value ?? '';
  const key = tournamentDisciplineKey(raw);
  const rule = TOURNAMENT_DISCIPLINES.find(item => item.key === key);
  return rule?.id || String(raw || '').trim();
}

function normalizeTeam(team, players) {
  const members = Array.isArray(team?.members)
    ? [...new Set(team.members.map(normalizeId).filter(Boolean))]
    : [];

  const memberGroups = members
    .map(id => players.find(p => normalizeId(p.id) === id)?.competitionGroup)
    .filter(Boolean);

  return {
    ...team,
    id: normalizeId(team?.id),
    name: String(team?.name || '').trim(),
    disciplineId: resolveDisciplineId(team),
    competitionGroup: String(team?.competitionGroup || memberGroups[0] || '').trim(),
    members,
    active: team?.active !== false
  };
}

function normalizeMatch(match) {
  return {
    ...match,
    id: normalizeId(match?.id),
    disciplineId: resolveDisciplineId(match),
    competitionGroup: String(match?.competitionGroup || '').trim(),
    teamAId: normalizeId(match?.teamAId),
    teamBId: normalizeId(match?.teamBId)
  };
}

export async function getPublicTournamentData() {
  const [teamRows, matchRows, playerRows] = await Promise.all([
    readCollectionPublic(COLLECTIONS.teams),
    readCollectionPublic(COLLECTIONS.matches),
    readCollectionPublic(COLLECTIONS.students)
  ]);

  const players = playerRows
    .filter(x => x.active !== false)
    .map(x => ({ ...x, id: normalizeId(x.id), competitionGroup: normalizePlayerCompetitionGroup(x) }));
  const disciplines = TOURNAMENT_DISCIPLINES.map(rule => ({ ...rule, active: true }));
  const teams = teamRows
    .filter(x => x.active !== false)
    .map(x => normalizeTeam(x, players));
  const matches = matchRows.map(x => normalizeMatch(x));

  console.info('[INVICTUS] Datos públicos normalizados:', {
    disciplinas: disciplines.map(d => `${d.id}:${d.name}`),
    equipos: teams.map(t => `${t.id}:${t.name}:${t.disciplineId}:${t.competitionGroup}`),
    jugadores: players.length,
    partidos: matches.length
  });

  return { disciplines, teams, matches, players };
}

/**
 * Compatibilidad de API: las tarjetas públicas ahora leen directamente
 * /students. No existe una colección duplicada /publicPlayers.
 */
export async function getPublicPlayers() {
  return (await readCollectionPublic(COLLECTIONS.students))
    .filter(x => x.active !== false)
    .map(x => ({ ...x, id: normalizeId(x.id), competitionGroup: normalizePlayerCompetitionGroup(x) }));
}

/**
 * Funciones antiguas de proyección pública quedan como no-op deliberado.
 * Se conservan temporalmente para que una versión antigua de app.js no
 * provoque una escritura duplicada mientras se completa la transición.
 */
export async function syncPublicPlayer() {}
export async function syncPublicPlayers() {}
export async function deletePublicPlayer() {}
export async function resetPublicPlayers() {}

export async function getMatches() {
  return readCollection(COLLECTIONS.matches);
}

export async function saveMatch(match) {
  const id = String(match.id || '').trim().toUpperCase();
  if (!id) throw new Error('El partido debe tener un ID.');

  const payload = {
    ...match,
    id,
    status: match.status || 'Programado',
    scoreA: Number.isFinite(Number(match.scoreA)) ? Number(match.scoreA) : null,
    scoreB: Number.isFinite(Number(match.scoreB)) ? Number(match.scoreB) : null,
    updatedAt: new Date().toISOString()
  };

  await setDoc(doc(db, COLLECTIONS.matches, id), payload, { merge: true });
  return payload;
}

export async function deleteMatch(id) {
  await deleteDoc(
    doc(db, COLLECTIONS.matches, String(id).trim().toUpperCase())
  );
}
