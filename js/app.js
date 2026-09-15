console.log('[INVICTUS 2026] V20.8 — Rating y experiencia visual en tarjetas.');
import { createAutomaticPlayerCutout } from './services/player-photo-cutout.js';
import { generateRoundRobinStage } from './tournament.js';


const authElements={modal:document.getElementById('authModal'),form:document.getElementById('authForm'),email:document.getElementById('authEmail'),password:document.getElementById('authPassword'),togglePassword:document.getElementById('authTogglePassword'),error:document.getElementById('authError'),submit:document.getElementById('authSubmit')};
let currentUser=null,authReady=false,pendingAdminOpen=false;
function authError(message){authElements.error.textContent=message;authElements.error.hidden=false;}
function clearAuthError(){authElements.error.textContent='';authElements.error.hidden=true;}
function clearAuthForm(){
  if (authElements.form) authElements.form.reset();
  if (authElements.password) authElements.password.type = 'password';
  authElements.togglePassword?.setAttribute('aria-pressed', 'false');
  authElements.togglePassword?.setAttribute('aria-label', 'Ver contraseña');
  authElements.togglePassword?.setAttribute('title', 'Ver contraseña');
  authElements.togglePassword?.classList.remove('is-visible');
  clearAuthError();
}
function openAuth(){clearAuthForm();authElements.modal.hidden=false;document.body.classList.add('auth-open');setTimeout(()=>authElements.email.focus(),0);}
function closeAuth(){clearAuthForm();authElements.modal.hidden=true;document.body.classList.remove('auth-open');}
authElements.togglePassword?.addEventListener('click', () => {
  const visible = authElements.password.type === 'text';

  authElements.password.type = visible ? 'password' : 'text';
  authElements.togglePassword.setAttribute(
    'aria-label',
    visible ? 'Ver contraseña' : 'Ocultar contraseña'
  );
  authElements.togglePassword.setAttribute(
    'title',
    visible ? 'Ver contraseña' : 'Ocultar contraseña'
  );
  authElements.togglePassword.setAttribute('aria-pressed', String(!visible));
  authElements.togglePassword.classList.toggle('is-visible', !visible);
});
authElements.form?.addEventListener('submit',async e=>{e.preventDefault();clearAuthError();const email=authElements.email.value.trim(),password=authElements.password.value;if(!email||!authElements.email.checkValidity())return authError('Ingresa un correo electrónico válido.');if(!password)return authError('Ingresa la contraseña.');authElements.submit.disabled=true;authElements.submit.textContent='Ingresando...';try{await login(email,password);closeAuth();}catch(error){console.error('[INVICTUS] Error de autenticación:',error);authError(firebaseAuthMessage(error));}finally{authElements.submit.disabled=false;authElements.submit.textContent='Iniciar sesión';}});
document.querySelectorAll('[data-auth-close]').forEach(el=>el.addEventListener('click',closeAuth));
watchAuth(async user => {
  currentUser = user;
  authReady = true;
  updateHeaderLogoutVisibility(user);

  console.log(
    user
      ? '[INVICTUS] Sesión autenticada: ' + user.email
      : '[INVICTUS] Sin sesión autenticada.'
  );

  // Sin autenticación no se conserva ninguna vista administrativa activa.
  if (!user) {
    clearAuthForm();
    document.querySelectorAll('section.view').forEach(view => view.classList.remove('active'));
    document.getElementById('view-inicio')?.classList.add('active');
    document.querySelectorAll('#mainNav button').forEach(button => button.classList.remove('active'));
    document.querySelector('#mainNav [data-view="inicio"]')?.classList.add('active');
    document.getElementById('resetTestDataModal')?.setAttribute('hidden', '');
    document.getElementById('studentModal')?.classList.remove('open');
    document.getElementById('studentImportModal')?.classList.remove('open');
    document.getElementById('disciplineModal')?.classList.remove('open');
    document.getElementById('teamModal')?.classList.remove('open');
    adminTeams = [];
    teamsLoaded = false;
  }

  if (pendingAdminOpen) {
    pendingAdminOpen = false;

    if (user) {
      closeAuth();

      // El usuario pudo haber abierto Administración antes de que
      // Firebase terminara de resolver la sesión. Cargamos ahora.
      await loadAdminStudents();

      if (!disciplinesLoaded) {
        try {
          await loadDisciplines();
        } catch (error) {
          console.error('[INVICTUS] No fue posible cargar disciplinas:', error);
          adminDisciplines = [];
          disciplinesLoaded = false;
          renderDisciplineAdmin();
          renderDisciplineCatalog();
          renderDisciplineChecks();
        }
      }

      await loadAdminTeams();
    } else {
      openAuth();
    }
  }
});
document.querySelectorAll('[data-view="admin"]').forEach(button => button.addEventListener('click', event => {
  if (!authReady || !currentUser) {
    event.preventDefault();
    event.stopImmediatePropagation();
    pendingAdminOpen = true;
    if (authReady) openAuth();
    return;
  }
}, true));
window.INVICTUS_AUTH={get currentUser(){return currentUser;},logout};
import { login, logout, watchAuth, firebaseAuthMessage } from './modules/auth.js';
import {
  getStudents,
  saveStudent,
  saveStudentsBatch,
  getStudentCounter,
  setStudentCounter,
  reserveNextStudentNumber,
  reserveStudentNumberRange,
  reserveNextTeamNumber,
  resetAllTestData,
  getTeams,
  saveTeam,
  deleteTeam,
  getPublicCounters,
  syncPublicCounters,
  resetPublicCounters,
  getPublicTournamentData,
  getMatches,
  saveMatch,
  deleteMatch
} from './repositories.js';

import {
  createStudent,
  nextStudentId,
  studentIdFromNumber} from './modules/students.js';

import {
  groupForCourse,
  normalizeCourseCode,
  normalizeDiscipline,
  TOURNAMENT_DISCIPLINES,
  tournamentDisciplineKey,
  tournamentDisciplineRule
} from './modules/disciplines.js';


let adminDisciplines = [];
let disciplinesLoaded = false;
let adminTeams = [];
let teamsLoaded = false;

// Datos públicos: Firestore es la única fuente de verdad.
let publicData = { disciplines: [], teams: [], matches: [], players: [] };
let publicDataLoaded = false;
let curSchedDiscipline = '';
let curStandingsDiscipline = '';
let curStandingsGroup = '';
let curGameSection = 'Primaria';
let curPlayerSport = '';

// Catálogo oficial de categorías del torneo.
// Estas categorías son estructurales y no dependen de que todavía
// existan equipos/jugadores registrados en Firestore.
const TOURNAMENT_CATEGORIES = [
  { id: 'preinfantil', name: 'Preinfantil', grades: 'Transición · 1° · 2°' },
  { id: 'infantil', name: 'Infantil', grades: '3° · 4° · 5°' },
  { id: 'prejuvenil', name: 'Prejuvenil', grades: '6° · 7° · 8°' },
  { id: 'profesional', name: 'Profesional', grades: '9° · 10° · 11°' },
  { id: 'mayor', name: 'Mayor', grades: 'Profesores · Invitados' }
];

const TOURNAMENT_CATEGORY_NAMES = new Map(
  TOURNAMENT_CATEGORIES.map(c => [normalizeCategoryKey(c.name), c.name])
);

