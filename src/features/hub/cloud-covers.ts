import type { SupabaseClient } from '@supabase/supabase-js';

export function imageMime(bytes: Uint8Array): string {
  if (bytes.length > 10485760) throw new Error('La foto debe ocupar como máximo 10 MB.');
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, i) => bytes[i] === value)) return 'image/png';
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  if (ascii(4, 8) === 'ftyp') {
    const brands = ascii(8, Math.min(bytes.length, 64));
    if (brands.includes('avif')) return 'image/avif';
    if (/heic|heix|hevc|hevx/.test(brands)) return 'image/heic';
  }
  throw new Error('El archivo no es una imagen compatible. Elige JPEG, PNG, WebP, HEIC o AVIF.');
}

export function createCloudCovers(client: SupabaseClient, read: (uri: string) => Promise<Uint8Array>, newId: () => string) {
  return {
    async uploadGif(owner: string, comment: string, uri: string): Promise<string> {
      const bytes = await read(uri);
      if (bytes.length > 5242880) throw new Error('El GIF debe ocupar como máximo 5 MB.');
      const signature = String.fromCharCode(...bytes.slice(0, 6));
      if (bytes.length < 13 || !['GIF87a', 'GIF89a'].includes(signature)) throw new Error('Elige un archivo GIF válido.');
      const width = bytes[6] | (bytes[7] << 8), height = bytes[8] | (bytes[9] << 8);
      if (!width || !height || width * height > 4194304) throw new Error('El GIF debe tener como máximo 4 megapíxeles.');
      const path = `${owner}/${comment}/${newId()}.gif`;
      const { error } = await client.storage.from('comment-gifs').upload(path, bytes, { contentType: 'image/gif', upsert: false });
      if (error) throw new Error(error.message);
      return path;
    },
    async resolveGif(path: string): Promise<string> {
      const { data, error } = await client.storage.from('comment-gifs').createSignedUrl(path, 300);
      if (error || !data?.signedUrl) throw new Error('No se puede acceder al GIF.');
      return data.signedUrl;
    },
    async upload(owner: string, entity: string, uri: string, bucket: 'hub-media' | 'group-media' = 'hub-media', groupId?: string): Promise<string> {
      if (!uri || /^https?:\/\//.test(uri)) return uri;
      const bytes = await read(uri);
      const contentType = imageMime(bytes);
      const path = `${owner}/${groupId ? groupId + '/' : ''}${entity}/${newId()}.${contentType.split('/')[1]}`;
      const { error } = await client.storage.from(bucket).upload(path, bytes, { contentType, upsert: false });
      if (error) throw new Error(error.message);
      return path;
    },
    async resolve(path: string, bucket: 'hub-media' | 'group-media' = 'hub-media'): Promise<string> {
      if (!path || /^https?:\/\//.test(path)) return path;
      const { data, error } = await client.storage.from(bucket).createSignedUrl(path, 3600);
      if (error || !data?.signedUrl) throw new Error(error?.message || 'No se puede acceder a la foto.');
      return data.signedUrl;
    },
  };
}
