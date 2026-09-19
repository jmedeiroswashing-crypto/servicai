import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <Link href="/perfil" className="mb-6 flex w-fit items-center gap-1.5 text-sm text-foreground-muted hover:text-ink">
        <ArrowLeft size={14} /> Voltar
      </Link>
      <h1 className="font-display text-3xl text-ink">Privacidade</h1>
      <p className="mt-3 border border-accent/30 bg-accent/5 p-4 text-sm text-foreground-muted">
        Esta página descreve, de forma direta, como seus dados realmente circulam hoje dentro do aplicativo — ainda
        não é uma política de privacidade formal revisada juridicamente.
      </p>

      <div className="mt-8 space-y-6 text-sm text-foreground-muted">
        <section>
          <h2 className="mb-2 font-medium text-ink">Dados de clientes</h2>
          <p>
            Quando você publica uma solicitação de serviço, os prestadores compatíveis veem apenas categoria,
            descrição, cidade aproximada e orçamento — nunca seu nome, telefone, e-mail ou endereço exato antes de
            você decidir contratar ou responder a uma proposta.
          </p>
          <p className="mt-2">
            Se você favoritar um prestador, ele passa a poder ver seu nome e telefone (recurso de prospecção,
            disponível para prestadores do plano Premium) — isso é avisado no momento de favoritar.
          </p>
        </section>
        <section>
          <h2 className="mb-2 font-medium text-ink">Dados de prestadores</h2>
          <p>
            Nome, foto, cidade, telefone e endereço comercial de prestadores são públicos no perfil, já que
            funcionam como uma vitrine profissional — assim como acontece em qualquer diretório de negócios.
          </p>
        </section>
        <section>
          <h2 className="mb-2 font-medium text-ink">Mensagens e avaliações</h2>
          <p>
            Conversas ficam salvas para as duas partes poderem consultar o histórico. Avaliações publicadas em
            perfis de prestadores são reais, escritas por clientes após um serviço concluído — o aplicativo nunca
            gera avaliações fictícias.
          </p>
        </section>
        <section>
          <h2 className="mb-2 font-medium text-ink">Exclusão de conta</h2>
          <p>
            Ao excluir sua conta, ela é desativada e some das buscas e listagens imediatamente. Alguns registros
            ligados a outras pessoas (como mensagens já trocadas ou avaliações já publicadas) são mantidos para não
            apagar o histórico da outra parte envolvida.
          </p>
        </section>
      </div>
    </div>
  );
}
