/*
 * INVICTUS — Repositorios
 * Punto de acceso de la aplicación a la persistencia.
 */

export {
  getStudents,
  saveStudent,
  saveStudentsBatch,
  deleteStudent,
  studentExists
} from './services/students-service.js';


export {
  getStudentCounter,
  setStudentCounter,
  reserveNextStudentNumber,
  reserveStudentNumberRange,
  reserveNextTeamNumber,
  resetAllTestData
} from './services/system-service.js';


export {
  getTeams,
  saveTeam,
  deleteTeam
} from './services/teams-service.js';

export { getPublicCounters, syncPublicCounters, resetPublicCounters } from './services/public-counters-service.js';

export { getPublicTournamentData, getPublicPlayers, syncPublicPlayer, syncPublicPlayers, deletePublicPlayer, resetPublicPlayers, getMatches, saveMatch, deleteMatch } from './services/public-tournament-service.js';
