/** Comunicação entre o telão (/pitch) e a janela do apresentador, via BroadcastChannel. */

export const NOME_CANAL = 'servicai-pitch';

export interface EstadoPitch {
  tela: number;
  /** Date.now() de quando o cronômetro começou; null enquanto o pitch não começou. */
  inicioMs: number | null;
  /** Date.now() de quando a tela atual entrou no ar. */
  telaDesdeMs: number;
  preto: boolean;
  /** Banca mexendo no app (tecla D). */
  noApp: boolean;
  /** API fora do ar: as demos tocam o vídeo gravado. */
  modoVideo: boolean;
  /** Mensagem curta para o apresentador (preparando demo, erro de demo etc.). */
  aviso: string | null;
  demoPronta: boolean;
  auto: boolean;
  /** Ensaio automático terminado: duração em ms. */
  ensaioDuracaoMs: number | null;
}

export type ComandoPitch =
  | { tipo: 'proxima' }
  | { tipo: 'anterior' }
  | { tipo: 'ir'; tela: number }
  | { tipo: 'reiniciar' }
  | { tipo: 'preto' }
  | { tipo: 'pedir-estado' };

export type MensagemCanal = { de: 'telao'; estado: EstadoPitch } | { de: 'apresentador'; comando: ComandoPitch };

export function abrirCanal(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  return new BroadcastChannel(NOME_CANAL);
}
