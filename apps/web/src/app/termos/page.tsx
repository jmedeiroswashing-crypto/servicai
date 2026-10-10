import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export default function TermosPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <Link href="/perfil" className="mb-6 flex w-fit items-center gap-1.5 text-sm text-foreground-muted hover:text-ink">
        <ArrowLeft size={14} /> Voltar
      </Link>
      <h1 className="font-display text-3xl text-ink">Termos de Uso</h1>

      <div className="mt-4 flex gap-3 border border-danger/40 bg-danger/5 p-4 text-sm text-foreground-muted">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-danger" />
        <div>
          <p className="font-medium text-ink">Aviso importante — rascunho sem validade jurídica ainda</p>
          <p className="mt-1">
            Este texto é um rascunho estruturado, <strong>não revisado nem aprovado por um advogado</strong>. Não
            use como proteção jurídica definitiva antes de uma revisão formal. Trechos marcados com{' '}
            <code className="text-xs">[PREENCHER]</code> precisam dos dados reais da empresa.
          </p>
        </div>
      </div>

      <p className="mt-6 text-xs text-foreground-muted">Última atualização: a definir junto com a revisão jurídica.</p>

      <div className="mt-6 space-y-7 text-sm text-foreground-muted">
        <section>
          <h2 className="mb-2 font-medium text-ink">1. Aceitação</h2>
          <p>
            Ao criar uma conta ou usar o ServiçAi, você concorda com estes Termos de Uso e com nossa{' '}
            <Link href="/privacidade" className="text-accent hover:underline">
              Política de Privacidade
            </Link>
            . Se não concordar, não utilize a plataforma.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-medium text-ink">2. O que é o ServiçAi</h2>
          <p>
            O ServiçAi, operado por <strong>[PREENCHER: razão social]</strong>, é um marketplace que conecta
            clientes a profissionais autônomos e empresas prestadoras de serviço, e também permite a venda de
            produtos entre usuários (Marketplace). A plataforma é apenas uma <strong>intermediária</strong>: não
            presta os serviços anunciados, não fabrica nem vende os produtos anunciados, e não é parte no contrato
            firmado diretamente entre cliente e prestador, ou entre comprador e vendedor.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-medium text-ink">3. Cadastro e conta</h2>
          <p>
            Você deve fornecer informações verdadeiras e manter apenas uma conta. É responsável por manter sua
            senha em segurança e por tudo que acontecer usando suas credenciais. Contas podem ser desativadas pelo
            próprio usuário a qualquer momento, na área de configurações do perfil.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-medium text-ink">4. Responsabilidade entre as partes</h2>
          <p>
            Cada prestador é o único responsável pela qualidade, prazo, segurança e execução do serviço que
            oferece, incluindo o cumprimento de obrigações fiscais e regulatórias da sua atividade. Cada
            cliente é responsável pelas informações que publica e pelos combinados feitos diretamente com o
            prestador (incluindo preço, forma e prazo de pagamento, que a plataforma não processa nem garante). O
            mesmo vale para vendedores e compradores no Marketplace de produtos.
          </p>
          <p className="mt-2">
            <strong className="text-ink">O ServiçAi não garante, não arbitra e não se responsabiliza</strong> pela
            qualidade dos serviços prestados, pela entrega ou qualidade de produtos vendidos, por prejuízos
            financeiros, materiais ou de qualquer natureza decorrentes de negociações realizadas entre usuários. O
            selo de &ldquo;identidade verificada&rdquo; confirma apenas que um documento foi analisado pela nossa
            equipe — não é garantia de idoneidade, qualidade do serviço ou ausência de risco.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-medium text-ink">5. Avaliações e denúncias</h2>
          <p>
            Avaliações publicadas são escritas por clientes reais após um serviço concluído — a plataforma nunca
            gera avaliações fictícias. Denúncias e disputas são analisadas por nossa equipe de moderação, que pode
            advertir, suspender ou excluir contas que violem estes Termos, a critério da plataforma.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-medium text-ink">6. Condutas proibidas</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Publicar conteúdo falso, enganoso, ilegal ou que viole direitos de terceiros.</li>
            <li>Usar a plataforma para fraude, golpe ou qualquer atividade ilícita.</li>
            <li>Assediar, ameaçar ou discriminar outros usuários.</li>
            <li>Tentar contornar os mecanismos de segurança, limite de uso ou moderação da plataforma.</li>
            <li>Criar múltiplas contas para burlar suspensão ou limites de plano.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 font-medium text-ink">7. Planos pagos e cobrança</h2>
          <p>
            Prestadores podem assinar planos pagos que ampliam limites de uso e visibilidade na busca. O processo de
            cobrança recorrente, cancelamento e reembolso será detalhado nesta seção assim que o processamento de
            pagamento real estiver implementado — atualmente a plataforma não processa pagamentos de verdade.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-medium text-ink">8. Propriedade intelectual</h2>
          <p>
            A marca ServiçAi, seu logotipo e o software da plataforma pertencem a <strong>[PREENCHER]</strong>. O
            conteúdo que você publica (fotos, descrições, avaliações) continua sendo seu, mas você concede à
            plataforma licença para exibi-lo dentro do ServiçAi para o funcionamento do serviço.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-medium text-ink">9. Encerramento</h2>
          <p>
            Podemos suspender ou encerrar contas que violem estes Termos, mediante aviso sempre que possível.
            Você pode encerrar sua conta a qualquer momento nas configurações do perfil.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-medium text-ink">10. Alterações nestes Termos</h2>
          <p>
            Podemos atualizar estes Termos conforme a plataforma evolui. Mudanças relevantes serão comunicadas
            dentro do aplicativo, e o uso continuado após a alteração representa aceite dos novos termos.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-medium text-ink">11. Lei aplicável e foro</h2>
          <p>
            Estes Termos são regidos pela legislação brasileira. Fica eleito o foro da comarca de{' '}
            <strong>[PREENCHER: cidade/estado]</strong> para dirimir eventuais controvérsias, com renúncia a
            qualquer outro, por mais privilegiado que seja.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-medium text-ink">12. Contato</h2>
          <p>
            Dúvidas sobre estes Termos podem ser enviadas pela nossa{' '}
            <Link href="/ajuda" className="text-accent hover:underline">
              Central de Ajuda
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
