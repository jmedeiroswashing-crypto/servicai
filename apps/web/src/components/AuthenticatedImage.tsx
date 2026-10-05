'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export function AuthenticatedImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    setError(false);
    setObjectUrl(null);

    api
      .get(src, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        url = URL.createObjectURL(res.data);
        setObjectUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [src]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-surface-muted text-xs text-foreground-muted ${className ?? ''}`}>
        Não foi possível carregar
      </div>
    );
  }

  if (!objectUrl) {
    return (
      <div className={`flex items-center justify-center bg-surface-muted ${className ?? ''}`}>
        <Loader2 size={16} className="animate-spin text-foreground-muted" />
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={objectUrl} alt={alt} className={className} />;
}
