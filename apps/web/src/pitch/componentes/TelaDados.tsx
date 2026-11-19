'use client';

/* eslint-disable @next/next/no-img-element -- export estático, imagens já otimizadas */
import { useEffect, useState } from 'react';
import { Check, Handshake, HardHat, ListOrdered, MessageSquareText, ShowerHead } from 'lucide-react';
import { CONFIG_PITCH, PENDENTE_TELA, TEXTOS, dadoTela5Valido, type IdTela } from '../pitch-dados';

/** Mostra os filhos só depois de `ms` (entrada suave de 300 ms). */
function Depois({ ms, children }: { ms: number; children: React.ReactNode }) {
  const [visivel, setVisivel] = useState(ms === 0);
  useEffect(() => {
    const t = setTimeout(() => setVisivel(true), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return visivel ? <div className="p-aparece">{children}</div> : null;
}

function Logo({ altura }: { altura: number }) {
  return (
    <div className="p-logo" aria-label="ServiçAi">
      <img src="/marca/simbolo-claro.webp" alt="" style={{ height: `calc(var(--u) * ${altura})` }} />
      <img src="/marca/nome-claro.webp" alt="" style={{ height: `calc(var(--u) * ${altura * 0.42})` }} />
    </div>
  );
}

function valor(texto: string | null | undefined): string {
  return texto && texto.trim() ? texto : PENDENTE_TELA;
}

export function TelaDados({ id }: { id: IdTela }) {
  switch (id) {
    case 'abertura':
      return (
        <div className="p-tela">
          <div className="p-gigante">{TEXTOS.abertura.grande}</div>
          <Depois ms={2600}>
            <ShowerHead className="p-icone-grande p-espaco-3 p-laranja" aria-label="Chuveiro" />
          </Depois>
        </div>
      );

    case 'apresentacao':
      return (
        <div className="p-tela">
          <Logo altura={13} />
          <div className="p-titulo p-espaco-3">{CONFIG_PITCH.apresentador}</div>
          <div className="p-subtitulo p-espaco-1">Equipe {valor(CONFIG_PITCH.equipe)}</div>
        </div>
      );

    case 'problema-cliente':
      return (
        <div className="p-tela">
          <div className="p-subtitulo">{TEXTOS.problemaCliente.titulo}</div>
          <div className="p-linha p-espaco-2">
            {TEXTOS.problemaCliente.frases.map((f, i) => (
              <Depois key={f} ms={600 + i * 1300}>
                <div className="p-titulo" style={{ fontSize: 'calc(var(--u) * 6.4)' }}>
                  {f}
                </div>
              </Depois>
            ))}
          </div>
        </div>
      );

    case 'problema-prestador':
      return (
        <div className="p-tela">
          <HardHat className="p-icone-grande" aria-hidden="true" />
          <div className="p-titulo p-espaco-2">{TEXTOS.problemaPrestador.titulo}</div>
          <Depois ms={4200}>
            <div className="p-titulo p-azul">{TEXTOS.problemaPrestador.subtitulo}</div>
          </Depois>
        </div>
      );

    case 'numero': {
      const dado = dadoTela5Valido();
      if (!dado) {
        return (
          <div className="p-tela">
            <div className="p-titulo" style={{ fontSize: 'calc(var(--u) * 5.6)' }}>
              {TEXTOS.numero.semFonte}
            </div>
          </div>
        );
      }
      return (
        <div className="p-tela">
          <div className="p-gigante p-azul">{dado.numero}</div>
          <div className="p-subtitulo p-espaco-2" style={{ maxWidth: 'calc(var(--u) * 70)' }}>
            {dado.texto}
          </div>
          <div className="p-pequeno p-espaco-3">Fonte: {dado.fonte}</div>
        </div>
      );
    }

    case 'virada':
      return (
        <div className="p-tela">
          <div className="p-titulo" style={{ fontSize: 'calc(var(--u) * 5.6)', maxWidth: 'calc(var(--u) * 78)' }}>
            {TEXTOS.virada.pergunta}
          </div>
        </div>
      );

    case 'servicai': {
      const icones = [MessageSquareText, ListOrdered, Handshake];
      return (
        <div className="p-tela">
          <Logo altura={7} />
          <div className="p-titulo p-espaco-2">{TEXTOS.servicai.frase}</div>
          <div className="p-linha p-espaco-3">
            {TEXTOS.servicai.passos.map((p, i) => {
              const Icone = icones[i];
              return (
                <Depois key={p.rotulo} ms={500 + i * 700}>
                  <div className="p-passo">
                    <Icone aria-hidden="true" />
                    <strong>{p.rotulo}</strong>
                    <span>{p.detalhe}</span>
                  </div>
                </Depois>
              );
            })}
          </div>
        </div>
      );
    }

    case 'modelo':
      return (
        <div className="p-tela">
          <div className="p-titulo">{TEXTOS.modelo.titulo}</div>
          <div className="p-cartoes p-espaco-3">
            {TEXTOS.modelo.planos.map((p, i) => (
              <Depois key={p.nome} ms={1800 + i * 450}>
                <div className={`p-cartao ${p.nome === 'Impulso' ? 'p-destaque' : ''}`}>
                  <div className="p-nome">{p.nome}</div>
                  <div className="p-preco">{p.preco}</div>
                  <div className="p-detalhe">{p.detalhe}</div>
                </div>
              </Depois>
            ))}
          </div>
          <Depois ms={8200}>
            <div className="p-subtitulo p-espaco-3" style={{ color: 'var(--texto)' }}>
              {TEXTOS.modelo.nota}
            </div>
          </Depois>
        </div>
      );

    case 'estagio':
      return (
        <div className="p-tela">
          <div className="p-colunas">
            <div>
              <h3>Já funciona</h3>
              <ul>
                {TEXTOS.estagio.jaFunciona.map((item) => (
                  <li key={item}>
                    <Check aria-hidden="true" style={{ color: 'var(--verde)' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <Depois ms={4000}>
              <div>
                <h3 className="p-azul">Próximo</h3>
                <ul>
                  {TEXTOS.estagio.proximo.map((item) => (
                    <li key={item} style={{ color: 'var(--suave)' }}>
                      <span aria-hidden="true" style={{ color: 'var(--azul)' }}>
                        →
                      </span>
                      {item.replace(/^Próximo:\s*(.)/, (_, letra: string) => letra.toUpperCase())}
                    </li>
                  ))}
                </ul>
              </div>
            </Depois>
          </div>
        </div>
      );

    case 'piloto': {
      const p = CONFIG_PITCH.planoPiloto;
      const r = TEXTOS.piloto.rotulos;
      return (
        <div className="p-tela">
          <div className="p-subtitulo" style={{ alignSelf: 'flex-start' }}>
            Plano de piloto
          </div>
          <dl className="p-campos p-espaco-2">
            <div>
              <dt>{r.cidade}</dt>
              <dd>{valor(p?.cidade)}</dd>
            </div>
            <div>
              <dt>{r.profissionais}</dt>
              <dd>{valor(p?.profissionais)}</dd>
            </div>
            <div>
              <dt>{r.prazo}</dt>
              <dd>{valor(p?.prazo)}</dd>
            </div>
            <div>
              <dt>{r.metricas}</dt>
              <dd>{p?.metricas.length ? p.metricas.join(', ') : PENDENTE_TELA}</dd>
            </div>
          </dl>
        </div>
      );
    }

    case 'pedido':
      return (
        <div className="p-tela">
          <div className="p-titulo" style={{ fontSize: 'calc(var(--u) * 5.6)', maxWidth: 'calc(var(--u) * 80)' }}>
            {valor(CONFIG_PITCH.pedido)}
          </div>
        </div>
      );

    case 'fechamento':
      return (
        <div className="p-tela">
          <div className="p-gigante">{TEXTOS.fechamento.grande}</div>
          <Depois ms={4200}>
            <div className="p-titulo p-espaco-3">{TEXTOS.fechamento.frase}</div>
          </Depois>
          <Depois ms={8000}>
            <div className="p-espaco-3">
              <Logo altura={8} />
            </div>
          </Depois>
        </div>
      );

    default:
      return null;
  }
}
