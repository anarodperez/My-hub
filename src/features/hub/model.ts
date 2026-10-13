export type Category = 'book' | 'movie' | 'series' | 'product' | 'place';
export type ThemePreference = 'system' | 'light' | 'dark';
export type Recommendation = { id: string; title: string; category: Category; opinion: string; rating: number; coverUrl: string; createdAt: string; priceCents?: number; location?: string; link?: string; sample?: boolean };
export type CalendarEvent = { id: string; title: string; category: Category; date: string };
export type Wish = { id: string; title: string; category: Category; coverUrl: string; link?: string; completed: boolean };
export type Subscription = { id: string; name: string; amountCents: number; frequency: 'monthly' | 'yearly'; nextDate: string };
export type HubState = {
  version: 1;
  songExampleAdded?: boolean;
  starsideCoverUpdated?: boolean;
  romantasyReleasesAdded?: boolean;
  song?: { title: string; artist: string; coverUrl: string; link?: string };
  examplesAdded?: boolean;
  wishes?: Wish[];
  wishlistVisibility?: 'private' | 'public';
  recommendations: Recommendation[];
  saved: { recommendationId: string; status: 'pending' | 'finished' }[];
  events: CalendarEvent[];
  subscriptions: Subscription[];
  preferences: { name: string; theme: ThemePreference; avatarUri?: string };
};
export const emptyState: HubState = { version: 1, recommendations: [], saved: [], events: [], subscriptions: [], preferences: { name: '', theme: 'system' } };
export function toggleSaved(state: HubState, recommendationId: string): HubState {
  const exists = state.saved.some((item) => item.recommendationId === recommendationId);
  return { ...state, saved: exists ? state.saved.filter((item) => item.recommendationId !== recommendationId) : [...state.saved, { recommendationId, status: 'pending' }] };
}
export const categories: { value: Category; label: string; singular: string }[] = [
  { value: 'book', label: 'Libros', singular: 'Libro' },
  { value: 'movie', label: 'Películas', singular: 'Película' },
  { value: 'series', label: 'Series', singular: 'Serie' },
];
export const recommendationCategories: typeof categories = [
  ...categories,
  { value: 'product', label: 'Compras', singular: 'Compra' },
  { value: 'place', label: 'Sitios', singular: 'Sitio' },
];
export function isWebLink(input: string): boolean {
  try {
    const url = new URL(input);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch { return false; }
}
export function isRating(value: unknown): value is number {
  return typeof value === 'number' && value >= 0.5 && value <= 5 && Number.isInteger(value * 2);
}
export function ratingFromPosition(x: number, width: number): number {
  if (width <= 0 || !Number.isFinite(width) || !Number.isFinite(x)) return 0.5;
  return Math.max(0.5, Math.min(5, Math.ceil((x / width) * 10) / 2));
}
export function parseAmountCents(input: string): number | null {
  const text = input.trim();
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(text)) return null;
  const [whole, decimals = ''] = text.replace(',', '.').split('.');
  const result = Number(whole) * 100 + Number(decimals.padEnd(2, '0'));
  return Number.isSafeInteger(result) ? result : null;
}
export function isLocalDate(input: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return false;
  const [year, month, day] = input.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return year >= 1900 && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}
export function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function calendarDays(year: number, month: number): (string | null)[] {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const days: (string | null)[] = Array(offset).fill(null);
  for (let day = 1; day <= count; day++) days.push(localDate(new Date(year, month, day)));
  while (days.length % 7) days.push(null);
  return days;
}
export function resolveTheme(preference: ThemePreference, system: string | null | undefined): 'light' | 'dark' {
  return preference === 'system' ? system === 'dark' ? 'dark' : 'light' : preference;
}
export const money = (cents: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100);
export const displayDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
const categoryValid = (value: unknown) => recommendationCategories.some((category) => category.value === value);
const recommendationDetailsValid = (value: Record<string, unknown>) =>
  (value.sample === undefined || typeof value.sample === 'boolean') &&
  (value.priceCents === undefined || (Number.isSafeInteger(value.priceCents) && Number(value.priceCents) >= 0)) &&
  (value.location === undefined || typeof value.location === 'string') &&
  (value.link === undefined || (typeof value.link === 'string' && isWebLink(value.link)));
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object';
export function decodeState(raw: string | null): HubState {
  if (raw === null) return emptyState;
  const value: unknown = JSON.parse(raw);
  if (!record(value) || value.version !== 1 || (value.examplesAdded !== undefined && typeof value.examplesAdded !== 'boolean') || !record(value.preferences) || typeof value.preferences.name !== 'string' || !['system', 'light', 'dark'].includes(String(value.preferences.theme)) ||
    (value.songExampleAdded !== undefined && typeof value.songExampleAdded !== 'boolean') ||
    (value.starsideCoverUpdated !== undefined && typeof value.starsideCoverUpdated !== 'boolean') ||
    (value.romantasyReleasesAdded !== undefined && typeof value.romantasyReleasesAdded !== 'boolean') ||
    (value.preferences.avatarUri !== undefined && typeof value.preferences.avatarUri !== 'string') ||
    (value.song !== undefined && (!record(value.song) || typeof value.song.title !== 'string' || !value.song.title.trim() || typeof value.song.artist !== 'string' || !value.song.artist.trim() || typeof value.song.coverUrl !== 'string' || (value.song.link !== undefined && (typeof value.song.link !== 'string' || !isWebLink(value.song.link))))) ||
    (value.wishlistVisibility !== undefined && value.wishlistVisibility !== 'private' && value.wishlistVisibility !== 'public') ||
    (value.wishes !== undefined && (!Array.isArray(value.wishes) || !value.wishes.every((w) => record(w) && typeof w.id === 'string' && typeof w.title === 'string' && categoryValid(w.category) && typeof w.coverUrl === 'string' && typeof w.completed === 'boolean' && (w.link === undefined || (typeof w.link === 'string' && isWebLink(w.link)))))) ||
    !Array.isArray(value.recommendations) || !value.recommendations.every((r) => record(r) && typeof r.id === 'string' && typeof r.title === 'string' && categoryValid(r.category) && typeof r.opinion === 'string' && isRating(r.rating) && typeof r.coverUrl === 'string' && typeof r.createdAt === 'string' && recommendationDetailsValid(r)) ||
    !Array.isArray(value.events) || !value.events.every((e) => record(e) && typeof e.id === 'string' && typeof e.title === 'string' && categoryValid(e.category) && typeof e.date === 'string' && isLocalDate(e.date)) ||
    !Array.isArray(value.subscriptions) || !value.subscriptions.every((s) => record(s) && typeof s.id === 'string' && typeof s.name === 'string' && Number.isSafeInteger(s.amountCents) && Number(s.amountCents) >= 0 && ['monthly', 'yearly'].includes(String(s.frequency)) && typeof s.nextDate === 'string' && isLocalDate(s.nextDate)) ||
    !Array.isArray(value.saved) || !value.saved.every((s) => record(s) && typeof s.recommendationId === 'string' && ['pending', 'finished'].includes(String(s.status)))) throw new Error('No hemos podido leer tus datos. No se ha borrado nada.');
  return value as HubState;
}
