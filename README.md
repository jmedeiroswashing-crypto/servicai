# ServiçAi

<!-- teste de acesso compartilhado: mbeze -->

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
  JWT (passport-jwt), Socket.IO (chat em tempo real), OpenAI SDK.
- **Frontend**: Next.js 16 (App Router), Tailwind CSS v4, Framer Motion, TanStack Query,
  Zustand, React Hook Form + Zod.
- **Banco**: PostgreSQL (neste setup, hospedado no Supabase; veja `apps/api/.env`).

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

## Roadmap (fora do escopo desta primeira entrega)

- App mobile em **Flutter** (cliente + prestador).
- **Pagamentos reais**: PIX, cartão, parcelamento, carteira digital, escrow
  (liberação do pagamento só após confirmação do serviço).
- **Verificação de identidade**: CPF/CNPJ, selfie, biometria facial, selo verificado.
- **Sistema antigolpe** com IA (detecção de avaliações falsas, contas falsas, fraudes).
- **Feed estilo TikTok** com recomendação de conteúdo por IA.
- **Painel de empresa**: funcionários, filiais, CRM, leads, contratos, campanhas.
- **Gamificação**: ranking por cidade/bairro/nacional, medalhas, missões.
- **Cobrança recorrente real** dos planos de assinatura (a estrutura de planos já existe;
  falta integrar um gateway de pagamento — Stripe, Pagar.me — via webhook).
- **Período de teste (trial)** de planos pagos: o status `TESTE` já existe no modelo de
  dados, falta o fluxo de ativação (duração, elegibilidade, um teste por prestador).
- **Administração de planos completa**: CRUD de planos/preços pela UI, lista/busca de
  assinantes, gráfico de evolução (grátis→pago→cancelamento) ao longo do tempo — precisa
  de uma tabela de auditoria de mudanças de plano que ainda não existe.
- **Distância real por coordenadas** no ranking e no mural de oportunidades (hoje é
  aproximação por cidade/estado, sem geocodificação).
- **Push notification de verdade** (celular/navegador fechado): as notificações hoje só
  chegam com o app aberto (WebSocket) — push real precisa de service worker + FCM/APNs.
- **Chat por voz/imagem no intake de IA**: hoje o `/solicitar` com IA é só texto.
- Infraestrutura de produção: Docker/Kubernetes, CI/CD, ElasticSearch (busca full-text
  em escala) e Pinecone (busca semântica/recomendação via embeddings).
- Upload de mídia real via **AWS S3** (hoje a API aceita apenas URLs já hospedadas).

## Notas técnicas importantes

- **Prisma 7** mudou o fluxo de configuração: a URL do banco não fica mais em
  `schema.prisma`, e sim em `prisma.config.ts` (lido pela CLI) e é passada via
  driver adapter (`@prisma/adapter-pg`) para o `PrismaClient` em runtime. O client
  gerado fica em `apps/api/src/generated/prisma` (não versionado).
- Se usar **Supabase** como banco, use a string de conexão do **Session pooler**
  (porta 5432) para rodar migrations — a do **Transaction pooler** (porta 6543) não
  suporta os locks de sessão que o `prisma migrate` precisa, mas pode ser usada em
  produção para as queries normais da aplicação.
