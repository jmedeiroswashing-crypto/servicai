/**
 * Extrai um valor em R$ plausível de um texto lido por OCR de recibo/nota
 * fiscal. Prioriza padrões com "R$" ou "TOTAL" na frente; se não achar,
 * cai pro maior valor decimal encontrado no texto (costuma ser o total).
 * Isso é heurística, não leitura garantida — a pessoa sempre confirma/edita
 * o valor antes de salvar.
 */
export function extractAmountFromOcrText(text: string): number | null {
  const normalized = text.replace(/\n/g, ' ');

  const labeledPattern = /(?:total|valor|r\$)\s*:?\s*r?\$?\s*([\d.,]{2,})/gi;
  const labeledMatches = [...normalized.matchAll(labeledPattern)];
  const candidates: number[] = [];

  for (const match of labeledMatches) {
    const parsed = parseMoneyToken(match[1]);
    if (parsed !== null) candidates.push(parsed);
  }
  if (candidates.length > 0) return Math.max(...candidates);

  const genericPattern = /\d{1,4}[.,]\d{2}\b/g;
  const genericMatches = normalized.match(genericPattern) ?? [];
  const genericValues = genericMatches.map(parseMoneyToken).filter((v): v is number => v !== null);
  if (genericValues.length === 0) return null;

  return Math.max(...genericValues);
}

function parseMoneyToken(raw: string): number | null {
  const cleaned = raw.trim().replace(/[^\d.,]/g, '');
  if (!cleaned) return null;

  let normalized = cleaned;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    normalized = cleaned.replace(',', '.');
  }

  const value = parseFloat(normalized);
  if (Number.isNaN(value) || value <= 0 || value > 1_000_000) return null;
  return value;
}

/**
 * Roda o OCR no navegador (sem precisar de chave de IA paga). O pacote é
 * carregado só quando a pessoa realmente usa a leitura de recibo, pra não
 * pesar o carregamento do resto do app.
 */
export async function runReceiptOcr(file: File): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('por');
  try {
    const {
      data: { text },
    } = await worker.recognize(file);
    return text;
  } finally {
    await worker.terminate();
  }
}
