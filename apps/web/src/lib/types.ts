export type Role = 'CLIENTE' | 'PRESTADOR' | 'ADMIN';
export type Selo = 'NENHUM' | 'PRATA' | 'OURO' | 'PREMIUM';
export type BookingStatus = 'SOLICITADO' | 'ACEITO' | 'RECUSADO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';
export type Plan = 'GRATIS' | 'PRO' | 'BUSINESS' | 'PREMIUM';

// Mirrors the backend's plans.config.ts sentinel — Infinity doesn't survive JSON,
// so "unlimited" is represented as this large finite number instead.
export const UNLIMITED = 999_999;
export type SubscriptionStatus = 'ATIVA' | 'CANCELADA' | 'INADIMPLENTE';

export interface PlanConfig {
  plan: Plan;
  label: string;
  priceMonthly: number;
  selo: Selo;
  planPriority: number;
  maxListings: number;
  maxMedia: number;
  aiGenerationsPerMonth: number;
  features: string[];
}

export interface Subscription {
  id: string;
  providerId: string;
  plan: Plan;
  status: SubscriptionStatus;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd: boolean;
  aiUsageCount: number;
  aiUsagePeriod: string;
  config: PlanConfig;
}

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  name: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  city?: string | null;
  role: Role;
  avatarUrl?: string | null;
  verified: boolean;
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
}

export interface MediaItem {
  id: string;
  type: string;
  url: string;
  caption?: string | null;
  beforeUrl?: string | null;
  afterUrl?: string | null;
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
  createdAt: string;
  provider?: ProviderProfile;
  service?: ServiceListing | null;
  client?: { name: string; avatarUrl?: string | null; phone?: string | null };
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
