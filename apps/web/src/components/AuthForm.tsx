'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Building2, User, LogIn, MapPin } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { isValidCPF, isValidCNPJ } from '@/lib/br-documents';
import { ESTADOS_BR } from '@/lib/estados-brasil';
import type { Role } from '@/lib/types';

interface IbgeMunicipio {
  id: number;
  nome: string;
}

function useCidadesPorEstado(uf: string) {
  return useQuery({
    queryKey: ['ibge', 'municipios', uf],
    enabled: !!uf,
    staleTime: 1000 * 60 * 60 * 24,
    queryFn: async () => {
      const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
      if (!res.ok) throw new Error('Falha ao buscar cidades');
      const data: IbgeMunicipio[] = await res.json();
      return data.map((m) => m.nome).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    },
  });
}

type Mode = 'login' | 'cadastro';
type PersonType = 'PF' | 'PJ';

interface FormValues {
  email: string;
  password: string;
  name: string;
  city: string;
  phone: string;
  cpf: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  addressCep: string;
  addressStreet: string;
  addressNumber: string;
  addressState: string;
}

export function AuthForm({
  role,
  onBack,
  initialMode = 'cadastro',
}: {
  role: Role;
  onBack: () => void;
  initialMode?: Mode;
}) {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [personType, setPersonType] = useState<PersonType>('PF');
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  const isVendedor = role === 'PRESTADOR';
  const isPJ = isVendedor && personType === 'PJ';

  const selectedState = watch('addressState');
  const { data: cidadesDoEstado, isFetching: isFetchingCidades } = useCidadesPorEstado(selectedState);

  useEffect(() => {
    setValue('city', '');
  }, [selectedState, setValue]);

  async function onSubmit(data: FormValues) {
    setError(null);
    try {
      if (mode === 'login') {
        const res = await api.post('/auth/login', { email: data.email, password: data.password });
        setAuth(res.data.accessToken, res.data.user);
        router.push(res.data.user.role === 'PRESTADOR' ? '/painel' : '/');
        return;
      }

      const payload: Record<string, unknown> = {
        email: data.email,
        password: data.password,
        name: data.name,
        city: data.city,
        phone: data.phone,
        role,
      };

      if (isVendedor) {
        payload.personType = personType;
        payload.cpf = data.cpf;
        if (personType === 'PJ') {
          payload.cnpj = data.cnpj;
          payload.razaoSocial = data.razaoSocial;
          payload.nomeFantasia = data.nomeFantasia;
          payload.addressCep = data.addressCep;
          payload.addressStreet = data.addressStreet;
          payload.addressNumber = data.addressNumber;
          payload.addressState = data.addressState;
        }
      }

      const res = await api.post('/auth/register', payload);
      setAuth(res.data.accessToken, res.data.user);
      router.push(isVendedor ? '/painel' : '/');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Não foi possível concluir. Tente novamente.';
      setError(Array.isArray(message) ? message.join(', ') : message);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-md rounded-3xl border border-border bg-surface p-8"
    >
      <button onClick={onBack} className="mb-4 text-sm text-foreground/50 hover:text-foreground">
        ← Voltar
      </button>

      <div className="mb-6 flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl gradient-brand text-white">
          {isVendedor ? <Building2 size={18} /> : <User size={18} />}
        </span>
        <h1 className="text-xl font-bold">{isVendedor ? 'Área do vendedor' : 'Área do cliente'}</h1>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 rounded-full bg-surface-muted p-1">
        <button
          type="button"
          onClick={() => setMode('login')}
          className={`flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium transition-colors ${
            mode === 'login' ? 'gradient-brand text-white' : 'text-foreground/60'
          }`}
        >
          <LogIn size={14} /> Entrar
        </button>
        <button
          type="button"
          onClick={() => setMode('cadastro')}
          className={`flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium transition-colors ${
            mode === 'cadastro' ? 'gradient-brand text-white' : 'text-foreground/60'
          }`}
        >
          Criar conta
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {mode === 'cadastro' && isVendedor && (
          <div className="grid grid-cols-2 gap-2 rounded-full bg-surface-muted p-1">
            <button
              type="button"
              onClick={() => setPersonType('PF')}
              className={`rounded-full py-2 text-sm font-medium transition-colors ${
                personType === 'PF' ? 'bg-background shadow-sm' : 'text-foreground/50'
              }`}
            >
              Pessoa física
            </button>
            <button
              type="button"
              onClick={() => setPersonType('PJ')}
              className={`rounded-full py-2 text-sm font-medium transition-colors ${
                personType === 'PJ' ? 'bg-background shadow-sm' : 'text-foreground/50'
              }`}
            >
              Empresa (CNPJ)
            </button>
          </div>
        )}

        {mode === 'cadastro' && (
          <div>
            <label className="mb-1 block text-sm font-medium">
              {isPJ ? 'Nome do responsável' : 'Nome completo'}
            </label>
            <input
              {...register('name', { required: true })}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 outline-none focus:border-brand"
              placeholder="Ex: Maria da Silva"
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">Campo obrigatório</p>}
          </div>
        )}

        {mode === 'cadastro' && isPJ && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium">Razão social</label>
              <input
                {...register('razaoSocial', { required: true })}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 outline-none focus:border-brand"
                placeholder="Ex: Silva Serviços Elétricos LTDA"
              />
              {errors.razaoSocial && <p className="mt-1 text-xs text-red-500">Campo obrigatório</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Nome fantasia</label>
              <input
                {...register('nomeFantasia')}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 outline-none focus:border-brand"
                placeholder="Ex: Elétrica Silva (opcional)"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">CNPJ</label>
              <input
                {...register('cnpj', {
                  required: true,
                  validate: (v) => isValidCNPJ(v) || 'CNPJ inválido',
                })}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 outline-none focus:border-brand"
                placeholder="00.000.000/0000-00"
                maxLength={18}
              />
              {errors.cnpj && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.cnpj.message || 'Campo obrigatório'}
                </p>
              )}
            </div>
          </>
        )}

        {mode === 'cadastro' && isVendedor && (
          <div>
            <label className="mb-1 block text-sm font-medium">CPF {isPJ ? 'do responsável' : ''}</label>
            <input
              {...register('cpf', {
                required: true,
                validate: (v) => isValidCPF(v) || 'CPF inválido',
              })}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 outline-none focus:border-brand"
              placeholder="000.000.000-00"
              maxLength={14}
            />
            {errors.cpf && <p className="mt-1 text-xs text-red-500">{errors.cpf.message || 'Campo obrigatório'}</p>}
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium">E-mail</label>
          <input
            {...register('email', { required: true })}
            type="email"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 outline-none focus:border-brand"
            placeholder="Ex: voce@email.com"
          />
          {errors.email && <p className="mt-1 text-xs text-red-500">Campo obrigatório</p>}
        </div>

        {mode === 'cadastro' && (
          <div>
            <label className="mb-1 block text-sm font-medium">Telefone{isPJ ? '/WhatsApp comercial' : ''}</label>
            <input
              {...register('phone', { required: true })}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 outline-none focus:border-brand"
              placeholder="Ex: (11) 98765-4321"
            />
            {errors.phone && <p className="mt-1 text-xs text-red-500">Campo obrigatório</p>}
          </div>
        )}

        {mode === 'cadastro' && !isPJ && (
          <div>
            <label className="mb-1 block text-sm font-medium">Cidade</label>
            <input
              {...register('city', { required: true })}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 outline-none focus:border-brand"
              placeholder="Ex: São Paulo"
            />
            {errors.city && <p className="mt-1 text-xs text-red-500">Campo obrigatório</p>}
          </div>
        )}

        {mode === 'cadastro' && isPJ && (
          <div className="space-y-3 rounded-2xl border border-border bg-surface-muted/50 p-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground/70">
              <MapPin size={14} /> Endereço da empresa
            </p>

            <div>
              <label className="mb-1 block text-xs font-medium text-foreground/60">Estado</label>
              <select
                {...register('addressState', { required: true })}
                defaultValue=""
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand"
              >
                <option value="" disabled>
                  Selecione o estado
                </option>
                {ESTADOS_BR.map((e) => (
                  <option key={e.uf} value={e.uf}>
                    {e.nome} ({e.uf})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-foreground/60">Cidade</label>
              <select
                {...register('city', { required: true })}
                defaultValue=""
                disabled={!selectedState || isFetchingCidades}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand disabled:opacity-50"
              >
                <option value="" disabled>
                  {!selectedState
                    ? 'Selecione o estado primeiro'
                    : isFetchingCidades
                      ? 'Carregando cidades...'
                      : 'Selecione a cidade'}
                </option>
                {cidadesDoEstado?.map((nome) => (
                  <option key={nome} value={nome}>
                    {nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className="mb-1 block text-xs font-medium text-foreground/60">CEP</label>
                <input
                  {...register('addressCep', { required: true })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand"
                  placeholder="00000-000"
                  maxLength={9}
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-foreground/60">Rua/Avenida</label>
                <input
                  {...register('addressStreet', { required: true })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand"
                  placeholder="Ex: Av. Paulista"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-foreground/60">Número</label>
              <input
                {...register('addressNumber', { required: true })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand"
                placeholder="Ex: 1000"
              />
            </div>

            {(errors.addressCep || errors.addressStreet || errors.addressNumber || errors.city || errors.addressState) && (
              <p className="text-xs text-red-500">Preencha todos os campos do endereço</p>
            )}
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium">Senha</label>
          <input
            {...register('password', { required: true, minLength: 6 })}
            type="password"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 outline-none focus:border-brand"
            placeholder={mode === 'cadastro' ? 'Mínimo 6 caracteres' : '••••••••'}
          />
          {errors.password && <p className="mt-1 text-xs text-red-500">Mínimo de 6 caracteres</p>}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-full gradient-brand py-2.5 font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-50"
        >
          {isSubmitting ? 'Enviando...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>
      </form>
    </motion.div>
  );
}
