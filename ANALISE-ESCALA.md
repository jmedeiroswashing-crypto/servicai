# Análise: Escala Business → oferta de gestão dentro do ServiçAi

> Fase 1 do pedido de recriar o Escala Business. Lido: `README.md`, `MANUAL-DO-DONO.md`,
> `PRODUCT.md`, `DESIGN.md`, `CLAUDE.md`, `src/painel/modulos.ts` (mapa dos 18 módulos),
> `src/data/store.ts` (camada de dados, sessão/permissão, regras de negócio) e
> `src/painel/escala/periodo.ts` (seletor de período) do projeto `gm-iphones`. Não alterei
> nada lá — só leitura, como pedido.
>
> **Decisão já confirmada pelo usuário:** isso não vira um produto separado e genérico pra
> qualquer loja. Vira **uma oferta dentro do próprio site ServiçAi**, pros prestadores
> gerenciarem o negócio deles. Por isso esta análise já é escrita nesse sentido — não vou
> propor `src/config/loja.ts` nem 2 configs de exemplo (celular/acessórios) como o prompt
> original pedia, porque isso só faria sentido pra um produto multi-loja.

## 1. O que o Escala Business faz (18 módulos, 7 grupos)

| Grupo | Módulo | O que faz | Específico de loja de celular? |
|---|---|---|---|
| Operação | Início | Faturamento, lucro, caixa, alertas do dia, curva do período | Não |
| Operação | Vender (PDV) | Venda no balcão com **IMEI**, troca e pagamento misto | **Sim** (IMEI) |
| Operação | Vendas | Lista de vendas, recibo, cancelar/devolver | Parcial (recibo de venda de produto) |
| Operação | Caixa do dia | Abrir/fechar caixa, sangria, suprimento | Não |
| Operação | Calendário | Cada dia com lucro/prejuízo e pontinhos de evento | Não |
| Operação | Minha comissão | Comissão do vendedor no mês | Não (mas pressupõe equipe) |
| Assistência | Consertos (OS) | Quadro Recebido→Em análise→Aguardando aprovação→Em conserto→Pronto→Entregue | Não (só o nome "conserto") |
| Assistência | Usado na troca | Avaliação de usado com checklist | **Sim** (troca de aparelho) |
| Produtos | Produtos | Cadastro com fotos, cores, preços | Parcial (loja física vende peça/produto) |
| Produtos | Estoque | Giro por **IMEI**, curva ABC, reposição | **Sim** (IMEI) |
| Produtos | Compras e fornecedores | Entrada de mercadoria, custo médio | **Sim** (estoque físico) |
| Produtos | Etiquetas | Etiqueta com QR pra imprimir | **Sim** (produto físico) |
| Financeiro | Contas e despesas | A pagar/a receber, recorrência, "já paguei" | Não |
| Financeiro | Metas | Meta do mês, projeção de fechamento | Não |
| Financeiro | Relatórios | 7 relatórios (lucro por produto, vendas, vendedor, pagamento, despesas, estoque, assistência) | Parcial |
| Relacionamento | Clientes | Listas inteligentes (aniversário, garantia vencendo, sumidos, fiéis) | Não |
| Relacionamento | Equipe e comissões | Pessoas, meta, % de comissão por categoria, ranking | Não (mas pressupõe equipe) |
| Site | Site, Anúncios, Sorteios, Estatísticas | Edita o site da loja apontando nele mesmo | **Sim**, e sem sentido aqui — o ServiçAi já é a "vitrine" do prestador |
| Loja | Configurações | Pagamento, desconto, histórico, backup | Parcial |

## 2. O que isso vira dentro do ServiçAi

### Já existe no ServiçAi hoje (não duplicar)
- **Despesas/Receitas** (`apps/api/src/expenses`, `incomes`) — já é o "Contas e despesas" em
  versão simples (sem conta a pagar com vencimento/recorrência completa, sem "a receber").
- **Agenda** (`apps/api/src/appointments`) — compromisso com lembrete, parecido com o
  Calendário, mas sem o cálculo de lucro/prejuízo por dia.
- **Booking** (`apps/api/src/bookings`) — é o equivalente do **OS**: tem status
  (`SOLICITADO→ACEITO→EM_ANDAMENTO→CONCLUIDO/CANCELADO`), mas **sem quadro kanban visual,
  sem orçamento item por item, sem mensagem automática por etapa, sem termo de entrada/saída**.
- **Score/avaliação** já existe, cobre parte do que "Clientes" faria.

### Núcleo que vale a pena trazer (reaproveitável por qualquer prestador, sem nada de loja de celular)
1. **Caixa do dia** — abrir com troco, sangria/suprimento, fechar com esperado × contado ×
   diferença. Novo no ServiçAi.
2. **Calendário financeiro** — dia a dia colorido por lucro/prejuízo, com pontinhos de evento
   (reaproveita Expense/Income/Appointment já existentes, só falta a tela).
3. **Metas** — meta do mês + projeção de fechamento pelo ritmo atual. Novo.
4. **Relatórios** — o que fizer sentido sem produto físico: vendas/serviços dia a dia, por
   forma de pagamento, despesas, resumo do período. "Lucro por produto" e "estoque" não se
   aplicam.
