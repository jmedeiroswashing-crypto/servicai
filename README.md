# ServiçAi

Plataforma de intermediação inteligente de serviços — conecta clientes a empresas e
profissionais autônomos (eletricistas, encanadores, advogados, médicos, designers, etc.)
usando IA, avaliações verificadas e reputação digital.

Este repositório contém o **MVP**: backend (API) + frontend web. Veja "Roadmap" abaixo
para o que ainda falta em relação à visão completa do produto.

## Estrutura

```
servicai/
├── apps/
│   ├── api/     # Backend NestJS + Prisma + PostgreSQL
│   └── web/     # Frontend Next.js + Tailwind + Framer Motion
└── docker-compose.yml   # Postgres + Redis locais (opcional, alternativa ao Supabase)
```

## Stack

- **Backend**: NestJS 12, Prisma 7 (driver adapters, `@prisma/adapter-pg`), PostgreSQL,
  JWT (passport-jwt), Socket.IO (chat e notificações em tempo real), OpenAI SDK,
  `web-push` (push notification real), `nodemailer` (e-mail transacional), `bcryptjs`
  (troca feita a partir de `bcrypt` nativo — era a causa de queda em produção na
  Vercel, que não compila binários nativos), rate limiting próprio (sem
  `@nestjs/throttler`, que também quebrava o build serverless).
- **Frontend**: Next.js 16 (App Router, export estático), Tailwind CSS v4, Framer
  Motion, TanStack Query, Zustand, React Hook Form + Zod, `sonner` (toasts de erro).
- **Mobile**: projeto Android gerado via **Capacitor** (empacota o site como app
  nativo) — não é um app Flutter/React Native separado, é o mesmo frontend web.
- **Banco**: PostgreSQL (neste setup, hospedado no Supabase; veja `apps/api/.env`).
- **Deploy**: Vercel (projetos `servicai` e `servicai-api`, ver seção de Deploy).

## Como rodar

### Backend

```bash
cd apps/api
npm install
cp .env.example .env   # preencha DATABASE_URL, JWT_SECRET, OPENAI_API_KEY
npx prisma generate
npx prisma migrate dev
npm run start:dev       # http://localhost:3001/api
```

### Frontend

```bash
cd apps/web
npm install
cp .env.local.example .env.local   # ou crie com NEXT_PUBLIC_API_URL
npm run dev              # http://localhost:3000
```

## Funcionalidades implementadas (MVP)

- **Auth**: cadastro/login de Cliente e Prestador com JWT.
- **Perfil do prestador**: especialidade, cidade, bio, selo (Prata/Ouro/Premium),
  Score ServiçAi, galeria de mídia (fotos/vídeos/antes-depois).
- **Anúncios de serviço** (listings): CRUD do prestador, com geração de descrição e
  sugestão de preço por IA (`POST /listings/ai/generate-description`,
  `POST /listings/ai/suggest-price`).
- **Busca inteligente**: `GET /search?q=...` interpreta a frase do usuário via IA
  (categoria, urgência, localização) e retorna os prestadores mais relevantes. Com
  fallback heurístico local quando `OPENAI_API_KEY` não está configurada.
- **Avaliações multi-critério**: nota geral + pontualidade, qualidade, preço,
  atendimento — usadas para calcular o **Score ServiçAi** (0–100) de cada prestador.
- **Contratação/Agendamento**: fluxo de `Booking` com status
  (`SOLICITADO → ACEITO/RECUSADO → EM_ANDAMENTO → CONCLUIDO/CANCELADO`).
