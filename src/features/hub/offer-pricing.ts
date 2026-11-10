export function parseOfferPrice(value: string): number {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(normalized)) throw new Error('Escribe un importe válido, con un máximo de dos decimales.');
  const [whole, decimal = ''] = normalized.split('.');
  const cents = Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
  if (cents < 1 || cents > 99999999) throw new Error('El importe debe estar entre 0,01 y 999.999,99 €.');
  return cents;
}

export function offerPrice(cents: number): string {
  return (cents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}
