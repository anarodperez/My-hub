export function createSessionGuard() {
  let generation = 0;
  return { next: () => ++generation, isCurrent: (value: number) => value === generation };
}
