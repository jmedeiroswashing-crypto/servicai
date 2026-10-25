'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Wrench, LogOut, Plus, MessageCircle, Link2, X } from 'lucide-react';
import { repairApi } from '@/lib/repair-api';
import { useRepairAuthStore } from '@/store/repair-auth-store';
import { ImageUploadField } from '@/components/ImageUploadField';
import { REPAIR_STATUS_LABEL, REPAIR_STATUS_ORDER, buildWhatsappLink, buildWhatsappMessage } from '@/lib/repair-status';
import type { RepairDevice, RepairStatus } from '@/lib/types';

const inputClass =
  'w-full border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-ink placeholder:text-foreground-muted/50';
const labelClass = 'mb-1.5 block text-xs font-medium text-foreground-muted';

function trackingUrlFor(device: RepairDevice) {
  return `${window.location.origin}/conserto/acompanhar?token=${device.trackingToken}`;
}

function NewDeviceForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [imei, setImei] = useState('');
  const [defect, setDefect] = useState('');
  const [budgetValue, setBudgetValue] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: async () =>
      (
        await repairApi.post('/repair/devices', {
          clientName,
          clientPhone,
          deviceModel,
          imei: imei || undefined,
          defect,
          photos,
          budgetValue: budgetValue ? Number(budgetValue) : undefined,
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair', 'devices'] });
      onDone();
    },
  });

  const canSave = clientName.trim() && clientPhone.trim() && deviceModel.trim() && defect.trim();

  return (
    <div className="border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg text-ink">Novo aparelho</h2>
        <button onClick={onDone} aria-label="Fechar" className="text-foreground-muted hover:text-ink">
          <X size={18} />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Nome do cliente</label>
          <input value={clientName} onChange={(e) => setClientName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Telefone do cliente (WhatsApp)</label>
          <input
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            placeholder="(11) 91234-5678"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Modelo do aparelho</label>
          <input
            value={deviceModel}
            onChange={(e) => setDeviceModel(e.target.value)}
            placeholder="Ex: iPhone 12"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>IMEI (opcional)</label>
          <input value={imei} onChange={(e) => setImei(e.target.value)} className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Defeito relatado</label>
          <textarea
            value={defect}
            onChange={(e) => setDefect(e.target.value)}
            rows={2}
            className={`${inputClass} resize-none`}
          />
        </div>
        <div>
          <label className={labelClass}>Valor do orçamento (opcional)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={budgetValue}
            onChange={(e) => setBudgetValue(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="mt-4">
        <label className={labelClass}>Fotos</label>
        <div className="flex flex-wrap items-center gap-2">
          {photos.map((url, i) => (
            <div key={url} className="relative h-16 w-16 overflow-hidden border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                aria-label="Remover foto"
                className="absolute right-0 top-0 bg-ink/70 p-0.5 text-background"
              >
                <X size={10} />
              </button>
            </div>
          ))}
          <ImageUploadField
            value=""
            onChange={(url) => setPhotos((prev) => [...prev, url])}
            label="Adicionar foto"
            previewClassName="h-16 w-16"
          />
        </div>
      </div>

      {mutation.isError && <p className="mt-3 text-xs text-danger">Não foi possível salvar. Tente novamente.</p>}

      <button
        onClick={() => mutation.mutate()}
        disabled={!canSave || mutation.isPending}
        className="mt-5 bg-ink px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-85 disabled:opacity-40"
      >
        {mutation.isPending ? 'Salvando...' : 'Cadastrar aparelho'}
      </button>
    </div>
  );
}

function DeviceRow({ device, shopName }: { device: RepairDevice; shopName: string }) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: async (status: RepairStatus) => (await repairApi.patch(`/repair/devices/${device.id}`, { status })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['repair', 'devices'] }),
  });

  function whatsappHref() {
    const url = trackingUrlFor(device);
    const message = buildWhatsappMessage(device.status, device.deviceModel, shopName, url);
    return buildWhatsappLink(device.clientPhone, message);
  }

  function copyLink() {
    navigator.clipboard.writeText(trackingUrlFor(device)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-ink">
            {device.deviceModel} — {device.clientName}
          </p>
          <p className="text-xs text-foreground-muted">{device.clientPhone}</p>
          <p className="mt-1 text-sm text-foreground-muted">{device.defect}</p>
          {device.budgetValue != null && (
            <p className="mt-1 text-sm text-ink">Orçamento: R$ {device.budgetValue.toFixed(2).replace('.', ',')}</p>
          )}
        </div>
        <div className="flex gap-2">
          <a
            href={whatsappHref()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 border border-success/40 px-3 py-1.5 text-xs font-medium text-success hover:bg-success/10"
          >
            <MessageCircle size={13} /> Avisar no WhatsApp
          </a>
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs font-medium text-foreground-muted hover:border-ink hover:text-ink"
          >
            <Link2 size={13} /> {copied ? 'Copiado!' : 'Link de acompanhamento'}
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {REPAIR_STATUS_ORDER.map((status) => (
          <button
            key={status}
            onClick={() => mutation.mutate(status)}
            disabled={mutation.isPending}
            className={`border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
              device.status === status ? 'border-ink bg-ink text-background' : 'border-border text-foreground-muted hover:border-ink'
            }`}
          >
            {REPAIR_STATUS_LABEL[status]}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ConsertoPage() {
  const router = useRouter();
  const { token, shop, logout } = useRepairAuthStore();
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!token) router.push('/conserto/login');
  }, [token, router]);

  const { data: devices, isLoading } = useQuery({
    queryKey: ['repair', 'devices'],
    enabled: !!token,
    queryFn: async () => (await repairApi.get<RepairDevice[]>('/repair/devices')).data,
  });

  const stuck = useMemo(() => {
    // Date.now() é necessariamente "impuro" (lê o relógio) — é exatamente o
    // que esse contador de "parados há dias" precisa fazer, recalculando só
    // quando `devices` muda (não a cada render).
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    return devices?.filter((d) => d.status !== 'ENTREGUE' && now - new Date(d.createdAt).getTime() > 1000 * 60 * 60 * 24 * 7);
  }, [devices]);

  if (!token) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench size={22} className="text-accent" />
          <div>
            <p className="font-display text-xl text-ink">{shop?.name}</p>
            <p className="text-xs text-foreground-muted">{shop?.email}</p>
          </div>
        </div>
        <button
          onClick={() => {
            logout();
            router.push('/conserto/login');
          }}
          className="flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs text-foreground-muted hover:border-danger hover:text-danger"
        >
          <LogOut size={13} /> Sair
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="border border-border p-4">
          <p className="font-display text-2xl text-ink">{devices?.length ?? 0}</p>
          <p className="text-xs text-foreground-muted">Aparelhos no total</p>
        </div>
        <div className="border border-border p-4">
          <p className="font-display text-2xl text-ink">{devices?.filter((d) => d.status !== 'ENTREGUE').length ?? 0}</p>
          <p className="text-xs text-foreground-muted">Em andamento</p>
        </div>
        <div className="border border-border p-4">
          <p className="font-display text-2xl text-ink">{stuck?.length ?? 0}</p>
          <p className="text-xs text-foreground-muted">Parados há +7 dias</p>
        </div>
      </div>

      <div className="mt-8">
        {showForm ? (
          <NewDeviceForm onDone={() => setShowForm(false)} />
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-ink px-4 py-2.5 text-sm font-medium text-background hover:opacity-85"
          >
            <Plus size={15} /> Novo aparelho
          </button>
        )}
      </div>

      <div className="mt-8 space-y-3">
        {isLoading && <p className="text-foreground-muted">Carregando...</p>}
        {!isLoading && devices?.length === 0 && <p className="text-foreground-muted">Nenhum aparelho cadastrado ainda.</p>}
        {devices?.map((d) => (
          <DeviceRow key={d.id} device={d} shopName={shop?.name ?? 'nossa loja'} />
        ))}
      </div>
    </div>
  );
}
