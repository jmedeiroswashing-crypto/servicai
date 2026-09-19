export type Role = 'CLIENTE' | 'PRESTADOR' | 'ADMIN';
export type Selo = 'NENHUM' | 'PRATA' | 'OURO' | 'PREMIUM';
export type BookingStatus = 'SOLICITADO' | 'ACEITO' | 'RECUSADO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';
export type Plan = 'GRATIS' | 'PRO' | 'BUSINESS' | 'PREMIUM';

// Mirrors the backend's plans.config.ts sentinel — Infinity doesn't survive JSON,
// so "unlimited" is represented as this large finite number instead.
export const UNLIMITED = 999_999;
export type SubscriptionStatus =
  | 'ATIVA'
  | 'TESTE'
  | 'PAGAMENTO_PENDENTE'
  | 'CANCELAMENTO_SOLICITADO'
  | 'CANCELADA'
  | 'INADIMPLENTE'
  | 'EXPIRADA';

export interface PlanConfig {
  plan: Plan;
  label: string;
  tagline: string;
  priceMonthly: number;
  selo: Selo;
  planPriority: number;
  rankingWeight: number;
  maxListings: number;
  maxMedia: number;
  aiGenerationsPerMonth: number;
  proposalsPerMonth: number;
  hasPerformanceStats: boolean;
  hasAdvancedInsights: boolean;
  verifiedBadge: boolean;
  highlight?: string;
  benefits: string[];
}

export interface Subscription {
  id: string;
  providerId: string;
  plan: Plan;
  status: SubscriptionStatus;
  effectivePlan: Plan;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd: boolean;
  aiUsageCount: number;
  aiUsagePeriod: string;
  proposalsUsedCount: number;
  proposalsUsedPeriod: string;
  config: PlanConfig;
}

export interface PerformanceMetrics {
  profileViews: number;
  searchAppearances: number;
  contactsCount: number;
  proposalsUsed: number;
  proposalsLimit: number;
  hasPerformanceStats: boolean;
  hasAdvancedInsights: boolean;
}

export interface AdminOverview {
  totalProviders: number;
  byPlan: Record<string, number>;
  mrr: number;
  conversionRate: number;
  cancelamentosSolicitados: number;
}

export interface BoostInfo {
  label: string;
  price: number;
  durationDays: number;
  description: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  name: string;
}

export type PersonType = 'PF' | 'PJ';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  city?: string | null;
  addressState?: string | null;
  bio?: string | null;
  role: Role;
  avatarUrl?: string | null;
  verified: boolean;
  personType?: PersonType | null;
  razaoSocial?: string | null;
  nomeFantasia?: string | null;
  createdAt: string;
}

export interface ProviderProfile {
  id: string;
  userId: string;
  specialty: string;
  categories: string[];
  bio?: string | null;
  city: string;
  yearsExperience: number;
  selo: Selo;
  scoreIA: number;
  ratingAvg: number;
  servicesDone: number;
  clientsCount: number;
  boostExpiresAt?: string | null;
  createdAt: string;
  user: {
    name: string;
    avatarUrl?: string | null;
    phone?: string | null;
    verified?: boolean;
    addressStreet?: string | null;
    addressNumber?: string | null;
    addressState?: string | null;
    addressCep?: string | null;
  };
  media?: MediaItem[];
  services?: ServiceListing[];
  reviews?: Review[];
  reviewCount?: number;
  respondsWithinHour?: boolean | null;
  availableNow?: boolean;
}

export interface PriceEstimate {
  priceMin: number;
  priceMax: number;
  estimatedTime: string;
  reasoning: string;
}

export interface MediaItem {
  id: string;
  type: string;
  url: string;
  title?: string | null;
  caption?: string | null;
  beforeUrl?: string | null;
  afterUrl?: string | null;
  serviceId?: string | null;
  createdAt: string;
}

export interface ServiceListing {
  id: string;
  providerId: string;
  title: string;
  description: string;
  category: string;
  priceMin?: number | null;
  priceMax?: number | null;
  estimatedTime?: string | null;
  active: boolean;
  createdAt: string;
  provider?: ProviderProfile;
}