- **Favoritos**.
- **Chat**: REST + WebSocket (namespace `/chat`) para mensagens em tempo real.
- **Planos de assinatura — Grátis / Profissional (R$ 29,90) / Premium (R$ 59,90)**
  (`apps/api/src/subscriptions/plans.config.ts`): reformulados para vender **visibilidade
  e oportunidades**, não itens de funcionalidade soltos. A alavanca comercial central é
  quantas **propostas de oportunidade por mês** o prestador pode enviar (Grátis: 5,
  Profissional: 60, Premium: ilimitado) — cada proposta é uma chance real de fechar
  negócio, o que é diferente de travar uma função. Premium também ganha o selo de
  "prestador verificado" (reaproveita o campo `Selo` já existente). O enum `Plan` no
  banco ainda tem `BUSINESS` por causa de dados de teste antigos (evitar remover valor
  de enum no Postgres é mais seguro que recriar a tabela) — ele não é mais vendido,
  `GET /subscriptions/plans` já filtra para mostrar só os 3 planos atuais, e assinantes
  legados nesse plano são tratados com os benefícios do Premium.
  - **Algoritmo de ranking de visibilidade** (`apps/api/src/providers/ranking.ts`): a
    posição nos resultados de busca (`/providers`, `/search`) combina relevância de
    categoria, localização, nota média, volume de avaliações, taxa de resposta
    (aceite de solicitações), atividade recente e completude do perfil — o plano
    contratado soma pontos (até 25 de ~130 possíveis), mas não decide sozinho.
    Testado explicitamente: um prestador pago com perfil vazio e zero avaliações fica
    só 1 posição à frente de um grátis com perfil completo, não dezenas de posições —
    e nota+volume de avaliações têm o mesmo peso máximo que o plano, então um grátis
    muito bem avaliado consegue superar um pago irrelevante.
  - **Estados reais de assinatura** (`ATIVA/TESTE/PAGAMENTO_PENDENTE/
    CANCELAMENTO_SOLICITADO/CANCELADA/INADIMPLENTE/EXPIRADA`): cancelar é "soft" — o
    prestador mantém os benefícios até o fim do período já pago
    (`POST /subscriptions/me/cancel`), e a expiração de verdade é aplicada no backend
    (não só na tela) sempre que a assinatura é lida: se o prazo pago já passou, o
    prestador volta a valer como Grátis para ranking e limites, mesmo que a UI antiga
    ainda não tenha sido recarregada. `TESTE` (período de teste) existe no modelo de
    dados mas não tem um fluxo de ativação ainda — ficou definido para o futuro.
  - **Página "Meu Plano"** (`/painel/plano`): plano atual + status, benefícios,
    desempenho (visualizações do perfil, aparições em buscas, contatos, propostas
    usadas no mês) e dados da assinatura (valor, próxima cobrança, upgrade,
    cancelamento) — separada da página de preços (`/precos`), que continua sendo a
    vitrine de comparação/venda.
  - **Métricas administrativas** (`GET /subscriptions/admin/overview`, role `ADMIN`,
    tela `/admin/planos`): assinantes por plano, MRR estimado, taxa de conversão
    grátis→pago, cancelamentos solicitados. Não construí CRUD de planos nem gráfico de
    evolução histórica — isso exigiria uma tabela de auditoria de mudanças de plano que
    ainda não existe (não quis simular dado falso). **Não há fluxo de criação de conta
    ADMIN** — esse papel só existe via provisionamento manual do banco.
  - **Correção de segurança feita nesta entrega**: o cadastro aceitava `role: "ADMIN"`
    diretamente pela API (a interface só oferecia Cliente/Vendedor, mas nada impedia
    uma chamada direta). `RegisterDto` agora valida contra uma lista fixa
    (`CLIENTE`/`PRESTADOR`), fechando a escalação de privilégio.
  - Ainda sem gateway de pagamento — troca de plano e cancelamento são aplicados
    direto, como já valia para o impulso avulso abaixo.
- **Impulso avulso "Potencialização de clientes"** (R$ 5, na página de preços): diferente
  dos planos, é uma compra única que põe o prestador no topo de toda listagem/busca por
  7 dias, **à frente até de quem tem plano Premium** (`GET /subscriptions/boost`,
  `POST /subscriptions/me/boost`). Comprar de novo com um impulso ainda ativo soma mais
  7 dias ao prazo restante em vez de reiniciar. Mesma ressalva dos planos: sem gateway de
  pagamento, ativado direto para fins de teste. Testado que o prestador impulsionado
  aparece antes de um concorrente Premium na listagem pública.
