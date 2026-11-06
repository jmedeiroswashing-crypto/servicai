import { describe, expect, it } from 'vitest';
import type { Booking, ClientSummary, Expense, Income } from '../types';
import { gerarCsv, reciboHtml } from './exportar';
import { MODULOS, menuDe, moduloDaRota } from './modulos';
import { agrupar, alertasDoDia, aReceber, atrasado, lerDescricao, mensagensDoDia, montarDescricao, primeiroDia, resumo, serie } from './numeros';
import { dataParaApi, diaDe, intervalo } from './periodo';

const local = (dia: string) => new Date(`${dia}T12:00:00`).toISOString();
const income = (dia: string, amount: number, source: Income['source'] = 'MANUAL'): Income => ({ id: dia + amount, description: 'Serviço', amount, date: local(dia), createdAt: local(dia), source });
const expense = (dia: string, amount: number, category = 'Outro'): Expense => ({ id: dia + amount, description: 'Conta', category, amount, date: local(dia), createdAt: local(dia), isRecurring: false });
const booking = (extra: Partial<Booking>): Booking => ({ id: 'b1', status: 'SOLICITADO', createdAt: local('2026-11-01'), ...extra });

describe('intervalo', () => {
  it('compara "este mês" com o mesmo ponto do mês anterior', () => {
    const iv = intervalo({ tipo: 'mes' }, '2026-11-06');
    expect(iv).toMatchObject({ de: '2026-11-01', ate: '2026-11-06', ant: { de: '2026-10-01', ate: '2026-10-06' }, dias: 6 });
  });

  it('no dia 31, o período anterior não invade o mês atual', () => {
    const iv = intervalo({ tipo: 'mes' }, '2026-03-31');
    expect(iv.ant).toEqual({ de: '2026-02-01', ate: '2026-02-28' });
  });

  it('compara um dia com o mesmo dia da semana passada', () => {
    expect(intervalo({ tipo: 'hoje' }, '2026-11-06').ant).toEqual({ de: '2026-10-30', ate: '2026-10-30' });
  });

  it('não aceita período livre com o fim antes do início', () => {
    const iv = intervalo({ tipo: 'livre', de: '2026-11-05', ate: '2026-11-01' }, '2026-11-06');
    expect(iv).toMatchObject({ de: '2026-11-05', ate: '2026-11-05', dias: 1 });
  });

  it('mantém o dia escolhido ao enviar para a API', () => {
    expect(diaDe(dataParaApi('2026-11-06'))).toBe('2026-11-06');
  });
});

describe('resumo e série', () => {
  const incomes = [income('2026-11-02', 100), income('2026-11-03', 300, 'RESERVA'), income('2026-10-30', 999)];
  const expenses = [expense('2026-11-02', 50), expense('2026-10-01', 777)];

  it('soma cada receita uma vez e desconta só as despesas do período', () => {
    expect(resumo(incomes, expenses, '2026-11-01', '2026-11-06')).toEqual({ faturamento: 400, despesas: 50, lucro: 350, servicos: 2, ticket: 200 });
  });

  it('não divide por zero sem nenhum serviço', () => {
    expect(resumo([], [], '2026-11-01', '2026-11-06')).toMatchObject({ faturamento: 0, ticket: 0, lucro: 0 });
  });

  it('agrupa por dia até 31 dias e soma por semana acima disso', () => {
    const porDia = serie(incomes, expenses, '2026-11-01', '2026-11-06');
    expect(porDia.passo).toBe(1);
    expect(porDia.pontos).toHaveLength(6);
    expect(porDia.pontos[1]).toMatchObject({ dia: '2026-11-02', fat: 100, desp: 50, lucro: 50 });

    const porSemana = serie(incomes, expenses, '2026-09-01', '2026-11-06');
    expect(porSemana.passo).toBe(7);
    expect(porSemana.pontos.reduce((t, p) => t + p.fat, 0)).toBe(1399);
  });

  it('agrupa por mês em períodos longos sem perder valores', () => {
    const anual = serie(incomes, expenses, '2026-01-01', '2026-11-06');
    expect(anual.passo).toBe(30);
    expect(anual.pontos).toHaveLength(11);
    expect(anual.pontos.reduce((t, p) => t + p.desp, 0)).toBe(827);
  });

  it('começa o "Desde o início" no primeiro movimento', () => {
    expect(primeiroDia(incomes, expenses, '2026-11-06')).toBe('2026-10-01');
    expect(primeiroDia([], [], '2026-11-06')).toBe('2026-11-06');
  });

  it('agrupa e ordena do maior para o menor', () => {
    const grupos = agrupar([expense('2026-11-01', 10, 'Luz'), expense('2026-11-02', 40, 'Água'), expense('2026-11-03', 5, 'Luz')], (e) => e.category, (e) => e.amount);
    expect(grupos).toEqual([{ nome: 'Água', total: 40, qtd: 1 }, { nome: 'Luz', total: 15, qtd: 2 }]);
  });
});

describe('descrição do lançamento', () => {
  it('guarda e lê serviço, cliente e forma', () => {
    const texto = montarDescricao({ servico: 'Troca de tomada', cliente: 'Ana', forma: 'Pix' });
    expect(texto).toBe('Troca de tomada · Ana · Pix');
    expect(lerDescricao(texto)).toEqual({ servico: 'Troca de tomada', cliente: 'Ana', forma: 'Pix' });
  });

  it('lê texto sem cliente nem forma, inclusive os lançamentos automáticos', () => {
    expect(lerDescricao('Reserva concluída — Eletricista')).toEqual({ servico: 'Reserva concluída — Eletricista', cliente: undefined, forma: undefined });
    expect(lerDescricao(montarDescricao({ servico: 'Pintura', forma: 'Dinheiro' }))).toEqual({ servico: 'Pintura', cliente: undefined, forma: 'Dinheiro' });
  });

  it('não confunde serviço chamado como uma forma de pagamento', () => {
    expect(lerDescricao('Pix')).toEqual({ servico: 'Pix', cliente: undefined, forma: undefined });
  });
});

