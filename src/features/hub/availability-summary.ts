import type { AvailabilityPeriod, AvailabilityRow } from './backend-types.ts';

export function availabilitySummary(rows: AvailabilityRow[], members: string[], day: string, period: AvailabilityPeriod) {
  const answers = new Map(rows.filter(row => row.available_date === day && row.period === period).map(row => [row.owner_id, row.available !== false]));
  const people = [...new Set(members)];
  return {
    free: people.filter(id => answers.get(id) === true),
    busy: people.filter(id => answers.get(id) === false),
    unknown: people.filter(id => !answers.has(id)),
  };
}
