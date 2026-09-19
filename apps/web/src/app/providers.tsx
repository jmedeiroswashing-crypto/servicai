'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { registerServiceWorker } from '@/lib/push';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }));

  useEffect(() => {
    registerServiceWorker();
  }, []);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
