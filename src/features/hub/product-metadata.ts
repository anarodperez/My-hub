import { parseAmountCents } from './model.ts';

export type ProductMetadata = { title: string; coverUrl: string; amount: string };
const manual = 'No se pudieron leer los datos. Puedes rellenarlos manualmente.';
const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';

export function productLink(value: string): string {
  try {
    const url = new URL(value.trim());
    const host = url.hostname;
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port || !host.includes('.') || /[:\[\]]/.test(host) || /^[\d.]+$/.test(host) || /\.(local|localhost|internal|test|invalid)$/i.test(host) || value.length > 2000) return '';
    url.hash = '';
    return url.href;
  } catch { return ''; }
}

function findProduct(value: unknown, depth = 0): Record<string, unknown> | undefined {
  if (depth > 10) return;
  if (Array.isArray(value)) return value.map(item => findProduct(item, depth + 1)).find(Boolean);
  const item = record(value);
  const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
  if (types.includes('Product')) return item;
  return item['@graph'] ? findProduct(item['@graph'], depth + 1) : undefined;
}

export async function fetchProductMetadata(link: string, signal?: AbortSignal, request: typeof fetch = fetch): Promise<ProductMetadata> {
  const url = productLink(link);
  if (!url) throw new Error('Usa un enlace público completo http o https, sin credenciales.');
  // shortcut: cuota gratuita de Microlink; pasar a un servicio propio si el uso habitual supera el límite.
  const endpoint = new URL('https://api.microlink.io');
  endpoint.searchParams.set('url', url);
  endpoint.searchParams.set('data.structured.selectorAll', 'script[type="application/ld+json"]');
  endpoint.searchParams.set('data.structured.attr', 'text');
  endpoint.searchParams.set('data.price.selector', 'meta[property="product:price:amount"], meta[property="og:price:amount"], meta[itemprop="price"]');
  endpoint.searchParams.set('data.price.attr', 'content');
  endpoint.searchParams.set('data.currency.selector', 'meta[property="product:price:currency"], meta[property="og:price:currency"], meta[itemprop="priceCurrency"]');
  endpoint.searchParams.set('data.currency.attr', 'content');
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort);
  if (signal?.aborted) abort();
  const timeout = setTimeout(abort, 20000);
  try {
    const response = await request(endpoint.href, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (response.status === 429) throw new Error('Se ha alcanzado el límite de consultas. Prueba más tarde o rellena los datos manualmente.');
    if (!response.ok) throw new Error(manual);
    const body = record(await response.json());
    if (body.status !== 'success') throw new Error(manual);
    const data = record(body.data);
    let product: Record<string, unknown> = {};
    for (const raw of Array.isArray(data.structured) ? data.structured : []) {
      try { const found = findProduct(typeof raw === 'string' ? JSON.parse(raw) : raw); if (found) { product = found; break; } } catch { /* Una etiqueta inválida no descarta el resto de la página. */ }
    }
    const offer = record(Array.isArray(product.offers) ? product.offers[0] : product.offers);
    const rawPrice = offer.price ?? data.price;
    const currency = text(offer.priceCurrency ?? data.currency).toUpperCase();
    const cents = currency === 'EUR' ? parseAmountCents(typeof rawPrice === 'number' ? String(rawPrice) : text(rawPrice)) : null;
    const image = Array.isArray(product.image) ? product.image[0] : product.image;
    const result = {
      title: (text(product.name) || text(data.title)).slice(0, 150),
      coverUrl: productLink(text(image) || text(record(image).url) || text(record(image).contentUrl)) || productLink(text(record(data.image).url)),
      amount: cents === null ? '' : (cents / 100).toFixed(2).replace('.', ','),
    };
    if (!result.title && !result.coverUrl && !result.amount) throw new Error(manual);
    return result;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
