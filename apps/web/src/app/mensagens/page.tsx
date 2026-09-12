'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import { ArrowLeft, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { createChatSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth-store';
import type { ChatConversation, ChatMessage } from '@/lib/types';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function ConversationList({
  conversations,
  activeId,
  userId,
  onSelect,
}: {
  conversations: ChatConversation[];
  activeId: string | null;
  userId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="divide-y divide-border overflow-y-auto">
      {conversations.length === 0 && (
        <p className="p-6 text-sm text-foreground-muted">Nenhuma conversa ainda.</p>
      )}
      {conversations.map((c) => {
        const name = c.provider?.user.name ?? c.client?.name ?? 'Conversa';
        const lastMessage = c.messages?.[0];
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`flex w-full flex-col gap-1 px-5 py-4 text-left transition-colors hover:bg-surface-muted/60 ${
              activeId === c.id ? 'bg-surface-muted' : ''
            }`}
          >
            <span className="font-medium text-ink">{name}</span>
            {lastMessage && (
              <span className="truncate text-sm text-foreground-muted">
                {lastMessage.senderId === userId ? 'Você: ' : ''}
                {lastMessage.content}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Thread({ conversationId, onBack }: { conversationId: string; onBack: () => void }) {
  const { user, token } = useAuthStore();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: conversations } = useQuery<ChatConversation[]>({ queryKey: ['chat', 'conversations'] });
  const conversation = conversations?.find((c) => c.id === conversationId);
  const peerName = conversation?.provider?.user.name ?? conversation?.client?.name ?? 'Conversa';

  const { data: messages } = useQuery({
    queryKey: ['chat', 'messages', conversationId],
    queryFn: async () => (await api.get<ChatMessage[]>(`/chat/conversations/${conversationId}/messages`)).data,
  });

  useEffect(() => {
    if (!token) return;
    const socket = createChatSocket(token);
    socketRef.current = socket;

    socket.emit('join', { conversationId });

    socket.on('message', (message: ChatMessage) => {
      if (message.conversationId !== conversationId) return;
      queryClient.setQueryData<ChatMessage[]>(['chat', 'messages', conversationId], (old) =>
        old ? [...old, message] : [message],
      );
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    });

    return () => {
      socket.disconnect();
    };
  }, [conversationId, token, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSend() {
    const content = draft.trim();
    if (!content || !socketRef.current) return;
    socketRef.current.emit('message', { conversationId, content });
    setDraft('');
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <button onClick={onBack} className="text-foreground-muted hover:text-ink sm:hidden">
          <ArrowLeft size={18} />
        </button>
        <span className="font-medium text-ink">{peerName}</span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {messages?.map((m) => {
          const mine = m.senderId === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-3.5 py-2 text-sm ${mine ? 'bg-ink text-background' : 'border border-border text-ink'}`}>
                <p>{m.content}</p>
                <p className={`mt-1 text-[0.65rem] ${mine ? 'text-background/60' : 'text-foreground-muted'}`}>
                  {formatTime(m.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 border-t border-border px-4 py-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Escreva uma mensagem..."
          className="flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-foreground-muted/50"
        />
        <button onClick={handleSend} className="p-2 text-ink hover:text-accent" aria-label="Enviar">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

function MensagensContent() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeId, setActiveId] = useState<string | null>(searchParams.get('c'));

  useEffect(() => {
    if (!token) router.push('/login');
  }, [token, router]);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['chat', 'conversations'],
    enabled: !!token,
    queryFn: async () => (await api.get<ChatConversation[]>('/chat/conversations')).data,
  });

  useEffect(() => {
    const fromQuery = searchParams.get('c');
    if (fromQuery) setActiveId(fromQuery);
  }, [searchParams]);

  if (!token) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-display mb-6 text-2xl text-ink">Mensagens</h1>
      <div className="grid h-[65vh] border border-border sm:grid-cols-[280px_1fr]">
        <div className={`${activeId ? 'hidden sm:block' : ''} border-border sm:border-r`}>
          {isLoading ? (
            <p className="p-6 text-sm text-foreground-muted">Carregando...</p>
          ) : (
            <ConversationList
              conversations={conversations ?? []}
              activeId={activeId}
              userId={user?.id ?? ''}
              onSelect={setActiveId}
            />
          )}
        </div>
        <div className={`${activeId ? '' : 'hidden sm:flex'} flex items-center justify-center`}>
          {activeId ? (
            <Thread key={activeId} conversationId={activeId} onBack={() => setActiveId(null)} />
          ) : (
            <p className="text-sm text-foreground-muted">Selecione uma conversa</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MensagensPage() {
  return (
    <Suspense fallback={null}>
      <MensagensContent />
    </Suspense>
  );
}