export interface Review {
  id: string;
  rating: number;
  pontualidade: number;
  qualidade: number;
  preco: number;
  atendimento: number;
  comment?: string | null;
  photoUrls: string[];
  createdAt: string;
  client?: { name: string; avatarUrl?: string | null };
}

export interface Booking {
  id: string;
  status: BookingStatus;
  scheduledAt?: string | null;
  address?: string | null;
  notes?: string | null;
  priceQuoted?: number | null;
  createdAt: string;
  provider?: ProviderProfile;
  service?: ServiceListing | null;
  client?: { name: string; avatarUrl?: string | null; phone?: string | null };
}

export interface EarningsMonth {
  label: string;
  total: number;
  count: number;
}

export interface Earnings {
  currentMonthTotal: number;
  currentMonthCount: number;
  totalAllTime: number;
  totalServicesCompleted: number;
  avgTicket: number;
  months: EarningsMonth[];
}

export interface SearchIntent {
  category: string;
  keywords: string[];
  urgency: 'baixa' | 'media' | 'alta';
  location: string | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  type: string;
  content: string;
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  clientId: string;
  providerId: string;
  createdAt: string;
  provider?: { id?: string; user: { name: string; avatarUrl?: string | null } };
  client?: { name: string; avatarUrl?: string | null };
  messages?: ChatMessage[];
}

export type RequestStatus = 'ABERTA' | 'EM_ANDAMENTO' | 'FECHADA' | 'CANCELADA';
export type ProposalStatus = 'ENVIADA' | 'ACEITA' | 'RECUSADA';

export interface ServiceRequestItem {
  id: string;
  category: string;
  title: string;
  description: string;
  city: string;
  state?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  desiredDate?: string | null;
  desiredTime?: string | null;
  status?: RequestStatus;
  createdAt: string;
  proposalsCount: number;
}

export interface OpportunityMatch extends ServiceRequestItem {
  publishedAgo: string;
  alreadyProposed: boolean;
  proximityLabel: string;
  matchScore: number;
}

export interface Proposal {
  id: string;
  requestId: string;
  providerId: string;
  price: number;
  message: string;
  deadline?: string | null;
  availableAt?: string | null;
  status: ProposalStatus;
  createdAt: string;
  provider?: ProviderProfile;
  request?: ServiceRequestItem;
}

export type NotificationType =
  | 'NOVA_MENSAGEM'
  | 'NOVA_PROPOSTA'
  | 'PROPOSTA_ACEITA'
  | 'NOVA_OPORTUNIDADE'
  | 'PLANO_EXPIRANDO'
  | 'PLANO_EXPIRADO'
  | 'VAGA_RESERVADA'
  | 'LEMBRETE_MANUTENCAO';

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
}

export type DealStatus = 'ATIVA' | 'RESERVADA' | 'CANCELADA';

export interface LastMinuteDeal {
  id: string;
  category: string;
  title: string;
  description?: string | null;
  city: string;
  state?: string | null;
  originalPrice: number;
  dealPrice: number;
  discountPct: number;
  scheduledAt: string;
  provider: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    specialty: string;
    ratingAvg: number;
    selo: string;
  };
}

export interface MyDeal {
  id: string;
  category: string;
  title: string;
  description?: string | null;
  city: string;
  state?: string | null;
  originalPrice: number;
  dealPrice: number;
  scheduledAt: string;
  status: DealStatus;
  claimedBy?: { name: string; phone?: string | null } | null;
  claimedAt?: string | null;
  createdAt: string;
}

export interface RequestDraft {
  category?: string;
  title?: string;
  description?: string;
  city?: string;
  state?: string;
  budgetMin?: number;
  budgetMax?: number;
  desiredDate?: string;
  desiredTime?: string;
}

export interface IntakeResult {
  draft: RequestDraft;
  assistantReply: string;
  readyToPublish: boolean;
}

export interface ProviderDraft {
  specialty?: string;
  categories?: string[];
  city?: string;
  bio?: string;
  yearsExperience?: number;
}

export interface ProviderIntakeResult {
  draft: ProviderDraft;
  assistantReply: string;
  readyToSave: boolean;
}
