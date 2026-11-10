export function giftCountdown(deadline: string, now: number): string {
  const remaining = Date.parse(deadline) - now;
  if (remaining <= 0) return 'Inscripciones cerradas';
  const days = Math.floor(remaining / 86400000);
  if (days) return days === 1 ? 'Queda 1 día' : `Quedan ${days} días`;
  const hours = Math.floor(remaining / 3600000);
  if (hours) return hours === 1 ? 'Queda 1 h' : `Quedan ${hours} h`;
  const minutes = Math.floor(remaining / 60000);
  return minutes ? (minutes === 1 ? 'Queda 1 min' : `Quedan ${minutes} min`) : 'Menos de 1 min';
}
