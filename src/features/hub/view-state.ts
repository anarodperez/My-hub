// Transient UI preferences only; no account content or credentials are stored here.
const values = new Map<string, unknown>();
const listeners = new Map<string, Set<() => void>>();
export const viewStateKey = (account: string, screen: string) => JSON.stringify([account, screen]);
export function readViewState<T>(key: string, initial: T): T { return values.has(key) ? values.get(key) as T : initial; }
export function writeViewState<T>(key: string, value: T) {
  if (Object.is(values.get(key), value)) return;
  values.set(key, value);
  listeners.get(key)?.forEach(listener => listener());
}
export function subscribeViewState(key: string, listener: () => void) {
  const subscriptions = listeners.get(key) || new Set<() => void>();
  subscriptions.add(listener); listeners.set(key, subscriptions);
  return () => { subscriptions.delete(listener); if (!subscriptions.size) listeners.delete(key); };
}