- **Notificações em tempo real** (`src/notifications`, WebSocket namespace `/notifications`,
  sino no canto superior direito): avisa sobre nova mensagem no chat, nova proposta
  recebida numa solicitação e plano prestes a expirar/expirado — sempre com link direto
  pra tela relevante. Persistidas em banco (`GET /notifications`, marcar como lida/todas)
  e empurradas ao vivo via socket assim que o evento acontece, além de aparecerem na
  lista na próxima vez que o usuário abrir o menu. O aviso de "plano expirando" é
  deduplicado (no máximo 1 a cada 24h) para não virar spam.
- **Publicar solicitação conversando com a IA** (`/solicitar`, aba "Conversar com a IA"):
  em vez de preencher o formulário, o cliente descreve em texto livre o que precisa e a
  IA vai extraindo categoria, título, descrição, cidade/estado, orçamento e data a cada
  mensagem, mostrando o rascunho ao vivo ao lado da conversa; o formulário manual
  continua disponível como alternativa. Funciona também **sem `OPENAI_API_KEY`
  configurada**, com um fallback heurístico (por palavra-chave de categoria, regex de
  valores em R$, "hoje"/"amanhã") que já testei extraindo corretamente categoria,
  cidade e orçamento ao longo de duas mensagens — sem chave, a extração é mais simples
  que com IA generativa, mas o fluxo completo funciona.
- **Frontend**: landing, busca, perfil do prestador (estilo "Instagram"), cadastro/login
  com seleção de tipo de conta, painel do prestador (estatísticas, plano atual e
  solicitações), página de preços (`/precos`).
- **Chat em tempo real** entre cliente e prestador (`/mensagens`, WebSocket namespace `/chat`)
  e "Traçar rota" no perfil do prestador via Geolocation API + link de directions do
  Google Maps (sem chave de API paga).
- **Mural de oportunidades** ("Clientes procurando"): clientes publicam uma solicitação
  (`/solicitar`) com categoria, descrição, região e orçamento; prestadores veem, em
  `/painel/oportunidades`, só as solicitações compatíveis com as categorias e a
  cidade/estado do próprio perfil (`GET /requests/matches`, com filtros de categoria,
  distância, orçamento e ordenação por mais recentes/mais próximos/melhor
  correspondência). O prestador demonstra interesse enviando uma proposta (valor, prazo,
  mensagem) via `POST /requests/:id/proposals`; o cliente acompanha as propostas
  recebidas em `/minhas-solicitacoes` e pode abrir uma conversa direto com quem propôs.
  **Privacidade**: a resposta de `/requests/matches` nunca inclui nome, telefone, e-mail
  ou endereço do cliente — só os dados necessários para avaliar a oportunidade (testado
  explicitamente). O "match inteligente" hoje compara categoria e cidade/estado; não há
  geocodificação real, então "mais próximos" é uma aproximação por cidade/estado, não por
  distância em km, e não há verificação de disponibilidade de agenda (não existe um
  calendário de disponibilidade do prestador ainda).

### Funcionalidades adicionadas depois do MVP inicial

- **Marketplace** (`/marketplace`): venda de produtos usados entre usuários (CLIENTE
  ou PRESTADOR), separado do fluxo de serviços — anúncio com fotos, favoritos, chat
  próprio (`marketplace-chat`, WebSocket dedicado) entre comprador e vendedor.
- **Agenda** (`/painel/agenda`): compromissos do prestador com lembrete — notificação
  push + in-app quando o horário está chegando (`AppointmentsService.sendDueReminders`,
  cron a cada 5 min), mesmo com o app fechado. Tem PATCH pra reagendar.
- **Faturamento** (`/painel/faturamento`): lançamento manual de receitas e despesas,
  despesas recorrentes (geradas automaticamente todo mês), leitura de recibo por foto
  via IA pra preencher o lançamento. **Receita aqui é o valor combinado, não pagamento
  confirmado** — o app ainda não processa pagamento de verdade (ver Roadmap).
