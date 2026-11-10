import type { HubState } from './model.ts';

export type WishlistOrganization = { collections: { id: string; name: string }[]; assignments: Record<string, string> };
export const defaultWishlistOrganization: WishlistOrganization = {
  collections: [{ id: 'personal', name: 'Para mí' }, { id: 'gifts', name: 'Ideas para regalos' }], assignments: {},
};
export const wishlistOrganization = (state: HubState) => state.wishlistOrganization ?? defaultWishlistOrganization;

export function validOrganization(value: unknown): value is WishlistOrganization {
  if (!value || typeof value !== 'object') return false;
  const { collections, assignments } = value as WishlistOrganization;
  if (!Array.isArray(collections) || collections.length > 100 || !assignments || typeof assignments !== 'object' || Array.isArray(assignments)) return false;
  if (!collections.every(c => c && typeof c.id === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(c.id) && !['all', 'unassigned'].includes(c.id) && typeof c.name === 'string' && c.name.trim().length > 0 && c.name.length <= 60)) return false;
  const ids = new Set(collections.map(c => c.id));
  if (ids.size !== collections.length || new Set(collections.map(c => c.name.trim().toLocaleLowerCase('es'))).size !== collections.length) return false;
  return Object.entries(assignments).every(([key, id]) => /^(wish|saved):[\w-]{1,150}$/.test(key) && ids.has(id));
}

export function assignCollection(state: HubState, key: string, collectionId: string): HubState {
  const organization = wishlistOrganization(state);
  if (collectionId === 'unassigned' && !organization.assignments[key]) return state;
  const assignments = { ...organization.assignments };
  if (collectionId === 'unassigned') delete assignments[key];
  else assignments[key] = collectionId;
  const next = { ...organization, assignments };
  if (!validOrganization(next)) throw new Error('Elige una colección válida.');
  return { ...state, wishlistOrganization: next };
}

export function removeCollection(state: HubState, id: string): HubState {
  const organization = wishlistOrganization(state);
  return { ...state, wishlistOrganization: {
    collections: organization.collections.filter(c => c.id !== id),
    assignments: Object.fromEntries(Object.entries(organization.assignments).filter(([, collection]) => collection !== id)),
  } };
}
