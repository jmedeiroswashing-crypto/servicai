'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

type LoadResult = { src: string; status: 'loaded'; url: string } | { src: string; status: 'error' };

export function AuthenticatedImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [result, setResult] = useState<LoadResult | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;

    api
      .get(src, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        url = URL.createObjectURL(res.data);
        setResult({ src, status: 'loaded', url });
      })
      .catch(() => {
        if (!cancelled) setResult({ src, status: 'error' });
      });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [src]);

  const current = result?.src === src ? result : null;

  if (current?.status === 'error') {
    return (
      <div className={`flex items-center justify-center bg-surface-muted text-xs text-foreground-muted ${className ?? ''}`}>
        Não foi possível carregar
      </div>
    );
  }

  if (!current) {
    return (
      <div className={`flex items-center justify-center bg-surface-muted ${className ?? ''}`}>
        <Loader2 size={16} className="animate-spin text-foreground-muted" />
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={current.url} alt={alt} className={className} />;
}
