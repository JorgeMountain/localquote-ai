const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizePasswordResetEmail(value: string) {
  const email = value.trim().toLowerCase();
  return emailPattern.test(email) ? email : null;
}

export function buildPasswordResetRedirect(origin: string) {
  return new URL("/auth/callback?next=/update-password", origin).toString();
}
