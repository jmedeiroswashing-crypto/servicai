/**
 * CORS_ORIGIN aceita uma lista separada por vírgula (ex: para liberar o site E o
 * app nativo ao mesmo tempo). As origens do Capacitor (apps Android/iOS
 * empacotados com o site) são sempre liberadas, já que não são configuráveis
 * pelo usuário final e não têm risco de CSRF entre sites como um domínio público teria.
 *
 * Usado tanto pelo bootstrap HTTP (main.ts / api/index.js) quanto pelos gateways
 * WebSocket — os três precisam da mesma lista para o app funcionar por completo.
 */
export function resolveCorsOrigins(configuredValue?: string | null): string[] {
  const configuredOrigins = (configuredValue ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const capacitorOrigins = ['capacitor://localhost', 'https://localhost', 'http://localhost'];
  return [...new Set([...configuredOrigins, ...capacitorOrigins])];
}
