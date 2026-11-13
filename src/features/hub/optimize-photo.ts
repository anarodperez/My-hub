import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

export async function readImageBytes(uri: string): Promise<Uint8Array> {
  if (Platform.OS !== 'web') return new File(uri).bytes();
  const response = await fetch(uri);
  if (!response.ok) throw new Error('No se pudo leer la foto.');
  return new Uint8Array(await response.arrayBuffer());
}

export async function optimizePhoto(uri: string): Promise<Uint8Array> {
  const context = ImageManipulator.manipulate(uri, { maxWidth: 1280, maxHeight: 1280 });
  let image;
  try {
    image = await context.renderAsync();
    const { width, height } = image;
    if (!(width > 0 && height > 0)) throw new Error('La foto no tiene dimensiones válidas.');
    for (const [maximum, quality] of [[1280, 0.78], [960, 0.65], [720, 0.55]]) {
      const ratio = Math.min(1, maximum / Math.max(width, height));
      image.release();
      image = undefined;
      context.reset().resize({ width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) });
      image = await context.renderAsync();
      const result = await image.saveAsync({ format: SaveFormat.WEBP, compress: quality });
      let bytes;
      try { bytes = await readImageBytes(result.uri); }
      finally {
        // Only the generated cache file is disposable; never delete the source photo.
        try { if (Platform.OS === 'web') URL.revokeObjectURL(result.uri); else new File(result.uri).delete(); } catch { /* The OS can reclaim the cache file. */ }
      }
      if (bytes.length <= 256 * 1024) return bytes;
    }
    throw new Error('No se pudo reducir la foto a 256 KB. Prueba con otra imagen.');
  } finally { image?.release(); context.release(); }
}
