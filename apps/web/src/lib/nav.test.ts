import { describe, expect, it } from 'vitest';
import { getAccountMenu, getBottomNav, getHeaderLinks, getSectionTabs, isChromeHidden, isItemActive } from './nav';

const labels = (items: { label: string }[]) => items.map((item) => item.label);

describe('menus por perfil', () => {
  it('empresário completo tem no máximo 5 itens', () => {
    expect(labels(getHeaderLinks('PRESTADOR', 'COMPLETO'))).toEqual(['Início', 'Agenda', 'Clientes', 'Dinheiro', 'Mensagens']);
  });

  it('conta antiga sem modo escolhido usa o menu completo', () => {
    expect(labels(getHeaderLinks('PRESTADOR', null))).toEqual(labels(getHeaderLinks('PRESTADOR', 'COMPLETO')));
  });

  it('só gestão não vê busca de clientes nem mensagens', () => {
    expect(labels(getHeaderLinks('PRESTADOR', 'GESTAO'))).toEqual(['Agenda', 'Clientes', 'Dinheiro']);
    expect(getSectionTabs('/painel/clientes', 'PRESTADOR', 'GESTAO')).toEqual([]);
  });

  it('só contratação não vê as telas de dinheiro', () => {
    expect(labels(getHeaderLinks('PRESTADOR', 'CONTRATACAO'))).toEqual(['Início', 'Agenda', 'Novos clientes', 'Mensagens']);
    expect(getSectionTabs('/painel/caixa', 'PRESTADOR', 'CONTRATACAO')).toEqual([]);
  });

  it('barra inferior de cliente e visitante tem Publicar em destaque no centro', () => {
    for (const role of ['CLIENTE', undefined] as const) {
      const items = getBottomNav(role);
      expect(items).toHaveLength(5);
      expect(items[2]).toMatchObject({ label: 'Publicar', primary: true });
    }
    expect(getBottomNav(undefined)[4].href).toBe('/login');
    expect(getBottomNav(undefined).map((item) => item.href)).not.toContain('/mensagens');
    expect(getBottomNav('CLIENTE')[4].href).toBe('/perfil');
  });

  it('menu do cliente tem os itens pedidos', () => {
    expect(labels(getAccountMenu('CLIENTE'))).toEqual(
      expect.arrayContaining(['Minhas solicitações', 'Minhas reservas', 'Meu perfil', 'Configurações']),
    );
  });

  it('nenhum menu de prestador perde as funções antigas', () => {
    const reachable = [
      ...getHeaderLinks('PRESTADOR', 'COMPLETO').flatMap((item) => [item.href, ...(item.match ?? [])]),
      ...getAccountMenu('PRESTADOR', 'COMPLETO').map((item) => item.href),
    ];
    for (const route of ['/painel/caixa', '/painel/calendario', '/painel/faturamento', '/painel/clientes', '/painel/conseguir-clientes', '/painel/perfil', '/painel/plano', '/perfil']) {
      expect(reachable).toContain(route);
    }
  });
});

describe('isItemActive', () => {
  it('marca Dinheiro nas três telas do grupo', () => {
    const dinheiro = getHeaderLinks('PRESTADOR', 'COMPLETO').find((item) => item.label === 'Dinheiro')!;
    for (const path of ['/painel/caixa', '/painel/calendario', '/painel/faturamento']) {
      expect(isItemActive(path, dinheiro)).toBe(true);
    }
    expect(isItemActive('/painel/agenda', dinheiro)).toBe(false);
  });
});

describe('isChromeHidden', () => {
  it.each(['/login', '/login/cliente', '/login/empresario', '/cadastro', '/comecar', '/conserto', '/conserto/login'])(
    'esconde a navegação em %s',
    (path) => expect(isChromeHidden(path)).toBe(true),
  );

  it.each(['/', '/buscar', '/loginho', '/consertos', '/painel'])('mantém a navegação em %s', (path) => {
    expect(isChromeHidden(path)).toBe(false);
  });
});
