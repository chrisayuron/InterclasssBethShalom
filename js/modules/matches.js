/*
 * INVICTUS — Módulo de partidos y eventos
 * Modelo neutral para que cada deporte pueda definir sus propios eventos.
 */

export const MATCH_STATUS = Object.freeze({
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  FINISHED: 'finished',
  POSTPONED: 'postponed',
  CANCELLED: 'cancelled'
});

export function createMatch(data) {
  return {
    id: data.id || crypto.randomUUID(),
    sportId: data.sportId,
    groupId: data.groupId,
    modality: data.modality || 'team',
    participantA: data.participantA,
    participantB: data.participantB,
    date: data.date,
    time: data.time,
    round: data.round || '',
    status: data.status || MATCH_STATUS.SCHEDULED,
    events: Array.isArray(data.events) ? [...data.events] : [],
    result: data.result || null,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function addEvent(match, event) {
  return {
    ...match,
    events: [
      ...match.events,
      {
        id: event.id || crypto.randomUUID(),
        type: event.type,
        participantId: event.participantId || null,
        playerId: event.playerId || null,
        value: Number(event.value || 0),
        minute: event.minute ?? null,
        note: event.note || '',
        createdAt: new Date().toISOString()
      }
    ],
    updatedAt: new Date().toISOString()
  };
}

export function updateEvent(match, eventId, changes) {
  return {
    ...match,
    events: match.events.map(event =>
      event.id === eventId ? { ...event, ...changes } : event
    ),
    updatedAt: new Date().toISOString()
  };
}

export function removeEvent(match, eventId) {
  return {
    ...match,
    events: match.events.filter(event => event.id !== eventId),
    updatedAt: new Date().toISOString()
  };
}
