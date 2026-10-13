import type { HubState, Recommendation } from './model';

// Datos del negocio/producto verificados en sus webs; opiniones y notas ilustrativas.
const examples: Recommendation[] = [
  {
    id: 'example-cafe-de-flore',
    category: 'place',
    title: 'Café de Flore',
    opinion: 'Una pausa con café, conversación y una terraza con encanto. De esos sitios que guardaría para una tarde sin prisas en París.',
    rating: 5,
    location: '172 boulevard Saint-Germain, París',
    link: 'https://cafedeflore.fr/en/',
    coverUrl: 'https://cafedeflore.fr/wp-content/uploads/2022/07/cdf_hero1.jpeg',
    createdAt: '2026-10-13T12:00:00Z',
    sample: true,
  },
  {
    id: 'example-ikea-jamlik',
    category: 'product',
    title: 'Vela de vainilla JÄMLIK',
    opinion: 'Vainilla, luz cálida y un buen libro: una combinación para un rincón de lectura acogedor. El vaso de cristal se puede reutilizar cuando se termine.',
    rating: 5,
    priceCents: 199,
    link: 'https://www.ikea.com/es/es/p/jamlik-vela-aromatica-vaso-vainilla-beige-claro-70502178/',
    coverUrl: 'https://www.ikea.com/es/es/images/products/jamlik-vela-aromatica-vaso-vainilla-beige-claro__1060475_pe850035_s5.jpg',
    createdAt: '2026-10-13T11:00:00Z',
    sample: true,
  },
];

export function addExamples(state: HubState): HubState {
  if (state.examplesAdded) return state;
  return { ...state, examplesAdded: true, recommendations: [...examples.filter((example) => !state.recommendations.some((item) => item.id === example.id)), ...state.recommendations] };
}

export function addSongExample(state: HubState): HubState {
  if (state.songExampleAdded) return state;
  return { ...state, songExampleAdded: true, song: state.song || {
    title: 'Yellow', artist: 'Coldplay',
    coverUrl: 'https://i.ytimg.com/vi/yKNxeF4KMsY/hqdefault.jpg',
    link: 'https://www.youtube.com/watch?v=yKNxeF4KMsY',
  } };
}

// Cambio de foto solicitado: una sola vez, para permitir futuras fotos personales.
export function improveStarsideCover(state: HubState): HubState {
  if (state.starsideCoverUpdated) return state;
  const target = state.recommendations.find((item) => item.category === 'book' && item.title.trim().toLowerCase() === 'starside');
  return { ...state, starsideCoverUpdated: true, recommendations: state.recommendations.map((item) => item.id === target?.id ? { ...item, coverUrl: 'https://images.penguinrandomhouse.com/cover/9791387949044' } : item) };
}
