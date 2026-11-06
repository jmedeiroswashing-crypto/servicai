/**
 * O pooler do Supabase na porta 5432 (modo sessão) prende uma vaga por conexão e
 * tem poucas vagas: em hospedagem serverless, poucas instâncias já lotam tudo.
 * A API usa a 6543 (modo transação). As migrações seguem na 5432, que elas exigem.
 */
export function urlDeExecucao(url: string | undefined): string | undefined {
  if (!url) return url;
  const parsed = URL.canParse(url) ? new URL(url) : null;
  if (!parsed || !parsed.hostname.endsWith('.pooler.supabase.com') || parsed.port !== '5432') return url;
  parsed.port = '6543';
  return parsed.toString();
}
