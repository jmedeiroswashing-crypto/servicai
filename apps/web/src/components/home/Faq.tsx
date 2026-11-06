import { ChevronDown } from 'lucide-react';

const QUESTIONS = [
  {
    q: 'É grátis para quem contrata?',
    a: 'Sim. Buscar profissionais, publicar pedidos, receber propostas e conversar pelo chat não têm custo para clientes.',
  },
  {
    q: 'Como eu pago o profissional?',
    a: 'Por enquanto, o pagamento é combinado direto com o profissional. O ServiçAi ainda não processa pagamentos, então combine valor e forma de pagamento antes de começar.',
  },
  {
    q: 'Como sei se um profissional é confiável?',
    a: 'Veja a nota e os comentários de quem já contratou. O selo Verificado indica que o profissional enviou um documento de identidade e ele foi aprovado. Converse pelo chat antes de fechar.',
  },
  {
    q: 'Meus dados ficam visíveis?',
    a: 'Profissionais veem o que você pediu e a região, sem seu nome, telefone, e-mail ou endereço. Você escolhe com quem conversar.',
  },
  {
    q: 'Como funcionam as propostas?',
    a: 'Quando você publica um pedido, profissionais compatíveis enviam valor, prazo e mensagem. Você compara e aceita a que preferir, sem obrigação de fechar.',
  },
  {
    q: 'Quanto custa para o profissional?',
    a: 'Há um plano Grátis com até 5 propostas por mês e planos pagos para quem quer enviar mais propostas e ter mais recursos. Veja os valores na página de planos.',
  },
  {
    q: 'A ordem dos profissionais depende de quem paga?',
    a: 'Na página inicial, não: a ordem considera avaliações e tempo de resposta. Na busca, contam principalmente relevância, local e avaliações, mas planos pagos dão alguma prioridade, e anúncios impulsionados aparecem marcados como "Em destaque".',
  },
  {
    q: 'Posso excluir minha conta?',
    a: 'Sim. A opção fica em Meu perfil. A Política de Privacidade explica como tratamos seus dados.',
  },
];

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-titulo" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-12 sm:px-6 md:py-16">
      <h2 id="faq-titulo" className="font-display text-title text-ink">
        Perguntas frequentes
      </h2>
      <div className="mt-6 divide-y divide-border rounded-card border border-border bg-surface">
        {QUESTIONS.map((item) => (
          <details key={item.q} className="group">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 p-4 font-medium text-ink [&::-webkit-details-marker]:hidden">
              {item.q}
              <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-foreground-muted transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <p className="px-4 pb-4 text-sm leading-relaxed text-foreground-muted">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
