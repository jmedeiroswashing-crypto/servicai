# Reorganização da navegação do ServiçAi

Data: 2026-11-05
Status: substituída pelo briefing de redesign de 2026-11-06, que também muda o visual.
Continuam valendo os logins separados, o retorno após login e os menus do prestador.

## Objetivo

Tornar o site fácil de navegar para clientes e empresários, com logins claramente
separados. O estilo visual atual está aprovado e não muda: cores, fontes, logo e
aparência dos componentes continuam os mesmos.

## Escopo

**Dentro:** menus, entrada e cadastro, ordem e densidade das telas, textos de
navegação e tamanho de toque.

**Fora:** identidade visual, backend, banco de dados e a área `/conserto`, que tem
login próprio. Nenhuma função é removida. As áreas de admin só recebem o novo menu.

## Problemas que motivam a mudança

- `/login` usa `role="CLIENTE"` fixo: todos veem "Área do cliente", e o empresário
  que usa a aba "Criar conta" dali cria uma conta de cliente.
- O prestador completo tem 11 itens em uma barra com rolagem lateral.
- No celular, a navegação depende do menu de três traços.
- O aviso de termos bloqueia qualquer página na primeira visita.
- Após o login, a pessoa sempre vai para o destino padrão e perde o que estava fazendo.
- `/ajuda` exige login mesmo para quem não consegue entrar.

## 1. Logins separados

### Rotas

| Rota | Conteúdo |
|---|---|
| `/login` | Escolha entre dois cartões: **Sou cliente** e **Sou empresário** |
| `/login/cliente` | Título "Entrar como cliente"; link "Criar conta de cliente" para `/cadastro?tipo=CLIENTE` |
| `/login/empresario` | Título "Entrar como empresário" e o apoio "Profissional autônomo ou empresa"; link "Criar conta de empresário" para a escolha de modo |

### Regras

- As duas telas usam o mesmo `POST /auth/login`. O tipo real da conta vem do servidor.
- As abas Entrar/Criar conta saem do `AuthForm`, o que elimina a criação de conta do
  tipo errado. Login e cadastro passam a ser telas ligadas por um link.
- **Porta errada:** se o login for válido mas a conta for do outro tipo, a pessoa entra
  normalmente, vai para a própria área e vê o aviso "Esta é uma conta de cliente" (ou
  "de empresário"). Ninguém fica bloqueado por escolher o cartão errado.
- `ADMIN` entra por qualquer uma das telas e vai para sua área.
- Links antigos para `/login` continuam válidos e mostram a escolha, preservando `next`.

### Retorno após o login

- Telas protegidas redirecionam para `/login?next=<caminho atual>`, e `next` segue até a
  tela escolhida.