- **Verificação de identidade**: prestador envia foto de documento oficial
  (`identity.controller.ts`), admin aprova/rejeita (`/admin/identidade`) e o selo de
  identidade verificada aparece no perfil. Selfie/biometria facial continuam fora do
  escopo.
- **Disputas formais de reserva**: cliente ou prestador pode abrir uma disputa sobre
  um agendamento problemático (`BookingDisputeSection`), com resposta da outra parte
  e checagem automática do que já foi combinado.
- **Sistema de denúncias** (`/admin/denuncias`): denunciar usuário, produto, avaliação,
  serviço ou reserva (`ReportTargetType`), com fila de análise e resolução pelo admin.
- **Verificação de e-mail e redefinição de senha**: e-mail transacional via
  `nodemailer`, tokens com expiração. Trocar ou redefinir a senha agora também invalida
  qualquer token JWT emitido antes (`User.tokenVersion`) — sessões antigas (inclusive de
  uma conta excluída) param de funcionar na hora, não só quando expiram sozinhas.
- **Push notification de verdade** (`web-push` + VAPID, service worker em
  `apps/web/public/sw.js`): funciona com o app/navegador fechado, diferente do
  WebSocket. Precisa de `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`
  configuradas — sem isso, a API loga um aviso e segue só com WebSocket.
- **Central de ajuda** (`/ajuda`) e **Termos de Uso/Política de Privacidade**
  (estrutura LGPD) com aviso na primeira visita.
- **App Android** via Capacitor — empacota o mesmo frontend web como app nativo,
  sem lógica duplicada.

## Roadmap (fora do escopo desta primeira entrega)

- App mobile de verdade em **Flutter/React Native** — hoje o "app" Android é o
  frontend web empacotado via Capacitor, não um app nativo separado.
- **Pagamentos reais**: PIX, cartão, parcelamento, carteira digital, escrow
  (liberação do pagamento só após confirmação do serviço). Planos, impulso avulso e
  "receita" no Faturamento continuam sendo valor combinado/aplicado direto, sem
  gateway (Stripe/Pagar.me) integrado.
- **Selfie/biometria facial** na verificação de identidade (hoje só documento com
  foto + revisão manual de admin).
- **Sistema antigolpe** com IA (detecção de avaliações falsas, contas falsas, fraudes)
  — hoje a defesa é denúncia manual (`/admin/denuncias`), não detecção automática.
- **Feed estilo TikTok** com recomendação de conteúdo por IA.
- **Painel de empresa**: funcionários, filiais, CRM, leads, contratos, campanhas.
- **Gamificação**: ranking por cidade/bairro/nacional, medalhas, missões.
- **Cobrança recorrente real** dos planos de assinatura (a estrutura de planos já existe;
  falta integrar um gateway de pagamento via webhook).
- **Administração de planos completa**: CRUD de planos/preços pela UI, lista/busca de
  assinantes, gráfico de evolução (grátis→pago→cancelamento) ao longo do tempo — precisa
  de uma tabela de auditoria de mudanças de plano que ainda não existe. Hoje só existe
  `POST /subscriptions/admin/:userId/cancel` pra admin forçar um cancelamento duro, sem
  tela própria.
- **Distância real por coordenadas** no ranking e no mural de oportunidades (hoje é
  aproximação por cidade/estado, sem geocodificação — não há `lat`/`lng` no banco).
- **Chat por voz/imagem no intake de IA**: hoje o `/solicitar` com IA é só texto.
- Infraestrutura de produção: Docker/Kubernetes, CI/CD, ElasticSearch (busca full-text
  em escala) e Pinecone (busca semântica/recomendação via embeddings).
- **Upload de mídia real via object storage (S3 ou similar)**: hoje é `multer` salvando
  em disco local, o que não persiste entre invocações da função serverless da Vercel —
  arquivo enviado em produção pode sumir. Prioridade alta pra quem for usar upload de
  mídia/documento de identidade em produção.

