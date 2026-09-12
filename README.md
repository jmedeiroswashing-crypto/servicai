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
- **Planos de assinatura** (Grátis/Pro/Business/Premium): cada plano define limite de
  anúncios ativos, limite de itens de mídia, cota mensal de usos de IA e o selo de
  reputação correspondente (Prata/Ouro/Premium); a troca de plano já atualiza o selo e
  a prioridade de exposição do prestador na busca (`GET /subscriptions/plans`,
  `GET/PATCH /subscriptions/me`). **Sem gateway de pagamento integrado ainda** — a troca
  de plano é aplicada diretamente para fins de teste; em produção deve ser acionada por
  um webhook de confirmação de pagamento (Pix/cartão via Stripe, Pagar.me, etc.), não
  diretamente pelo cliente. Preços definidos com base em pesquisa de mercado (GetNinjas,
  Zaask, Thumbtack, Angi) — ver `apps/api/src/subscriptions/plans.config.ts`.
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
