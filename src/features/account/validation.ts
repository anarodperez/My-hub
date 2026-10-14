export function validateCredentials(email: string, password: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Introduce un correo válido.';
  if (!password) return 'Introduce tu contraseña.';
  return null;
}
export function validateNewPassword(password: string, confirmation: string): string | null {
  if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
  if (password !== confirmation) return 'Las contraseñas no coinciden.';
  return null;
}