5. **Clientes com listas inteligentes** — aniversário, "sumido" (cliente que não volta há X
   meses), "fiel" (N+ contratações). O ServiçAi já tem o histórico de Booking por cliente,
   só falta agrupar assim.
6. **Equipe e comissões** — **gap real do ServiçAi hoje**: um prestador não tem conceito de
   "funcionário"/ajudante no sistema. Pra trazer isso de verdade precisa de um papel novo
   (ver seção 4).
7. **Seletor de período com comparação** (`periodo.ts`) — Hoje/7d/30d/Mês/Ano/Tudo, sempre
   comparando com o período anterior equivalente. Esse código é genérico e dá pra portar
   quase igual (sem IMEI, sem nada de loja).
8. **Busca de comandos (Ctrl+K) e Assistente** — genérico, mas é uma baita peça de trabalho
   à parte; não é núcleo mínimo.

### Vira "Ordem de Serviço" genérica (adapta, não copia)
- O quadro kanban do **OS** (`Recebido → Em análise → Aguardando aprovação → Em conserto →
  Pronto → Entregue`) é o maior ganho real pros prestadores do ServiçAi — hoje o `Booking`
  só tem os 5 status sem quadro visual nem orçamento por item nem mensagem automática por
  etapa. Reescrever como uma versão mais rica do Booking existente (não um model novo
  paralelo), com nomes genéricos (ex: "Recebido" vira "Solicitado", sem jargão de assistência
  técnica).
- "Termo de entrada/saída" vira o Recibo em PDF que **já existe** no ServiçAi
  (`GET /bookings/:id/receipt`), só falta registrar orçamento item por item antes.

### Não faz sentido trazer (específico de loja física com estoque por IMEI)
- Vender (PDV) com leitor de IMEI, Estoque por IMEI, Compras/fornecedores com custo médio,
  Etiquetas de preço, Usado na troca (trade-in).
- Toda a aba **Site** (editar o site apontando nele mesmo, Sorteios, Anúncios, Estatísticas
  de visita) — o ServiçAi **já é** a vitrine do prestador; ele não tem um site próprio pra
  editar dentro do painel. Isso não se aplica.

## 3. Pontos técnicos importantes (diferentes do prompt original)

- **Dados: Postgres via Prisma, não localStorage/IndexedDB.** O Escala Business de referência
  é uma demo client-only (`src/data/store.ts`, tudo no navegador). Como isso vai ser uma
  oferta de verdade dentro do ServiçAi, cada módulo novo (Caixa, Metas, Clientes agrupados,
  Equipe) precisa de tabela própria no schema do Prisma e endpoint no NestJS, seguindo o
  padrão que já existe em `apps/api/src/expenses`/`incomes`/`appointments` — não dá pra
  copiar `store.ts` direto.
- **Sem multi-loja/config por tipo de negócio.** Isso simplifica bastante: não precisa da
  camada `src/sistema/` vs `src/config/loja.ts` do prompt original, nem portar `margens`,
  `condicao` (novo/seminovo), `Categoria` de produto físico.
- **"?" com ajuda, tour guiado, busca de comandos** são um padrão de UX muito bom (presentes
  em praticamente toda tela do Escala Business) mas representam bastante trabalho à parte —
  vale tratar como uma segunda onda, depois do núcleo funcionando.

## 4. Decisão em aberto — preciso da sua resposta antes da Fase 2

**O ServiçAi hoje não tem conceito de equipe/funcionário** — cada prestador é uma pessoa só.
O Escala Business inteiro é construído em cima de "dono vê tudo, funcionário só vende e não
vê dinheiro". Pra trazer "Equipe e comissões" de verdade, teria que:
- criar um jeito do prestador convidar/cadastrar gente da equipe dele, com um papel que vê
  menos coisa (sem lucro/despesas), e
- decidir se isso é parte da Fase 2 (núcleo) ou fica pra depois, já que é a peça mais nova
  (não existe nada parecido hoje no ServiçAi).

Minha sugestão: **núcleo da Fase 2 sem Equipe** (Caixa, Calendário financeiro, Metas,
Relatórios, Clientes com listas inteligentes, Ordem de Serviço em quadro) — isso já é valor
real e não depende de nada novo em autenticação/papéis. Equipe e comissões entra como
Fase 3, junto com Site/Relacionamento, por mexer em permissão/login.

## O que ficou faltando desta fase

- Não testei o painel ao vivo no navegador (390px/1366px) — você sinalizou que ia me mandar
  um link atualizado e ainda não chegou; a documentação escrita (`MANUAL-DO-DONO.md`) é bem
  detalhada e cobriu a análise, mas vale eu rodar o `ruflo-browser` nas telas reais assim que
  tiver o link certo, antes de decidir qualquer detalhe fino de layout.
- Não abri cada arquivo de tela individualmente (`telas/*.tsx`) nem os módulos de regra
  (`pedido.ts`, `estoque.ts`, `relatorios.ts`, `exportar.ts`) — fiz a leitura pela visão geral
  (manual + mapa de módulos + camada de dados), que é o que o seu próprio prompt apontou como
  a melhor descrição. Se topar o plano acima, numa próxima fase eu abro os arquivos de regra
  específicos de cada módulo que entrar no núcleo, pra portar a lógica certa (ex: cálculo de
  lucro, fórmula de "vende em X dias").
