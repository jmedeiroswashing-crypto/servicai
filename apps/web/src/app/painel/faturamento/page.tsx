'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Endereço antigo, ainda usado por notificações já enviadas: agora os números moram no Início. */
export default function FaturamentoPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/painel');
  }, [router]);
  return null;
}
