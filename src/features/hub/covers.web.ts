export async function persistCover(uri: string): Promise<string> {
  if (uri.startsWith('data:')) return uri;
  const response = await fetch(uri);
  if (!response.ok) throw new Error('No se ha podido leer la foto.');
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Foto no válida.'));
    reader.onerror = () => reject(new Error('No se ha podido leer la foto.'));
    reader.readAsDataURL(blob);
  });
}

export function discardCover(_uri: string): void {
  // En web la foto forma parte del documento local, sin un archivo separado.
}