describe('alertas e mensagens', () => {
  const h = '2026-11-06';

  it('sem dados, não inventa alerta', () => {
    expect(alertasDoDia({ bookings: [], h })).toEqual([]);
  });

  it('marca como atrasado só o que segue aberto', () => {
    expect(atrasado(booking({ status: 'ACEITO', scheduledAt: local('2026-11-05') }), h)).toBe(true);
    expect(atrasado(booking({ status: 'CONCLUIDO', scheduledAt: local('2026-11-05') }), h)).toBe(false);
    expect(atrasado(booking({ status: 'ACEITO', scheduledAt: local(h) }), h)).toBe(false);
  });

  it('lista atrasados, pedidos novos, serviços de hoje e concluídos sem valor', () => {
    const ids = alertasDoDia({
      h,
      bookings: [
        booking({ id: 'a', status: 'ACEITO', scheduledAt: local('2026-11-01') }),
        booking({ id: 'b', status: 'SOLICITADO' }),
        booking({ id: 'c', status: 'ACEITO', scheduledAt: local(h) }),
        booking({ id: 'd', status: 'CONCLUIDO', priceQuoted: null }),
      ],
    }).map((a) => a.id);
    expect(ids).toEqual(['atrasados', 'novos', 'hoje', 'sem-valor']);
  });

  it('avisa a meta atrasada, mas não a meta já alcançada', () => {
    const meta = { id: 'm', month: '2026-11', targetAmount: 1000 };
    expect(alertasDoDia({ bookings: [], h: '2026-11-20', meta, lucroDoMes: 100 }).map((a) => a.id)).toEqual(['meta']);
    expect(alertasDoDia({ bookings: [], h: '2026-11-20', meta: { ...meta, reachedAt: h }, lucroDoMes: 100 })).toEqual([]);
  });

  it('soma a receber só o que foi confirmado ou está em andamento', () => {
    expect(aReceber([booking({ status: 'ACEITO', priceQuoted: 100 }), booking({ status: 'EM_ANDAMENTO', priceQuoted: 50 }), booking({ status: 'SOLICITADO', priceQuoted: 900 })])).toBe(150);
  });

  it('monta lembrete, agradecimento e cliente sumido, sempre com telefone', () => {
    const client = { name: 'Ana Souza', phone: '68999990000' };
    const lista = mensagensDoDia(
      [
        booking({ id: 'l', status: 'ACEITO', scheduledAt: local('2026-11-07'), client }),
        { ...booking({ id: 'o', status: 'CONCLUIDO', client }), updatedAt: local('2026-11-05') } as Booking,
        booking({ id: 's', status: 'ACEITO', scheduledAt: local('2026-11-07'), client: { name: 'Sem Fone' } }),
      ],
      [
        { clientId: 'x', name: 'Bruno Lima', phone: '68988880000', totalSpent: 1, servicesCount: 1, lastServiceAt: local('2026-05-01') } as ClientSummary,
        { clientId: 'y', name: 'Recente', phone: '68977770000', totalSpent: 1, servicesCount: 1, lastServiceAt: local('2026-10-30') } as ClientSummary,
      ],
      h,
    );
    expect(lista.map((m) => m.id)).toEqual(['lembrete-l', 'obrigado-o', 'sumido-x']);
    expect(lista[0].texto).toContain('Ana!');
  });
});

describe('módulos', () => {
  it('quem só quer contratação não vê o financeiro', () => {
    const ids = menuDe('CONTRATACAO').map((m) => m.id);
    expect(ids).toContain('conseguir');
    expect(ids).not.toContain('caixa');
    expect(ids).not.toContain('relatorios');
  });

  it('quem só quer gestão não vê captação de clientes', () => {
    const ids = menuDe('GESTAO').map((m) => m.id);
    expect(ids).toContain('caixa');
    expect(ids).not.toContain('conseguir');
  });

  it('acha o módulo pela rota, com ou sem barra final, e nas telas internas', () => {
    expect(moduloDaRota('/painel')?.id).toBe('inicio');
    expect(moduloDaRota('/painel/caixa/')?.id).toBe('caixa');
    expect(moduloDaRota('/painel/oportunidades')?.id).toBe('conseguir');
    expect(moduloDaRota('/painel/nao-existe')).toBeUndefined();
  });

  it('todo módulo tem frase e ajuda', () => {
    for (const m of MODULOS) {
      expect(m.frase.length).toBeGreaterThan(0);
      expect(m.ajuda.length).toBeGreaterThan(0);
    }
  });
});

describe('exportar', () => {
  it('impede fórmula na planilha e separa com ponto e vírgula', () => {
    const csv = gerarCsv([{ nome: '=HYPERLINK("x")', total: 12.5 }], [
      { titulo: 'Nome', valor: (l) => l.nome },
      { titulo: 'Total', valor: (l) => l.total },
    ]);
    expect(csv).toBe(`"Nome";"Total"\r\n"'=HYPERLINK(""x"")";"12,5"`);
  });

  it('valor negativo continua número', () => {
    expect(gerarCsv([{ v: -5 }], [{ titulo: 'V', valor: (l) => l.v }])).toContain('"-5"');
  });

  it('escapa o que o usuário digitou no recibo', () => {
    const html = reciboHtml({ prestador: '<script>x</script>', servico: 'A & B', valor: 10, data: local('2026-11-06') });
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('A &amp; B');
    expect(html).toContain('R$ 10,00');
  });
});