function normalizeCategoryKey(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function canonicalCategoryName(value) {
  const key = normalizeCategoryKey(value);
  return TOURNAMENT_CATEGORY_NAMES.get(key) || String(value ?? '').trim();
}

function normalizeLookup(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function disciplineById(id) {
  // Fuente única de verdad: catálogo hardcodeado. No se consulta ninguna
  // colección /disciplines ni se usa publicData para definir disciplinas.
  return tournamentDisciplineFor(id);
}

function publicTeamName(id) {
  const key = normalizeLookup(id);
  return publicData.teams.find(t => normalizeLookup(t.id) === key)?.name || id || '—';
}

function publicPlayerName(id) {
  const key = normalizeLookup(id);
  return publicData.players.find(p => normalizeLookup(p.id) === key)?.fullName || id || '—';
}

function sameDiscipline(a, b) {
  return normalizeLookup(a) === normalizeLookup(b);
}

function sameGroup(a, b) {
  if (!a || !b) return true;
  return normalizeLookup(a) === normalizeLookup(b);
}
function publicGroupLabel(group) { return group || 'Sin grupo'; }
function publicDisciplineType(d) { return String(d?.type || '').toLowerCase(); }
function isVideoGame(d) { return publicDisciplineType(d).includes('video'); }
function publicSectionForCourse(course) {
  const n = parseInt(String(course || '').replace(/[^0-9]/g,''),10);
  if (String(course || '').toLowerCase().includes('transición') || (!Number.isFinite(n) || n <= 5)) return 'Primaria';
  return 'Bachillerato';
}

async function loadPublicTournamentData() {
  try {
    publicData = await getPublicTournamentData();
    publicDataLoaded = true;
    if (!curStandingsDiscipline || !disciplineById(curStandingsDiscipline)) curStandingsDiscipline = TOURNAMENT_DISCIPLINES[0]?.id || '';
    if (!curSchedDiscipline || !disciplineById(curSchedDiscipline)) curSchedDiscipline = TOURNAMENT_DISCIPLINES[0]?.id || '';
    console.log(`[INVICTUS] Datos públicos cargados: ${publicData.players.length} jugadores, ${publicData.teams.length} equipos, ${publicData.matches.length} partidos.`);
    renderPublicMatches();
    renderOverview(); renderSportTabs(); renderCatTabs(); renderStandings(); populateFilters(); renderPlayers();
  } catch (error) {
    console.error('[INVICTUS] Error cargando datos públicos:', error);
  }
}


function activeTeamDisciplines() {
  // Fuente única de verdad: catálogo oficial hardcodeado.
  return TOURNAMENT_DISCIPLINES.map(rule => ({ ...rule, active: true }));
}

function tournamentDisciplineFor(value) {
  return tournamentDisciplineRule(value);
}

function canonicalDisciplineId(value) {
  const rule = tournamentDisciplineFor(value);
  return rule?.key || tournamentDisciplineKey(value);
}

function courseOptions() {
  const seen = new Set();
  const options = [];
  adminStudents.filter(s => s.active !== false).forEach(student => {
    const course = String(student.course || '').trim();
    const normalized = course || (student.playerType === 'Profesor' ? 'Profesores' : '');
    if (normalized && !seen.has(normalized)) { seen.add(normalized); options.push(normalized); }
  });
  ['0','0P','0K','0T','1','2','3','4','5','6','7','8','9','10','11','Profesores','Invitados'].forEach(course => {
    if (!seen.has(course)) { seen.add(course); options.push(course); }
  });
  return options.sort((a,b) => { const special={Profesores:900,Invitados:901}; if(special[a]!==undefined || special[b]!==undefined) return (special[a]??0)-(special[b]??0); return compareCourses(a,b); });
}

function teamDisciplineName(id) {
  const rule = tournamentDisciplineFor(id);
  return rule?.name || id || '—';
}

function syncTraditionalTeamName() {
  const nameInput = document.getElementById('teamName');
  const disciplineInput = document.getElementById('teamDiscipline');
  const courseInput = document.getElementById('teamCourse');
  if (!nameInput || !disciplineInput) return;

  const rule = tournamentDisciplineFor(disciplineInput.value);
  const isTraditional = rule?.type === 'Deporte';
  const course = String(courseInput?.value || document.getElementById('teamGroup')?.value || '').trim();

  if (isTraditional) {
    nameInput.value = course;
    nameInput.readOnly = true;
    nameInput.placeholder = 'Se genera automáticamente según el curso';
  } else {
    nameInput.readOnly = false;
    nameInput.placeholder = 'Ej. Pareja 1';
  }
}

function teamMemberName(id) {
  const student = adminStudents.find(item => item.id === id);
  return student
    ? `${student.firstName || ''} ${student.lastName || ''}`.trim()
    : id;
}

function isTraditionalSportRule(rule) {
  return rule?.type === 'Deporte';
}

function isFootballRule(rule) {
  return rule?.key === 'futbol';
}

function teamGoalkeepers(team) {
  const ids = new Set((team?.goalkeeperIds || []).map(normalizeLookup));
  return (team?.members || []).filter(id => ids.has(normalizeLookup(id)));
}

function getStudentTeamInDiscipline(studentId, disciplineId, editId = '') {
  const studentKey = normalizeLookup(studentId);
  const currentTeamKey = String(editId || '').trim().toUpperCase();
  const rule = tournamentDisciplineFor(disciplineId);
  return adminTeams.find(team =>
    String(team.id || '').trim().toUpperCase() !== currentTeamKey &&
    canonicalDisciplineId(team.disciplineId) === rule?.key &&
    (team.members || []).some(memberId => normalizeLookup(memberId) === studentKey)
  ) || null;
}

function normalizeTeam(team) {
  return {
    id: String(team?.id || '').trim().toUpperCase(),
    name: String(team?.name || '').trim(),
    disciplineId: String(team?.disciplineId || '').trim().toUpperCase(),
    course: String(team?.course || '').trim(),
    competitionGroup: String(team?.competitionGroup || '').trim(),
    members: Array.isArray(team?.members) ? [...new Set(team.members.map(String))] : [],
    goalkeeperIds: Array.isArray(team?.goalkeeperIds) ? [...new Set(team.goalkeeperIds.map(String))] : [],
    active: team?.active !== false
  };
}

function nextTeamNumberFromLoadedTeams(teams) {
  const numbers=(teams||[]).map(t=>String(t.id||'').match(/^EQ(\d+)$/i)).filter(Boolean).map(m=>Number(m[1])).filter(Number.isFinite);
  return numbers.length ? Math.max(...numbers)+1 : 1;
}

function inferTeamCourse(team) {
  if (team?.course) return String(team.course).trim();
  const courses=[...(team?.members||[])]
    .map(id=>adminStudents.find(s=>normalizeLookup(s.id)===normalizeLookup(id))?.course)
    .filter(Boolean);
  return courses.length && courses.every(c=>normalizeLookup(c)===normalizeLookup(courses[0])) ? courses[0] : '';
}

function getConfiguredTraditionalTeam(disciplineKey, course) {
  return adminTeams.find(team =>
    team.active !== false &&
    canonicalDisciplineId(team.disciplineId) === disciplineKey &&
    normalizeLookup(team.course || inferTeamCourse(team)) === normalizeLookup(course)
  ) || null;
}

function adminTeamCourses() {
  const courses = new Set();
  adminStudents
    .filter(student => student.active !== false)
    .forEach(student => {
      if (student.playerType === 'Profesor') courses.add('Profesores');
      else if (/invitad/i.test(String(student.course || ''))) courses.add('Invitados');
      else if (student.course) courses.add(String(student.course).trim());
    });
  return [...courses].sort(compareCourses);
}

function renderTeamAdmin() {
  const body = document.getElementById('teamAdminBody');
  if (!body) return;

  const rows = [];
  const traditionalRules = TOURNAMENT_DISCIPLINES.filter(rule => rule.type === 'Deporte');
  const courses = adminTeamCourses();

  // Deportes tradicionales: el sistema presenta automáticamente un espacio
  // para cada curso que tenga jugadores. El documento Firestore se crea solo
  // cuando el administrador configura ese equipo.
  traditionalRules.forEach(rule => {
    courses.forEach(course => {
      const eligibleCount = adminStudents.filter(student => {
        if (student.active === false) return false;
        if (course === 'Profesores') return student.playerType === 'Profesor';
        if (course === 'Invitados') return /invitad/i.test(String(student.course || ''));
        return normalizeCourseCode(student.course) === normalizeCourseCode(course);
      }).length;
      if (!eligibleCount) return;

      const team = getConfiguredTraditionalTeam(rule.key, course);
      if (team) {
        rows.push(`
          <tr>
            <td><strong>${escapeHtml(team.id)}</strong></td>
            <td>${escapeHtml(team.name)}</td>
            <td>${escapeHtml(rule.name)}</td>
            <td>${escapeHtml(course)}</td>
            <td>${team.members.length}</td>
            <td>
              <div class="student-actions">
                <button type="button" class="student-action" data-team-action="edit" data-id="${escapeHtml(team.id)}">Editar</button>
                <button type="button" class="student-action delete" data-team-action="delete" data-id="${escapeHtml(team.id)}">Eliminar</button>
              </div>
            </td>
          </tr>`);
      } else {
        rows.push(`
          <tr>
            <td><strong>—</strong></td>
            <td><span class="empty">Pendiente de configurar</span></td>
            <td>${escapeHtml(rule.name)}</td>
            <td>${escapeHtml(course)}</td>
            <td>0</td>
            <td>
              <button type="button" class="admin-btn secondary" data-team-action="configure" data-discipline="${escapeHtml(rule.id)}" data-course="${escapeHtml(course)}">Configurar equipo</button>
            </td>
          </tr>`);
      }
    });
  });

  // Videojuegos: únicamente se muestran las parejas que ya existen.
  adminTeams
    .filter(team => team.active !== false && tournamentDisciplineFor(team.disciplineId)?.type === 'Videojuego')
    .sort((a, b) => {
      const da = teamDisciplineName(a.disciplineId);
      const db = teamDisciplineName(b.disciplineId);
      return da.localeCompare(db, 'es') || compareCourses(a.course || inferTeamCourse(a), b.course || inferTeamCourse(b)) || a.name.localeCompare(b.name, 'es');
    })
    .forEach(team => {
      const rule = tournamentDisciplineFor(team.disciplineId);
      rows.push(`
        <tr>
          <td><strong>${escapeHtml(team.id)}</strong></td>
          <td>${escapeHtml(team.name)}</td>
          <td>${escapeHtml(rule?.name || teamDisciplineName(team.disciplineId))}</td>
          <td>${escapeHtml(team.course || inferTeamCourse(team) || '—')}</td>
          <td>${team.members.length}</td>
          <td>
            <div class="student-actions">
              <button type="button" class="student-action" data-team-action="edit" data-id="${escapeHtml(team.id)}">Editar</button>
              <button type="button" class="student-action delete" data-team-action="delete" data-id="${escapeHtml(team.id)}">Eliminar</button>
            </div>
          </td>
        </tr>`);
    });

  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="6" class="empty">No hay cursos con jugadores ni parejas de videojuegos registradas.</td></tr>';
    return;
  }

  body.innerHTML = rows.join('');
}

function courseSortKey(course) {
  const raw = String(course || '').trim().toUpperCase();
  const match = raw.match(/^(\d+)([A-Z]*)$/);
  if (!match) return [999, raw];
  const number = Number(match[1]);
  const suffix = match[2] || '';
  const suffixOrder = { P: 1, K: 2, T: 3 };
  return [number, suffixOrder[suffix] || 0, suffix];
}

function compareCourses(a, b) {
  const ka = courseSortKey(a);
  const kb = courseSortKey(b);
  if (ka[0] !== kb[0]) return ka[0] - kb[0];
  if (ka[1] !== kb[1]) return ka[1] - kb[1];
  return String(ka[2]).localeCompare(String(kb[2]), 'es');
}

function displayCourse(course, student = null) {
  const value = String(course || '').trim();
  if (value) return value;
  return student?.playerType === 'Profesor' ? 'Profesores' : 'Sin curso';
}

function getEligibleTeamStudents() {
  const course = document.getElementById('teamCourse')?.value || document.getElementById('teamGroup')?.value || '';
  const search = (document.getElementById('teamMemberSearch')?.value || '')
    .trim()
    .toLowerCase();

  return [...adminStudents]
    .filter(student => student.active !== false)
    .filter(student => {
      if (!course) return false;
      if (course === 'Profesores') return student.playerType === 'Profesor';
      if (course === 'Invitados') return /invitad/i.test(String(student.course || ''));
      return normalizeCourseCode(student.course) === normalizeCourseCode(course);
    })
    .filter(student => {
      if (!search) return true;
      const haystack = [
        student.id,
        student.firstName,
        student.lastName,
        student.fullName,
        student.course,
        student.competitionGroup
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(search);
    })
    .sort((a, b) => {
      const courseCompare = compareCourses(a.course, b.course);
      if (courseCompare !== 0) return courseCompare;
      const lastCompare = String(a.lastName || '').localeCompare(String(b.lastName || ''), 'es');
      if (lastCompare !== 0) return lastCompare;
      return String(a.firstName || '').localeCompare(String(b.firstName || ''), 'es');
    });
}

function renderTeamMembers(selectedIds = null) {
  const members = document.getElementById('teamMembers');
  const count = document.getElementById('teamSelectedCount');
  const search = document.getElementById('teamMemberSearch');
  const selectVisible = document.getElementById('teamSelectVisible');

  if (!members || !count) return;

  const selected = selectedIds
    ? new Set(selectedIds)
    : new Set(
        [...members.querySelectorAll('input[data-team-member]:checked')]
          .map(input => input.value)
      );

  const students = getEligibleTeamStudents();
  const disciplineId = document.getElementById('teamDiscipline')?.value || '';
  const editId = document.getElementById('teamEditId')?.value || '';

  if (students.length) {
    const groups = [];
    let currentCourse = null;

    students.forEach(student => {
      const course = displayCourse(student.course, student);
      if (course !== currentCourse) {
        currentCourse = course;
        groups.push({ course, students: [] });
      }
      groups[groups.length - 1].students.push(student);
    });

    members.innerHTML = groups.map(courseGroup => `
      <div class="team-member-course-group">
        <div class="team-member-course-heading">${escapeHtml(courseGroup.course)}</div>
        ${courseGroup.students.map(student => {
          const existingTeam = disciplineId
            ? getStudentTeamInDiscipline(student.id, disciplineId, editId)
            : null;
          const unavailable = Boolean(existingTeam);
          const isSelected = selected.has(student.id);
          const teamLabel = existingTeam
            ? `Ya pertenece a: ${existingTeam.name || existingTeam.id}`
            : 'Disponible';

          return `
          <div class="team-member-row${unavailable ? ' is-unavailable' : ''}">
            <input
              type="checkbox"
              value="${escapeHtml(student.id)}"
              data-team-member
              ${isSelected ? 'checked' : ''}
              ${unavailable ? 'disabled' : ''}
            >
            <span class="team-member-id">${escapeHtml(student.id)}</span>
            <span class="team-member-name">
              <strong>${escapeHtml(`${student.lastName || ''}${student.lastName && student.firstName ? ', ' : ''}${student.firstName || ''}`.trim())}</strong>
              <small class="team-member-status">${escapeHtml(teamLabel)}</small>
            </span>
            ${isFootballRule(tournamentDisciplineFor(disciplineId)) && !unavailable ? `<label class="team-member-role"><input type="checkbox" data-team-goalkeeper value="${escapeHtml(student.id)}" ${((selectedIds || []).map(normalizeLookup).includes(normalizeLookup(student.id)) && (window.__editingTeamGoalkeepers || []).map(normalizeLookup).includes(normalizeLookup(student.id))) ? 'checked' : ''}> <span>Portero</span></label>` : ''}
          </div>
        `;
        }).join('')}
      </div>
    `).join('');
  } else {
    members.innerHTML = `
      <div class="team-members-empty">
        ${search?.value
          ? 'No se encontraron estudiantes con ese criterio.'
          : 'No hay estudiantes activos que correspondan al grupo seleccionado.'}
      </div>
    `;
  }

  const allChecked = [...members.querySelectorAll('input[data-team-member]')];
  count.textContent = `${selected.size} seleccionado${selected.size === 1 ? '' : 's'}`;

  if (selectVisible) {
    selectVisible.disabled = allChecked.length === 0;
    selectVisible.textContent =
      allChecked.length && allChecked.every(input => input.checked)
        ? 'Deseleccionar visibles'
        : 'Seleccionar visibles';
  }
}

function populateTeamForm(team = null) {
  const discipline = document.getElementById('teamDiscipline');
  const group = document.getElementById('teamGroup');
  const courseSelect = document.getElementById('teamCourse');

  if (!discipline || !group) return;

  const allDisciplines = activeTeamDisciplines();
  const isConfiguringTraditional = Boolean(team?.__configureTraditional);
  const isEditingExisting = Boolean(team?.id);
  const disciplines = (isConfiguringTraditional || isEditingExisting)
    ? allDisciplines
    : allDisciplines.filter(item => item.type === 'Videojuego');

  discipline.innerHTML = `
    <option value="">Seleccionar disciplina</option>
    ${disciplines.map(item => `
      <option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>
    `).join('')}
  `;

  const courses = courseOptions();
  if (courseSelect) {
    courseSelect.innerHTML = '<option value="">Seleccionar curso</option>' + courses.map(code => `<option value="${escapeHtml(code)}">${escapeHtml(code)}</option>`).join('');
  } else {
    group.innerHTML = '<option value="">Seleccionar curso</option>' + courses.map(code => `<option value="${escapeHtml(code)}">${escapeHtml(code)}</option>`).join('');
  }

  document.getElementById('teamEditId').value = team?.id || '';
  document.getElementById('teamIdPreview').value =
    team?.id || 'Se generará al guardar';
  document.getElementById('teamName').value = team?.name || '';
  const requestedRule = tournamentDisciplineFor(team?.disciplineId || '');
  const matchingDiscipline = requestedRule
    ? disciplines.find(item => tournamentDisciplineKey(item) === requestedRule.key)
    : null;
  discipline.value = matchingDiscipline?.id || team?.disciplineId || '';
  discipline.disabled = isConfiguringTraditional;
  const initialCourse = team?.course || inferTeamCourse(team) || '';
  if (courseSelect) courseSelect.value = initialCourse;
  group.value = initialCourse;
  document.getElementById('teamActive').checked = team?.active !== false;
  syncTraditionalTeamName();

  const search = document.getElementById('teamMemberSearch');
  if (search) search.value = '';

  window.__editingTeamGoalkeepers = team?.goalkeeperIds || [];
  renderTeamMembers(team?.members || []);
}

function openTeamForm(team = null) {
  if (!currentUser) {
    openAuth();
    return;
  }

  const modal = document.getElementById('teamModal');
  if (!modal) return;

  loadDisciplines();
  populateTeamForm(team);
  document.getElementById('teamModalTitle').textContent =
    team?.id ? 'Editar equipo' : (team?.__configureTraditional ? 'Configurar equipo' : 'Crear pareja');
  modal.classList.add('open');
}

function closeTeamForm() {
  document.getElementById('teamModal')?.classList.remove('open');
}

async function loadAdminTeams() {
  const body = document.getElementById('teamAdminBody');
  if (body) {
    body.innerHTML = `
      <tr>
        <td colspan="6" class="empty">Cargando equipos...</td>
      </tr>
    `;
  }

  try {
    adminTeams = (await getTeams()).map(normalizeTeam);
    // Mantener sincronizada la representación pública en la sesión actual.
    // Los partidos consultan los IDs de los equipos y no deben conservar
    // nombres antiguos después de una modificación administrativa.
    publicData.teams = [...adminTeams];
    teamsLoaded = true;
    renderTeamAdmin();
    console.log(`[INVICTUS] Equipos cargados: ${adminTeams.length}.`);
  } catch (error) {
    console.error('[INVICTUS] Error cargando equipos:', error);
    if (body) {
      body.innerHTML = `
        <tr>
          <td colspan="6" class="empty">
            No fue posible leer los equipos.
            <br><small>${escapeHtml(error.message)}</small>
          </td>
        </tr>
      `;
    }
  }
}

document.getElementById('btnAddTeam')?.addEventListener('click', () => {
  openTeamForm();
});

document.getElementById('teamModalClose')?.addEventListener('click', closeTeamForm);
document.getElementById('teamCancel')?.addEventListener('click', closeTeamForm);

document.getElementById('teamMemberSearch')?.addEventListener('input', () => {
  renderTeamMembers();
});

document.getElementById('teamCourse')?.addEventListener('change', () => {
  const course = document.getElementById('teamCourse')?.value || '';
  const group = document.getElementById('teamGroup');
  if (group) group.value = (course === 'Profesores' || course === 'Invitados') ? 'Mayor' : groupForCourse(course);
  syncTraditionalTeamName();
  renderTeamMembers([]);
});

// El estado de disponibilidad depende directamente de la disciplina.
// Si cambia el deporte, debemos recalcular inmediatamente los jugadores
// disponibles antes de permitir guardar el equipo.
document.getElementById('teamDiscipline')?.addEventListener('change', () => {
  // En deportes tradicionales, el nombre del equipo es exactamente el
  // curso seleccionado. En videojuegos el nombre sigue siendo manual.
  syncTraditionalTeamName();
  // Al cambiar de disciplina, la pertenencia previa deja de ser válida
  // como selección del formulario. Se obliga a elegir nuevamente para
  // evitar guardar jugadores seleccionados bajo el deporte anterior.
  renderTeamMembers([]);
});

document.getElementById('teamSelectVisible')?.addEventListener('click', () => {
  const inputs = [...document.querySelectorAll('#teamMembers input[data-team-member]:not(:disabled)')];
  if (!inputs.length) return;

  const allChecked = inputs.every(input => input.checked);
  inputs.forEach(input => {
    input.checked = !allChecked;
  });

  renderTeamMembers();
});

document.getElementById('teamMembers')?.addEventListener('change', event => {
  if (event.target.matches('input[data-team-goalkeeper]')) {
    window.__editingTeamGoalkeepers = [...document.querySelectorAll('#teamMembers input[data-team-goalkeeper]:checked')].map(input => input.value);
    return;
  }
  if (event.target.matches('input[data-team-member]')) {
    const selected = [...document.querySelectorAll('#teamMembers input[data-team-member]:checked')].map(input => input.value);
    const selectedSet = new Set(selected.map(normalizeLookup));
    window.__editingTeamGoalkeepers = (window.__editingTeamGoalkeepers || []).filter(id => selectedSet.has(normalizeLookup(id)));
    const count = document.getElementById('teamSelectedCount');
    if (count) count.textContent = `${selected.length} seleccionado${selected.length === 1 ? '' : 's'}`;
  }
});

document.getElementById('teamForm')?.addEventListener('submit', async event => {
  event.preventDefault();

  if (!authReady || !currentUser) {
    openAuth();
    return;
  }

  const editId = document.getElementById('teamEditId').value.trim().toUpperCase();
  const disciplineId = document.getElementById('teamDiscipline').value.trim().toUpperCase();
  const course = document.getElementById('teamCourse')?.value || document.getElementById('teamGroup').value;
  const rule = tournamentDisciplineFor(disciplineId);
  const name = rule?.type === 'Deporte'
    ? String(course || '').trim()
    : document.getElementById('teamName').value.trim();
  const active = document.getElementById('teamActive').checked;
  const members = [...document.querySelectorAll('#teamMembers input[data-team-member]:checked')].map(input => input.value);
  const goalkeeperIds = rule?.key === 'futbol'
    ? [...document.querySelectorAll('#teamMembers input[data-team-goalkeeper]:checked')].map(input => input.value)
    : [];

  if (!name) {
    window.alert('Debes indicar el nombre del equipo.');
    return;
  }

  if (!disciplineId) {
    window.alert('Debes seleccionar un deporte.');
    return;
  }

  if (!course) {
    window.alert('Debes seleccionar el curso.');
    return;
  }

  if (!members.length) {
    window.alert('Selecciona al menos un jugador para formar el equipo.');
    return;
  }

  if (!rule) {
    window.alert('La disciplina seleccionada no pertenece al catálogo oficial de INVICTUS.');
    return;
  }

  if (rule.type === 'Videojuego' && members.length !== 2) {
    window.alert('En videojuegos, cada equipo debe estar conformado exactamente por 2 jugadores.');
    return;
  }

  if (rule.type === 'Deporte') {
    const wrongCourse = members.find(id => {
      const student = adminStudents.find(s => normalizeLookup(s.id) === normalizeLookup(id));
      if (course === 'Profesores') return student?.playerType !== 'Profesor';
      if (course === 'Invitados') return !/invitad/i.test(String(student?.course || ''));
      return normalizeCourseCode(student?.course) !== normalizeCourseCode(course);
    });
    if (wrongCourse) {
      window.alert('Todos los integrantes del equipo deben pertenecer al curso seleccionado.');
      return;
    }
  }

  try {
    if (rule.type === 'Deporte') {
      const sameCourseTeam = adminTeams.find(team =>
        team.id !== editId &&
        team.active !== false &&
        canonicalDisciplineId(team.disciplineId) === rule.key &&
        normalizeLookup(team.course || inferTeamCourse(team)) === normalizeLookup(course)
      );
      if (sameCourseTeam) {
        window.alert(`Ya existe un equipo para ${course} en esta disciplina: ${sameCourseTeam.name}. Cada curso puede tener un solo equipo por deporte.`);
        return;
      }
    }

    const duplicateName = adminTeams.find(team =>
      team.id !== editId && team.active !== false && normalizeLookup(team.name) === normalizeLookup(name)
    );
    if (duplicateName) {
      window.alert(`Ya existe un equipo con el nombre "${duplicateName.name}". Usa un nombre diferente.`);
      return;
    }

    // La disponibilidad mostrada en pantalla se calcula con adminTeams.
    // Antes de guardar, volvemos a leer los equipos para evitar que la
    // validación quede desactualizada si hubo cambios desde que se abrió
    // el formulario o si otro proceso creó/modificó un equipo.
    const latestTeams = (await getTeams()).map(normalizeTeam);
    adminTeams = latestTeams;

    if (rule.type === 'Deporte') {
      const latestSameCourseTeam = latestTeams.find(team => team.id !== editId && team.active !== false && canonicalDisciplineId(team.disciplineId) === rule.key && normalizeLookup(team.course || inferTeamCourse(team)) === normalizeLookup(course));
      if (latestSameCourseTeam) throw new Error(`Ya existe un equipo para ${course} en esta disciplina: ${latestSameCourseTeam.name}. Cada curso puede tener un solo equipo por deporte.`);
    }
    const latestDuplicateName = latestTeams.find(team => team.id !== editId && team.active !== false && normalizeLookup(team.name) === normalizeLookup(name));
    if (latestDuplicateName) throw new Error(`Ya existe un equipo con el nombre "${latestDuplicateName.name}". Usa un nombre diferente.`);

    const selectedKeys = new Set(members.map(normalizeLookup));
    const duplicateTeams = rule.type === 'Deporte'
      ? latestTeams.filter(team =>
          team.id !== editId &&
          canonicalDisciplineId(team.disciplineId) === rule.key &&
          team.members.some(memberId => selectedKeys.has(normalizeLookup(memberId)))
        )
      : [];

    if (duplicateTeams.length) {
      const duplicatedStudents = members.filter(memberId =>
        duplicateTeams.some(team =>
          team.members.some(existingId => normalizeLookup(existingId) === normalizeLookup(memberId))
        )
      );

      window.alert(
        `No se puede guardar el equipo. ${duplicatedStudents.length === 1
          ? 'Este jugador ya pertenece'
          : 'Estos jugadores ya pertenecen'} a otro equipo en este deporte: ${duplicatedStudents.join(', ')}.`
      );
      renderTeamAdmin();
      renderTeamMembers();
      return;
    }

    if (rule.type === 'Videojuego') {
      const duplicatePair = latestTeams.find(team =>
        team.id !== editId && team.active !== false &&
        canonicalDisciplineId(team.disciplineId) === rule.key &&
        normalizeLookup(team.course || inferTeamCourse(team)) === normalizeLookup(course) &&
        team.members.length === 2 &&
        team.members.every(memberId => selectedKeys.has(normalizeLookup(memberId)))
      );
      if (duplicatePair) {
        window.alert(`Esta pareja ya está registrada en ${rule.name} para el curso ${course}: ${duplicatePair.name}.`);
        renderTeamAdmin();
        renderTeamMembers();
        return;
      }
    }

    const id = editId || `EQ${String(nextTeamNumberFromLoadedTeams(adminTeams)).padStart(3, '0')}`;

    const team = normalizeTeam({
      id,
      name,
      disciplineId,
      course,
      competitionGroup: groupForCourse(course),
      members,
      goalkeeperIds,
      active
    });

    await saveTeam(team);

    const index = adminTeams.findIndex(item => item.id === id);
    if (index >= 0) adminTeams[index] = team;
    else adminTeams.push(team);

    adminTeams.sort((a, b) =>
      String(a.id).localeCompare(String(b.id), 'es', { numeric: true })
    );

    publicData.teams = [...adminTeams];
    renderTeamAdmin();
    renderMatchAdmin();
    renderPublicMatches();
    renderTeamMembers();
    closeTeamForm();
  } catch (error) {
    console.error('[INVICTUS] Error guardando equipo:', error);
    window.alert(`No fue posible guardar el equipo.\n\n${error.message}`);
  }
});

document.getElementById('teamAdminBody')?.addEventListener('click', async event => {
  const button = event.target.closest('button[data-team-action]');
  if (!button) return;

  if (!authReady || !currentUser) {
    openAuth();
    return;
  }

  if (button.dataset.teamAction === 'configure') {
    const disciplineId = button.dataset.discipline || '';
    const course = button.dataset.course || '';
    openTeamForm({ disciplineId, course, name: '', __configureTraditional: true });
    return;
  }

  const team = adminTeams.find(item => item.id === button.dataset.id);
  if (!team) return;

  if (button.dataset.teamAction === 'edit') {
    openTeamForm(team);
    return;
  }

  if (button.dataset.teamAction === 'delete') {
    if (!window.confirm(`¿Eliminar el equipo "${team.name}"?`)) return;

    try {
      await deleteTeam(team.id);
      adminTeams = adminTeams.filter(item => item.id !== team.id);
      publicData.teams = [...adminTeams];
      renderTeamAdmin();
      renderMatchAdmin();
      renderPublicMatches();
    } catch (error) {
      console.error('[INVICTUS] Error eliminando equipo:', error);
      window.alert(`No fue posible eliminar el equipo.\n\n${error.message}`);
    }
  }
});




/* ---------------- PARTIDOS / RESULTADOS ---------------- */
let adminMatches = [];
let editingMatchId = null;
let pendingDrawMatches = [];



function renderPublicMatches() {
  const list = document.getElementById('publicMatchesList');
  if (!list) return;

  const disciplineFilter = document.getElementById('publicMatchDisciplineFilter')?.value || '';
  const statusFilter = document.getElementById('publicMatchStatusFilter')?.value || '';

  const matches = (publicData.matches || [])
    .map(normalizeMatch)
    .filter(m => !disciplineFilter || m.disciplineId === disciplineFilter)
    .filter(m => !statusFilter || m.status === statusFilter)
    .sort((a,b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  const all = (publicData.matches || []).map(normalizeMatch);
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  };

  setText('publicMatchesTotal', all.length);
  setText('publicMatchesPending', all.filter(m => m.status === 'Por programar').length);
  setText('publicMatchesScheduled', all.filter(m => m.status === 'Programado').length);
  setText('publicMatchesFinished', all.filter(m => m.status === 'Finalizado').length);

  const ds = document.getElementById('publicMatchDisciplineFilter');
  if (ds) {
    const old = ds.value;
    ds.innerHTML = '<option value="">Todas las disciplinas</option>' +
      effectiveDisciplines()
        .map(d => `<option value="${escapeHtml(d.id)}">${escapeHtml(d.name)}</option>`)
        .join('');
    if ([...ds.options].some(o => o.value === old)) ds.value = old;
  }

  if (!matches.length) {
    list.innerHTML = all.length
      ? '<div class="empty">No hay partidos que coincidan con los filtros.</div>'
      : '<div class="empty">Aún no hay partidos registrados. Cuando realices un sorteo o programes un partido, aparecerá aquí.</div>';
    return;
  }

  list.innerHTML = matches.map(m => {
    const discipline = disciplineById(m.disciplineId)?.name || m.disciplineId || '—';
    const a = matchParticipantName(m.teamAId);
    const b = matchParticipantName(m.teamBId);
    const hasScore = m.scoreA !== null && m.scoreB !== null;
    const schedule = m.date ? `${m.date}${m.time ? ` · ${m.time}` : ''}` : 'Fecha por definir';
    return `<article class="public-match-card">
      <div class="public-match-card-head">
        <span>${escapeHtml(discipline)}</span>
        <span>${escapeHtml(m.status)}</span>
      </div>
      <div class="public-match-teams">
        <strong>${escapeHtml(a)}</strong>
        <div class="public-match-score">${hasScore ? `<b>${m.scoreA}</b><span>VS</span><b>${m.scoreB}</b>` : '<span class="score-pending">VS</span>'}</div>
        <strong>${escapeHtml(b)}</strong>
      </div>
      <div class="public-match-meta">${escapeHtml(m.competitionGroup || 'Videojuegos')}${m.round ? ` · ${escapeHtml(m.round)}` : ''} · ${escapeHtml(schedule)}</div>
      ${hasScore && disciplineStatKind(disciplineById(m.disciplineId)) === 'football' ? `<div class="public-match-goals-block"><div class="public-match-goals-title">GOLES DEL PARTIDO</div>${renderGoalEventsPublic(m)}</div>` : ''}
    </article>`;
  }).join('');
}

function normalizeMatch(match) {
  return {
    id: String(match?.id || '').trim().toUpperCase(),
    disciplineId: String(match?.disciplineId || '').trim().toUpperCase(),
    competitionGroup: String(match?.competitionGroup || '').trim(),
    tournamentGroup: String(match?.tournamentGroup || '').trim(),
    date: String(match?.date || ''),
    time: String(match?.time || ''),
    durationMinutes: Number(match?.durationMinutes) > 0 ? Number(match.durationMinutes) : 60,
    venue: String(match?.venue || '').trim(),
    participantType: String(match?.participantType || '').trim(),
    round: String(match?.round || '').trim(),
    teamAId: String(match?.teamAId || '').trim().toUpperCase(),
    teamBId: String(match?.teamBId || '').trim().toUpperCase(),
    status: match?.status || 'Por programar',
    scoreA: match?.scoreA === null || match?.scoreA === undefined || match?.scoreA === '' ? null : Number(match.scoreA),
    scoreB: match?.scoreB === null || match?.scoreB === undefined || match?.scoreB === '' ? null : Number(match.scoreB),
    events: Array.isArray(match?.events) ? match.events.map(e => ({
      ...e,
      playerId: e?.playerId ? String(e.playerId).trim().toUpperCase() : null,
      participantId: e?.participantId ? String(e.participantId).trim().toUpperCase() : null,
      type: String(e?.type || ''),
      value: Math.max(0, Number(e?.value || 0))
    })) : []
  };
}

function footballGoals(match) {
  return Array.isArray(match?.events) ? match.events.filter(e => e?.type === 'goal' && e?.playerId) : [];
}

function matchParticipantName(id) {
  const raw=String(id||'').trim();
  if(raw.startsWith('PAIR:')) {
    const memberIds=raw.slice(5).split('+').filter(Boolean);
    const names=memberIds.map(memberId=>{
      const player=adminStudents.find(p=>normalizeLookup(p.id)===normalizeLookup(memberId)) || publicData.players.find(p=>normalizeLookup(p.id)===normalizeLookup(memberId));
      return player?.fullName || memberId;
    });
    return names.join(' + ') || raw;
  }
  const key = normalizeLookup(id);
  // En Administración puede existir una versión más reciente de los equipos
  // que la copia cargada inicialmente en publicData. Preferimos esa fuente
  // para que, después de crear/editar/eliminar un equipo, los partidos no
  // muestren nombres antiguos durante la misma sesión.
  const team = adminTeams.find(t => normalizeLookup(t.id) === key)
    || publicData.teams.find(t => normalizeLookup(t.id) === key);
  if (team?.name) return team.name;
  const adminPlayer = adminStudents.find(p => normalizeLookup(p.id) === key);
  if (adminPlayer?.fullName) return adminPlayer.fullName;
  const player = publicData.players.find(p => normalizeLookup(p.id) === key);
  return player?.fullName || id || '—';
}

function renderGoalEventsPublic(match) {
  const discipline = disciplineById(match.disciplineId);
  if (disciplineStatKind(discipline) !== 'football') return '';
  const goals = footballGoals(match);
  if (!goals.length) return '<div class="public-match-goals-empty">Sin goles registrados</div>';
  return `<div class="public-match-goals">${goals.map(goal => {
    const player = publicPlayerName(goal.playerId);
    const team = matchParticipantName(goal.participantId) || '';
    return `<div class="public-match-goal-row"><span class="goal-ball">⚽</span><strong>${escapeHtml(player)}</strong>${team ? `<small>(${escapeHtml(team)})</small>` : ''}</div>`;
  }).join('')}</div>`;
}

function renderMatchAdmin() {
  const body = document.getElementById('matchAdminBody');
  if (!body) return;
  const rows = [...adminMatches].sort((a,b) => `${a.competitionGroup} ${a.id}`.localeCompare(`${b.competitionGroup} ${b.id}`, 'es'));
  if (!rows.length) { body.innerHTML = '<tr><td colspan="8" class="empty">No hay partidos registrados todavía.</td></tr>'; return; }
  body.innerHTML = rows.map(m => `<tr>
    <td><strong>${escapeHtml(m.id)}</strong></td>
    <td>${escapeHtml(disciplineById(m.disciplineId)?.name || m.disciplineId)}</td>
    <td>${escapeHtml(m.competitionGroup || 'Videojuegos')}${m.round ? `<br><small>${escapeHtml(m.round)}</small>` : ''}</td>
    <td>${escapeHtml(matchParticipantName(m.teamAId))} <strong>vs</strong> ${escapeHtml(matchParticipantName(m.teamBId))}</td>
    <td>${escapeHtml(m.date || 'Por definir')}</td>
    <td>${escapeHtml(m.status)}</td>
    <td>${m.scoreA ?? '—'} · ${m.scoreB ?? '—'}</td>
    <td><div class="student-actions"><button class="student-action" data-match-action="schedule" data-id="${escapeHtml(m.id)}">${m.date ? 'Cambiar fecha' : 'Asignar fecha'}</button><button class="student-action" data-match-action="result" data-id="${escapeHtml(m.id)}">${m.status === 'Finalizado' ? 'Editar resultado' : 'Registrar resultado'}</button><button class="student-action" data-match-action="edit" data-id="${escapeHtml(m.id)}">Editar</button><button class="student-action delete" data-match-action="delete" data-id="${escapeHtml(m.id)}">Eliminar</button></div></td>
  </tr>`).join('');
}

function getMatchDisciplines() {
  return effectiveDisciplines();
}

function getMatchGroups(disciplineId = '') {
  const discipline = disciplineById(disciplineId);
  if (isVideoGame(discipline)) return ['Videojuegos'];
  return [...new Set(adminTeams
    .filter(t => t.active !== false && sameDiscipline(t.disciplineId, disciplineId))
    .map(t => t.competitionGroup || groupForCourse(t.course || inferTeamCourse(t)))
    .filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
}

function studentRegisteredInDiscipline(student, disciplineId) {
  if (!disciplineId) return true;
  const targetKey = canonicalDisciplineId(disciplineId);
  const registered = Array.isArray(student?.sports) ? student.sports : [];
  return registered.some(id => canonicalDisciplineId(id) === targetKey);
}

function getVideoGameParticipants(disciplineId, group = '') {
  // En videojuegos cada participante del torneo es una pareja/equipo.
  // No se sortean estudiantes sueltos y no se mezclan participantes que no
  // hayan sido inscritos en la disciplina.
  return adminTeams
    .filter(t => t.active !== false)
    .filter(t => canonicalDisciplineId(t.disciplineId) === canonicalDisciplineId(disciplineId))
    .filter(t => !group || String(t.competitionGroup || '').trim() === group)
    .filter(t => (t.members || []).length === 2)
    .map(t => ({ id: t.id, name: t.name, kind: 'team', competitionGroup: t.competitionGroup || group, course: t.course || inferTeamCourse(t) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

function getMatchParticipants(disciplineId = '', group = '') {
  const discipline = disciplineById(disciplineId);
  if (isVideoGame(discipline)) return getVideoGameParticipants(disciplineId, group);

  const mode = String(discipline?.mode || '').toLowerCase();

  if (mode.includes('individual') || mode.includes('pareja')) {
    return adminStudents
      .filter(s => s.active !== false)
      .filter(s => studentRegisteredInDiscipline(s, disciplineId))
      .filter(s => !group || String(s.competitionGroup || '').trim() === group)
      .map(s => ({ id: s.id, name: `${s.fullName || `${s.firstName || ''} ${s.lastName || ''}`.trim()}`.trim(), kind: 'player' }))
      .sort((a,b) => a.name.localeCompare(b.name, 'es'));
  }

  return adminTeams
    .filter(t => t.active !== false)
    .filter(t => !disciplineId || sameDiscipline(t.disciplineId, disciplineId))
    .filter(t => !group || t.competitionGroup === group)
    .map(t => ({ id: t.id, name: t.name, kind: 'team' }))
    .sort((a,b) => a.name.localeCompare(b.name, 'es'));
}

function disciplineStatKind(discipline) {
  const name = normalizeLookup(discipline?.name || '');
  if (isVideoGame(discipline)) return 'videogame';
  if (/futbol|fútbol|soccer/.test(name)) return 'football';
  if (/baloncesto|basket/.test(name)) return 'basketball';
  if (/voleibol|volleyball/.test(name)) return 'volleyball';
  return 'generic';
}

function getMatchStatPlayers(disciplineId, group, teamAId, teamBId) {
  const discipline = disciplineById(disciplineId);
  if (disciplineStatKind(discipline) === 'videogame') return { kind: 'videogame', teams: [] };
  const teams = [
    adminTeams.find(t => normalizeLookup(t.id) === normalizeLookup(teamAId)),
    adminTeams.find(t => normalizeLookup(t.id) === normalizeLookup(teamBId))
  ].filter(Boolean);
  const players = teams.map((team, index) => ({
    side: index === 0 ? 'A' : 'B',
    team,
    players: (team.members || []).map(id => adminStudents.find(s => normalizeLookup(s.id) === normalizeLookup(id))).filter(Boolean)
  }));
  return { kind: disciplineStatKind(discipline), teams: players };
}

function populateMatchForm(match = null) {
  const ds = document.getElementById('matchDiscipline');
  const gs = document.getElementById('matchGroup');
  const ta = document.getElementById('matchTeamA');
  const tb = document.getElementById('matchTeamB');
  if (!ds || !gs || !ta || !tb) return;

  const disciplines = getMatchDisciplines();
  ds.innerHTML = '<option value="">Seleccionar disciplina</option>' +
    disciplines.map(d => `<option value="${escapeHtml(d.id)}">${escapeHtml(d.name)}${isVideoGame(d) ? ' · Videojuego' : ''}</option>`).join('');

  document.getElementById('matchEditId').value = match?.id || '';
  ds.value = match?.disciplineId || '';
  refreshMatchGroups(match?.competitionGroup || '');
  refreshMatchParticipants();
  ta.value = match?.teamAId || '';
  tb.value = match?.teamBId || '';
}

function refreshMatchGroups(preferredGroup = '') {
  const d = document.getElementById('matchDiscipline')?.value || '';
  const gs = document.getElementById('matchGroup');
  if (!gs) return;
  const groups = getMatchGroups(d);
  gs.innerHTML = '<option value="">Seleccionar grupo</option>' + groups.map(x => `<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join('');
  if (groups.includes(preferredGroup)) gs.value = preferredGroup;
}

function openMatchForm(match = null) {
  if (!currentUser) { openAuth(); return; }
  populateMatchForm(match); editingMatchId = match?.id || null;
  document.getElementById('matchModalTitle').textContent = match ? 'Editar partido' : 'Crear partido';
  document.getElementById('matchModal')?.classList.add('open');
}
function closeMatchForm() { document.getElementById('matchModal')?.classList.remove('open'); }

function calendarWeekdayForDiscipline(discipline) {
  const rule = tournamentDisciplineFor(discipline);
  if (!rule?.calendarDay) return null;
  return {Lunes:1, Martes:2, Miércoles:3, Jueves:4, Viernes:5}[rule.calendarDay] || null;
}

function formatLocalDate(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function nextDateForWeekday(startDate, weekday) {
  const d=new Date(`${startDate}T12:00:00`);
  const delta=(weekday-d.getDay()+7)%7; d.setDate(d.getDate()+delta); return formatLocalDate(d);
}

function calendarRuleLabel(discipline) {
  const day=calendarWeekdayForDiscipline(discipline);
  return {1:'lunes',2:'martes',3:'miércoles',4:'jueves',5:'viernes'}[day] || 'día permitido';
}

function openScheduleMatchForm(match) {
  if (!currentUser) { openAuth(); return; }
  const modal = document.getElementById('scheduleMatchModal');
  if (!modal || !match) return;
  document.getElementById('scheduleMatchId').value = match.id;
  document.getElementById('scheduleMatchDate').value = match.date || '';
  document.getElementById('scheduleMatchLabel').textContent = `${matchParticipantName(match.teamAId)} vs ${matchParticipantName(match.teamBId)} · ${disciplineById(match.disciplineId)?.name || match.disciplineId}`;
  modal.classList.add('open');
}
function closeScheduleMatchForm() { document.getElementById('scheduleMatchModal')?.classList.remove('open'); }

function refreshMatchParticipants() {
  const d = document.getElementById('matchDiscipline')?.value || '';
  const g = document.getElementById('matchGroup')?.value || '';
  const ta = document.getElementById('matchTeamA');
  const tb = document.getElementById('matchTeamB');
  if (!ta || !tb) return;
  const participants = getMatchParticipants(d, g);
  const placeholder = participants.length ? 'Seleccionar participante' : (d ? 'No hay participantes disponibles' : 'Seleccionar disciplina primero');
  const html = `<option value="">${placeholder}</option>` + participants.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join('');
  [ta, tb].forEach(el => {
    const old = el.value;
    el.innerHTML = html;
    if (participants.some(p => p.id === old)) el.value = old;
  });
}

function getDrawCandidates(disciplineId, group = '') {
  const discipline = disciplineById(disciplineId);
  if (isVideoGame(discipline)) return getVideoGameParticipants(disciplineId, group);
  return adminTeams
    .filter(t => t.active !== false)
    .filter(t => canonicalDisciplineId(t.disciplineId) === canonicalDisciplineId(disciplineId))
    .filter(t => !group || String(t.competitionGroup || '').trim() === group)
    .map(t => ({ id: t.id, name: t.name, kind: 'team', competitionGroup: t.competitionGroup, course: t.course || inferTeamCourse(t) }));
}

function getDrawCompetitionGroups(disciplineId) {
  return [...new Set(getDrawCandidates(disciplineId, '').map(item => String(item.competitionGroup || '').trim()).filter(Boolean))]
    .sort((a,b) => a.localeCompare(b, 'es'));
}

function buildDrawMatchesForCompetitionGroup(disciplineId, competitionGroup) {
  const discipline = disciplineById(disciplineId);
  const candidates = getDrawCandidates(disciplineId, competitionGroup);
  if (candidates.length < 2) return { groups: [], matches: [] };

  const stage = generateRoundRobinStage(candidates, tournamentDisciplineFor(discipline));
  const pseudoGroup = { id: 'Único', participants: candidates, competitionGroup, disciplineId };
  return {
    groups: [pseudoGroup],
    matches: stage.matches.map(match => ({
      disciplineId,
      competitionGroup,
      tournamentGroup: 'Único',
      date: '', time: '', durationMinutes: 60,
      teamAId: match.a.id, teamBId: match.b.id,
      participantType: match.a.kind,
      status: 'Por programar', scoreA: null, scoreB: null,
      events: [], phase: 'Clasificación', round: `Jornada ${match.round}`
    }))
  };
}

function buildAutomaticDraw(disciplineId) {
  const discipline = disciplineById(disciplineId);
  const result = { groups: [], matches: [] };
  getDrawCompetitionGroups(disciplineId).forEach(category => {
    const stage = buildDrawMatchesForCompetitionGroup(disciplineId, category);
    result.groups.push(...stage.groups);
    result.matches.push(...stage.matches);
  });
  return result;
}

async function loadAdminMatches() {
  try { adminMatches = (await getMatches()).map(normalizeMatch); renderMatchAdmin(); console.log(`[INVICTUS] Partidos cargados: ${adminMatches.length}.`); }
  catch(error){ console.error('[INVICTUS] Error cargando partidos:',error); const b=document.getElementById('matchAdminBody'); if(b)b.innerHTML=`<tr><td colspan="7" class="empty">No fue posible leer partidos.<br><small>${escapeHtml(error.message)}</small></td></tr>`; }
}

let resultEditingMatchId = null;
let resultGoalEvents = [];

function resultDisciplineKind() {
  const match = adminMatches.find(m => normalizeLookup(m.id) === normalizeLookup(resultEditingMatchId));
  return match ? disciplineStatKind(disciplineById(match.disciplineId)) : 'generic';
}

function resultTeams() {
  const match = adminMatches.find(m => normalizeLookup(m.id) === normalizeLookup(resultEditingMatchId));
  if (!match) return [];
  return [{ side:'A', id:match.teamAId, name:matchParticipantName(match.teamAId) }, { side:'B', id:match.teamBId, name:matchParticipantName(match.teamBId) }];
}

function resultTeamPlayers(side) {
  const team = resultTeams().find(t => t.side === side);
  if (!team) return [];
  const adminTeam = adminTeams.find(t => normalizeLookup(t.id) === normalizeLookup(team.id));
  if (adminTeam) return (adminTeam.members || []).map(id => adminStudents.find(s => normalizeLookup(s.id) === normalizeLookup(id))).filter(Boolean);
  const player = adminStudents.find(s => normalizeLookup(s.id) === normalizeLookup(team.id));
  return player ? [player] : [];
}

function refreshResultGoalPlayers() {
  const teamSelect = document.getElementById('resultGoalTeam');
  const playerSelect = document.getElementById('resultGoalPlayer');
  if (!teamSelect || !playerSelect) return;
  const players = resultTeamPlayers(teamSelect.value);
  playerSelect.innerHTML = '<option value="">Seleccionar goleador</option>' + players.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.fullName || p.name || p.id)}</option>`).join('');
}

function renderResultGoals() {
  const list = document.getElementById('resultGoalsList');
  const count = document.getElementById('resultGoalsCount');
  if (!list) return;
  if (count) count.textContent = `${resultGoalEvents.length} ${resultGoalEvents.length === 1 ? 'anotación' : 'anotaciones'}`;
  if (!resultGoalEvents.length) { list.innerHTML = '<div class="modal-empty-state">Sin goles registrados. Agrega cada anotación con el jugador correspondiente.</div>'; return; }
  list.innerHTML = resultGoalEvents.map(goal => {
    const team = resultTeams().find(t => normalizeLookup(t.id) === normalizeLookup(goal.participantId));
    return `<div class="result-goal-row"><span class="goal-ball">⚽</span><div><strong>${escapeHtml(publicPlayerName(goal.playerId))}</strong><small>(${escapeHtml(team?.name || matchParticipantName(goal.participantId))})</small></div><button type="button" class="goal-remove" data-goal-remove="${escapeHtml(goal.id)}" aria-label="Eliminar gol">×</button></div>`;
  }).join('');
}

function renderResultPlayerStats(match) {
  const wrap = document.getElementById('resultPlayerStatsEditor');
  const body = document.getElementById('resultPlayerStatsBody');
  const hint = document.getElementById('resultPlayerStatsHint');
  if (!wrap || !body || !hint) return;
  const kind = disciplineStatKind(disciplineById(match.disciplineId));
  if (!['basketball','volleyball'].includes(kind)) { wrap.hidden = true; body.innerHTML = ''; return; }
  wrap.hidden = false;
  hint.textContent = 'Registra los puntos realizados por cada jugador.';
  const existing = Array.isArray(match.events) ? match.events : [];
  const teams = getMatchStatPlayers(match.disciplineId, match.competitionGroup, match.teamAId, match.teamBId).teams;
  body.innerHTML = teams.map(({side, team, players}) => `<div class="match-player-team"><div class="match-player-team-title">Equipo ${side} · ${escapeHtml(team.name || team.id)}</div><div class="match-player-grid">${players.map(player => {
    const value = existing.filter(e => normalizeLookup(e.playerId) === normalizeLookup(player.id) && e.type === 'points').reduce((sum,e)=>sum+Number(e.value||0),0);
    return `<label class="match-player-stat-row"><span>${escapeHtml(player.fullName || player.id)}</span><input type="number" min="0" step="1" value="${value}" data-result-player-stat="${escapeHtml(player.id)}"></label>`;
  }).join('')}</div></div>`).join('');
}

function collectResultEvents(existingEvents, match) {
  const nonGoal = existingEvents.filter(e => e.type !== 'goal' && e.type !== 'points');
  const kind = disciplineStatKind(disciplineById(match.disciplineId));
  if (kind === 'football') return [...nonGoal, ...resultGoalEvents];
  if (kind === 'basketball' || kind === 'volleyball') {
    const inputs = [...document.querySelectorAll('[data-result-player-stat]')];
    const points = inputs.map(input => ({ id:crypto.randomUUID(), type:'points', participantId:null, playerId:input.dataset.resultPlayerStat, value:Math.max(0,Number(input.value||0)), minute:null, note:'', createdAt:new Date().toISOString() })).filter(e=>e.value>0);
    return [...nonGoal, ...points];
  }
  return existingEvents;
}

function openResultForm(match) {
  if (!currentUser) { openAuth(); return; }
  resultEditingMatchId = match.id;
  resultGoalEvents = footballGoals(match).map(e => ({...e}));
  document.getElementById('resultMatchId').value = match.id;
  document.getElementById('resultMatchLabel').textContent = `${disciplineById(match.disciplineId)?.name || match.disciplineId} · ${match.competitionGroup || 'Sin grupo'}`;
  document.getElementById('resultTeamAName').textContent = matchParticipantName(match.teamAId);
  document.getElementById('resultTeamBName').textContent = matchParticipantName(match.teamBId);
  document.getElementById('resultScoreA').value = match.scoreA ?? 0;
  document.getElementById('resultScoreB').value = match.scoreB ?? 0;
  const kind = disciplineStatKind(disciplineById(match.disciplineId));
  document.getElementById('footballGoalEditor').hidden = kind !== 'football';
  refreshResultGoalPlayers();
  renderResultGoals();
  renderResultPlayerStats(match);
  document.getElementById('resultModal')?.classList.add('open');
}
function closeResultForm() { document.getElementById('resultModal')?.classList.remove('open'); resultEditingMatchId = null; resultGoalEvents = []; }

document.getElementById('btnAddMatch')?.addEventListener('click', () => openMatchForm());
document.getElementById('matchModalClose')?.addEventListener('click', closeMatchForm);
document.getElementById('matchCancel')?.addEventListener('click', closeMatchForm);
document.getElementById('matchDiscipline')?.addEventListener('change', () => { refreshMatchGroups(); refreshMatchParticipants(); });
document.getElementById('matchGroup')?.addEventListener('change', refreshMatchParticipants);

document.getElementById('resultModalClose')?.addEventListener('click', closeResultForm);
document.getElementById('resultCancel')?.addEventListener('click', closeResultForm);
document.getElementById('resultGoalTeam')?.addEventListener('change', refreshResultGoalPlayers);
document.getElementById('resultAddGoal')?.addEventListener('click', () => {
  const team = document.getElementById('resultGoalTeam')?.value || 'A';
  const playerId = document.getElementById('resultGoalPlayer')?.value || '';
  if (!playerId) { window.alert('Selecciona el jugador que hizo el gol.'); return; }
  const duplicate = false;
  resultGoalEvents.push({ id:crypto.randomUUID(), type:'goal', participantId:resultTeams().find(t=>t.side===team)?.id || null, playerId, value:1, minute:null, note:'', createdAt:new Date().toISOString() });
  renderResultGoals();
  document.getElementById('resultGoalPlayer').value = '';
});
document.getElementById('resultGoalsList')?.addEventListener('click', event => {
  const btn = event.target.closest('[data-goal-remove]');
  if (!btn) return;
  resultGoalEvents = resultGoalEvents.filter(g => g.id !== btn.dataset.goalRemove);
  renderResultGoals();
});

document.getElementById('drawMatchesClose')?.addEventListener('click', () => document.getElementById('drawMatchesModal')?.classList.remove('open'));
document.getElementById('drawMatchesCancel')?.addEventListener('click', () => document.getElementById('drawMatchesModal')?.classList.remove('open'));

document.getElementById('drawDiscipline')?.addEventListener('change', event => {
  const disciplineId=event.target.value; const preview=document.getElementById('drawPreview'); pendingDrawMatches=[];
  if(!preview) return;
  if(!disciplineId){preview.innerHTML='<div class="empty">Selecciona una disciplina para generar una propuesta de competición.</div>';return;}
  const stage=buildAutomaticDraw(disciplineId); pendingDrawMatches=stage.matches;
  if(!stage.groups.length || !pendingDrawMatches.length){preview.innerHTML=`<div class="empty">${escapeHtml(stage.reason || 'No hay suficientes participantes para generar la competición.')}</div>`;return;}
  const discipline=disciplineById(disciplineId); const isVideo=isVideoGame(discipline);
  const cards=stage.groups.map(group=>{
    const pairs=pendingDrawMatches.filter(m=>m.competitionGroup===group.competitionGroup);
    const rounds=[...new Set(pairs.map(m=>m.round))].sort((a,b)=>Number(a.replace(/\D/g,''))-Number(b.replace(/\D/g,'')));
    const roundsHtml=rounds.map(round=>`<div class="draw-round-block"><strong>${escapeHtml(round)}</strong>${pairs.filter(m=>m.round===round).map((m,i)=>`<div class="draw-pair-row"><span>${i+1}</span><strong>${escapeHtml(matchParticipantName(m.teamAId))}</strong><b>VS</b><strong>${escapeHtml(matchParticipantName(m.teamBId))}</strong></div>`).join('')}</div>`).join('');
    const label=isVideo?'Parejas':(group.competitionGroup || 'Categoría');
    return `<div class="draw-group-card"><div class="draw-group-card-head"><strong>${escapeHtml(label)}</strong><small>${group.participants.length} participante${group.participants.length===1?'':'s'} · ida y vuelta</small></div>${roundsHtml}</div>`;
  }).join('');
  const totalRounds=[...new Set(pendingDrawMatches.map(m=>`${m.competitionGroup}|${m.round}`))].length;
  const note=isVideo ? 'Los jugadores inscritos se mezclan aleatoriamente y se forman parejas. Las parejas se mantienen durante el torneo y juegan ida y vuelta.' : 'Existe un solo equipo por curso dentro de cada categoría. No se crean grupos internos; los equipos de la categoría juegan ida y vuelta.';
  preview.innerHTML=`<div class="draw-groups-summary"><strong>${escapeHtml(discipline?.name||disciplineId)}</strong><span>${stage.groups.length} categoría${stage.groups.length===1?'':'s'} · ${pendingDrawMatches.length} partidos · ${totalRounds} jornadas</span></div>${cards}<div class="draw-auto-note"><strong>Regla aplicada:</strong> ${note}</div>`;
});

document.getElementById('btnDrawMatches')?.addEventListener('click', () => {
  if (!currentUser) { openAuth(); return; }
  populateDrawForm();
  document.getElementById('drawMatchesModal')?.classList.add('open');
});

document.getElementById('drawMatchesRun')?.addEventListener('click', async () => {
  if (!currentUser) { openAuth(); return; }
  const disciplineId = document.getElementById('drawDiscipline')?.value || '';
  if (!disciplineId) { window.alert('Selecciona una disciplina para realizar el sorteo.'); return; }
  const generated = pendingDrawMatches.length ? { matches: pendingDrawMatches } : buildAutomaticDraw(disciplineId);
  const matches = generated.matches;
  const existingStage = adminMatches.some(m => canonicalDisciplineId(m.disciplineId) === canonicalDisciplineId(disciplineId) && m.phase === 'Clasificación');
  if (!matches.length) { window.alert('No hay suficientes participantes para generar la fase de clasificación.'); return; }
  if (existingStage) { window.alert('Ya existe una fase de clasificación para esta disciplina. Elimina o corrige los partidos existentes antes de volver a generar el sorteo.'); return; }
  const groups = [...new Set(matches.map(m => m.competitionGroup || 'Videojuegos'))];
  const detail = groups.map(group => {
    const groupMatches = matches.filter(m => (m.competitionGroup || 'Videojuegos') === group).length;
    return `${group}: ${groupMatches} partido${groupMatches === 1 ? '' : 's'}`;
  }).join('\n');
  if (!window.confirm(`Se guardará la fase de clasificación propuesta para ${disciplineById(disciplineId)?.name || disciplineId}.\n\n${detail}\n\nSe generarán todos los enfrentamientos de la fase. Fútbol tendrá ida y vuelta; las demás disciplinas tendrán una sola vuelta. Los partidos quedarán "Por programar" y sin fecha. ¿Continuar?`)) return;
  const button = document.getElementById('drawMatchesRun'); button.disabled=true; button.textContent='Guardando...';
  try {
    const saved=[];
    for(const draft of matches){
      const id=`PAR-${Date.now()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
      saved.push(normalizeMatch(await saveMatch({...draft,id})));
    }
    adminMatches.push(...saved);
    publicData.matches=adminMatches;
    renderMatchAdmin(); renderStandings(); renderPublicMatches(); renderPlayers();
    pendingDrawMatches = [];
    document.getElementById('drawMatchesModal')?.classList.remove('open');
    window.alert(`Sorteo realizado. Se crearon ${saved.length} enfrentamientos en ${groups.length} categoría${groups.length === 1 ? '' : 's'}.`);
  } catch(error){
    console.error('[INVICTUS] Error guardando sorteo:',error);
    window.alert(`No fue posible guardar el sorteo.\n\n${error.message}`);
  } finally {
    button.disabled=false; button.textContent='Sortear y guardar';
  }
});

function buildAutomaticCalendarAssignments(matches, startDate) {
  const assignments=[];
  const slots=new Map();
  const sorted=[...matches].sort((a,b)=>`${a.disciplineId}|${a.competitionGroup}|${a.round}|${a.id}`.localeCompare(`${b.disciplineId}|${b.competitionGroup}|${b.round}|${b.id}`,'es'));
  const weekdayName={1:'Lunes',2:'Martes',3:'Miércoles',4:'Jueves',5:'Viernes'};
  for(const match of sorted) {
    const discipline=disciplineById(match.disciplineId);
    const weekday=calendarWeekdayForDiscipline(discipline);
    if(!weekday) continue;
    let cursor=nextDateForWeekday(startDate,weekday);
    let guard=0;
    while(guard++<500) {
      const key=`${match.disciplineId}|${cursor}`;
      const dayMatches=slots.get(key)||[];
      const category=match.competitionGroup||'';
      const allowed=weekday===3 ? dayMatches.length===0 : [1,5].includes(weekday) ? !dayMatches.some(m=>(m.competitionGroup||'')===category) : dayMatches.length<1;
      if(allowed) break;
      const d=new Date(`${cursor}T12:00:00`); d.setDate(d.getDate()+7); cursor=formatLocalDate(d);
    }
    const key=`${match.disciplineId}|${cursor}`;
    const arr=slots.get(key)||[]; arr.push(match); slots.set(key,arr);
    assignments.push({id:match.id,date:cursor,weekday:weekdayName[weekday]});
  }
  return assignments;
}

function renderCalendarPreview() {
  const start=document.getElementById('calendarStartDate')?.value;
  const preview=document.getElementById('calendarPreview');
  if(!preview||!start) return;
  const pending=adminMatches.filter(m=>!m.date && m.phase==='Clasificación');
  if(!pending.length) { preview.innerHTML='<div class="empty">No hay partidos de clasificación pendientes de programación.</div>'; return; }
  const assignments=buildAutomaticCalendarAssignments(pending,start);
  const byDate={}; assignments.forEach(a=>(byDate[a.date]??=[]).push(a));
  preview.innerHTML=Object.entries(byDate).map(([date,items])=>`<div class="draw-group-card"><div class="draw-group-card-head"><strong>${escapeHtml(date)}</strong><small>${items.length} partido${items.length===1?'':'s'}</small></div>${items.map(a=>{const m=adminMatches.find(x=>x.id===a.id);return `<div class="draw-pair-row"><span>${escapeHtml(a.weekday)}</span><strong>${escapeHtml(matchParticipantName(m.teamAId))}</strong><b>VS</b><strong>${escapeHtml(matchParticipantName(m.teamBId))}</strong></div>`}).join('')}</div>`).join('');
}

document.getElementById('btnScheduleCalendar')?.addEventListener('click',()=>{
  if(!currentUser){openAuth();return;}
  const modal=document.getElementById('calendarModal'); if(!modal)return;
  const now=new Date(); document.getElementById('calendarStartDate').value=formatLocalDate(now);
  renderCalendarPreview(); modal.classList.add('open');
});
document.getElementById('calendarStartDate')?.addEventListener('change',renderCalendarPreview);
document.getElementById('calendarClose')?.addEventListener('click',()=>document.getElementById('calendarModal')?.classList.remove('open'));
document.getElementById('calendarCancel')?.addEventListener('click',()=>document.getElementById('calendarModal')?.classList.remove('open'));
document.getElementById('calendarForm')?.addEventListener('submit',async e=>{
  e.preventDefault(); if(!currentUser){openAuth();return;}
  const start=document.getElementById('calendarStartDate').value; if(!start)return;
  const pending=adminMatches.filter(m=>!m.date && m.phase==='Clasificación');
  const assignments=buildAutomaticCalendarAssignments(pending,start);
  if(!assignments.length){window.alert('No hay partidos pendientes de programación.');return;}
  const button=e.currentTarget.querySelector('button[type="submit"]'); button.disabled=true; button.textContent='Programando...';
  try {
    for(const a of assignments){ const match=adminMatches.find(m=>m.id===a.id); if(!match)continue; const saved=normalizeMatch(await saveMatch({...match,date:a.date,status:match.status==='Finalizado'?'Finalizado':'Programado'})); const i=adminMatches.findIndex(m=>m.id===saved.id); if(i>=0)adminMatches[i]=saved; }
    publicData.matches=adminMatches; renderMatchAdmin(); renderPublicMatches(); document.getElementById('calendarModal')?.classList.remove('open');
    window.alert(`Calendario programado. Se asignaron fechas a ${assignments.length} partidos.`);
  } catch(error){ console.error('[INVICTUS] Error programando calendario:',error); window.alert(`No fue posible programar el calendario.\n\n${error.message}`); }
  finally { button.disabled=false; button.textContent='Programar partidos'; }
});

document.getElementById('scheduleMatchClose')?.addEventListener('click', closeScheduleMatchForm);
document.getElementById('scheduleMatchCancel')?.addEventListener('click', closeScheduleMatchForm);
document.getElementById('scheduleMatchForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!currentUser) { openAuth(); return; }
  const id = document.getElementById('scheduleMatchId')?.value || '';
  const date = document.getElementById('scheduleMatchDate')?.value || '';
  const match = adminMatches.find(m => normalizeLookup(m.id) === normalizeLookup(id));
  if (!match || !date) return;
  const discipline=disciplineById(match.disciplineId);
  const expectedDay=calendarWeekdayForDiscipline(discipline);
  const selectedDay=new Date(`${date}T12:00:00`).getDay();
  if(expectedDay && selectedDay !== expectedDay) {
    window.alert(`Esta disciplina solo puede programarse los ${calendarRuleLabel(discipline)}.`);
    return;
  }
  const sameDay=adminMatches.filter(m=>m.id!==match.id && m.date===date && sameDiscipline(m.disciplineId,match.disciplineId));
  if(expectedDay===3 && sameDay.length>=1) {
    window.alert('El reglamento establece un solo partido de Vóleibol por fecha.');
    return;
  }
  if([1,5].includes(expectedDay)) {
    const category=match.competitionGroup || '';
    if(category && sameDay.some(m=>(m.competitionGroup||'')===category)) {
      window.alert(`Ya existe un partido de ${category} programado para esta fecha en ${discipline?.name || 'esta disciplina'}.`);
      return;
    }
  }
  try {
    const saved = normalizeMatch(await saveMatch({...match, date, status: match.status === 'Finalizado' ? 'Finalizado' : 'Programado'}));
    const index=adminMatches.findIndex(m=>m.id===saved.id);
    if(index>=0) adminMatches[index]=saved;
    publicData.matches=adminMatches;
    renderMatchAdmin(); renderPublicMatches();
    closeScheduleMatchForm();
  } catch(error) {
    console.error('[INVICTUS] Error programando partido:', error);
    window.alert(`No fue posible guardar la fecha.\n\n${error.message}`);
  }
});

document.getElementById('matchForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!currentUser) { openAuth(); return; }
  const editId = document.getElementById('matchEditId').value.trim().toUpperCase();
  const existingMatch = editId ? adminMatches.find(m => normalizeLookup(m.id) === normalizeLookup(editId)) : null;
  const participantA = document.getElementById('matchTeamA').value;
  const participantB = document.getElementById('matchTeamB').value;
  const disciplineId = document.getElementById('matchDiscipline').value;
  const competitionGroup = document.getElementById('matchGroup').value || (isVideoGame(disciplineById(disciplineId)) ? 'Videojuegos' : '');
  if (!disciplineId || !participantA || !participantB || (!competitionGroup && !isVideoGame(disciplineById(disciplineId)))) { window.alert('Completa disciplina, categoría y participantes.'); return; }
  if (isVideoGame(disciplineById(disciplineId))) { window.alert('Los videojuegos se juegan por parejas. Usa “Sortear partidos” para formar las parejas y generar los enfrentamientos.'); return; }
  if (participantA === participantB) { window.alert('Los participantes A y B deben ser diferentes.'); return; }
  const participants = getMatchParticipants(disciplineId, competitionGroup);
  const typeA = participants.find(p => p.id === participantA)?.kind || existingMatch?.participantType || 'team';
  const payload = normalizeMatch({
    ...(existingMatch || {}), id: editId || `PAR${String(Date.now()).slice(-6)}`, disciplineId, competitionGroup,
    teamAId: participantA, teamBId: participantB, participantType: typeA,
    status: existingMatch?.status || 'Por programar', scoreA: existingMatch?.scoreA ?? null, scoreB: existingMatch?.scoreB ?? null,
    events: existingMatch?.events || [], date: existingMatch?.date || '', time: existingMatch?.time || '', durationMinutes: existingMatch?.durationMinutes || 60, venue: existingMatch?.venue || ''
  });
  try {
    const saved = normalizeMatch(await saveMatch(payload));
    const index=adminMatches.findIndex(m=>m.id===saved.id); if(index>=0)adminMatches[index]=saved; else adminMatches.push(saved);
    publicData.matches=adminMatches; renderMatchAdmin(); closeMatchForm(); renderStandings(); renderPublicMatches(); renderPlayers();
  } catch(error){ console.error('[INVICTUS] Error guardando partido:',error); window.alert(`No fue posible guardar el partido.\n\n${error.message}`); }
});

document.getElementById('resultForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!currentUser) { openAuth(); return; }
  const match = adminMatches.find(m => normalizeLookup(m.id) === normalizeLookup(resultEditingMatchId));
  if (!match) return;
  const scoreA = Math.max(0, Number(document.getElementById('resultScoreA').value || 0));
  const scoreB = Math.max(0, Number(document.getElementById('resultScoreB').value || 0));
  const payload = normalizeMatch({...match, scoreA, scoreB, status:'Finalizado', events:collectResultEvents(match.events || [], match)});
  try {
    const saved = normalizeMatch(await saveMatch(payload));
    const index=adminMatches.findIndex(m=>m.id===saved.id); if(index>=0)adminMatches[index]=saved;
    publicData.matches=adminMatches; renderMatchAdmin(); closeResultForm(); renderStandings(); renderPublicMatches(); renderPlayers();
  } catch(error){ console.error('[INVICTUS] Error guardando resultado:',error); window.alert(`No fue posible guardar el resultado.\n\n${error.message}`); }
});

document.getElementById('matchAdminBody')?.addEventListener('click', async event => {
  const button=event.target.closest('[data-match-action]'); if(!button)return;
  const match=adminMatches.find(m=>m.id===button.dataset.id); if(!match)return;
  if(button.dataset.matchAction==='schedule'){openScheduleMatchForm(match);return;}
  if(button.dataset.matchAction==='result'){openResultForm(match);return;}
  if(button.dataset.matchAction==='edit'){openMatchForm(match);return;}
  if(button.dataset.matchAction==='delete' && window.confirm(`¿Eliminar el partido ${match.id}?`)){try{await deleteMatch(match.id);adminMatches=adminMatches.filter(m=>m.id!==match.id);publicData.matches=adminMatches;renderMatchAdmin();renderStandings();renderPlayers();}catch(error){window.alert(`No fue posible eliminar el partido.\n\n${error.message}`);}}
});

function populateDrawForm() {
  const ds = document.getElementById('drawDiscipline');
  const preview = document.getElementById('drawPreview');
  if (!ds || !preview) return;
  pendingDrawMatches = [];
  const disciplines = effectiveDisciplines();
  ds.innerHTML = '<option value="">Seleccionar disciplina</option>' + disciplines.map(d => `<option value="${escapeHtml(d.id)}">${escapeHtml(d.name)}</option>`).join('');
  preview.innerHTML = '<div class="empty">Selecciona una disciplina para generar una propuesta de enfrentamientos.</div>';
}

function effectiveDisciplines() {
  return TOURNAMENT_DISCIPLINES.map(rule => ({ ...rule, active: true }));
}

function loadDisciplines() {
  // Catálogo 100% hardcodeado. No se consulta /disciplines en Firestore.
  adminDisciplines = effectiveDisciplines();
  disciplinesLoaded = true;
  renderDisciplineAdmin();
  renderDisciplineCatalog();
  renderDisciplineChecks();
  if (teamsLoaded) renderTeamAdmin();
  console.log(`[INVICTUS] Catálogo oficial hardcodeado cargado: ${TOURNAMENT_DISCIPLINES.length} disciplinas.`);
}

function renderDisciplineAdmin() {
  const body = document.getElementById('disciplineAdminBody');
  if (!body) return;

  body.innerHTML = TOURNAMENT_DISCIPLINES.map(rule => `
    <tr>
      <td>${escapeHtml(rule.name)}</td>
      <td>${escapeHtml(rule.type)}</td>
      <td>${escapeHtml(rule.mode)}</td>
      <td>${escapeHtml(rule.calendarDay)}</td>
      <td>${escapeHtml(rule.rounds === 'idaVuelta' ? 'Ida y vuelta' : 'Una vuelta')}</td>
    </tr>
  `).join('');
}


/* INVICTUS 2026 — Aplicación
 * Capa de orquestación de la interfaz.
 * Los datos del torneo provienen de Firestore.
 */

function computeRating(p){
  return playerRating(p);
}
function tierOf(rating){
  if(rating>=100) return {key:'invictus',a:'#7f5cff',b:'#ff4fd8',text:'#ffffff',label:'INVICTUS'};
  if(rating>=85) return {key:'legend',a:'#e52b2b',b:'#ff7a18',text:'#ffffff',label:'Leyenda'};
  if(rating>=70) return {key:'elite',a:'#f4b400',b:'#ffd95a',text:'#fffdf2',label:'Élite'};
  if(rating>=55) return {key:'standout',a:'#8b5cf6',b:'#c084fc',text:'#ffffff',label:'Destacado'};
  if(rating>=40) return {key:'competitor',a:'#1677ff',b:'#35c9ff',text:'#ffffff',label:'Competidor'};
  if(rating>=25) return {key:'prospect',a:'#20a45b',b:'#65e38d',text:'#ffffff',label:'Promesa'};
  return {key:'rookie',a:'#718096',b:'#b8c2d1',text:'#ffffff',label:'Novato'};
}
function ratingForPlayer(player){
  return 15 + playerRating(player);
}
function experienceProgress(experience){
  if(experience<=0) return 0;
  // Indicador visual acumulativo: crece siempre hacia la derecha sin crear niveles ni reinicios.
  return Math.min(100, Math.round((1 - Math.exp(-experience / 1800)) * 100));
}
function initials(name){ return name.split(' ').map(w=>w[0]).slice(0,2).join(''); }

/* ---------------- NAV ---------------- */
document.querySelectorAll('#mainNav button').forEach(btn => {
  btn.addEventListener('click', event => {
    if (btn.dataset.view === 'admin' && (!authReady || !currentUser)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      pendingAdminOpen = true;
      if (authReady) openAuth();
      return;
    }

    document.querySelectorAll('#mainNav button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('section.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + btn.dataset.view).classList.add('active');
    window.scrollTo({top:0,behavior:'smooth'});
  });
});

/* ---------------- INICIO: category overview ---------------- */
function renderOverview(){
  const el=document.getElementById('catOverview'); if(!el)return;

  // Las 5 categorías oficiales siempre se muestran, aunque estén vacías.
  // Un jugador cuenta aquí como PARTICIPANTE si tiene al menos una disciplina
  // inscrita en su ficha (campo sports/compatibilidad disciplines), no por el
  // simple hecho de existir en /students. Se cuenta una sola vez por categoría,
  // aunque participe en varias disciplinas.
  el.innerHTML=TOURNAMENT_CATEGORIES.map(category=>{
    const categoryKey=normalizeCategoryKey(category.name);
    const teams=publicData.teams.filter(t=>normalizeCategoryKey(t.competitionGroup)===categoryKey).length;
    const players=publicData.players.filter(p=>{
      if (normalizeCategoryKey(p.competitionGroup)!==categoryKey) return false;
      const registeredSports = Array.isArray(p.sports)
        ? p.sports
        : (Array.isArray(p.disciplines) ? p.disciplines : []);
      return registeredSports.some(Boolean);
    }).length;
    return `<div class="game-card"><div class="game-card-head"><div class="game-icon">🏆</div><h3>${escapeHtml(category.name)}</h3></div><p>${teams} equipo${teams===1?'':'s'} · ${players} jugador${players===1?'':'es'}</p></div>`;
  }).join('');
}
function renderSportTabs(){
  const el=document.getElementById('sportTabs'); if(!el)return;
  const disciplines=effectiveDisciplines();
  if(!curStandingsDiscipline && disciplines.length)curStandingsDiscipline=disciplines[0].id;
  el.innerHTML=disciplines.map(d=>`<button data-sport="${escapeHtml(d.id)}" class="${d.id===curStandingsDiscipline?'active':''}">${isVideoGame(d)?'🎮':'🏆'} ${escapeHtml(d.name)}</button>`).join('');
  el.querySelectorAll('button').forEach(b=>b.onclick=()=>{curStandingsDiscipline=b.dataset.sport;renderSportTabs();renderCatTabs();renderStandings();});
}
function groupsForDiscipline(id){
  const firestoreGroups=[...new Set(
    publicData.teams
      .filter(t => sameDiscipline(t.disciplineId, id))
      .map(t => canonicalCategoryName(t.competitionGroup))
      .filter(Boolean)
  )];

  // Para deportes, el selector conserva siempre el catálogo oficial de
  // categorías. Así no desaparecen cuando todavía no hay equipos.
  const official=TOURNAMENT_CATEGORIES.map(c=>c.name);
  const custom=firestoreGroups.filter(g=>
    !official.some(c=>normalizeCategoryKey(c)===normalizeCategoryKey(g))
  );
  return [...official,...custom].sort((a,b)=>{
    const ai=official.findIndex(c=>normalizeCategoryKey(c)===normalizeCategoryKey(a));
    const bi=official.findIndex(c=>normalizeCategoryKey(c)===normalizeCategoryKey(b));
    if(ai!==-1&&bi!==-1)return ai-bi;
    if(ai!==-1)return -1;
    if(bi!==-1)return 1;
    return a.localeCompare(b,'es');
  });
}

function renderCatTabs(){
  const el=document.getElementById('catTabs'); if(!el)return;
  const d=disciplineById(curStandingsDiscipline);
  const groups=groupsForDiscipline(curStandingsDiscipline);
  if(!groups.includes(curStandingsGroup) && !groups.some(g=>sameGroup(g,curStandingsGroup)))curStandingsGroup=groups[0]||'';
  el.innerHTML=groups.map(g=>`<button data-group="${escapeHtml(g)}" class="${sameGroup(g,curStandingsGroup)?'active':''}">${escapeHtml(g)}</button>`).join('');
  el.querySelectorAll('button').forEach(b=>b.onclick=()=>{curStandingsGroup=b.dataset.group;renderCatTabs();renderStandings();});
  if(!d)el.innerHTML='<div class="empty">No hay disciplinas registradas.</div>';
}

function teamStatsFor(disciplineId, group){
  const teams=publicData.teams.filter(t =>
    sameDiscipline(t.disciplineId, disciplineId) &&
    (!group || sameGroup(t.competitionGroup, group))
  );

  return teams.map(team=>{
    const matches=publicData.matches.filter(m =>
      m.status==='Finalizado' &&
      sameDiscipline(m.disciplineId, disciplineId) &&
      (sameGroup(m.competitionGroup, group) || !m.competitionGroup) &&
      (normalizeLookup(m.teamAId)===normalizeLookup(team.id) || normalizeLookup(m.teamBId)===normalizeLookup(team.id))
    );
    let pj=0,w=0,e=0,p=0,gf=0,gc=0,pts=0;
    matches.forEach(m=>{
      const a=normalizeLookup(m.teamAId)===normalizeLookup(team.id);
      const own=a?Number(m.scoreA):Number(m.scoreB);
      const opp=a?Number(m.scoreB):Number(m.scoreA);
      if(!Number.isFinite(own)||!Number.isFinite(opp))return;
      pj++;gf+=own;gc+=opp;
      if(own>opp){w++;pts+=3}else if(own===opp){e++;pts+=1}else p++;
    });
    return {team,id:team.id,pj,w,e,p,gf,gc,dg:gf-gc,pts};
  }).sort((a,b)=>b.pts-a.pts||b.dg-a.dg||String(a.team.name||a.id).localeCompare(String(b.team.name||b.id),'es'));
}

function renderStandings(){
  const table=document.getElementById('standingsTable');if(!table)return;
  const d=disciplineById(curStandingsDiscipline);
  if(!d){
    table.innerHTML='<tbody><tr><td class="empty">No hay disciplinas registradas en Firestore.</td></tr></tbody>';
    return;
  }

  if(isVideoGame(d)){
    const teams=publicData.teams.filter(t=>sameDiscipline(t.disciplineId,d.id)&&(!curStandingsGroup||sameGroup(t.competitionGroup,curStandingsGroup)));
    const wins={};
    teams.forEach(t=>wins[t.id]=0);
    publicData.matches
      .filter(m=>sameDiscipline(m.disciplineId,d.id)&&m.status==='Finalizado'&&(!curStandingsGroup||sameGroup(m.competitionGroup,curStandingsGroup)))
      .forEach(m=>{
        const a=Number(m.scoreA),b=Number(m.scoreB);
        if(!Number.isFinite(a)||!Number.isFinite(b))return;
        if(a>b)wins[m.teamAId]=(wins[m.teamAId]||0)+1;
        else if(b>a)wins[m.teamBId]=(wins[m.teamBId]||0)+1;
      });
    const list=Object.entries(wins)
      .map(([id,w])=>({id,w,name:publicTeamName(id)}))
      .sort((a,b)=>b.w-a.w||a.name.localeCompare(b.name,'es'));
    table.innerHTML=`<thead><tr><th>#</th><th>Participante</th><th>Victorias</th></tr></thead><tbody>${list.length?list.map((r,i)=>`<tr class="${i===0?'top1':''}"><td class="pos">${i+1}</td><td>${escapeHtml(r.name)}</td><td class="pts">${r.w}</td></tr>`).join(''):'<tr><td colspan="3" class="empty">Aún no hay participantes registrados para esta combinación.</td></tr>'}</tbody>`;
    return;
  }

  const rows=teamStatsFor(d.id,curStandingsGroup);
  const cols=['PJ','G','E','P','GF','GC','DG','Pts'];
  table.innerHTML=`<thead><tr><th>#</th><th>Equipo</th>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map((r,i)=>`<tr class="${i===0?'top1':''}"><td class="pos">${i+1}</td><td>${escapeHtml(r.team.name||r.id||'—')}</td><td>${r.pj}</td><td>${r.w}</td><td>${r.e}</td><td>${r.p}</td><td>${r.gf}</td><td>${r.gc}</td><td>${r.dg}</td><td class="pts">${r.pts}</td></tr>`).join(''):'<tr><td colspan="10" class="empty">Aún no hay equipos registrados para esta combinación.</td></tr>'}</tbody>`;
}
function fmtDate(d){const dt=new Date(`${d}T00:00:00`);return dt.toLocaleDateString('es-CO',{weekday:'long',day:'numeric',month:'long'});}
function populateFilters(){const fc=document.getElementById('filterCat');const fs=document.getElementById('filterSport');if(!fc||!fs)return;const groups=[...new Set(publicData.players.map(p=>p.competitionGroup).filter(Boolean))];fc.innerHTML='<option value="">Todos los grupos</option>'+groups.map(g=>`<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join('');fs.innerHTML='<option value="">Todas las disciplinas</option>'+effectiveDisciplines().map(d=>`<option value="${escapeHtml(d.id)}">${escapeHtml(d.name)}</option>`).join('');}
function playerStats(player){
  const stats={};
  const playerKey=normalizeLookup(player.id);
  for(const m of publicData.matches.filter(x=>x.status==='Finalizado')){
    const discipline=disciplineById(m.disciplineId);
    const kind=disciplineStatKind(discipline);
    const disciplineId=m.disciplineId;
    const teamA=publicData.teams.find(t=>normalizeLookup(t.id)===normalizeLookup(m.teamAId));
    const teamB=publicData.teams.find(t=>normalizeLookup(t.id)===normalizeLookup(m.teamBId));
    const participantTeam=teamA?.members?.map(normalizeLookup).includes(playerKey)?teamA:
      teamB?.members?.map(normalizeLookup).includes(playerKey)?teamB:null;
    if(!participantTeam)continue;
    const isA=normalizeLookup(participantTeam.id)===normalizeLookup(m.teamAId);
    const own=Number(isA?m.scoreA:m.scoreB),opp=Number(isA?m.scoreB:m.scoreA);
    if(!Number.isFinite(own)||!Number.isFinite(opp))continue;
    stats[disciplineId]??={games:0,wins:0,draws:0,losses:0,goals:0,points:0,for:0,against:0};
    const st=stats[disciplineId];
    st.games++;
    if(own>opp)st.wins++; else if(own===opp)st.draws++; else st.losses++;

    if(kind==='football'){
      st.goals += (m.events||[]).filter(e=>normalizeLookup(e.playerId)===playerKey && e.type==='goal')
        .reduce((sum,e)=>sum+Math.max(0,Number(e.value||0)),0);
    } else if(kind==='basketball' || kind==='volleyball'){
      st.points += (m.events||[]).filter(e=>normalizeLookup(e.playerId)===playerKey && e.type==='points')
        .reduce((sum,e)=>sum+Math.max(0,Number(e.value||0)),0);
    }
  }
  return stats;
}
function participantTeamForPlayer(match, playerKey) {
  const teamA = publicData.teams.find(t => normalizeLookup(t.id) === normalizeLookup(match.teamAId));
  const teamB = publicData.teams.find(t => normalizeLookup(t.id) === normalizeLookup(match.teamBId));
  const inA = teamA?.members?.some(id => normalizeLookup(id) === playerKey);
  const inB = teamB?.members?.some(id => normalizeLookup(id) === playerKey);
  if (inA) return { team: teamA, side: 'A', own: Number(match.scoreA), opp: Number(match.scoreB) };
  if (inB) return { team: teamB, side: 'B', own: Number(match.scoreB), opp: Number(match.scoreA) };
  return null;
}

function matchRatingForPlayer(match, playerKey) {
  if (match.status !== 'Finalizado') return 0;
  const discipline = disciplineById(match.disciplineId);
  const kind = disciplineStatKind(discipline);
  const participant = participantTeamForPlayer(match, playerKey);
  if (!participant || !Number.isFinite(participant.own) || !Number.isFinite(participant.opp)) return 0;
  let rating = 0;
  if (kind === 'football') {
    rating += (match.events || []).filter(e => e.type === 'goal' && normalizeLookup(e.playerId) === playerKey)
      .reduce((sum, e) => sum + Math.max(0, Number(e.value || 0)), 0);
    if (participant.own > participant.opp) rating += 2;
    const goalkeepers = (participant.team?.goalkeeperIds || []).map(normalizeLookup);
    if (participant.opp === 0 && goalkeepers.includes(playerKey)) rating += 2;
  } else if (kind === 'volleyball') {
    const points = (match.events || []).filter(e => e.type === 'points' && normalizeLookup(e.playerId) === playerKey)
      .reduce((sum, e) => sum + Math.max(0, Number(e.value || 0)), 0);
    rating += Math.floor(points / 8);
    if (participant.own > participant.opp) rating += 2;
  } else if (kind === 'basketball') {
    const points = (match.events || []).filter(e => e.type === 'points' && normalizeLookup(e.playerId) === playerKey)
      .reduce((sum, e) => sum + Math.max(0, Number(e.value || 0)), 0);
    rating += points;
    if (participant.own > participant.opp) rating += 2;
  } else if (kind === 'videogame') {
    rating += Math.max(0, Math.floor(participant.own));
  }
  return rating;
}

function matchExperienceForPlayer(match, playerKey) {
  if (match.status !== 'Finalizado') return 0;
  const participant = participantTeamForPlayer(match, playerKey);
  if (!participant) return 0;
  const result = Number.isFinite(participant.own) && Number.isFinite(participant.opp) ? participant.own - participant.opp : 0;
  return 100 + (result > 0 ? 100 : 0);
}

function playerRating(player) {
  const key = normalizeLookup(player.id);
  return publicData.matches.reduce((sum, match) => sum + matchRatingForPlayer(match, key), 0);
}

function playerExperience(player) {
  const key = normalizeLookup(player.id);
  return publicData.matches.reduce((sum, match) => sum + matchExperienceForPlayer(match, key), 0);
}

function ratingFromStats(stats, player = null){
  return player ? playerRating(player) : 0;
}
function publicPlayerMatches(player){
  const key=normalizeLookup(player.id);
  return publicData.matches.filter(m=>m.status==='Finalizado').map(m=>{
    const teamA=publicData.teams.find(t=>normalizeLookup(t.id)===normalizeLookup(m.teamAId));
    const teamB=publicData.teams.find(t=>normalizeLookup(t.id)===normalizeLookup(m.teamBId));
    const isA=teamA?.members?.map(normalizeLookup).includes(key);
    const isB=teamB?.members?.map(normalizeLookup).includes(key);
    if(!isA&&!isB)return null;
    const own=Number(isA?m.scoreA:m.scoreB),opp=Number(isA?m.scoreB:m.scoreA);
    if(!Number.isFinite(own)||!Number.isFinite(opp))return null;
    return {m,team:isA?teamA:teamB,opponent:isA?teamB:teamA,own,opp,discipline:disciplineById(m.disciplineId)};
  }).filter(Boolean).sort((a,b)=>`${b.m.date||''}${b.m.time||''}`.localeCompare(`${a.m.date||''}${a.m.time||''}`));
}
function renderPlayers(){
  const grid=document.getElementById('playerGrid');if(!grid)return;
  const q=(document.getElementById('searchPlayer')?.value||'').toLowerCase();
  const group=document.getElementById('filterCat')?.value||'';
  const discipline=document.getElementById('filterSport')?.value||'';
  const filtered=publicData.players.filter(p=>(!q||String(p.fullName||'').toLowerCase().includes(q))&&(!group||sameGroup(p.competitionGroup,group))&&(!discipline||publicData.matches.some(m=>sameDiscipline(m.disciplineId,discipline)&&m.status==='Finalizado'&&((publicData.teams.find(t=>normalizeLookup(t.id)===normalizeLookup(m.teamAId))?.members||[]).map(normalizeLookup).includes(normalizeLookup(p.id))||(publicData.teams.find(t=>normalizeLookup(t.id)===normalizeLookup(m.teamBId))?.members||[]).map(normalizeLookup).includes(normalizeLookup(p.id))))));
  if(!filtered.length){grid.innerHTML='<div class="empty">No encontramos jugadores con esos filtros.</div>';return;}
  grid.innerHTML=filtered.map(p=>{
    const stats=playerStats(p),rating=ratingForPlayer(p),experience=playerExperience(p),tier=tierOf(rating),xpProgress=experienceProgress(experience),sportRows=Object.entries(stats).map(([id,s])=>{const d=disciplineById(id),kind=disciplineStatKind(d);let metric=kind==='football'?`${s.goals}G`:kind==='basketball'||kind==='volleyball'?`${s.points}P`:'';let result=kind==='videogame'?`${s.games}PJ · ${s.wins}W · ${s.losses}L`:`${s.games}PJ · ${s.wins}G · ${s.losses}P`;return `<div class="sport-row"><div class="sport-name">${escapeHtml(d?.name||id)}</div><div class="sport-stats">${result}${metric?` · ${metric}`:''}</div></div>`;}).join('');
    const photo=studentPhotoPath(p),autoCutout=!!photo;
    const portrait=autoCutout?`<div class="pcard-cutout-stage" data-cutout-player="${escapeHtml(p.id)}"><span class="pcard-cutout-loading">Procesando...</span><img class="pcard-photo-fallback" src="${escapeHtml(photo)}" alt="Foto de ${escapeHtml(p.fullName)}" loading="lazy" hidden></div>`:photo?`<img class="pcard-photo-img" src="${escapeHtml(photo)}" alt="Foto de ${escapeHtml(p.fullName)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><div class="pcard-photo-placeholder" style="display:none;"><span>${escapeHtml(initials(p.fullName||''))}</span><small>Sin foto</small></div>`:`<div class="pcard-photo-placeholder"><span>${escapeHtml(initials(p.fullName||''))}</span><small>Sin foto</small></div>`;
    return `<div class="pcard" tabindex="0" role="button" aria-label="Ver estadísticas de ${escapeHtml(p.fullName)}" style="--tier-a:${tier.a};--tier-b:${tier.b};--tier-text:${tier.text};--xp-progress:${xpProgress}%;" data-xp-progress="${xpProgress}" data-public-player="${escapeHtml(p.id)}"><div class="pcard-inner"><div class="pcard-top"><div class="rating-block"><div class="rating-num">${rating}</div><div class="rating-cat">${escapeHtml(tier.label)}</div></div><div class="position-stack"><div class="position-badge">${escapeHtml(p.competitionGroup||'Jugador')}</div><div class="player-code">${escapeHtml(p.id)}</div></div></div><div class="pcard-portrait ${autoCutout?'pcard-portrait-cutout':''}">${portrait}<div class="pcard-shine"></div></div><div class="pcard-name">${escapeHtml(p.fullName)}</div><div class="pcard-grade">${escapeHtml(p.course||p.playerType||'')}</div><div class="pcard-progress" aria-label="Experiencia acumulada: ${experience} XP"><div class="pcard-progress-head"><span>Experiencia</span><b>${experience} XP</b></div><div class="pcard-xp-meter"><div class="pcard-xp-track"><div class="pcard-xp-fill"></div></div><span class="pcard-xp-star" aria-hidden="true">★</span></div></div><div class="pcard-sports">${sportRows||'<div class="sport-row"><div class="sport-name">Sin estadísticas</div><div class="sport-stats">0PJ · 0W</div></div>'}</div><div class="pcard-foot"><span>★ Rating ${rating}</span><b>${Object.keys(stats).length} disciplina${Object.keys(stats).length===1?'':'s'}</b></div></div></div>`;
  }).join('');
  requestAnimationFrame(()=>{
    grid.querySelectorAll('.pcard').forEach(card=>{
      const fill=card.querySelector('.pcard-xp-fill');
      if(fill) fill.style.width=`${Number(card.dataset.xpProgress||0)}%`;
    });
  });
  grid.querySelectorAll('[data-public-player]').forEach(card=>{const open=()=>openPublicPlayerModal(card.dataset.publicPlayer);card.addEventListener('click',open);card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});});
  grid.querySelectorAll('[data-cutout-player]').forEach(stage=>{const player=publicData.players.find(p=>String(p.id)===String(stage.dataset.cutoutPlayer));const photo=player?studentPhotoPath(player):'';if(photo)createAutomaticPlayerCutout(stage,photo);});
}
function openPublicPlayerModal(id){
  const p=publicData.players.find(x=>normalizeLookup(x.id)===normalizeLookup(id));if(!p)return;
  const stats=playerStats(p), rating=ratingForPlayer(p), experience=playerExperience(p), tier=tierOf(rating), matches=publicPlayerMatches(p), photo=studentPhotoPath(p);
  const totals=Object.values(stats).reduce((a,s)=>({games:a.games+s.games,wins:a.wins+s.wins,draws:a.draws+s.draws,losses:a.losses+s.losses,points:a.points+s.points,for:a.for+s.for,against:a.against+s.against,events:a.events+s.events}),{games:0,wins:0,draws:0,losses:0,points:0,for:0,against:0,events:0});
  const winRate=totals.games?Math.round(totals.wins/totals.games*100):0;
  const blocks=Object.entries(stats).map(([disciplineId,s])=>{
    const d=disciplineById(disciplineId);
    const kind=disciplineStatKind(d);
    let metricHtml='';
    if(kind==='football'){
      metricHtml=`<div class="msb-stat"><div class="n">${s.goals}</div><div class="l">Goles</div></div>`;
    } else if(kind==='basketball'){
      metricHtml=`<div class="msb-stat"><div class="n">${s.points}</div><div class="l">Puntos</div></div>`;
    } else if(kind==='volleyball'){
      metricHtml=`<div class="msb-stat"><div class="n">${s.points}</div><div class="l">Puntos</div></div>`;
    } else if(kind==='videogame'){
      metricHtml='';
    } else {
      metricHtml=`<div class="msb-stat"><div class="n">${s.games}</div><div class="l">Partidas</div></div>`;
    }
    const resultHtml=kind==='videogame'
      ? `<div class="msb-stat"><div class="n">${s.games}</div><div class="l">Partidas jugadas</div></div><div class="msb-stat"><div class="n">${s.wins}</div><div class="l">Partidas ganadas</div></div><div class="msb-stat"><div class="n">${s.losses}</div><div class="l">Partidas perdidas</div></div>`
      : `<div class="msb-stat"><div class="n">${s.games}</div><div class="l">Partidos jugados</div></div><div class="msb-stat"><div class="n">${s.wins}</div><div class="l">Partidos ganados</div></div>${kind==='football'||kind==='basketball'?`<div class="msb-stat"><div class="n">${s.draws}</div><div class="l">Partidos empatados</div></div>`:''}<div class="msb-stat"><div class="n">${s.losses}</div><div class="l">Partidos perdidos</div></div>`;
    return `<div class="modal-sport-block"><div class="msb-head"><span>${escapeHtml(d?.name||disciplineId)}</span><small>${s.games} ${kind==='videogame'?'partida':'partido'}${s.games===1?'':'s'}</small></div><div class="msb-stats">${resultHtml}${metricHtml}</div></div>`;
  }).join('');
  const recent=matches.slice(0,6).map(({m,team,opponent,own,opp,discipline})=>{const outcome=own>opp?'Victoria':own===opp?'Empate':'Derrota';return `<div class="modal-match-row"><div><strong>${escapeHtml(discipline?.name||m.disciplineId||'Disciplina')}</strong><span>${escapeHtml(team?.name||team?.id||'Equipo')} vs ${escapeHtml(opponent?.name||opponent?.id||'Rival')}</span></div><b class="${outcome.toLowerCase()}">${own} · ${opp}<small>${outcome}</small></b></div>`;}).join('');
  document.getElementById('playerModalContent').innerHTML=`<button class="modal-close" id="playerModalClose" type="button" aria-label="Cerrar">✕</button><div class="player-modal-hero"><div class="player-modal-photo-wrap ${photo?'has-photo':''}" data-modal-cutout="${photo?escapeHtml(p.id):''}">${photo?'<span class="pcard-cutout-loading">Procesando...</span>':'<div class="pcard-photo-placeholder"><span>'+escapeHtml(initials(p.fullName||''))+'</span><small>Sin foto</small></div>'}</div><div class="player-modal-main"><div class="player-modal-rating"><span>${rating}</span><small>${escapeHtml(tier.label)}</small><code>${escapeHtml(p.id)}</code></div><div><div class="player-modal-group">${escapeHtml(p.competitionGroup||'Jugador')}</div><h2>${escapeHtml(p.fullName)}</h2><p>${escapeHtml(p.course||p.playerType||'Jugador')}</p></div></div></div><div class="modal-body"><div class="modal-overview"><div><b>${totals.games}</b><span>Partidos</span></div><div><b>${totals.wins}</b><span>Victorias</span></div><div><b>${totals.draws}</b><span>Empates</span></div><div><b>${totals.losses}</b><span>Derrotas</span></div><div><b>${winRate}%</b><span>Efectividad</span></div></div><div class="player-modal-xp"><b>${experience} XP</b><span>Experiencia acumulada</span></div><h4>Estadísticas por disciplina</h4>${blocks||'<div class="modal-empty-state">Aún no hay resultados registrados para este jugador.</div>'}<h4 class="modal-section-title">Últimos resultados</h4>${recent||'<div class="modal-empty-state">Cuando participe en partidos finalizados, sus resultados aparecerán aquí.</div>'}</div>`;
  document.getElementById('playerModal').classList.add('open');
  document.getElementById('playerModalClose')?.addEventListener('click', closePlayerModal);
  const stage=document.querySelector('[data-modal-cutout]');
  if(stage&&photo)createAutomaticPlayerCutout(stage,photo);
}
function closePlayerModal(){document.getElementById('playerModal').classList.remove('open');}
document.getElementById('playerModal').addEventListener('click',e=>{if(e.target.id==='playerModal')closePlayerModal();});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('playerModal')?.classList.contains('open')) closePlayerModal(); });
document.getElementById('searchPlayer').addEventListener('input',renderPlayers);document.getElementById('filterCat').addEventListener('change',renderPlayers);document.getElementById('filterSport').addEventListener('change',renderPlayers);

/* ---------------- SEGURIDAD DE SESIÓN ---------------- */
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos de inactividad
const SESSION_ACTIVITY_EVENTS = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
let lastSessionActivity = Date.now();
let sessionIdleTimer = null;

function registerSessionActivity() {
  lastSessionActivity = Date.now();
}

SESSION_ACTIVITY_EVENTS.forEach(eventName => {
  window.addEventListener(eventName, registerSessionActivity, { passive: true });
});

function startSessionIdleGuard() {
  if (sessionIdleTimer) clearInterval(sessionIdleTimer);

  sessionIdleTimer = setInterval(async () => {
    if (!currentUser) return;

    if (Date.now() - lastSessionActivity >= SESSION_IDLE_TIMEOUT_MS) {
      console.log('[INVICTUS] Sesión cerrada por inactividad.');
      try {
        await logout();
      } catch (error) {
        console.error('[INVICTUS] No fue posible cerrar la sesión:', error);
      }
    }
  }, 60 * 1000);
}

watchAuth(user => {
  if (user) {
    lastSessionActivity = Date.now();
    startSessionIdleGuard();
  } else if (sessionIdleTimer) {
    clearInterval(sessionIdleTimer);
    sessionIdleTimer = null;
  }
});

/* ---------------- INIT ---------------- */
loadHomeCounters();
loadPublicTournamentData();


/* ============================================================
   ADMINISTRACIÓN · ESTUDIANTES
   ============================================================ */

let adminStudents = [];
let editingStudentId = null;
let csvRows = [];

const adminElements = {
  view: document.getElementById('view-admin'),
  body: document.getElementById('adminStudentsBody'),
  count: document.getElementById('studentCount'),
  search: document.getElementById('adminStudentSearch'),
  modal: document.getElementById('studentModal'),
  form: document.getElementById('studentForm'),
  modalTitle: document.getElementById('studentModalTitle'),
  modalClose: document.getElementById('studentModalClose'),
  cancel: document.getElementById('studentCancel'),
  error: document.getElementById('studentFormError'),
  editId: document.getElementById('studentEditId'),
  idPreview: document.getElementById('studentIdPreview'),
  firstName: document.getElementById('studentFirstName'),
  lastName: document.getElementById('studentLastName'),
  course: document.getElementById('studentCourse'),
  playerType: document.getElementById('studentType'),
  courseField: document.getElementById('studentCourseField'),
  group: document.getElementById('studentGroup'),
  photo: document.getElementById('studentPhoto'),
  photoPreview: document.getElementById('studentPhotoPreview'),
  active: document.getElementById('studentActive'),
  disciplines: document.getElementById('studentDisciplines'),
  disciplineGrid: document.getElementById('disciplineGrid'),
  importModal: document.getElementById('studentImportModal'),
  importFile: document.getElementById('studentCsvFile'),
  importPreview: document.getElementById('csvPreview'),
  importConfirm: document.getElementById('studentImportConfirm'),
  importClose: document.getElementById('studentImportClose'),
  importCancel: document.getElementById('studentImportCancel')
};

function studentFullName(student) {
  return student.fullName ||
    `${student.firstName || ''} ${student.lastName || ''}`.trim();
}

function studentInitials(student) {
  return studentFullName(student)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function syncHomeCountersAfterAdminChange() {
  if (!currentUser) return;

  try {
    const counters = await syncPublicCounters();

    const sports = document.getElementById('homeSportsCount');
    const videoGames = document.getElementById('homeVideoGamesCount');
    const players = document.getElementById('homePlayersCount');
    const playersText = document.getElementById('homePlayersText');
    const categories = document.getElementById('homeCategoriesCount');

    if (sports) sports.textContent = String(counters.sports);
    if (videoGames) videoGames.textContent = String(counters.videoGames);
    if (players) players.textContent = String(counters.players);
    if (playersText) playersText.textContent = String(counters.players);
    if (categories) categories.textContent = String(TOURNAMENT_CATEGORIES.length);

    console.log('[INVICTUS] Contadores sincronizados en Firestore:', counters);
  } catch (error) {
    console.error('[INVICTUS] No fue posible sincronizar contadores:', error);
  }
}

async function loadHomeCounters() {
  console.log('[INVICTUS] Cargando contadores públicos en la carga de página (sin autenticación)...');
  const sports = document.getElementById('homeSportsCount');
  const videoGames = document.getElementById('homeVideoGamesCount');
  const players = document.getElementById('homePlayersCount');
  const playersText = document.getElementById('homePlayersText');
  const categories = document.getElementById('homeCategoriesCount');

  if (!sports || !videoGames || !players) return;

  try {
    const counters = await getPublicCounters();

    sports.textContent = String(counters.sports);
    videoGames.textContent = String(counters.videoGames);
    players.textContent = String(counters.players);

    if (playersText) {
      playersText.textContent = String(counters.players);
    }

    // Las categorías son un catálogo fijo del torneo, no un contador de
    // registros actuales en Firestore.
    if (categories) {
      categories.textContent = String(TOURNAMENT_CATEGORIES.length);
    }

    console.log('[INVICTUS] Contadores públicos cargados desde Firestore:', counters);
  } catch (error) {
    console.error('[INVICTUS] Error cargando contadores públicos:', error);

    sports.textContent = '—';
    videoGames.textContent = '—';
    players.textContent = '—';

    if (playersText) {
      playersText.textContent = '—';
    }
  }
}


function getAdminStudentById(studentId) {
  return adminStudents.find(item => String(item.id) === String(studentId)) || null;
}

function renderAdminStudents() {
  const query = adminElements.search.value.trim().toLowerCase();

  const filtered = adminStudents.filter(student => {
    if (!query) return true;

    return [
      student.id,
      studentFullName(student),
      student.course,
      student.playerType,
      student.competitionGroup
    ]
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  adminElements.count.textContent =
    `${adminStudents.length} estudiante${adminStudents.length === 1 ? '' : 's'} registrado${adminStudents.length === 1 ? '' : 's'}`;

  if (!filtered.length) {
    adminElements.body.innerHTML = `
      <tr>
        <td colspan="8" class="empty">
          ${adminStudents.length
            ? 'No encontramos estudiantes con esa búsqueda.'
            : 'No hay estudiantes registrados todavía.'}
        </td>
      </tr>
    `;
    return;
  }

  adminElements.body.innerHTML = filtered.map(student => {
    const photo = student.photo
      ? `<img class="student-mini-photo" src="${escapeHtml(student.photo)}" alt="${escapeHtml(studentFullName(student))}">`
      : `<div class="student-mini-placeholder">${escapeHtml(studentInitials(student))}</div>`;

    const registeredSports = Array.isArray(student.sports)
      ? student.sports
      : (Array.isArray(student.disciplines) ? student.disciplines : Object.keys(student.sports || {}));
    const sportsCount = registeredSports.filter(Boolean).length;
    const sportsTitle = registeredSports.map(id => disciplineById(id)?.name || id).filter(Boolean).join(', ');

    return `
      <tr>
        <td>${photo}</td>
        <td><span class="student-id">${escapeHtml(student.id)}</span></td>
        <td class="student-name-cell">
          <strong>${escapeHtml(studentFullName(student))}</strong>
          <small>${escapeHtml(student.firstName || '')}</small>
        </td>
        <td>${escapeHtml(student.playerType === 'Profesor' ? 'Profesor' : (student.course || '—'))}</td>
        <td>${escapeHtml(student.competitionGroup)}</td>
        <td><span class="student-sport-count" title="${escapeHtml(sportsTitle || 'Sin disciplinas')}">${sportsCount}</span></td>
        <td>
          <span class="status-pill ${student.active === false ? 'inactive' : ''}">
            ${student.active === false ? 'Inactivo' : 'Activo'}
          </span>
        </td>
        <td>
          <div class="student-actions">
            <button class="student-action" data-student-action="edit" data-id="${escapeHtml(student.id)}">Editar</button>
            <button class="student-action delete" data-student-action="delete" data-id="${escapeHtml(student.id)}">Eliminar</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function verifyAdminStudentIdentity(students) {
  const seen = new Set();

  students.forEach(student => {
    const id = String(student.id || '');
    if (!id) return;

    if (seen.has(id)) {
      console.warn('[INVICTUS] ID duplicado detectado:', id);
    }
    seen.add(id);

    if (!student.firstName || !student.lastName) {
      console.warn('[INVICTUS] Registro sin nombre completo:', id, student);
    }
  });
}

async function loadAdminStudents() {
  adminElements.body.innerHTML = `
    <tr>
      <td colspan="8" class="empty">Conectando con Firestore...</td>
    </tr>
  `;

  console.log('[INVICTUS] Cargando jugadores para Administración...');

  try {
    adminStudents = (await getStudents()).map(student => ({ ...student, sports: Array.isArray(student.sports) ? student.sports : (Array.isArray(student.disciplines) ? student.disciplines : []) }));
    verifyAdminStudentIdentity(adminStudents);
    renderAdminStudents();
    console.log(
      `[INVICTUS] Administración cargada: ${adminStudents.length} jugador(es).`
    );

    // Reconstruimos el contador público sin bloquear la carga administrativa.
    await syncHomeCountersAfterAdminChange();
    await loadPublicTournamentData();
  } catch (error) {
    console.error('[INVICTUS] Error cargando estudiantes:', error);
    console.error(error);

    adminElements.body.innerHTML = `
      <tr>
        <td colspan="8" class="empty">
          No fue posible leer Firestore.
          <br><small>${escapeHtml(error.message)}</small>
        </td>
      </tr>
    `;
  }
}

function effectiveDisciplineCatalog() {
  return effectiveDisciplines();
}

function renderDisciplineChecks(selected = []) {
  if (!adminElements.disciplines) {
    return;
  }

  const catalog = effectiveDisciplineCatalog();

  adminElements.disciplines.innerHTML = catalog.map(item => `
    <label class="discipline-check">
      <input
        type="checkbox"
        value="${escapeHtml(item.id)}"
        ${selected.some(id => canonicalDisciplineId(id) === item.key) ? 'checked' : ''}
      >
      <span>${escapeHtml(item.name)}</span>
      <small class="discipline-type">${escapeHtml(item.type)}</small>
    </label>
  `).join('');
}

function selectedDisciplines() {
  if (!adminElements.disciplines) {
    return [];
  }

  return [...adminElements.disciplines.querySelectorAll('input[type="checkbox"]:checked')]
    .map(input => input.value);
}

function renderDisciplineCatalog() {
  if (!adminElements.disciplineGrid) {
    return;
  }

  const icons = {
    futbol: '⚽',
    baloncesto: '🏀',
    voleibol: '🏐',
    fifa: '🎮',
    mario: '🎮',
    mariokart: '🏎️',
    smash: '🥊'
  };

  const catalog = effectiveDisciplineCatalog();

  adminElements.disciplineGrid.innerHTML = catalog.map(item => `
    <article class="discipline-card">
      <div class="discipline-icon">${icons[item.id] || '🎯'}</div>
      <h4>${escapeHtml(item.name)}</h4>
      <p>${escapeHtml(item.type)}</p>
      <span class="discipline-badge">${escapeHtml(item.mode)}</span>
    </article>
  `).join('');
}

function updatePlayerTypeUI() {
  const type = adminElements.playerType?.value || 'Estudiante';
  const isStudent = type === 'Estudiante';

  if (adminElements.courseField) {
    adminElements.courseField.hidden = !isStudent;
  }

  if (adminElements.course) {
    adminElements.course.required = isStudent;
    adminElements.course.disabled = !isStudent;
  }

  if (adminElements.group) {
    if (!isStudent) {
      adminElements.group.value = 'Profesores';
    } else if (adminElements.course.value) {
      updateGroupFromCourse();
    }
  }
}

function updateGroupFromCourse() {
  const group = groupForCourse(adminElements.course.value);
  adminElements.group.value = group;
}


function studentPhotoPath(student) {
  if (!student) return '';
  const id = String(student.id || '').trim();
  if (!id) return '';

  // Las fotos de INVICTUS son archivos estáticos del proyecto.
  // No dependemos de Firestore Storage ni de data/blob URLs.
  const stored = String(student.photo || '').trim();
  if (stored && /^(?:\.\/)?assets\/students\//i.test(stored)) {
    return /\.(?:jpe?g|png|webp)$/i.test(stored) ? stored : `${stored}.webp`;
  }

  // La extensión se resuelve en la vista mediante onerror/fallback.
  return `./assets/students/${encodeURIComponent(id)}.webp`;
}

function showStudentPhotoPreview(student) {
  const preview = adminElements.photoPreview;
  if (!preview) return;

  const id = String(student?.id || '').trim();
  if (!id) {
    preview.innerHTML = '<span>Foto</span>';
    return;
  }

  const extensions = ['.webp', '.png', '.jpg', '.jpeg'];
  let index = 0;

  const tryNext = () => {
    if (index >= extensions.length) {
      preview.innerHTML = '<span>Foto</span>';
      return;
    }
    const src = `./assets/students/${encodeURIComponent(id)}${extensions[index++]}`;
    const img = new Image();
    img.alt = `Foto de ${studentFullName(student)}`;
    img.onload = () => {
      preview.innerHTML = '';
      preview.appendChild(img);
    };
    img.onerror = tryNext;
    img.src = src;
  };

  tryNext();
}
function openStudentModal(student = null) {
  editingStudentId = student?.id || null;

  adminElements.form.reset();
  if (adminElements.playerType) adminElements.playerType.value = student?.playerType || 'Estudiante';
  adminElements.error.hidden = true;
  renderDisciplineChecks([]);
  adminElements.error.textContent = '';
  adminElements.photoPreview.innerHTML = '<span>Foto</span>';
  adminElements.photoPreview.dataset.photoPath = '';

  if (student) {
    adminElements.modalTitle.textContent = 'Editar jugador';
    adminElements.editId.value = student.id;
    adminElements.idPreview.value = student.id;
    adminElements.firstName.value = student.firstName || '';
    adminElements.lastName.value = student.lastName || '';
    adminElements.course.value = student.course || '';
    if (adminElements.playerType) adminElements.playerType.value = student.playerType || (student.course ? 'Estudiante' : 'Profesor');
    adminElements.group.value =
      groupForCourse(student.course) || student.competitionGroup || '';
    adminElements.active.checked = student.active !== false;
    renderDisciplineChecks(Array.isArray(student.sports) ? student.sports : (Array.isArray(student.disciplines) ? student.disciplines : []));

    showStudentPhotoPreview(student);
  } else {
    adminElements.modalTitle.textContent = 'Agregar jugador';

    const ids = adminStudents.map(item => item.id);
    adminElements.idPreview.value = nextStudentId(ids);
    adminElements.active.checked = true;
    renderDisciplineChecks([]);
    adminElements.photoPreview.dataset.photoPath = '';
  }

  updatePlayerTypeUI();
  adminElements.modal.classList.add('open');
}

function closeStudentModal() {
  adminElements.modal.classList.remove('open');
  editingStudentId = null;
}

function setStudentError(message) {
  adminElements.error.textContent = message;
  adminElements.error.hidden = false;
}

adminElements.course.addEventListener('change', updateGroupFromCourse);
adminElements.playerType?.addEventListener('change', updatePlayerTypeUI);

adminElements.photo?.addEventListener('change', () => {
  // La fotografía final se sirve desde assets/students/{ID}.ext.
  // Este selector se conserva solo para no romper formularios existentes;
  // no se sube ningún archivo a Firebase.
  const file = adminElements.photo.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  adminElements.photoPreview.innerHTML = `<img src="${url}" alt="Vista previa de fotografía">`;
  adminElements.photoPreview.dataset.photoPath = '';
});

adminElements.form.addEventListener('submit', async event => {
  event.preventDefault();

  adminElements.error.hidden = true;

  const submitButton = adminElements.form.querySelector('button[type="submit"]');
  if (submitButton?.disabled) return;

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.dataset.originalText = submitButton.textContent;
    submitButton.textContent = 'Guardando...';
  }

  try {
    const photoTargetId = editingStudentId || adminElements.idPreview.value.trim();
    const selectedPhoto = photoTargetId
      ? `assets/students/${photoTargetId}.webp`
      : '';

    if (editingStudentId) {
      const original = adminStudents.find(item => item.id === editingStudentId);

      if (!original) throw new Error('No encontramos el jugador.');

      const updated = {
        ...original,
        id: original.id,
        firstName: adminElements.firstName.value.trim(),
        lastName: adminElements.lastName.value.trim(),
        fullName: `${adminElements.firstName.value.trim()} ${adminElements.lastName.value.trim()}`.trim(),
        playerType: adminElements.playerType?.value || 'Estudiante',
        course: adminElements.playerType?.value === 'Profesor' ? '' : adminElements.course.value,
        competitionGroup: adminElements.playerType?.value === 'Profesor'
          ? 'Profesores'
          : groupForCourse(adminElements.course.value),
        sports: selectedDisciplines(),
        photo: selectedPhoto || original.photo || '',
        active: adminElements.active.checked
      };

      if (!updated.firstName || !updated.lastName) {
        throw new Error('Nombres y apellidos son obligatorios.');
      }

      await saveStudent(updated);

      adminStudents = adminStudents.map(item =>
        item.id === updated.id ? updated : item
      );
    } else {
      const nextNumber = await reserveNextStudentNumber();

      const student = createStudent({
        id: studentIdFromNumber(nextNumber),
        firstName: adminElements.firstName.value,
        lastName: adminElements.lastName.value,
        playerType: adminElements.playerType?.value || 'Estudiante',
        course: adminElements.playerType?.value === 'Profesor' ? '' : adminElements.course.value,
        competitionGroup: adminElements.playerType?.value === 'Profesor'
          ? 'Profesores'
          : adminElements.group.value,
        sports: selectedDisciplines(),
        photo: selectedPhoto || '',
        active: adminElements.active.checked
      }, adminStudents.map(item => item.id));

      await saveStudent(student);
      adminStudents.push(student);

      adminStudents.sort((a, b) =>
        String(a.id).localeCompare(String(b.id), 'es', { numeric: true })
      );
    }

    closeStudentModal();
    renderAdminStudents();
    await syncHomeCountersAfterAdminChange();
    await loadPublicTournamentData();
    await loadHomeCounters();
  } catch (error) {
    console.error(error);
    setStudentError(error.message || 'No fue posible guardar el estudiante.');
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent =
        submitButton.dataset.originalText || 'Guardar estudiante';
    }
  }
});

adminElements.body.addEventListener('click', async event => {
  const button = event.target.closest('[data-student-action]');
  if (!button) return;

  const id = button.dataset.id;
  const student = getAdminStudentById(id);

  if (!student) return;

  if (button.dataset.studentAction === 'edit') {
    openStudentModal(student);
    return;
  }

  if (button.dataset.studentAction === 'delete') {
    const confirmed = window.confirm(
      `¿Deseas desactivar a ${studentFullName(student)} (${student.id})? El estudiante conservará su historial y su ID.`
    );

    if (!confirmed) return;

    try {
      const deactivatedAt = new Date().toISOString();

      const updatedStudent = {
        ...student,
        active: false,
        deactivatedAt
      };
      await saveStudent(updatedStudent);
      await syncPublicPlayer(updatedStudent);

      const index = adminStudents.findIndex(item => item.id === id);
      if (index !== -1) {
        adminStudents[index] = {
          ...adminStudents[index],
          active: false,
          deactivatedAt
        };
      }

      renderAdminStudents();
      await syncHomeCountersAfterAdminChange();
      await loadHomeCounters();
      await loadPublicTournamentData();
    } catch (error) {
      console.error(error);
      window.alert(`No fue posible desactivar el jugador.\n\n${error.message}`);
    }
  }
});

adminElements.search.addEventListener('input', renderAdminStudents);

document.getElementById('btnSyncPublicCounters')?.addEventListener('click', async () => {
  if (!authReady || !currentUser) {
    openAuth();
    return;
  }

  const button = document.getElementById('btnSyncPublicCounters');
  if (!button) return;

  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = 'Actualizando...';

  try {
    const counters = await syncPublicCounters();
    await loadPublicTournamentData();
    await loadHomeCounters();

    console.log('[INVICTUS] Contador de jugadores actualizado manualmente:', counters);

    window.alert(
      `Contadores actualizados.\n\n` +
      `Jugadores: ${counters.players}\n` +
      `Deportes: ${counters.sports}\n` +
      `Videojuegos: ${counters.videoGames}`
    );
  } catch (error) {
    console.error('[INVICTUS] Error actualizando contadores públicos:', error);
    window.alert(
      `No fue posible actualizar los contadores.\n\n${error.message}`
    );
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
});

document.getElementById('btnAddStudent').addEventListener('click', () => {
  openStudentModal();
});

adminElements.modalClose.addEventListener('click', closeStudentModal);
adminElements.cancel.addEventListener('click', closeStudentModal);

adminElements.modal.addEventListener('click', event => {
  if (event.target === adminElements.modal) {
    closeStudentModal();
  }
});

/* ---------------- Importación CSV ---------------- */

function parseCsvLine(line, delimiter = ',') {
  const values = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function normalizeCsvHeader(header) {
  return String(header || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/^"|"$/g, '')
    .toLocaleLowerCase('es-CO');
}

function detectCsvDelimiter(headerLine) {
  const required = ['nombres', 'apellidos', 'curso'];
  const candidates = [',', ';', '\t', '|'];

  for (const delimiter of candidates) {
    const headers = parseCsvLine(headerLine, delimiter).map(normalizeCsvHeader);
    if (required.every(header => headers.includes(header))) {
      return delimiter;
    }
  }

  // Si no se pudo identificar por las columnas esperadas, usar el separador
  // con mayor presencia en la primera línea. Esto ayuda con exportaciones de Excel.
  const counts = candidates.map(delimiter => ({
    delimiter,
    count: headerLine.split(delimiter).length - 1
  }));

  counts.sort((a, b) => b.count - a.count);
  return counts[0].count > 0 ? counts[0].delimiter : ',';
}

function parseStudentsCsv(text) {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    throw new Error('El archivo CSV está vacío.');
  }

  const delimiter = detectCsvDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map(normalizeCsvHeader);

  const required = ['nombres', 'apellidos', 'curso'];
  const missing = required.filter(header => !headers.includes(header));

  if (missing.length) {
    throw new Error(
      `No se reconocieron las columnas requeridas: ${missing.join(', ')}. ` +
      'El archivo debe contener nombres, apellidos y curso.'
    );
  }

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line, delimiter);
    const row = {};

    headers.forEach((header, position) => {
      row[header] = values[position] || '';
    });

    const rawCourse = String(row.curso || '').trim();
    const course = normalizeCourseCode(rawCourse);

    return {
      rowNumber: index + 2,
      nombres: row.nombres.trim(),
      apellidos: row.apellidos.trim(),
      curso: course,
      grupo: groupForCourse(course)
    };
  });
}

function renderCsvPreview(rows) {
  if (!rows.length) {
    adminElements.importPreview.innerHTML =
      `<div class="empty">El CSV no contiene estudiantes.</div>`;
    adminElements.importConfirm.disabled = true;
    return;
  }

  const valid = rows.filter(row =>
    row.nombres && row.apellidos && row.curso && groupForCourse(row.curso)
  );

  adminElements.importPreview.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Fila</th>
          <th>Nombres</th>
          <th>Apellidos</th>
          <th>Curso</th>
          <th>Grupo</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        ${rows.slice(0, 100).map(row => {
          const ok = row.nombres && row.apellidos && row.curso && groupForCourse(row.curso);

          return `
            <tr>
              <td>${row.rowNumber}</td>
              <td>${escapeHtml(row.nombres)}</td>
              <td>${escapeHtml(row.apellidos)}</td>
              <td>${escapeHtml(row.curso)}</td>
              <td>${escapeHtml(groupForCourse(row.curso) || 'No configurado')}</td>
              <td>${ok ? '✓ Válido' : '✕ Incompleto'}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
    ${rows.length > 100 ? `<div class="empty">Mostrando las primeras 100 filas.</div>` : ''}
  `;

  adminElements.importConfirm.disabled =
    valid.length === 0 || valid.length !== rows.length;
}

document.getElementById('btnImportStudents').addEventListener('click', () => {
  csvRows = [];
  adminElements.importFile.value = '';
  adminElements.importPreview.innerHTML =
    `<div class="empty">Selecciona un CSV para mostrar la vista previa.</div>`;
  adminElements.importConfirm.disabled = true;
  adminElements.importCancel.disabled = false;
  adminElements.importClose.disabled = false;
  adminElements.importConfirm.textContent = 'Importar jugadores';
  adminElements.importConfirm.classList.remove('is-loading');
  const importStatus = document.getElementById('studentImportStatus');
  if (importStatus) {
    importStatus.textContent = '';
    importStatus.classList.remove('visible');
  }
  adminElements.importModal.classList.add('open');
});

async function decodeCsvFile(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Excel puede guardar un CSV con la codificación ANSI de Windows
  // (habitualmente Windows-1252 en equipos configurados en español).
  // Si intentamos leerlo como UTF-8, caracteres como á, é, í, ó, ú, ñ
  // pueden terminar convertidos en "�". Primero intentamos UTF-8 estricto
  // y, si no es válido, usamos Windows-1252.
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return new TextDecoder('utf-16le').decode(buffer);
  }

  if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return new TextDecoder('utf-16be').decode(buffer);
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

adminElements.importFile.addEventListener('change', async () => {
  const file = adminElements.importFile.files[0];

  if (!file) return;

  try {
    const text = await decodeCsvFile(file);
    csvRows = parseStudentsCsv(text);
    renderCsvPreview(csvRows);
  } catch (error) {
    csvRows = [];
    adminElements.importConfirm.disabled = true;
    adminElements.importPreview.innerHTML =
      `<div class="empty">${escapeHtml(error.message)}</div>`;
  }
});

adminElements.importConfirm.addEventListener('click', async () => {
  if (!csvRows.length) return;

  if (csvRows.length > 500) {
    window.alert('La importación debe tener máximo 500 estudiantes por lote.');
    return;
  }

  const existingIds = adminStudents.map(student => student.id);
  const newStudents = [];
  let ids = [...existingIds];
  const identities = new Set();

  const setImportProgress = (message) => {
    const status = document.getElementById('studentImportStatus');
    if (status) {
      status.textContent = message;
      status.classList.add('visible');
    }
  };

  const setImportBusy = (busy) => {
    adminElements.importConfirm.disabled = busy || !csvRows.length;
    adminElements.importCancel.disabled = busy;
    adminElements.importClose.disabled = busy;
    adminElements.importConfirm.textContent = busy ? 'Importando…' : 'Importar jugadores';
    adminElements.importConfirm.classList.toggle('is-loading', busy);
  };

  try {
    setImportBusy(true);
    setImportProgress(`Validando ${csvRows.length} estudiante${csvRows.length === 1 ? '' : 's'}…`);

    // Validamos todo el CSV antes de tocar el contador para evitar reservar
    // números si el archivo contiene duplicados.
    for (const row of csvRows) {
      const identity = `${row.nombres}|${row.apellidos}|${row.curso}`
        .toLocaleLowerCase('es-CO');

      if (identities.has(identity)) {
        throw new Error(
          `El CSV contiene estudiantes repetidos: ${row.nombres} ${row.apellidos} (${row.curso}).`
        );
      }

      identities.add(identity);
    }

    setImportProgress(`Reservando identificadores para ${csvRows.length} estudiantes…`);
    const firstNumber = await reserveStudentNumberRange(csvRows.length);

    setImportProgress(`Preparando ${csvRows.length} estudiantes…`);

    csvRows.forEach((row, index) => {
      const nextNumber = firstNumber + index;
      const course = normalizeCourseCode(row.curso);

      const student = createStudent({
        id: studentIdFromNumber(nextNumber),
        playerType: 'Estudiante',
        firstName: row.nombres,
        lastName: row.apellidos,
        course,
        competitionGroup: groupForCourse(course),
        active: true
      }, ids);

      newStudents.push(student);
      ids.push(student.id);
    });

    setImportProgress(`Guardando ${newStudents.length} estudiantes en Firestore…`);
    await saveStudentsBatch(newStudents);

    adminStudents.push(...newStudents);

    adminStudents.sort((a, b) =>
      String(a.id).localeCompare(String(b.id), 'es', { numeric: true })
    );

    setImportProgress(`${newStudents.length} estudiantes importados correctamente.`);
    renderAdminStudents();
    await syncHomeCountersAfterAdminChange();
    await loadHomeCounters();
    await loadPublicTournamentData();

    window.alert(`${newStudents.length} estudiantes importados correctamente.`);
    adminElements.importModal.classList.remove('open');
    setImportBusy(false);
  } catch (error) {
    console.error(error);
    setImportProgress(`No se pudo completar la importación: ${error.message}`);
    setImportBusy(false);
    window.alert(`La importación de jugadores no pudo completarse.\n\n${error.message}`);
  }
});

adminElements.importClose.addEventListener('click', () => {
  adminElements.importModal.classList.remove('open');
});

adminElements.importCancel.addEventListener('click', () => {
  adminElements.importModal.classList.remove('open');
});

/* ---------------- Navegación administrativa ---------------- */

document.querySelectorAll('[data-admin-section]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-admin-section]').forEach(item =>
      item.classList.remove('active')
    );

    document.querySelectorAll('.admin-section').forEach(item =>
      item.classList.remove('active')
    );

    button.classList.add('active');

    const target = document.getElementById(
      `admin-${button.dataset.adminSection}`
    );

    if (target) target.classList.add('active');
  });
});

/* Cargar datos al abrir administración. El catálogo de disciplinas debe
   estar listo antes de renderizar equipos, porque la tabla muestra nombres
   de disciplina y no sus IDs internos. */
document.querySelector('#mainNav [data-view="admin"]')?.addEventListener('click', async () => {
  if (!authReady || !currentUser) return;
  await loadAdminStudents();
  if (!disciplinesLoaded) {
    try {
      await loadDisciplines();
    } catch (error) {
      console.error('[INVICTUS] No fue posible cargar disciplinas:', error);
      adminDisciplines = [];
      disciplinesLoaded = false;
      renderDisciplineAdmin();
      renderDisciplineCatalog();
      renderDisciplineChecks();
    }
  }
  await loadAdminTeams();
  await loadAdminMatches();
});



/* ============================================================
   REINICIO TOTAL DEL ENTORNO DE PRUEBAS
   ============================================================ */

const resetElements = {
  modal: document.getElementById('resetTestDataModal'),
  confirmation: document.getElementById('resetConfirmation'),
  error: document.getElementById('resetError'),
  button: document.getElementById('resetTestButton')
};

document.querySelectorAll('[data-reset-test-data]').forEach(button => {
  button.addEventListener('click', () => {
    if (!resetElements.modal) return;

    resetElements.confirmation.value = '';
    resetElements.error.hidden = true;
    resetElements.modal.hidden = false;
    resetElements.confirmation.focus();
  });
});

document.querySelectorAll('[data-reset-close]').forEach(button => {
  button.addEventListener('click', () => {
    if (resetElements.modal) {
      resetElements.modal.hidden = true;
    }
  });
});

resetElements.button?.addEventListener('click', async () => {
  if (resetElements.confirmation.value.trim() !== 'REINICIAR') {
    resetElements.error.textContent =
      'Debes escribir REINICIAR exactamente para confirmar.';
    resetElements.error.hidden = false;
    return;
  }

  resetElements.button.disabled = true;
  resetElements.button.textContent = 'Reiniciando...';

  try {
    await resetAllTestData();

    adminStudents = [];
    renderAdminStudents();
    console.log(
      '[INVICTUS] Reinicio completo confirmado: el próximo estudiante será BS001.'
    );

    resetElements.modal.hidden = true;

    window.alert(
      'El entorno de pruebas fue reiniciado. El próximo estudiante será BS001.'
    );
  } catch (error) {
    console.error(
      '[INVICTUS] Error al reiniciar datos:',
      error
    );

    resetElements.error.textContent =
      error.message || 'No fue posible completar el reinicio.';
    resetElements.error.hidden = false;
  } finally {
    resetElements.button.disabled = false;
    resetElements.button.textContent = 'Reiniciar todos los datos';
  }
});



function updateHeaderLogoutVisibility(user) {
  const logoutButton = document.querySelector('[data-logout]');
  if (!logoutButton) return;

  const authenticated = Boolean(user);
  logoutButton.classList.toggle('is-hidden', !authenticated);
  logoutButton.setAttribute('aria-hidden', String(!authenticated));
  logoutButton.tabIndex = authenticated ? 0 : -1;
}

/* ---------------- CIERRE DE SESIÓN ---------------- */
document.querySelector('[data-logout]')?.addEventListener('click', async () => {
  try {
    await logout();
    console.log('[INVICTUS] Sesión cerrada manualmente.');

    // Regresar inmediatamente a la página principal.
    document.querySelectorAll('section.view').forEach(view => view.classList.remove('active'));
    document.getElementById('view-inicio')?.classList.add('active');
    document.querySelectorAll('#mainNav button').forEach(button => button.classList.remove('active'));
    document.querySelector('#mainNav [data-view="inicio"]')?.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    closeAuth();
  } catch (error) {
    console.error('[INVICTUS] No fue posible cerrar la sesión:', error);
    window.alert(`No fue posible cerrar la sesión.\n\n${error.message}`);
  }
});
