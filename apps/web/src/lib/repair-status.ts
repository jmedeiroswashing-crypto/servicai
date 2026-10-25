import type { RepairStatus } from './types';

export const REPAIR_STATUS_LABEL: Record<RepairStatus, string> = {
  EM_ANALISE: 'Em análise',
  AGUARDANDO_APROVACAO: 'Aguardando aprovação',
  AGUARDANDO_PECA: 'Aguardando peça',
  PRONTO: 'Pronto',
  ENTREGUE: 'Entregue',
};

export const REPAIR_STATUS_ORDER: RepairStatus[] = [
  'EM_ANALISE',
  'AGUARDANDO_APROVACAO',
  'AGUARDANDO_PECA',
  'PRONTO',
  'ENTREGUE',
];

const WHATSAPP_MESSAGE_BY_STATUS: Partial<Record<RepairStatus, (deviceModel: string, shopName: string, trackingUrl: string) => string>> = {
  AGUARDANDO_APROVACAO: (deviceModel, shopName, trackingUrl) =>
    `Olá! Aqui é da ${shopName}. O orçamento do seu ${deviceModel} já está pronto, só falta sua aprovação para seguirmos com o conserto. Acompanhe aqui: ${trackingUrl}`,
  PRONTO: (deviceModel, shopName, trackingUrl) =>
    `Olá! Aqui é da ${shopName}. Seu ${deviceModel} já está pronto para retirada! Acompanhe aqui: ${trackingUrl}`,
};

export function buildWhatsappMessage(status: RepairStatus, deviceModel: string, shopName: string, trackingUrl: string) {
  const build = WHATSAPP_MESSAGE_BY_STATUS[status];
  if (build) return build(deviceModel, shopName, trackingUrl);
  return `Olá! Aqui é da ${shopName}. Atualização sobre o seu ${deviceModel}: ${REPAIR_STATUS_LABEL[status]}. Acompanhe aqui: ${trackingUrl}`;
}

export function buildWhatsappLink(phone: string, message: string) {
  const digits = phone.replace(/\D/g, '');
  const withCountryCode = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${withCountryCode}?text=${encodeURIComponent(message)}`;
}
