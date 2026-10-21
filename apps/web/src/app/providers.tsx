'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query';
import { Toaster, toast } from 'sonner';
import { registerServiceWorker } from '@/lib/push';
import { extractErrorMessage } from '@/lib/error-message';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000 } },
        // Rede de segurança: toda mutação que falhar e não tratar o próprio
        // erro (a maioria do app hoje) ainda avisa o usuário via toast, em vez
        // de falhar em silêncio.
        mutationCache: new MutationCache({
          onError: (error) => {
            toast.error(extractErrorMessage(error));
          },
        }),
      }),
  );

  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster position="top-center" richColors closeButton />
    </QueryClientProvider>
  );
}
