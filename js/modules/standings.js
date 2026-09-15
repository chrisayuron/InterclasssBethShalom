/*
 * INVICTUS — Cálculo de posiciones
 * La tabla es una consecuencia de los resultados, no una fuente independiente.
 */

export function footballResult(scoreA, scoreB) {
  if (scoreA > scoreB) return { a: 3, b: 0 };
  if (scoreA < scoreB) return { a: 0, b: 3 };
  return { a: 1, b: 1 };
}

export function calculateFootballRow(row) {
  const gf = Number(row.gf || 0);
  const gc = Number(row.gc || 0);
  const g = Number(row.g || 0);
  const e = Number(row.e || 0);
  const p = Number(row.p || 0);

  return {
    ...row,
    pj: g + e + p,
    dg: gf - gc,
    pts: g * 3 + e
  };
}

export function sortRows(rows) {
  return [...rows].sort((a, b) => {
    if ((b.pts || 0) !== (a.pts || 0)) return (b.pts || 0) - (a.pts || 0);
    if ((b.dg || 0) !== (a.dg || 0)) return (b.dg || 0) - (a.dg || 0);
    return String(a.name || a.team || '').localeCompare(
      String(b.name || b.team || ''), 'es'
    );
  });
}
