import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermosPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <Link href="/perfil" className="mb-6 flex w-fit items-center gap-1.5 text-sm text-foreground-muted hover:text-ink">
        <ArrowLeft size={14} /> Voltar
      </Link>
      <h1 className="font-display text-3xl text-ink">Termos de uso</h1>
      <p className="mt-3 border border-accent/30 bg-accent/5 p-4 text-sm text-foreground-muted">
        Esta é uma versão preliminar, ainda sem revisão jurídica formal. Antes de operar publicamente, o texto final
        deve ser escrito e validado por um advogado.
      </p>

      <div className="mt-8 space-y-6 text-sm text-foreground-muted">
        <section>
          <h2 className="mb-2 font-medium text-ink">O que é o ServiçAi</h2>
          <p>
            O ServiçAi é um marketplace que conecta clientes a profissionais autônomos e empresas prestadoras de
            serviço. A plataforma não presta os serviços anunciados nem é parte no contrato entre cliente e
            prestador — apenas facilita o encontro entre as duas partes.
          </p>
        </section>
        <section>
          <h2 className="mb-2 font-medium text-ink">Responsabilidade</h2>
          <p>
            Cada prestador é responsável pela qualidade, prazo e execução do serviço que oferece. Cada cliente é
            responsável pelas informações que publica e pelos combinados feitos diretamente com o prestador.
          </p>
        </section>
        <section>
          <h2 className="mb-2 font-medium text-ink">Contas e cadastro</h2>
          <p>
            Cada pessoa deve manter apenas uma conta e é responsável por manter seus dados de acesso em segurança.
            Contas podem ser desativadas a pedido do próprio usuário, a qualquer momento, na área de configurações
            do perfil.
          </p>
        </section>
      </div>
    </div>
  );
}
