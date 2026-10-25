import type { Category, HubState } from './model.ts';

export function filterCollection<T extends { title: string; category: Category; rating?: number }>(items: T[], query: string, category: Category | 'all', minimumRating = 0): T[] {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
  const term = normalize(query);
  return items.filter(item => normalize(item.title).includes(term) && (category === 'all' || item.category === category) && (!minimumRating || (item.rating ?? 0) >= minimumRating));
}

export function selectWishlist(state: HubState, status: 'pending' | 'finished', category: Category | 'all') {
  const byId = new Map(state.recommendations.map((item) => [item.id, item]));
  const saved = state.saved.flatMap((entry) => {
    const item = byId.get(entry.recommendationId);
    return item ? [{ item, status: entry.status }] : [];
  });
  const allWishes = state.wishes || [];
  const counts = {
    pending: saved.filter((entry) => entry.status === 'pending').length + allWishes.filter((wish) => !wish.completed).length,
    finished: saved.filter((entry) => entry.status === 'finished').length + allWishes.filter((wish) => wish.completed).length,
  };
  return {
    counts,
    totalForStatus: counts[status],
    recommendations: saved.filter((entry) => entry.status === status && (category === 'all' || entry.item.category === category)).map((entry) => entry.item),
    wishes: allWishes.filter((wish) => wish.completed === (status === 'finished') && (category === 'all' || wish.category === category)),
  };
}

export function pickSurprise<T extends { key: string }>(options: T[], previous = '', random = Math.random): T | undefined {
  const available = options.length > 1 ? options.filter((option) => option.key !== previous) : options;
  return available[Math.floor(random() * available.length)];
}
