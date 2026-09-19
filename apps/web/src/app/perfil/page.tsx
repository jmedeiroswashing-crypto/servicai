'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BadgeCheck,
  MapPin,
  Phone,
  Mail,
  Pencil,
  Star,
  Users,
  Timer,
  Images,
  KeyRound,
  LogOut,
  Trash2,
  AlertTriangle,
  FileText,
  Bell,
  BellOff,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { isPushSupported, getCurrentPushSubscription, subscribeToPush, unsubscribeFromPush } from '@/lib/push';
import type { ProviderProfile, UserProfile } from '@/lib/types';

function roleLabel(user: UserProfile) {
  if (user.role === 'ADMIN') return 'Administrador';
  if (user.role === 'CLIENTE') return 'Cliente';
  return user.personType === 'PJ' ? 'Empresa' : 'Prestador de serviço';
}

function PushNotificationToggle() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSupported(isPushSupported());
    getCurrentPushSubscription().then((sub) => setSubscribed(!!sub));
  }, []);

  async function toggle() {
    setLoading(true);
    setError('');
    try {
      if (subscribed) {
        await unsubscribeFromPush();
        setSubscribed(false);
      } else {
        await subscribeToPush();
        setSubscribed(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível ativar as notificações.');
    } finally {
      setLoading(false);
    }
  }

  if (!supported) {
    return (
      <div className="flex items-center gap-2.5 border-b border-border py-3 text-sm text-foreground-muted/60">
        <BellOff size={15} /> Notificações push não são suportadas neste navegador
      </div>
    );
  }

  return (
    <div className="border-b border-border py-3">
      <button onClick={toggle} disabled={loading} className="flex w-full items-center justify-between text-sm text-ink disabled:opacity-50">
        <span className="flex items-center gap-2.5">
          {subscribed ? <Bell size={15} className="text-accent" /> : <BellOff size={15} className="text-foreground-muted" />}
          Notificações push {subscribed ? 'ativadas' : 'desativadas'}
        </span>
        <span className="text-xs text-accent hover:underline">{loading ? '...' : subscribed ? 'Desativar' : 'Ativar'}</span>
      </button>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
}

function ChangePasswordForm() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const mutation = useMutation({
    mutationFn: async () => (await api.post('/auth/change-password', { currentPassword, newPassword })).data,
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => setOpen(false), 1500);
    },
  });

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex w-full items-center gap-2.5 py-3 text-sm text-ink hover:text-accent">
        <KeyRound size={15} className="text-foreground-muted" /> Alterar senha
      </button>
    );
  }

  return (
    <div className="border-t border-border py-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-medium text-ink">
        <KeyRound size={15} /> Alterar senha
      </p>
      <div className="max-w-sm space-y-2.5">
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Senha atual"
          className="w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-ink"
        />
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Nova senha (mínimo 6 caracteres)"
          className="w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-ink"
        />
        {mutation.isError && (
          <p className="text-xs text-danger">
            {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
              'Não foi possível alterar a senha.'}
          </p>
        )}
        {mutation.isSuccess && <p className="text-xs text-success">Senha alterada com sucesso.</p>}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => mutation.mutate()}
            disabled={currentPassword.length < 1 || newPassword.length < 6 || mutation.isPending}
            className="bg-ink px-4 py-2 text-xs font-medium text-background hover:opacity-85 disabled:opacity-40"
          >
            {mutation.isPending ? 'Salvando...' : 'Salvar nova senha'}
          </button>
          <button onClick={() => setOpen(false)} className="px-4 py-2 text-xs text-foreground-muted hover:text-ink">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteAccountSection() {
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();
  const { logout } = useAuthStore();

  const mutation = useMutation({
    mutationFn: async () => api.delete('/users/me'),
    onSuccess: () => {
      logout();
      router.push('/');
    },
  });

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} className="flex w-full items-center gap-2.5 py-3 text-sm text-danger hover:opacity-80">
        <Trash2 size={15} /> Excluir conta
      </button>
    );
  }

  return (
    <div className="border-t border-border py-4">
      <div className="flex items-start gap-2.5 border border-danger/30 bg-danger/5 p-4">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-danger" />
        <div>
          <p className="text-sm font-medium text-ink">Tem certeza que quer excluir sua conta?</p>
          <p className="mt-1 text-xs text-foreground-muted">
            Essa ação não pode ser desfeita. Você perderá o acesso imediatamente e seu perfil deixa de aparecer no
            aplicativo.
          </p>
          {mutation.isError && <p className="mt-2 text-xs text-danger">Não foi possível excluir a conta. Tente novamente.</p>}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="bg-danger px-4 py-2 text-xs font-medium text-white hover:opacity-85 disabled:opacity-50"
            >
              {mutation.isPending ? 'Excluindo...' : 'Sim, excluir permanentemente'}
            </button>
            <button onClick={() => setConfirming(false)} className="px-4 py-2 text-xs text-foreground-muted hover:text-ink">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReputationRow({ provider }: { provider: ProviderProfile }) {
  return (
    <div className="grid grid-cols-3 border border-border sm:grid-cols-4">
      <div className="border-r border-border p-4">
        <p className="flex items-center gap-1 font-display text-xl text-ink">
          <Star size={15} className="fill-accent text-accent" /> {provider.ratingAvg.toFixed(1)}
        </p>
        <p className="mt-1 text-xs text-foreground-muted">Nota média</p>
      </div>
      <div className="border-r border-border p-4">
        <p className="font-display text-xl text-ink">{provider.reviewCount ?? 0}</p>
        <p className="mt-1 text-xs text-foreground-muted">Avaliações</p>
      </div>
      <div className="border-r border-border p-4 sm:border-r">
        <p className="font-display text-xl text-ink">{provider.servicesDone}</p>
        <p className="mt-1 text-xs text-foreground-muted">Serviços realizados</p>
      </div>
      {provider.respondsWithinHour && (
        <div className="hidden items-center gap-1.5 p-4 text-success sm:flex">
          <Timer size={15} />
          <span className="text-xs font-medium">Responde em até 1h</span>
        </div>
      )}
    </div>
  );
}

function ProviderProfileSections() {
  const { data: provider, isLoading } = useQuery({
    queryKey: ['providers', 'me', 'full'],
    queryFn: async () => (await api.get<ProviderProfile>('/providers/me/full')).data,
  });

  if (isLoading || !provider) {
    return <p className="mt-10 text-foreground-muted">Carregando dados profissionais...</p>;
  }

  return (
    <div className="mt-10 space-y-10">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl text-ink">Informações profissionais</h2>
          <Link href="/painel/perfil" className="flex items-center gap-1 text-sm text-accent hover:underline">
            <Pencil size={13} /> Editar
          </Link>
        </div>
        <div className="border border-border p-5">
          <p className="font-medium text-ink">{provider.specialty}</p>
          {provider.categories.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {provider.categories.map((c) => (
                <span key={c} className="border border-border px-2 py-0.5 text-xs text-foreground-muted">
                  {c}
                </span>
              ))}
            </div>
          )}
          <p className="mt-3 text-sm text-foreground-muted">
            {provider.yearsExperience > 0 ? `${provider.yearsExperience} anos de experiência` : 'Experiência ainda não informada'}
          </p>
          {provider.bio && <p className="mt-2 text-sm text-foreground-muted">{provider.bio}</p>}
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-display text-xl text-ink">Reputação</h2>
        <ReputationRow provider={provider} />
      </div>

      <div>
        <h2 className="mb-3 font-display text-xl text-ink">Serviços oferecidos</h2>
        {(!provider.services || provider.services.length === 0) && (
          <p className="text-sm text-foreground-muted">Nenhum serviço cadastrado ainda.</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {provider.services?.map((s) => (
            <div key={s.id} className="border border-border p-4">
              <h3 className="font-medium text-ink">{s.title}</h3>
              <p className="mt-1 text-sm text-foreground-muted">{s.description}</p>
              <p className="mt-2 text-sm font-medium text-ink">
                {s.priceMin ? `R$ ${s.priceMin}${s.priceMax ? ` – R$ ${s.priceMax}` : ''}` : 'A combinar'}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl text-ink">Portfólio</h2>
          <Link href="/painel/perfil" className="flex items-center gap-1 text-sm text-accent hover:underline">
            <Images size={13} /> Gerenciar
          </Link>
        </div>
        {(!provider.media || provider.media.length === 0) && (
          <p className="text-sm text-foreground-muted">Nenhum trabalho no portfólio ainda.</p>
        )}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {provider.media?.slice(0, 8).map((m) => (
            <div key={m.id} className="aspect-square overflow-hidden bg-surface-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.url}
                alt={m.title ?? ''}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-display text-xl text-ink">Avaliações recebidas</h2>
        {(!provider.reviews || provider.reviews.length === 0) && (
          <p className="text-sm text-foreground-muted">Nenhuma avaliação recebida ainda.</p>
        )}
        <div className="divide-y divide-border border-t border-border">
          {provider.reviews?.map((r) => (
            <div key={r.id} className="py-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium text-ink">{r.client?.name ?? 'Cliente'}</span>
                <span className="flex items-center gap-1 text-sm text-foreground-muted">
                  <Star size={13} className="fill-accent text-accent" /> {r.rating.toFixed(1)}
                </span>
              </div>
              {r.comment && <p className="text-sm text-foreground-muted">{r.comment}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MeuPerfilPage() {
  const { token, logout } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!token) router.push('/login');
  }, [token, router]);

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ['users', 'me'],
    enabled: !!token,
    queryFn: async () => (await api.get<UserProfile>('/users/me')).data,
  });

  if (!token) return null;

  if (isLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-20 text-foreground-muted">Carregando perfil...</div>;
  }

  if (isError || !user) {
    return <div className="mx-auto max-w-3xl px-4 py-20 text-danger">Não foi possível carregar seu perfil. Tente novamente.</div>;
  }

  const companyName = user.nomeFantasia || user.razaoSocial;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center border border-border bg-surface-muted">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              <span className="font-display text-2xl text-foreground-muted">{user.name.charAt(0)}</span>
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl text-ink">{user.name}</h1>
              {user.verified && <BadgeCheck size={18} className="text-accent" />}
            </div>
            {companyName && <p className="text-sm text-foreground-muted">{companyName}</p>}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground-muted">
              <span className="border border-border px-1.5 py-0.5 font-medium uppercase tracking-wide">{roleLabel(user)}</span>
              {user.city && (
                <span className="flex items-center gap-1">
                  <MapPin size={11} /> {user.city}
                  {user.addressState ? ` - ${user.addressState}` : ''}
                </span>
              )}
            </div>
          </div>
        </div>
        <Link
          href="/perfil/editar"
          className="flex shrink-0 items-center gap-1.5 border border-ink px-4 py-2 text-sm font-medium text-ink hover:bg-ink hover:text-background"
        >
          <Pencil size={13} /> Editar perfil
        </Link>
      </div>

      {/* Informações básicas */}
      <div className="mt-8">
        <h2 className="mb-3 font-display text-xl text-ink">Informações</h2>
        <dl className="grid gap-4 border border-border p-5 sm:grid-cols-2">
          <div>
            <dt className="flex items-center gap-1.5 text-xs text-foreground-muted">
              <Phone size={12} /> Telefone
            </dt>
            <dd className="mt-1 text-sm text-ink">{user.phone || 'Não informado'}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs text-foreground-muted">
              <Mail size={12} /> E-mail
            </dt>
            <dd className="mt-1 text-sm text-ink">{user.email}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-foreground-muted">Sobre</dt>
            <dd className={`mt-1 text-sm ${user.bio ? 'text-ink' : 'text-foreground-muted/60'}`}>
              {user.bio || 'Nenhuma descrição adicionada ainda.'}
            </dd>
          </div>
        </dl>
      </div>

      {user.role === 'PRESTADOR' && <ProviderProfileSections />}

      {user.role === 'CLIENTE' && (
        <div className="mt-10">
          <Link
            href="/minhas-solicitacoes"
            className="flex items-center justify-between border border-border p-5 transition-colors hover:border-ink"
          >
            <div className="flex items-center gap-3">
              <FileText size={18} className="text-foreground-muted" />
              <div>
                <p className="font-medium text-ink">Minhas solicitações</p>
                <p className="text-sm text-foreground-muted">Veja o histórico de serviços que você solicitou</p>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Configurações */}
      <div className="mt-10">
        <h2 className="mb-3 font-display text-xl text-ink">Configurações</h2>
        <div className="divide-y divide-border border border-border px-5">
          <PushNotificationToggle />
          <ChangePasswordForm />
          <div className="flex gap-4 py-1 text-xs text-foreground-muted">
            <Link href="/privacidade" className="hover:text-ink hover:underline">
              Política de privacidade
            </Link>
            <Link href="/termos" className="hover:text-ink hover:underline">
              Termos de uso
            </Link>
          </div>
          <button
            onClick={() => {
              logout();
              router.push('/');
            }}
            className="flex w-full items-center gap-2.5 py-3 text-sm text-ink hover:text-accent"
          >
            <LogOut size={15} className="text-foreground-muted" /> Sair da conta
          </button>
          <DeleteAccountSection />
        </div>
      </div>
    </div>
  );
}
