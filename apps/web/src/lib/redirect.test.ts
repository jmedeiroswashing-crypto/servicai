import { describe, expect, it } from 'vitest';
import { safeNext, withNext } from './redirect';

describe('safeNext', () => {
  it.each(['/solicitar', '/buscar?q=eletricista', '/painel/agenda'])('aceita o caminho interno %s', (value) => {
    expect(safeNext(value)).toBe(value);
  });

  it.each([
    null,
    undefined,
    '',
    'solicitar',
    '//site.com',
    'https://site.com',
    'javascript:alert(1)',
    '/\\site.com',
    '\\\\site.com',
    '/\tsite',
    '/\n/site.com',
  ])('recusa %j', (value) => {
    expect(safeNext(value)).toBeNull();
  });
});

describe('withNext', () => {
  it('não muda o link sem next', () => {
    expect(withNext('/login', null)).toBe('/login');
  });

  it('usa o separador certo', () => {
    expect(withNext('/login', '/a?b=1')).toBe('/login?next=%2Fa%3Fb%3D1');
    expect(withNext('/comecar?tipo=empresario', '/a')).toBe('/comecar?tipo=empresario&next=%2Fa');
  });
});