- `next` só é aceito se for caminho interno: começa com um único `/`, sem `//`, sem `\`
  e sem esquema. Qualquer outro valor é ignorado, para impedir redirecionamento aberto.
- Sem `next`, valem os destinos atuais de `destinationFor`.

### Cadastro

- `/comecar` perde a abertura de 2 segundos.
- A primeira pergunta passa a ser **Quero contratar** ou **Sou empresário**.
- Só o empresário vê os 3 modos, com títulos curtos: "Organizar meu negócio",
  "Organizar e conseguir clientes" e "Só conseguir clientes".
- Os parâmetros `tipo` e `modo` de `/cadastro` não mudam.

## 2. Menus

| Perfil | Itens |
|---|---|
| Empresário completo | Início, Agenda, Clientes, Dinheiro, Mensagens |
| Só gestão | Agenda, Clientes, Dinheiro |
| Só contratação | Início, Agenda, Novos clientes, Mensagens |
| Cliente | Buscar, Meus pedidos, Mensagens |
| Admin | Denúncias, Identidade, Planos |
| Visitante | Buscar, Vagas, Anunciar, Planos |

### Grupos com abas

As rotas existentes continuam sendo páginas próprias. As abas são links entre elas.

| Item | Abas |
|---|---|
| Dinheiro | Caixa (`/painel/caixa`), Calendário (`/painel/calendario`), Gestão (`/painel/faturamento`) |
| Clientes | Meus clientes (`/painel/clientes`), Conseguir novos (`/painel/conseguir-clientes`) |
| Meus pedidos | Solicitações (`/minhas-solicitacoes`), Reservas (`/minhas-reservas`) |

- As abas internas de `/painel/conseguir-clientes` passam a usar `?aba=`, para o botão
  voltar e o compartilhamento funcionarem. `/painel/oportunidades`,
  `/painel/vagas-ultima-hora` e `/painel/prospeccao` continuam abrindo.
- O cliente acessa "Publicar solicitação" por um botão em Meus pedidos e na busca, e
  "Vagas de última hora" pela busca.
- Todos os links de notificação do backend continuam válidos, pois nenhuma rota é removida.

### Conta

Um menu no topo reúne Meu perfil, Dados profissionais (empresário), Meu plano
(empresário), Ajuda e Sair.

### Comportamento por tela

- **Computador:** barra no topo, sem rolagem lateral.
- **Celular:** barra fixa inferior com os itens do perfil. O topo mantém logo, sino e Conta.
- **Visitante:** topo com Entrar (`/login`) e Criar conta (`/comecar`).
- A barra inferior respeita a área segura do Android (o app Capacitor usa este mesmo
  frontend) e não pode cobrir conteúdo nem o campo de digitação de `/mensagens`.
- Barra e menu ficam ocultos em `/comecar`, `/cadastro`, `/login`, `/login/*` e
  `/conserto/*`. As listas de caminhos da `Navbar` e dos gates precisam incluir as novas
  rotas, pois hoje comparam o caminho exato.

## 3. Fluxos e telas

- **Termos:** `TermsGate` deixa de bloquear a navegação. O cadastro ganha uma caixa
  obrigatória de aceite com links para Termos e Privacidade. O aceite segue sem registro
  no banco, como hoje, pois o backend está fora do escopo. Essa limitação deve ser levada
  a quem cuida da parte legal.
- **Ajuda:** a página abre sem login. O formulário exige conta porque `POST /support/contact`
  é autenticado; quem não está logado vê links para entrar e para "Esqueci a senha".
- **Home:** busca e categorias primeiro. "Serviços mais buscados", que repete as
  categorias, e os blocos institucionais ficam mais enxutos. A meta é reduzir bastante os
  7.696px atuais no celular, sem perder a chamada para empresários.
- **Busca:** resultados compactos no celular, com imagem ao lado do texto. Campo de busca
  com exemplo que caiba em 390px.
- **Toque:** navegação, botões e filtros principais com pelo menos 44px.

## 4. Textos

- "ServiçAi" nos textos. As imagens do logo não mudam, pois o visual está fora do escopo.
- "Empresário" no que se refere à conta (login, cadastro, painel e preços), substituindo
  "vendedor", "gestor" e "Área de contratação".
- "Prestador" continua no que o cliente vê, como em "prestadores da sua região".
- Remover "pagamento protegido" da descrição do site, pois não há pagamento integrado.

## Etapas

Cada etapa é um PR próprio, com link de teste da Vercel, e só vai ao ar após aprovação.

1. **Navegação:** menus, barra inferior, Conta e abas de grupo.
2. **Entrada:** logins separados, retorno após login, cadastro, termos e ajuda.
3. **Cliente:** home e busca.
4. **Empresário:** ajustes do painel e `?aba=`.
5. **Fechamento:** textos restantes, documentação e auditoria de segurança.

## Testes

- `apps/web` hoje só tem `lint` e `build`. Adicionar Vitest para o mapa de menus por perfil
  e a validação de `next`, incluindo `//site.com`, `https://site.com` e `/\site.com`.
- Testes de navegador em 390px e 1366×768 para cada perfil, com respostas da API simuladas.
- Nenhuma conta de teste será criada no banco de produção sem confirmação no chat.
- Verificar: sem rolagem horizontal, porta errada, volta após login, links de notificação
  e campo de digitação visível em `/mensagens`.
- Rodar a auditoria de segurança antes de publicar e atualizar o README.
