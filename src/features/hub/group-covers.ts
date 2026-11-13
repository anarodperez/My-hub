export const groupCoverOptions = [
  { value: 'coffee', label: 'Café entre amigas', source: require('../../../assets/group-covers/coffee.jpg') },
  { value: 'reading', label: 'Entre páginas', source: require('../../../assets/group-covers/reading.jpg') },
  { value: 'flowers', label: 'Flores y planes', source: require('../../../assets/group-covers/flowers.jpg') },
] as const;

export function defaultGroupCover(id: string) {
  const hash = Array.from(id).reduce((value, letter) => (value * 31 + letter.charCodeAt(0)) >>> 0, 0);
  return groupCoverOptions[hash % groupCoverOptions.length];
}

export function getGroupCover(id: string, key?: string | null) {
  return (groupCoverOptions.find(option => option.value === key) || defaultGroupCover(id)).source;
}
