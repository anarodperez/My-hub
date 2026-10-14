import type { Category, HubState } from './model.ts';

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
