export type Moment = { category: 'series' | 'movie' | 'book'; title: string; status: 'current' | 'finished'; coverUrl: string; coverPath?: string };

export const momentCategories = [
  { value: 'series', label: 'Serie', current: 'Estoy viendo', finished: 'Última serie vista' },
  { value: 'movie', label: 'Película', current: 'Estoy viendo', finished: 'Última película vista' },
  { value: 'book', label: 'Libro', current: 'Estoy leyendo', finished: 'Último libro leído' },
] as const;

export function validMoments(value: unknown): value is Moment[] {
  return Array.isArray(value) && value.length <= 3 && new Set(value.map(item => item?.category)).size === value.length && value.every(item =>
    item && typeof item === 'object' && momentCategories.some(category => category.value === item.category) &&
    typeof item.title === 'string' && item.title.trim().length > 0 && item.title.length <= 150 &&
    ['current', 'finished'].includes(item.status) && typeof item.coverUrl === 'string' &&
    (item.coverPath === undefined || typeof item.coverPath === 'string' && item.coverPath.length <= 4000));
}
