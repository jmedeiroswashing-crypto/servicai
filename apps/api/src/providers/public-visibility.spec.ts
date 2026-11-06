import { describe, expect, it } from 'vitest';
import { computeProfileComplete, isTestName, isValidPublicCity } from './public-visibility.js';

const complete = {
  name: 'Maria Souza',
  avatarUrl: 'https://exemplo.com/foto.jpg',
  specialty: 'Eletricista residencial',
  categories: ['Eletricista'],
  city: 'Recife',
};

describe('isTestName', () => {
  it.each(['Teste', 'Teste Plano', 'Responsavel Teste', 'Conta TEST', 'testes'])('reconhece "%s"', (name) => {
    expect(isTestName(name)).toBe(true);
  });

  it.each(['Maria Testoni', 'Celeste Lima', 'Contestado Silva', 'João Batista'])('não esconde "%s"', (name) => {
    expect(isTestName(name)).toBe(false);
  });
});

describe('isValidPublicCity', () => {
  it('aceita cidade real', () => {
    expect(isValidPublicCity('Cruzeiro do Sul')).toBe(true);
  });

  it.each(['', '  ', 'Não informado', 'não informado', 'S�o Paulo'])('recusa "%s"', (city) => {
    expect(isValidPublicCity(city)).toBe(false);
  });
});

describe('computeProfileComplete', () => {
  it('aceita perfil com todos os dados', () => {
    expect(computeProfileComplete(complete)).toBe(true);
  });

  it.each([
    ['sem foto', { avatarUrl: null }],
    ['profissão a definir', { specialty: 'A definir' }],
    ['sem profissão', { specialty: '  ' }],
    ['sem categoria', { categories: [] }],
    ['cidade não informada', { city: 'Não informado' }],
    ['nome corrompido', { name: 'Jo�o' }],
  ])('recusa perfil %s', (_label, change) => {
    expect(computeProfileComplete({ ...complete, ...change })).toBe(false);
  });
});
