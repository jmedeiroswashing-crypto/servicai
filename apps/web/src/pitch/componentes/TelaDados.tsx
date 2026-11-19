'use client';

/* eslint-disable @next/next/no-img-element -- export estático, imagens já otimizadas */
import { useEffect, useState } from 'react';
import {
  Check,
  Hammer,
  Megaphone,
  Server,
  Sparkles,
  Star,
  Timer,
  Handshake,
  TrendingUp,
  Users,
  Zap,
  Droplets,
  Brush,
  type LucideIcon,
} from 'lucide-react';
import { CONFIG_PITCH, TEXTOS, type IdTela, type Secao } from '../pitch-dados';

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

function Duas({ colunas }: { colunas: { titulo: string; texto: string }[] }) {
  return (
    <div className="p-cartoes" style={{ gridTemplateColumns: '1fr 1fr', gap: 'calc(var(--u) * 3)' }}>
      {colunas.map((c, i) => (
        <Depois key={c.titulo} ms={300 + i * 2600}>
          <div className="p-cartao" style={{ padding: 'calc(var(--u) * 3)' }}>
            <div className="p-preco p-azul" style={{ marginTop: 0 }}>
              {c.titulo}
            </div>
            <div className="p-subtitulo" style={{ marginTop: 'calc(var(--u) * 1.2)', color: 'var(--texto)' }}>
              {c.texto}
            </div>
          </div>
        </Depois>
      ))}
    </div>
  );
}

function Grade({ itens, icones, atraso = 700 }: { itens: string[]; icones: LucideIcon[]; atraso?: number }) {
  return (
    <div className="p-cartoes" style={{ gridTemplateColumns: `repeat(${itens.length}, 1fr)` }}>
      {itens.map((item, i) => {
        const Icone = icones[i % icones.length];
        return (
          <Depois key={item} ms={400 + i * atraso}>
            <div className="p-cartao" style={{ textAlign: 'center', minHeight: 'calc(var(--u) * 14)' }}>
              <Icone aria-hidden="true" style={{ width: 'calc(var(--u) * 4.4)', height: 'calc(var(--u) * 4.4)', color: 'var(--azul)' }} />
              <div className="p-subtitulo" style={{ marginTop: 'calc(var(--u) * 1.2)', color: 'var(--texto)', fontWeight: 700 }}>
                {item}
              </div>
            </div>
          </Depois>
        );
      })}
    </div>
  );
}

