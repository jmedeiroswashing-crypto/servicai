# Pitch de 3 minutos

Textos, falas, tempos e campos pendentes: `pitch-dados.ts` (bloco `CONFIG_PITCH` no topo).

## Endereços

- Telão: http://localhost:3000/pitch (`?tela=N` abre na tela N; `?auto=1` ensaia sozinho; `?video=1` força o plano B)
- Apresentador: http://localhost:3000/pitch/apresentador (ou aperte **P** no telão)
- Roteiro impresso: `npm run roteiro:ensaio` → `public/pitch/roteiro-ensaio.html` (abra e imprima em A4)

## Teclas

→ / PageDown / Espaço / clique: avança (o primeiro aperto começa o cronômetro) · ← / PageUp: volta ·
**B** tela preta · **F** tela cheia · **R** reinicia a animação ou a demo · **D** abre o app para a banca
(só nas telas 8–11) · **Esc** volta · **P** apresentador. As setas também funcionam na janela do apresentador.

## Antes do dia (com internet, uma vez)

```bash
cd apps/api && npm install && npm run build
cd ../web && npm install && npm run build      # gera out/ (a fonte do site é baixada aqui)
```

## No dia (sem internet)

```bash
docker compose up -d                       # na raiz: Postgres local
cd apps/api
npx prisma migrate deploy                  # só na 1ª vez neste banco local
npm run seed:pitch                         # zera e recria os dados da demo (rode antes de cada apresentação)
npm run start:prod                         # API compilada em http://localhost:3001/api, sem OPENAI_API_KEY
cd ../web
npm run pitch:servir                       # site compilado (out/) em http://localhost:3000
```

Use `start:prod` e `pitch:servir`, não `start:dev`/`npm run dev`: os modos de desenvolvimento
reiniciam quando o OneDrive mexe nos arquivos, e a API fora do ar por 2 s já manda o pitch para o vídeo.

Abra `/pitch`, aperte **P** (apresentador), espere o aviso "Preparando a demo…" sumir, aperte **F** e **→**.

## Plano B

Se a API não responder quando o pitch abre, as telas 8–11 tocam `public/pitch/demo-8.mp4` …
`demo-11.mp4`; o aviso aparece só na janela do apresentador. Para gravar de novo (API, seed e site no
ar, ffmpeg no PATH): `npm run gravar:demo`, depois `npm run build` para os vídeos irem para `out/`.
O Playwright precisa do ffmpeg dele: se reclamar, rode `npx playwright install ffmpeg`.

## Verificação

- `npm run pitch:capturas` — percorre as 16 telas pelo teclado em 1920×1080 e 1280×720 e acusa
  texto cortado
- `npm run pitch:ensaio-auto` — roda `?auto=1` e mostra quanto durou
- `npx vitest run src/pitch` (web) e `npx vitest run src/pitch` (api; os testes de banco precisam do Postgres local)
