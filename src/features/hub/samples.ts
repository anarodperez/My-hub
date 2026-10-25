import type { Category, HubState, Recommendation } from './model';

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

// Ejemplos ilustrativos solicitados para revisar las vistas; se insertan una sola vez.
export function addPreviewExamples(state: HubState): HubState {
  if (state.previewExamplesAdded) return state;
  const photo = (id: string) => 'https://images.unsplash.com/' + id + '?auto=format&fit=crop&w=640&q=80';
  const books = photo('photo-1544947950-fa07a98d237f');
  const cinema = photo('photo-1489599849927-2ee91cede3ba');
  const cafe = photo('photo-1501339847302-ac426a4a7cbb');
  const nature = photo('photo-1441974231531-c6227db76b6e');
  const entries: { title: string; category: Category; coverUrl: string }[] = [
    { title: 'Una librer\u00eda junto al mar', category: 'book', coverUrl: books },
    { title: 'El jard\u00edn de las historias pendientes', category: 'book', coverUrl: '' },
    { title: 'Una noche de cine bajo las estrellas', category: 'movie', coverUrl: cinema },
    { title: 'Domingo de pel\u00edcula y manta', category: 'movie', coverUrl: '' },
    { title: 'Una serie para perder la noci\u00f3n del tiempo', category: 'series', coverUrl: cinema },
    { title: 'El misterio de la casa del lago', category: 'series', coverUrl: nature },
    { title: 'Una taza para mi rinc\u00f3n de lectura', category: 'product', coverUrl: cafe },
    { title: 'Cuaderno de peque\u00f1os planes', category: 'product', coverUrl: '' },
    { title: 'Una cafeter\u00eda con libros y ventanales', category: 'place', coverUrl: cafe },
    { title: 'Escapada a un bosque en oto\u00f1o', category: 'place', coverUrl: nature },
  ];
  const wishes = entries.map((entry, index) => ({ ...entry, id: 'preview-wish-' + index, completed: index === 3 || index === 7 }));
  const recommendations: Recommendation[] = entries.filter((_, index) => [0, 2, 4, 8].includes(index)).map((entry, index) => ({ ...entry, id: 'preview-recommendation-' + index, opinion: ['Una historia para leer despacio, con una taza caliente y sin mirar el reloj.', 'Luces apagadas, palomitas y un final que da para conversar un buen rato.', 'De esas historias en las que un cap\u00edtulo m\u00e1s nunca parece suficiente.', 'Una mesa junto a la ventana y una tarde sin prisa.'][index], rating: index % 2 ? 4 : 5, createdAt: '2026-10-14T12:00:00Z', sample: true }));
  const upcomingDate = (offset: number) => { const day = new Date(); day.setDate(day.getDate() + offset); return day.getFullYear() + '-' + String(day.getMonth() + 1).padStart(2, '0') + '-' + String(day.getDate()).padStart(2, '0'); };
  const events = [
    { id: 'preview-event-book', title: 'Club de lectura: una tarde entre p\u00e1ginas', category: 'book' as const, date: upcomingDate(2) },
    { id: 'preview-event-movie', title: 'Noche de cine con palomitas', category: 'movie' as const, date: upcomingDate(2) },
    { id: 'preview-event-series', title: 'Estreno de nuestra pr\u00f3xima serie', category: 'series' as const, date: upcomingDate(5) },
    { id: 'preview-event-book-2', title: 'Visita a la feria del libro', category: 'book' as const, date: upcomingDate(9) },
  ];
  return { ...state, previewExamplesAdded: true,
    wishes: [...(state.wishes || []), ...wishes.filter((entry) => !(state.wishes || []).some((item) => item.id === entry.id))],
    recommendations: [...recommendations.filter((entry) => !state.recommendations.some((item) => item.id === entry.id)), ...state.recommendations],
    saved: [...state.saved, ...recommendations.filter((entry) => !state.saved.some((item) => item.recommendationId === entry.id)).map((entry) => ({ recommendationId: entry.id, status: 'pending' as const }))],
    events: [...state.events, ...events.filter((entry) => !state.events.some((item) => item.id === entry.id))],
  };
}

const previewPhotoIds = [
  'photo-1544947950-fa07a98d237f',
  'photo-1636557194004-94c67de591ea',
  'photo-1489599849927-2ee91cede3ba',
  'photo-1489599849927-2ee91cede3ba',
  'photo-1470748085385-5fbb3018c796',
  'photo-1698606974842-792d162b4f45',
  'photo-1645021790494-182818c51e73',
  'photo-1637689113621-73951984fcc1',
  'photo-1501339847302-ac426a4a7cbb',
  'photo-1441974231531-c6227db76b6e',
];

export function improvePreviewPhotos(state: HubState): HubState {
  if (state.previewPhotosAdded) return state;
  const oldPhotos = ['', ...['photo-1544947950-fa07a98d237f', 'photo-1489599849927-2ee91cede3ba', 'photo-1501339847302-ac426a4a7cbb', 'photo-1441974231531-c6227db76b6e'].map((id) => 'https://images.unsplash.com/' + id + '?auto=format&fit=crop&w=640&q=80')];
  const withPhoto = <T extends { id: string; coverUrl: string }>(item: T, prefix: string, indexes?: number[]): T => {
    if (!item.id.startsWith(prefix) || !oldPhotos.includes(item.coverUrl)) return item;
    const suffix = item.id.slice(prefix.length);
    if (!/^\d+$/.test(suffix)) return item;
    const index = Number(suffix);
    const photoId = previewPhotoIds[indexes ? indexes[index] : index];
    return photoId ? { ...item, coverUrl: 'https://images.unsplash.com/' + photoId + '?auto=format&fit=crop&w=640&q=85' } : item;
  };
  return { ...state, previewPhotosAdded: true,
    wishes: (state.wishes || []).map((item) => withPhoto(item, 'preview-wish-')),
    recommendations: state.recommendations.map((item) => withPhoto(item, 'preview-recommendation-', [0, 2, 4, 8])),
  };
}
