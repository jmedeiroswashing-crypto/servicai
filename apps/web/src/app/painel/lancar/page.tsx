'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, MessageCircle, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { ReceiptScanButton } from '@/components/ReceiptScanButton';
import { useProviderCompleto } from '@/components/painel/dados';
import { abrirRecibo } from '@/lib/painel/exportar';
import { brl, FORMAS, linkWhats, montarDescricao } from '@/lib/painel/numeros';
import { dataParaApi, hoje } from '@/lib/painel/periodo';
import { useAuthStore } from '@/store/auth-store';
import type { Income } from '@/lib/types';

export default function LancarPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const { data: provider } = useProviderCompleto();
  const [servico, setServico] = useState('');
  const [cliente, setCliente] = useState('');
  const [telefone, setTelefone] = useState('');
  const [valor, setValor] = useState('');
  const [dia, setDia] = useState(hoje);
  const [forma, setForma] = useState<string>();
  const [feito, setFeito] = useState<Income | null>(null);

  const mutation = useMutation({
    mutationFn: async () =>
      (
        await api.post<Income>('/incomes', {
          description: montarDescricao({ servico, cliente, forma }),
          amount: Number(valor),
          date: dataParaApi(dia),
        })
      ).data,
    onSuccess: (income) => {
      setFeito(income);
      queryClient.invalidateQueries({ queryKey: ['incomes', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['bookings', 'earnings'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['cash-register'] });
    },
    onError: () => toast.error('Não foi possível lançar. Tente de novo.'),
  });

  const nomePrestador = user?.name ?? 'Prestador';
  const textoWhats = `Olá${cliente ? `, ${cliente.split(' ')[0]}` : ''}! Recibo do serviço "${servico}": R$ ${brl(Number(valor), true)}, em ${new Date(`${dia}T12:00:00`).toLocaleDateString('pt-BR')}. Obrigado pela confiança!`;

  function novoLancamento() {
    setFeito(null);
    setServico('');
    setCliente('');
    setTelefone('');
    setValor('');
    setForma(undefined);
    setDia(hoje());
  }

  if (feito) {
    return (
      <section className="e-painel e-vazio">
        <span className="e-vazio-ic">
          <CheckCircle2 size={26} aria-hidden="true" />
        </span>
        <h2>Serviço lançado: R$ {brl(feito.amount, true)}</h2>
        <p>Já entrou no faturamento. Se quiser, entregue o recibo ao cliente.</p>
        <div className="e-bts" style={{ justifyContent: 'center' }}>
          <button
            type="button"
            className="e-bt"
            onClick={() => {
              const abriu = abrirRecibo({ prestador: nomePrestador, telefone: provider?.user.phone, servico, cliente, forma, valor: feito.amount, data: feito.date });
              if (!abriu) toast.error('O navegador bloqueou a janela do recibo. Libere e tente de novo.');
            }}
          >
            <Printer size={16} aria-hidden="true" /> Baixar recibo
          </button>
          {telefone.replace(/\D/g, '').length >= 10 && (
            <a className="e-bt" href={linkWhats(telefone, textoWhats)} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={16} aria-hidden="true" /> Enviar no WhatsApp
            </a>
          )}
          <button type="button" className="e-bt e-bt--forte" onClick={novoLancamento}>
            Lançar outro
          </button>
        </div>
        <Link href="/painel/feitos" className="e-mut underline">
          Ver serviços feitos
        </Link>
      </section>
    );
  }

  const servicos = provider?.services?.filter((s) => s.active) ?? [];
  const valido = servico.trim().length >= 2 && Number(valor) > 0 && !!dia;

  return (
    <section className="e-painel">
      <form
        className="e-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (valido) mutation.mutate();
        }}
      >
        {servicos.length > 0 && (
          <div className="e-campo">
            Seus serviços
            <div className="e-fichas">
              {servicos.slice(0, 8).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="e-ficha"
                  aria-pressed={servico === s.title}
                  onClick={() => {
                    setServico(s.title);
                    if (s.priceMin && !valor) setValor(String(s.priceMin));
                  }}
                >
                  {s.title}
                </button>
              ))}
            </div>
          </div>
        )}
        <label className="e-campo">
          O que foi feito
          <input value={servico} onChange={(e) => setServico(e.target.value)} placeholder="Ex.: troca de tomada" maxLength={100} required />
        </label>
        <div className="e-form-linha">
          <label className="e-campo">
            Valor (R$)
            <input type="number" inputMode="decimal" min="0.01" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" required />
          </label>
          <label className="e-campo">
            Data
            <input type="date" value={dia} max={hoje()} onChange={(e) => setDia(e.target.value)} required />
          </label>
        </div>
        <div className="e-form-linha">
          <label className="e-campo">
            Cliente (opcional)
            <input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nome do cliente" maxLength={60} />
          </label>
          <label className="e-campo">
            WhatsApp do cliente (opcional)
            <input type="tel" inputMode="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(68) 99999-9999" />
          </label>
        </div>
        <div className="e-campo">
          Forma de pagamento (opcional)
          <div className="e-fichas">
            {FORMAS.map((f) => (
              <button key={f} type="button" className="e-ficha" aria-pressed={forma === f} onClick={() => setForma(forma === f ? undefined : f)}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="e-bts">
          <button type="submit" className="e-bt e-bt--forte" disabled={!valido || mutation.isPending}>
            {mutation.isPending ? 'Lançando...' : 'Lançar serviço'}
          </button>
          <ReceiptScanButton onExtracted={(v) => v !== null && setValor(String(v))} />
        </div>
        <p className="e-nota">Serviço concluído pelo Quadro entra sozinho. Use esta tela para o que foi combinado por fora. O ServiçAi não processa pagamentos.</p>
      </form>
    </section>
  );
}
