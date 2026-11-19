import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CONFIG_PITCH,
  DURACAO_TOTAL,
  FIM_ENSAIO_AUTO,
  TELAS,
  TELAS_DEMO,
  TEXTOS,
  contarPalavras,
  falaLimpa,
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

describe('roteiro do pitch (Problema → Solução → Execução)', () => {
  it('segue a ordem do roteiro do apresentador', () => {
    expect(TELAS.map((t) => t.id)).toEqual([
      'problema',
      'onde',
      'quem-sofre',
      'evidencia',
      'consequencia',
      'solucao',
      'demo-pedido',
      'demo-resposta',
      'demo-gestao',
      'beneficiados',
      'por-que-resolve',
      'resultado',
      'etapas',
      'recursos',
      'quem-onde',
      'metricas',
      'fechamento',
    ]);
    const secoes = TELAS.map((t) => t.secao);
    expect(secoes.indexOf('Solução')).toBeGreaterThan(secoes.lastIndexOf('Problema'));
    expect(secoes.indexOf('Execução')).toBeGreaterThan(secoes.lastIndexOf('Solução'));
  });

  it('as falas são o texto do apresentador, palavra por palavra', () => {
    const texto = falaLimpa(TELAS.map((t) => t.fala).join(' '));
    for (const trecho of [
      'O problema é que quem trabalha prestando serviço em Cruzeiro do Sul depende quase só de recomendação para conseguir cliente, e não tem nenhuma estrutura para organizar o próprio trabalho.',
      'Eletricista, encanador, diarista, pedreiro, manicure: todo mundo vive do boca a boca e do WhatsApp.',
      'segundo o IBGE, mais da metade dos trabalhadores da Região Norte está na informalidade.',
      'Se nada for feito, o bom profissional continua invisível, perde cliente e dinheiro, e o morador continua contratando no escuro.',
      'Funciona assim: o cliente busca um profissional ou envia um pedido, e os prestadores recebem e respondem pelo app.',
      'o controle de entradas e saídas, as metas e as finanças calculadas automaticamente.',
      'O resultado esperado é mais clientes e mais renda para quem presta o serviço, e atendimento mais rápido e confiável para quem contrata.',
      'Depois, ampliar os tipos de serviço e levar o ServiçAi para outras cidades do Juruá.',
      'Quem vai fazer sou eu, João Washing, cuidando do desenvolvimento e da operação.',
      'o tempo até o cliente ser atendido e a nota média das avaliações.',
      'ServiçAi: toda a estrutura do prestador em um lugar só. Obrigado!',
    ]) {
      expect(texto).toContain(trecho);
    }
  });

  it('a duração total é a soma das telas', () => {
    expect(TELAS.reduce((s, t) => s + t.duracao, 0)).toBe(DURACAO_TOTAL);
    expect(inicioDaTela(1)).toBe(0);
    expect(telaNoTempo(0)).toBe(1);
    expect(telaNoTempo(DURACAO_TOTAL - 0.1)).toBe(TELAS.length);
    expect(FIM_ENSAIO_AUTO).toBe(DURACAO_TOTAL - 1);
  });

  it('as demos são as telas da solução que mostram o app, em sequência', () => {
    expect(TELAS_DEMO).toEqual([7, 8, 9]);
    expect(TELAS.filter((t) => t.tipo === 'demo').map((t) => t.demo)).toEqual(['pedido', 'proposta', 'gestao']);
    for (const t of TELAS.filter((x) => x.tipo === 'demo')) expect(t.legenda).toBeTruthy();
  });

  it('nenhuma fala passa do ritmo de 2,3 palavras por segundo', () => {
    for (const t of TELAS) {
      expect(contarPalavras(t.fala), `tela ${t.n}`).toBeLessThanOrEqual(palavrasQueCabem(t));
    }
  });
});

describe('só mostra como pronto o que o README diz que funciona', () => {
  const termos = Object.values(TERMOS_POR_ITEM).flat();

  it('cobre todo o Roadmap do README', () => {
    expect(itensDoRoadmap().sort()).toEqual(Object.keys(TERMOS_POR_ITEM).sort());
  });

  it('nenhuma fala, legenda ou texto de tela cita o Roadmap', () => {
    const textos = [...TELAS.map((t) => t.fala), ...TELAS.map((t) => t.legenda ?? ''), JSON.stringify(TEXTOS)];
    for (const texto of textos) {
      const n = normalizar(texto);
      for (const termo of termos) expect(n.includes(termo), `cita "${termo}"`).toBe(false);
    }
  });
});

describe('campos pendentes', () => {
  it('sem o caso real, a fala mostra [__] e ele aparece na lista de pendentes', () => {
    expect(CONFIG_PITCH.casoReal).toBeNull();
    expect(listarPendentes()).toHaveLength(1);
    expect(TELAS[3].fala).toMatch(/\[__ um caso real/);
  });

  it('preenchendo o caso real, não sobra pendente', () => {
    const cheio = { ...CONFIG_PITCH, casoReal: 'Vi um eletricista ótimo sem cliente nenhum.' };
    expect(listarPendentes(cheio)).toEqual([]);
    expect(montarTelas(cheio).some((t) => t.fala.includes('[__'))).toBe(false);
  });
});