### Fechado nesta rodada de auditoria (estava no roadmap, agora funciona)

- **Período de teste (trial) de planos pagos**: `POST /subscriptions/me/trial` ativa
  14 dias de PRO ou PREMIUM a partir do Grátis, uma vez por prestador
  (`Subscription.trialUsedAt`). Expira sozinho como qualquer assinatura paga — vira
  Grátis automaticamente quando o prazo vence, reaproveitando a mesma checagem de
  expiração que já existia. Botão "Testar grátis" em `/precos`, status "Em período de
  teste" em `/painel/plano`.
- **Horário de atendimento do prestador**: `ProviderProfile.businessHours` agora é
  validado e editável em `/painel/perfil`, aparece no perfil público, e
  `POST /bookings` recusa horário fora do expediente ou já ocupado por outra reserva
  — antes disso, "Contratar agora" nem perguntava data/hora.
- **Editar uma solicitação aberta** no mural de oportunidades
  (`PATCH /requests/:id`) e **recusar uma proposta específica**
  (`POST /requests/:id/proposals/:proposalId/reject`) sem precisar aceitar outra.
- **Editar/reagendar um impulso avulso (deal)** ativo (`PATCH /deals/:id`) — antes só
  dava pra cancelar e recriar. Mesmo padrão aplicado a Despesas, Receitas e
  Compromissos.
- **Correção de segurança**: `PATCH /subscriptions/me` aceitava o plano legado
  `BUSINESS` (benefícios do Premium de graça) — agora só aceita os planos
  realmente vendidos.
- **Sessão invalidada na hora** ao trocar/redefinir senha ou excluir a conta
  (`User.tokenVersion`) — antes um token já emitido continuava funcionando até expirar
  sozinho (até 7 dias), mesmo com a conta excluída.
- **15 índices novos no banco** em consultas que rodavam sem índice (lista de
  agendamentos, mensagens, avaliações, favoritos, solicitações, etc.).

## Notas técnicas importantes

- **Prisma 7** mudou o fluxo de configuração: a URL do banco não fica mais em
  `schema.prisma`, e sim em `prisma.config.ts` (lido pela CLI) e é passada via
  driver adapter (`@prisma/adapter-pg`) para o `PrismaClient` em runtime. O client
  gerado fica em `apps/api/src/generated/prisma` (não versionado).
- Se usar **Supabase** como banco, use a string de conexão do **Session pooler**
  (porta 5432) para rodar migrations — a do **Transaction pooler** (porta 6543) não
  suporta os locks de sessão que o `prisma migrate` precisa, mas pode ser usada em
  produção para as queries normais da aplicação.
- **Migrations `20261013200000_add_token_version_and_performance_indexes`** e
  `20261013210000_add_subscription_trial` foram escritas manualmente (SQL direto),
  não geradas por `prisma migrate dev` — este ambiente não tinha acesso a um Postgres
  real pra rodar o diff automático. Rode `npx prisma migrate deploy` (ou `migrate dev`
  localmente) contra o banco de verdade pra aplicá-las antes de testar as mudanças de
  segurança/índices/trial que vieram junto.

## Deploy

- **Frontend** (`apps/web`) e **backend** (`apps/api`) são dois projetos Vercel
  separados (`servicai` e `servicai-api`), cada um com seu próprio deploy a partir
  deste monorepo. A API roda como função serverless (`apps/api/api/index.mjs`) — por
  isso dependências nativas (ex: `bcrypt`) e filesystem persistente (ex: upload em
  disco) não funcionam direito nesse ambiente; ver notas na seção Stack/Roadmap.
- Variáveis de ambiente de produção (`DATABASE_URL`, `JWT_SECRET`, `OPENAI_API_KEY`,
  `VAPID_*`, SMTP para `nodemailer`, etc.) são configuradas direto no painel da Vercel
  de cada projeto, não neste repositório.
