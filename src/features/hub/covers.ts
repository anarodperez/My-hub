import { Directory, File, Paths } from 'expo-file-system';

const covers = () => new Directory(Paths.document, 'my-hub-covers');

export async function persistCover(uri: string): Promise<string> {
  const directory = covers();
  directory.create({ idempotent: true, intermediates: true });
  const source = new File(uri);
  const destination = new File(directory, `${Date.now()}-${Math.random().toString(36).slice(2)}${source.extension || '.jpg'}`);
  source.copy(destination);
  return destination.uri;
}

export function discardCover(uri: string): void {
  if (!uri.startsWith(`${covers().uri.replace(/\/+$/, '')}/`)) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // La recomendación ya está guardada; una limpieza fallida no debe revertirla.
  }
}
