/*
 * INVICTUS 2026 — Motor de competición
 * V19.9: un equipo por curso/categoría, ida y vuelta; videojuegos por parejas.
 */

export function shuffleParticipants(participants, random = Math.random) {
  const list = [...participants];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

export function calculateFootballPoints(row) { return (row.g || 0) * 3 + (row.e || 0); }
export function calculateGoalDifference(row) { return (row.gf || 0) - (row.gc || 0); }
export function calculateBasketballDifference(row) { return (row.pf || 0) - (row.pc || 0); }
export function sortStandings(rows) {
  return [...rows].sort((a,b) => {
    const pts=(b.pts||0)-(a.pts||0); if(pts) return pts;
    const dg=calculateGoalDifference(b)-calculateGoalDifference(a); if(dg) return dg;
    return String(a.team||'').localeCompare(String(b.team||''),'es');
  });
}

export function generateRoundRobin(participants) {
  const list=[...participants];
  if(list.length<2) return [];
  if(list.length%2) list.push(null);
  const rounds=[]; const n=list.length; const half=n/2; let rotation=[...list];
  for(let round=0; round<n-1; round++) {
    const matches=[];
    for(let i=0;i<half;i++) {
      const a=rotation[i], b=rotation[n-1-i];
      if(a&&b) matches.push({round:round+1,a,b});
    }
    rounds.push(matches);
    const fixed=rotation[0], rest=rotation.slice(1);
    rest.unshift(rest.pop()); rotation=[fixed,...rest];
  }
  return rounds;
}

export function generateDoubleRoundRobin(participants) {
  const first=generateRoundRobin(participants);
  if(!first.length) return [];
  const second=first.map(round => round.map(match => ({
    round: match.round + first.length,
    a: match.b,
    b: match.a
  })));
  return [...first,...second];
}

export function generateGroupStage(participants, random=Math.random) {
  // Se conserva el nombre de la función para compatibilidad con versiones
  // anteriores, pero ya no existen grupos internos de torneo.
  const ordered=shuffleParticipants(participants, random);
  return {
    groups:[{id:'Único',participants:ordered}],
    matches:generateDoubleRoundRobin(ordered).flatMap(round => round.map(m=>({...m,tournamentGroup:'Único'})))
  };
}

export function generateVideoGamePairs(players, random=Math.random) {
  const ordered=shuffleParticipants(players, random);
  const pairs=[];
  for(let i=0;i<ordered.length;i+=2) {
    const members=ordered.slice(i,i+2);
    if(members.length===2) {
      pairs.push({
        id:`PAIR:${members.map(p=>p.id).sort().join('+')}`,
        name:members.map(p=>p.name).join(' + '),
        kind:'pair',
        members,
        competitionGroup:members[0].competitionGroup || ''
      });
    }
  }
  return pairs;
}

export function generateVideoGameStage(players, random=Math.random) {
  const pairs=generateVideoGamePairs(players, random);
  return {
    groups:[{id:'Único',participants:pairs}],
    matches:generateDoubleRoundRobin(pairs).flat()
      .map(m=>({...m,tournamentGroup:'Único'}))
  };
}

export function nextStudentId(existingIds) {
  const numbers=existingIds.filter(id=>/^BS\d{3}$/.test(id)).map(id=>Number(id.slice(2))).filter(Number.isFinite);
  const next=numbers.length?Math.max(...numbers)+1:1;
  return `BS${String(next).padStart(3,'0')}`;
}

export function generateRoundRobinStage(participants, rule = null) {
  const baseRounds = generateRoundRobin(shuffleParticipants(participants));
  const matches = baseRounds.flat();
  if (rule?.rounds === 'idaVuelta') {
    const returnMatches = matches.map(match => ({
      round: match.round + baseRounds.length,
      a: match.b,
      b: match.a
    }));
    return { groups: [], matches: [...matches, ...returnMatches] };
  }
  return { groups: [], matches };
}
