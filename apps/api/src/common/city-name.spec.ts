import { describe, expect, it } from 'vitest';
import { normalizeCityName } from './city-name.js';

describe('normalizeCityName', () => {
  it.each([
    ['  cruzeiro   do sul ', 'Cruzeiro do Sul'],
    ['SÃO PAULO', 'São Paulo'],
    ['rio de janeiro', 'Rio de Janeiro'],
    ['xique-xique', 'Xique-Xique'],
    ['embu-guaçu', 'Embu-Guaçu'],
    ['pau-d’arco', 'Pau-D’arco'],
    ['santana do livramento', 'Santana do Livramento'],
    ['São Paulo', 'São Paulo'],
  ])('transforma "%s" em "%s"', (input, expected) => {
    expect(normalizeCityName(input)).toBe(expected);
  });
});
