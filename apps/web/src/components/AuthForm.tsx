'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PasswordInput } from './PasswordInput';
import { useAuthStore } from '@/store/auth-store';
import { isValidCPF, isValidCNPJ } from '@/lib/br-documents';
import { ESTADOS_BR } from '@/lib/estados-brasil';
import { useCidadesPorEstado } from '@/lib/use-cidades';
import { withNext } from '@/lib/redirect';
import type { BusinessMode, Role } from '@/lib/types';

function destinationFor(role: Role) {
  if (role !== 'PRESTADOR') return '/';
  return '/painel';
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
  acceptTerms: boolean;
}

const inputClass =
  'min-h-11 w-full rounded-lg border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent placeholder:text-foreground-muted/70';
const labelClass = 'mb-1.5 block text-xs font-medium text-foreground-muted';
const errorClass = 'mt-1 text-xs text-danger';

export function AuthForm({
  role,
  mode,
  onBack,
  initialBusinessMode,
  next = null,
}: {
  role: Role;
  mode: Mode;
  onBack: () => void;
  initialBusinessMode?: BusinessMode;
  next?: string | null;
}) {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
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
        const account = res.data.user;
        setAuth(res.data.accessToken, account);
        // A porta escolhida não decide o tipo da conta: quem entrar pela outra
        // vai para a própria área, sem ficar bloqueado.
        const wrongDoor = account.role !== role && account.role !== 'ADMIN';
        if (wrongDoor) {
          toast.info(account.role === 'CLIENTE' ? 'Esta é uma conta de cliente.' : 'Esta é uma conta de empresário.');
        }
        router.push(!wrongDoor && next ? next : destinationFor(account.role));
        return;
      }

      const payload: Record<string, unknown> = {
        email: data.email,
        password: data.password,
        name: data.name,
        city: data.city,
        addressState: data.addressState,
        phone: data.phone,
        role,
      };

      if (isVendedor) {
        payload.personType = personType;
        payload.cpf = data.cpf;
        if (initialBusinessMode) payload.businessMode = initialBusinessMode;
        if (personType === 'PJ') {
          payload.cnpj = data.cnpj;
          payload.razaoSocial = data.razaoSocial;
          payload.nomeFantasia = data.nomeFantasia;
          payload.addressCep = data.addressCep;
          payload.addressStreet = data.addressStreet;
          payload.addressNumber = data.addressNumber;
        }
      }

      const res = await api.post('/auth/register', payload);
      setAuth(res.data.accessToken, res.data.user);
      router.push(next ?? destinationFor(res.data.user.role));
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Não foi possível concluir. Tente novamente.';
      setError(Array.isArray(message) ? message.join(', ') : message);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-soft-sm sm:p-10">
      <button
        onClick={onBack}
        className="mb-4 flex min-h-11 items-center gap-1.5 text-sm text-foreground-muted hover:text-ink"
      >
        <ArrowLeft size={14} aria-hidden="true" /> Voltar
      </button>

      <h1 className="font-display text-2xl text-ink">
        {mode === 'login'
          ? isVendedor
            ? 'Entrar como empresário'
            : 'Entrar como cliente'
          : isVendedor
            ? 'Criar conta de empresário'
            : 'Criar conta de cliente'}
      </h1>
      <p className="mb-7 mt-1 text-sm text-foreground-muted">
        {isVendedor ? 'Profissional autônomo ou empresa' : 'Para encontrar e contratar profissionais'}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {mode === 'cadastro' && isVendedor && (
          <div className="flex gap-5 text-sm">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                checked={personType === 'PF'}
                onChange={() => setPersonType('PF')}
                className="accent-ink"
              />
              Pessoa física
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                checked={personType === 'PJ'}
                onChange={() => setPersonType('PJ')}
                className="accent-ink"
              />
              Empresa (CNPJ)
            </label>
          </div>
        )}

        {mode === 'cadastro' && (
          <div>
            <label htmlFor="name" className={labelClass}>{isPJ ? 'Nome do responsável' : 'Nome completo'}</label>
            <input id="name" {...register('name', { required: true })} className={inputClass} placeholder="Ex: Maria da Silva" />
            {errors.name && <p className={errorClass}>Campo obrigatório</p>}
          </div>
        )}

        {mode === 'cadastro' && isPJ && (
          <>
            <div>
              <label htmlFor="razaoSocial" className={labelClass}>Razão social</label>
              <input
                id="razaoSocial"
                {...register('razaoSocial', { required: true })}
                className={inputClass}
                placeholder="Ex: Silva Serviços Elétricos LTDA"
              />
              {errors.razaoSocial && <p className={errorClass}>Campo obrigatório</p>}
            </div>
            <div>
              <label htmlFor="nomeFantasia" className={labelClass}>Nome fantasia</label>
              <input id="nomeFantasia" {...register('nomeFantasia')} className={inputClass} placeholder="Ex: Elétrica Silva (opcional)" />
            </div>
            <div>
              <label htmlFor="cnpj" className={labelClass}>CNPJ</label>
              <input
                id="cnpj"
                {...register('cnpj', { required: true, validate: (v) => isValidCNPJ(v) || 'CNPJ inválido' })}
                className={inputClass}
                placeholder="00.000.000/0000-00"
                maxLength={18}
              />
              {errors.cnpj && <p className={errorClass}>{errors.cnpj.message || 'Campo obrigatório'}</p>}
            </div>
          </>
        )}

        {mode === 'cadastro' && isVendedor && (
          <div>
            <label htmlFor="cpf" className={labelClass}>CPF {isPJ ? 'do responsável' : ''}</label>
            <input
              id="cpf"
              {...register('cpf', { required: true, validate: (v) => isValidCPF(v) || 'CPF inválido' })}
              className={inputClass}
              placeholder="000.000.000-00"
              maxLength={14}
            />
            {errors.cpf && <p className={errorClass}>{errors.cpf.message || 'Campo obrigatório'}</p>}
          </div>
        )}

        <div>
          <label htmlFor="email" className={labelClass}>E-mail</label>
          <input id="email" {...register('email', { required: true })} type="email" className={inputClass} placeholder="Ex: voce@email.com" />
          {errors.email && <p className={errorClass}>Campo obrigatório</p>}
        </div>

        {mode === 'cadastro' && (
          <div>
            <label htmlFor="phone" className={labelClass}>Telefone{isPJ ? '/WhatsApp comercial' : ''}</label>
            <input id="phone" {...register('phone', { required: true })} className={inputClass} placeholder="Ex: (11) 98765-4321" />
            {errors.phone && <p className={errorClass}>Campo obrigatório</p>}
          </div>
        )}

        {mode === 'cadastro' && !isPJ && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="addressState" className={labelClass}>Estado</label>
              <select id="addressState" {...register('addressState', { required: true })} defaultValue="" className={inputClass}>
                <option value="" disabled>
                  UF
                </option>
                {ESTADOS_BR.map((e) => (
                  <option key={e.uf} value={e.uf}>
                    {e.nome} ({e.uf})
                  </option>
                ))}
              </select>
              {errors.addressState && <p className={errorClass}>Obrigatório</p>}
            </div>
            <div>
              <label htmlFor="city" className={labelClass}>Cidade</label>
              <select
                id="city"
                {...register('city', { required: true })}
                defaultValue=""
                disabled={!selectedState || isFetchingCidades}
                className={`${inputClass} disabled:opacity-50`}
              >
                <option value="" disabled>
                  {!selectedState ? 'Escolha o estado' : isFetchingCidades ? 'Carregando...' : 'Selecione'}
                </option>
                {cidadesDoEstado?.map((nome) => (
                  <option key={nome} value={nome}>
                    {nome}
                  </option>
                ))}
              </select>
              {errors.city && <p className={errorClass}>Obrigatório</p>}
            </div>
          </div>
        )}

        {mode === 'cadastro' && isPJ && (
          <div className="space-y-3 border border-border p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Endereço da empresa</p>

            <div>
              <label htmlFor="addressStatePJ" className={labelClass}>Estado</label>
              <select id="addressStatePJ" {...register('addressState', { required: true })} defaultValue="" className={inputClass}>
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
              <label htmlFor="cityPJ" className={labelClass}>Cidade</label>
              <select
                id="cityPJ"
                {...register('city', { required: true })}
                defaultValue=""
                disabled={!selectedState || isFetchingCidades}
                className={`${inputClass} disabled:opacity-50`}
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

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label htmlFor="addressCep" className={labelClass}>CEP</label>
                <input id="addressCep" {...register('addressCep', { required: true })} className={inputClass} placeholder="00000-000" maxLength={9} />
              </div>
              <div className="col-span-2">
                <label htmlFor="addressStreet" className={labelClass}>Rua/Avenida</label>
                <input id="addressStreet" {...register('addressStreet', { required: true })} className={inputClass} placeholder="Ex: Av. Paulista" />
              </div>
            </div>

            <div>
              <label htmlFor="addressNumber" className={labelClass}>Número</label>
              <input id="addressNumber" {...register('addressNumber', { required: true })} className={inputClass} placeholder="Ex: 1000" />
            </div>

            {(errors.addressCep || errors.addressStreet || errors.addressNumber || errors.city || errors.addressState) && (
              <p className={errorClass}>Preencha todos os campos do endereço</p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="password" className={labelClass}>Senha</label>
          <PasswordInput
            id="password"
            {...register('password', { required: true, minLength: 6 })}
            className={inputClass}
            placeholder={mode === 'cadastro' ? 'Mínimo 6 caracteres' : '••••••••'}
          />
          {errors.password && <p className={errorClass}>Mínimo de 6 caracteres</p>}
          {mode === 'login' && (
            <Link href="/esqueci-senha" className="mt-1.5 inline-block text-xs text-foreground-muted hover:text-ink hover:underline">
              Esqueceu a senha?
            </Link>
          )}
        </div>

        {mode === 'cadastro' && (
          <div>
            <label className="flex min-h-11 items-start gap-2.5 text-sm text-foreground-muted">
              <input
                type="checkbox"
                {...register('acceptTerms', { required: true })}
                className="mt-0.5 h-5 w-5 shrink-0 accent-accent"
              />
              <span>
                Li e concordo com os{' '}
                <Link href="/termos" target="_blank" className="text-accent hover:underline">
                  Termos de Uso
                </Link>{' '}
                e a{' '}
                <Link href="/privacidade" target="_blank" className="text-accent hover:underline">
                  Política de Privacidade
                </Link>
                .
              </span>
            </label>
            {errors.acceptTerms && <p className={errorClass}>É preciso aceitar para criar a conta.</p>}
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-11 w-full rounded-lg bg-accent py-3 text-sm font-semibold text-on-accent transition-colors duration-150 hover:bg-accent-strong disabled:opacity-50"
        >
          {isSubmitting ? 'Enviando...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-foreground-muted">
        {mode === 'login' ? (
          <>
            Ainda não tem conta?{' '}
            <Link
              href={withNext(isVendedor ? '/comecar?tipo=empresario' : '/cadastro?tipo=CLIENTE', next)}
              className="font-medium text-accent hover:underline"
            >
              {isVendedor ? 'Criar conta de empresário' : 'Criar conta de cliente'}
            </Link>
          </>
        ) : (
          <>
            Já tem conta?{' '}
            <Link
              href={withNext(isVendedor ? '/login/empresario' : '/login/cliente', next)}
              className="font-medium text-accent hover:underline"
            >
              Entrar
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
