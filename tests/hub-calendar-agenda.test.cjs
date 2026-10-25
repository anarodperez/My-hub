const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getCalendarAgenda } = require('../src/features/hub/calendar-agenda.ts');
test('agrupa fechas, mantiene todos los eventos de un día y separa próximos', () => {
  const events = [
    { id: 'a', title: 'A', date: '2026-10-28', category: 'book' },
    { id: 'b', title: 'B', date: '2026-10-28', category: 'movie' },
    { id: 'c', title: 'C', date: '2026-11-05', category: 'series' },
    { id: 'd', title: 'Pasado', date: '2026-10-01', category: 'book' },
  ];
  const agenda = getCalendarAgenda(events, '2026-10-28', '2026-10', '2026-10-14');
  assert.equal(agenda.monthCount, 3);
  assert.deepEqual(agenda.selectedEvents.map(e => e.id), ['a', 'b']);
  assert.equal(agenda.next.date, '2026-10-28');
  assert.equal(agenda.upcoming[0].date, '2026-11-05');
  assert.equal(agenda.byDate.get('2026-10-28').length, 2);
  assert.deepEqual(events.map(e => e.id), ['a', 'b', 'c', 'd']);
});
test('incluye hoy en próximo plan y limita la agenda a tres fechas', () => {
  const events = ['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'].map((date, i) => ({ id: String(i), date, title: 'Plan', category: 'book' }));
  const agenda = getCalendarAgenda(events, '2026-10-14', '2026-10', '2026-10-14');
  assert.equal(agenda.next.date, '2026-10-14');
  assert.equal(agenda.upcoming.length, 3);
  const empty = getCalendarAgenda([], '2026-10-14', '2026-10', '2026-10-14');
  assert.equal(empty.next, undefined);
  assert.deepEqual(empty.upcoming, []);
  assert.deepEqual(empty.selectedEvents, []);
});

const { calendarCountdown, calendarSwipe } = require('../src/features/hub/calendar-agenda.ts');
test('cuenta dias por fecha civil incluyendo cambio de mes, ano y horario', () => {
 assert.equal(calendarCountdown('2026-10-14', '2026-10-14'), 'Hoy');
 assert.equal(calendarCountdown('2026-11-01', '2026-10-31'), 'Ma\u00f1ana');
 assert.equal(calendarCountdown('2027-01-02', '2026-12-31'), 'Dentro de 2 d\u00edas');
 assert.equal(calendarCountdown('2026-10-26', '2026-10-24'), 'Dentro de 2 d\u00edas');
});
test('solo un deslizamiento horizontal deliberado cambia de mes', () => {
 assert.equal(calendarSwipe(-90, 10), 1);
 assert.equal(calendarSwipe(90, 10), -1);
 assert.equal(calendarSwipe(20, 0), 0);
 assert.equal(calendarSwipe(90, 100), 0);
});
