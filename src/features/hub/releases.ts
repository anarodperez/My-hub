import type { CalendarEvent, HubState } from './model';

// Ediciones españolas; fechas verificadas en las editoriales el 13/10/2026.
// Fuentes: docs/romantasy-releases-2026-10-13.md.
export const romantasyReleases: CalendarEvent[] = [
  { id: 'release-9788408325338', category: 'book', title: 'Una corte de armonía rota · Sarah J. Maas', date: '2026-10-28' },
  { id: 'release-9788408327271', category: 'book', title: 'Lazos de fuego (Academia Bloodwing 2, edición especial) · Briar Boleyn', date: '2026-10-28' },
  { id: 'release-9788410399327', category: 'book', title: 'Una tempestad para matar un beso · Julia Dippel', date: '2026-10-28' },
  { id: 'release-9791387629977', category: 'book', title: 'La maldad más dulce (La Música del Engaño 1) · Raven Kennedy', date: '2026-11-05' },
];

export function addRomantasyReleases(state: HubState): HubState {
  if (state.romantasyReleasesAdded) return state;
  const additions = romantasyReleases.filter((release) => !state.events.some((event) => event.id === release.id || (event.category === 'book' && event.date === release.date && event.title.trim().toLocaleLowerCase('es-ES') === release.title.toLocaleLowerCase('es-ES'))));
  return { ...state, romantasyReleasesAdded: true, events: [...state.events, ...additions] };
}
