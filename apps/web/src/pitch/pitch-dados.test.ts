import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CONFIG_PITCH,
  DURACAO_TOTAL,
  FIM_ENSAIO_AUTO,
  TELAS,
  TEXTOS,
  contarPalavras,
  inicioDaTela,
  listarPendentes,
  montarTelas,
  palavrasQueCabem,
  telaNoTempo,
} from './pitch-dados';

const README = readFileSync(new URL('../../../../README.md', import.meta.url), 'utf8');

function normalizar(texto: string): string {
  return texto.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

/**
 * Cada item em negrito do Roadmap do README e os termos que o denunciam num texto.
 * Se o README ganhar um item novo, o teste "cobre todo o Roadmap" falha até ele
 * entrar aqui.
 */
const TERMOS_POR_ITEM: Record<string, string[]> = {
  'Flutter/React Native': ['flutter', 'react native', 'app nativo'],
  'Pagamentos reais': ['pagamento', 'pix', 'cartao', 'escrow', 'parcelamento', 'carteira digital'],
  'Selfie/biometria facial': ['selfie', 'biometria'],
  'Sistema antigolpe': ['antigolpe', 'golpe', 'fraude'],
  'Feed estilo TikTok': ['tiktok', 'feed'],
  'Painel de empresa': ['filiais', 'funcionarios', 'crm'],
  'Gamificação': ['gamificacao', 'medalha', 'missoes'],
  'Cobrança recorrente real': ['cobranca recorrente', 'gateway'],
  'Administração de planos completa': ['crud de planos', 'administracao de planos'],
  'Distância real por coordenadas': ['coordenadas', 'distancia real'],
  'Chat por voz/imagem no intake de IA': ['por voz', 'voz/imagem'],
  'Upload de mídia real via object storage (S3 ou similar)': ['object storage', 's3'],
};

function itensDoRoadmap(): string[] {
  const inicio = README.indexOf('## Roadmap');
  const fim = README.indexOf('###', inicio);
  expect(inicio).toBeGreaterThan(-1);
  return [...README.slice(inicio, fim).matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1]);
}

function termosDoRoadmap(): string[] {
  return Object.values(TERMOS_POR_ITEM).flat();
}

describe('roteiro do pitch', () => {
  it('tem 16 telas que somam 180 s', () => {
    expect(TELAS).toHaveLength(16);
    expect(TELAS.reduce((s, t) => s + t.duracao, 0)).toBe(DURACAO_TOTAL);
  });

  it('cada tela começa no tempo do roteiro', () => {
    const inicios = [0, 12, 18, 34, 46, 56, 64, 72, 88, 102, 116, 124, 138, 150, 160, 168];
    expect(TELAS.map((t) => inicioDaTela(t.n))).toEqual(inicios);
    expect(telaNoTempo(0)).toBe(1);
    expect(telaNoTempo(72)).toBe(8);
    expect(telaNoTempo(179.9)).toBe(16);
  });

  it('só as telas 8 a 11 são demo, e cada uma tem roteiro e legenda', () => {
    expect(TELAS.filter((t) => t.tipo === 'demo').map((t) => t.n)).toEqual([8, 9, 10, 11]);
    for (const t of TELAS.filter((x) => x.tipo === 'demo')) {
      expect(t.demo).toBeTruthy();
      expect(t.legenda).toBeTruthy();
    }
  });

  it('nenhuma fala passa do ritmo de 2,3 palavras por segundo', () => {
    for (const t of TELAS) {
      expect(contarPalavras(t.fala), `tela ${t.n}`).toBeLessThanOrEqual(palavrasQueCabem(t));
    }
  });

  it('o ensaio automático termina entre 2:55 e 3:00', () => {
    expect(FIM_ENSAIO_AUTO).toBeGreaterThanOrEqual(175);
    expect(FIM_ENSAIO_AUTO).toBeLessThanOrEqual(180);
  });
});

describe('só mostra como pronto o que o README diz que funciona', () => {
  const termos = termosDoRoadmap();

  it('cobre todo o Roadmap do README', () => {
    expect(itensDoRoadmap().sort()).toEqual(Object.keys(TERMOS_POR_ITEM).sort());
  });

  it('a coluna "Já funciona" não cita nada do Roadmap', () => {
    for (const item of TEXTOS.estagio.jaFunciona) {
      const n = normalizar(item);
      for (const termo of termos) expect(n.includes(termo), `"${item}" cita "${termo}"`).toBe(false);
    }
  });

  it('toda frase que cita o Roadmap diz "próximo"', () => {
    const textos = [
      ...TELAS.map((t) => t.fala),
      ...TELAS.map((t) => t.legenda ?? ''),
      JSON.stringify({ ...TEXTOS, estagio: { proximo: TEXTOS.estagio.proximo } }),
    ];
    for (const texto of textos) {
      for (const frase of texto.split(/(?<=[.!?])\s+|","/)) {
        const n = normalizar(frase);
        const citado = termos.find((t) => n.includes(t));
        if (citado) expect(n, `"${frase}" cita "${citado}" sem "próximo"`).toContain('proximo');
      }
    }
  });
});

describe('campos pendentes', () => {
  it('sem dados, a fala mostra [__] e a lista de pendentes traz os 5 itens', () => {
    expect(CONFIG_PITCH.dadoTela5).toBeNull();
    const pendentes = listarPendentes();
    expect(pendentes).toHaveLength(5);
    expect(TELAS[13].fala).toMatch(/^\[__ /);
    expect(TELAS[14].fala).toMatch(/^\[__ /);
    expect(TELAS[1].fala).toMatch(/^\[__ saudação\]/);
  });

  it('sem fonte, a tela 5 vira a frase e não mostra número', () => {
    const semFonte = montarTelas({ ...CONFIG_PITCH, dadoTela5: { numero: '9', texto: 'x', fala: 'Nove.' }, fonteTela5: null });
    expect(semFonte[4].fala).toBe(TEXTOS.numero.semFonte);
    const comFonte = montarTelas({ ...CONFIG_PITCH, dadoTela5: { numero: '9', texto: 'x', fala: 'Nove.' }, fonteTela5: 'Fonte X' });
    expect(comFonte[4].fala).toBe('Nove.');
  });

  it('preenchendo tudo, não sobra pendente', () => {
    const cheio = {
      ...CONFIG_PITCH,
      equipe: 'Equipe',
      saudacao: 'Boa noite!',
      dadoTela5: { numero: '1', texto: 't', fala: 'f' },
      fonteTela5: 'fonte',
      planoPiloto: { cidade: 'Recife', profissionais: '30', prazo: '3 meses', metricas: ['pedidos'] },
      pedido: 'Pedido.',
    };
    expect(listarPendentes(cheio)).toEqual([]);
    expect(montarTelas(cheio).some((t) => t.fala.includes('[__'))).toBe(false);
  });
});
