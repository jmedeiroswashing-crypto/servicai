import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export default function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <Link href="/perfil" className="mb-6 flex w-fit items-center gap-1.5 text-sm text-foreground-muted hover:text-ink">
        <ArrowLeft size={14} /> Voltar
      </Link>
      <h1 className="font-display text-3xl text-ink">Política de Privacidade</h1>

      <div className="mt-4 flex gap-3 border border-danger/40 bg-danger/5 p-4 text-sm text-foreground-muted">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-danger" />
        <div>
          <p className="font-medium text-ink">Aviso importante — rascunho sem validade jurídica ainda</p>
          <p className="mt-1">
            Este texto foi estruturado para cobrir os pontos que a LGPD (Lei Geral de Proteção de Dados) exige, mas{' '}
            <strong>não foi revisado nem aprovado por um advogado</strong>. Como o ServiçAi trata CPF, CNPJ e foto de
            documento de identidade (dados sensíveis), a revisão jurídica é indispensável antes de operar
            publicamente. Trechos marcados com <code className="text-xs">[PREENCHER]</code> precisam dos dados reais
            da empresa.
          </p>
        </div>
      </div>

      <p className="mt-6 text-xs text-foreground-muted">Última atualização: a definir junto com a revisão jurídica.</p>

      <div className="mt-6 space-y-7 text-sm text-foreground-muted">
        <section>
          <h2 className="mb-2 font-medium text-ink">1. Quem somos</h2>
          <p>
            O ServiçAi é operado por <strong>[PREENCHER: razão social]</strong>, inscrita no CNPJ{' '}
            <strong>[PREENCHER]</strong>, com sede em <strong>[PREENCHER: endereço]</strong>. Para qualquer assunto
            relacionado a dados pessoais, entre em contato pela nossa{' '}
            <Link href="/ajuda" className="text-accent hover:underline">
              Central de Ajuda
            </Link>{' '}
            ou pelo e-mail <strong>[PREENCHER: e-mail do encarregado de dados / DPO]</strong>.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-medium text-ink">2. Quais dados coletamos</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong className="text-ink">Cadastro:</strong> nome, e-mail, telefone, cidade, estado e senha
              (armazenada de forma criptografada, nunca em texto puro).
            </li>
            <li>
              <strong className="text-ink">Prestadores:</strong> adicionalmente, CPF ou CNPJ, razão social (se
              pessoa jurídica) e endereço comercial completo.
            </li>
            <li>
              <strong className="text-ink">Verificação de identidade (dado sensível):</strong> foto de um documento
              oficial com foto (RG, CNH ou passaporte), enviada voluntariamente pelo prestador para obter o selo de
              identidade verificada. Esse arquivo fica numa área de acesso restrito, visível apenas para o próprio
              usuário e para a equipe de moderação — nunca é exibido publicamente.
            </li>
            <li>
              <strong className="text-ink">Uso da plataforma:</strong> solicitações de serviço, propostas, reservas,
              mensagens trocadas no chat, avaliações, denúncias e disputas registradas.
            </li>
            <li>
              <strong className="text-ink">Dados técnicos:</strong> endereço IP, tipo de dispositivo e navegador,
              coletados automaticamente para segurança (ex: limitar tentativas de login) e diagnóstico de erros.
            </li>
            <li>
              <strong className="text-ink">Armazenamento local no seu dispositivo:</strong> usamos o armazenamento
              local do navegador (localStorage) para manter você conectado e lembrar que você já confirmou estes
              termos — isso não é compartilhado com terceiros.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 font-medium text-ink">3. Para que usamos seus dados e a base legal</h2>
          <p>Cada uso abaixo corresponde a uma base legal da LGPD (art. 7º):</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>
              <strong className="text-ink">Execução de contrato:</strong> criar sua conta, conectar clientes e
              prestadores, processar reservas e propostas.
            </li>
            <li>
              <strong className="text-ink">Consentimento:</strong> envio de notificações push, verificação de
              identidade (você escolhe enviar o documento).
            </li>
            <li>
              <strong className="text-ink">Legítimo interesse:</strong> prevenção a fraude, moderação de conteúdo
              denunciado, melhoria do algoritmo de busca e recomendação.
            </li>
            <li>
              <strong className="text-ink">Cumprimento de obrigação legal:</strong> guarda de registros fiscais e
              resposta a ordens judiciais, quando aplicável.
            </li>
          </ul>
          <p className="mt-2">Nunca vendemos seus dados pessoais a terceiros.</p>
        </section>

        <section>
          <h2 className="mb-2 font-medium text-ink">4. Com quem compartilhamos</h2>
          <p>
            Compartilhamos dados apenas com prestadores de infraestrutura que operam em nosso nome (chamados
            &ldquo;operadores&rdquo; pela LGPD), sob obrigação contratual de confidencialidade:
          </p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>Hospedagem do banco de dados e do site (infraestrutura em nuvem).</li>
            <li>Serviço de envio de e-mail, quando configurado.</li>
            <li>Serviço de inteligência artificial usado para sugerir descrições e preços.</li>
          </ul>
          <p className="mt-2">
            Dentro da plataforma: o nome e telefone do cliente só ficam visíveis ao prestador depois que o cliente
            contrata, favorita ou responde a uma proposta — nunca antes disso.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-medium text-ink">5. Onde seus dados ficam armazenados</h2>
          <p>
            Nossa infraestrutura atual de banco de dados está hospedada nos Estados Unidos. Isso significa que seus
            dados pessoais são transferidos internacionalmente. Buscamos trabalhar apenas com provedores que adotam
            padrões de segurança e contratos compatíveis com a LGPD (art. 33), mas essa cláusula específica ainda
            precisa de validação jurídica formal.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-medium text-ink">6. Segurança</h2>
          <p>Medidas técnicas já implementadas na plataforma:</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>Senhas armazenadas com hash criptográfico (nunca em texto puro).</li>
            <li>Conexão criptografada (HTTPS) em todo o site.</li>
            <li>Limite de tentativas de login e de cadastro, para dificultar ataques automatizados.</li>
            <li>Documentos de identidade ficam numa área separada, sem acesso público, mesmo por link direto.</li>
          </ul>
          <p className="mt-2">
            Nenhum sistema é 100% invulnerável. Em caso de incidente de segurança que afete seus dados, você será
            comunicado conforme exigido pela LGPD.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-medium text-ink">7. Por quanto tempo guardamos seus dados</h2>
          <p>
            Mantemos seus dados enquanto sua conta estiver ativa. Ao excluir a conta, ela é desativada
            imediatamente; alguns registros ligados a outras pessoas (mensagens já trocadas, avaliações publicadas)
            são preservados para não apagar o histórico da outra parte envolvida. Prazos de retenção específicos
            (incluindo documentos de identidade) ainda precisam ser definidos formalmente com apoio jurídico.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-medium text-ink">8. Seus direitos (LGPD, art. 18)</h2>
          <p>Você pode solicitar, a qualquer momento, pelos nossos canais de contato:</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>Confirmação de que tratamos seus dados, e acesso a eles.</li>
            <li>Correção de dados incompletos, inexatos ou desatualizados.</li>
            <li>Anonimização, bloqueio ou eliminação de dados desnecessários.</li>
            <li>Portabilidade dos seus dados a outro fornecedor.</li>
            <li>Eliminação dos dados tratados com base no seu consentimento.</li>
            <li>Informação sobre com quem compartilhamos seus dados.</li>
            <li>Revogação do consentimento, a qualquer momento.</li>
          </ul>
          <p className="mt-2">
            Você também pode excluir sua conta diretamente em{' '}
            <Link href="/perfil" className="text-accent hover:underline">
              Perfil → Configurações
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-medium text-ink">9. Menores de idade</h2>
          <p>
            O ServiçAi não é destinado a menores de 18 anos. Não coletamos intencionalmente dados de crianças ou
            adolescentes.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-medium text-ink">10. Alterações nesta política</h2>
          <p>
            Podemos atualizar este texto conforme a plataforma evolui. Mudanças relevantes serão comunicadas dentro
            do aplicativo.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-medium text-ink">11. Autoridade Nacional de Proteção de Dados (ANPD)</h2>
          <p>
            Se você entender que seus direitos não foram respeitados, também pode registrar uma reclamação junto à
            ANPD (gov.br/anpd), a autoridade responsável pela fiscalização da LGPD no Brasil.
          </p>
        </section>
      </div>
    </div>
  );
}
