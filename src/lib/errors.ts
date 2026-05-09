export function getErrorMessage(error: unknown, fallback = 'Errore sconosciuto') {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return fallback;
}
