export function validDriverPassword(password: string): boolean {
  return password.length >= 10 && new TextEncoder().encode(password).length <= 72;
}
