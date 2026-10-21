export function extractErrorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  const message = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (!message) return fallback;
  return Array.isArray(message) ? message.join(', ') : message;
}