function Conteudo({ id }: { id: IdTela }) {
  switch (id) {
    case 'problema':
      return (
        <>
          <div className="p-subtitulo">{TEXTOS.problema.titulo}</div>
          {TEXTOS.problema.itens.map((item, i) => (
            <Depois key={item} ms={1200 + i * 4500}>
              <div className="p-titulo p-espaco-2">{item}.</div>
            </Depois>
          ))}
        </>
      );

    case 'onde':
      return (
        <>
          <div className="p-titulo">{TEXTOS.onde.titulo}</div>
          <div className="p-espaco-3" style={{ width: '100%' }}>
            <Grade itens={TEXTOS.onde.profissoes} icones={[Zap, Droplets, Sparkles, Hammer, Brush]} atraso={500} />
          </div>
          <Depois ms={5500}>
            <div className="p-subtitulo p-espaco-3" style={{ color: 'var(--texto)' }}>
              {TEXTOS.onde.rodape}
            </div>
          </Depois>
        </>
      );

    case 'quem-sofre':
      return (
        <>
          <div className="p-subtitulo">Quem sofre</div>
          <div className="p-espaco-2" style={{ width: '100%' }}>
            <Duas colunas={TEXTOS.quemSofre.colunas} />
          </div>
        </>
      );

    case 'evidencia':
      return (
        <>
          <div className="p-gigante p-azul">{TEXTOS.evidencia.numero}</div>
          <div className="p-subtitulo p-espaco-2" style={{ color: 'var(--texto)', maxWidth: 'calc(var(--u) * 70)' }}>
            {TEXTOS.evidencia.texto}
          </div>
          <div className="p-pequeno p-espaco-2">Fonte: {CONFIG_PITCH.fonteInformalidade}</div>
          {CONFIG_PITCH.casoReal && (
            <Depois ms={7000}>
              <div className="p-subtitulo p-espaco-3" style={{ fontStyle: 'italic', maxWidth: 'calc(var(--u) * 72)' }}>
                “{CONFIG_PITCH.casoReal}”
              </div>
            </Depois>
          )}
        </>
      );

    case 'consequencia':
      return (
        <>
          <div className="p-subtitulo">Se nada for feito</div>
          {TEXTOS.consequencia.frases.map((f, i) => (
            <Depois key={f} ms={600 + i * 4200}>
              <div className="p-titulo p-espaco-2">{f}</div>
            </Depois>
          ))}
        </>
      );

    case 'solucao':
      return (
        <>
          <Logo altura={12} />
          <div className="p-subtitulo p-espaco-3">{TEXTOS.solucao.subtitulo}</div>
          <Depois ms={5000}>
            <div className="p-titulo p-espaco-2">{TEXTOS.solucao.frase}</div>
          </Depois>
        </>
      );

    case 'beneficiados':
      return (
        <>
          <div className="p-subtitulo">Quem se beneficia</div>
          <div className="p-espaco-2" style={{ width: '100%' }}>
            <Duas colunas={TEXTOS.beneficiados.colunas} />
          </div>
        </>
      );

    case 'por-que-resolve':
      return (
        <>
          <div className="p-subtitulo" style={{ textDecoration: 'line-through', textDecorationColor: 'var(--laranja)' }}>
            {TEXTOS.porQueResolve.antes}
          </div>
          {TEXTOS.porQueResolve.depois.map((d, i) => (
            <Depois key={d} ms={4500 + i * 2800}>
              <div className="p-titulo p-espaco-2">
                <Check aria-hidden="true" style={{ width: '0.8em', height: '0.8em', color: 'var(--verde)', verticalAlign: '-0.08em', marginRight: '0.3em' }} />
                {d}
              </div>
            </Depois>
          ))}
        </>
      );

    case 'resultado':
      return (
        <>
          <div className="p-subtitulo">{TEXTOS.resultado.titulo}</div>
          {TEXTOS.resultado.linhas.map((l, i) => (
            <Depois key={l.quem} ms={400 + i * 4500}>
              <div className="p-espaco-3">
                <div className="p-pequeno" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {l.quem}
                </div>
                <div className="p-titulo" style={{ marginTop: 'calc(var(--u) * 0.6)' }}>
                  {l.texto}
                </div>
              </div>
            </Depois>
          ))}
        </>
      );

    case 'etapas':
      return (
        <>
          <div className="p-cartoes" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 'calc(var(--u) * 2.4)' }}>
            {TEXTOS.etapas.map((e, i) => (
              <Depois key={e.titulo} ms={300 + i * 5000}>
                <div className="p-cartao" style={{ padding: 'calc(var(--u) * 2.6)', minHeight: 'calc(var(--u) * 20)' }}>
                  <div className="p-gigante p-azul" style={{ fontSize: 'calc(var(--u) * 6)' }}>
                    {i + 1}
                  </div>
                  <div className="p-preco">{e.titulo}</div>
                  <div className="p-subtitulo" style={{ marginTop: 'calc(var(--u) * 1)' }}>
                    {e.texto}
                  </div>
                </div>
              </Depois>
            ))}
          </div>
        </>
      );

    case 'recursos':
      return (
        <>
          <div className="p-subtitulo">{TEXTOS.recursos.titulo}</div>
          <div className="p-espaco-2" style={{ width: '100%' }}>
            <Grade itens={TEXTOS.recursos.itens} icones={[Server, Megaphone, Handshake]} atraso={1800} />
          </div>
        </>
      );

    case 'quem-onde':
      return (
        <div className="p-cartoes" style={{ gridTemplateColumns: '1fr 1fr', gap: 'calc(var(--u) * 3)' }}>
          <div className="p-cartao" style={{ padding: 'calc(var(--u) * 3)' }}>
            <div className="p-pequeno" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {TEXTOS.quemOnde.quem.titulo}
            </div>
            <div className="p-titulo" style={{ marginTop: 'calc(var(--u) * 0.8)' }}>
              {CONFIG_PITCH.apresentador}
            </div>
            <div className="p-subtitulo" style={{ marginTop: 'calc(var(--u) * 0.8)' }}>
              {TEXTOS.quemOnde.quem.texto}
            </div>
          </div>
          <Depois ms={5200}>
            <div className="p-cartao" style={{ padding: 'calc(var(--u) * 3)' }}>
              <div className="p-pequeno" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {TEXTOS.quemOnde.onde.titulo}
              </div>
              <div className="p-titulo" style={{ marginTop: 'calc(var(--u) * 0.8)' }}>
                {CONFIG_PITCH.cidade}
              </div>
              <div className="p-subtitulo" style={{ marginTop: 'calc(var(--u) * 0.8)' }}>
                {TEXTOS.quemOnde.onde.texto}
              </div>
            </div>
          </Depois>
        </div>
      );

    case 'metricas':
      return (
        <>
          <div className="p-subtitulo">{TEXTOS.metricas.titulo}</div>
          <div className="p-espaco-2" style={{ width: '100%' }}>
            <Grade itens={TEXTOS.metricas.itens} icones={[Users, TrendingUp, Timer, Star]} atraso={1900} />
          </div>
        </>
      );

    case 'fechamento':
      return (
        <>
          <Logo altura={12} />
          <div className="p-titulo p-espaco-3">{TEXTOS.fechamento.frase}</div>
          <Depois ms={3200}>
            <div className="p-gigante p-espaco-3" style={{ fontSize: 'calc(var(--u) * 6)' }}>
              {TEXTOS.fechamento.obrigado}
            </div>
          </Depois>
        </>
      );

    default:
      return null;
  }
}


export function TelaDados({ id, secao }: { id: IdTela; secao: Secao }) {
  return (
    <div className="p-tela">
      <div className="p-secao">{secao}</div>
      <Conteudo id={id} />
    </div>
  );
}
