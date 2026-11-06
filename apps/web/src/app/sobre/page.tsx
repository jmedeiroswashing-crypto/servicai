import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Sobre',
  description: 'O ServiçAi conecta clientes a profissionais da região e ajuda prestadores a organizar o próprio negócio.',
  alternates: { canonical: '/sobre' },
};

export default function SobrePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 md:py-16">
      <h1 className="font-display text-3xl text-ink">Sobre o ServiçAi</h1>
      <div className="mt-6 space-y-4 leading-relaxed text-foreground-muted">
        <p>
          O ServiçAi conecta quem precisa de um serviço a profissionais da região. Você pode buscar um profissional ou
          publicar um pedido, receber propostas e conversar pelo chat antes de decidir.
        </p>
        <p>
          Para prestadores, o ServiçAi também é uma ferramenta de gestão, com agenda, controle de entradas e saídas e
          metas em um só lugar.
        </p>
        <p>
          O pagamento do serviço é combinado direto entre cliente e profissional. Saiba mais nas{' '}
          <Link href="/#faq" className="text-accent hover:underline">
            perguntas frequentes
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
