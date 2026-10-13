import { decodeState, emptyState, type HubState } from './model.ts';

type Storage = { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<void> };
const KEY = 'my-hub:v1';

export function createLocalStore(storage: Storage) {
  let current = emptyState;
  let ready = false;
  let queue: Promise<unknown> = Promise.resolve();
  return {
    async load() {
      ready = false;
      current = decodeState(await storage.getItem(KEY));
      ready = true;
      return current;
    },
    update(change: (previous: HubState) => HubState): Promise<HubState> {
      const task = queue.then(async () => {
        if (!ready) throw new Error('No podemos guardar hasta recuperar tus datos.');
        const next = change(current);
        await storage.setItem(KEY, JSON.stringify(next));
        current = next;
        return next;
      });
      queue = task.catch(() => {});
      return task;
    },
  };
}
