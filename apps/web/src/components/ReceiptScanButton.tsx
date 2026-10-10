'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { extractAmountFromOcrText, runReceiptOcr } from '@/lib/receipt-ocr';

export function ReceiptScanButton({ onExtracted }: { onExtracted: (amount: number | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setScanning(true);
    setError('');
    try {
      const text = await runReceiptOcr(file);
      const amount = extractAmountFromOcrText(text);
      if (amount === null) {
        setError('Não consegui identificar um valor na foto — confira a qualidade da imagem ou digite manualmente.');
      }
      onExtracted(amount);
    } catch {
      setError('Não foi possível ler a foto. Digite o valor manualmente.');
      onExtracted(null);
    } finally {
      setScanning(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={scanning}
        className="flex items-center gap-1.5 border border-border px-3 py-2 text-xs font-medium text-foreground-muted hover:border-ink hover:text-ink disabled:opacity-50"
        title="Leitura automática do valor por foto — confira sempre antes de salvar"
      >
        {scanning ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
        {scanning ? 'Lendo foto...' : 'Ler valor da nota (foto)'}
      </button>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
}
