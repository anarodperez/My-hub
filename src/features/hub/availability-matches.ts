import type { AvailabilityPeriod, AvailabilityRow } from './backend-types.ts';

export function availabilityMatches(rows: Pick<AvailabilityRow, 'owner_id' | 'available_date' | 'period'>[], members: string[], today: string) {
  const current = new Set(members);
  const groups = new Map<string, { date: string; period: AvailabilityPeriod; people: Set<string> }>();
  for (const row of rows) {
    if (!current.has(row.owner_id) || row.available_date < today) continue;
    const key = `${row.available_date}:${row.period}`;
    const match = groups.get(key) || { date: row.available_date, period: row.period, people: new Set<string>() };
    match.people.add(row.owner_id); groups.set(key, match);
  }
  const periods: AvailabilityPeriod[] = ['morning', 'afternoon', 'evening'];
  return [...groups.values()].filter(match => match.people.size > 1)
    .map(match => ({ ...match, people: [...match.people].sort() }))
    .sort((a, b) => b.people.length - a.people.length || a.date.localeCompare(b.date) || periods.indexOf(a.period) - periods.indexOf(b.period));
}
