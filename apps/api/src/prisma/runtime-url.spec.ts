import { describe, expect, it } from 'vitest';
import { urlDeExecucao } from './runtime-url.js';

describe('urlDeExecucao', () => {
  it('troca o modo sessão do Supabase pelo modo transação', () => {
    expect(urlDeExecucao('postgresql://u:p@aws-0-sa-east-1.pooler.supabase.com:5432/postgres')).toBe(
      'postgresql://u:p@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
    );
  });

  it('preserva a senha já codificada', () => {
    expect(urlDeExecucao('postgresql://u:a%40b%23c@x.pooler.supabase.com:5432/postgres')).toContain(':a%40b%23c@');
  });

  it('não mexe em outros bancos nem em quem já usa a 6543', () => {
    const local = 'postgresql://u:p@localhost:5432/servicai';
    const transacao = 'postgresql://u:p@x.pooler.supabase.com:6543/postgres';
    expect(urlDeExecucao(local)).toBe(local);
    expect(urlDeExecucao(transacao)).toBe(transacao);
  });

  it('aceita variável ausente ou inválida sem quebrar', () => {
    expect(urlDeExecucao(undefined)).toBeUndefined();
    expect(urlDeExecucao('nao-e-url')).toBe('nao-e-url');
  });
});
