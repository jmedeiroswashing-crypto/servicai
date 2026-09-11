export type Role = 'CLIENTE' | 'PRESTADOR' | 'ADMIN';
export type Selo = 'NENHUM' | 'PRATA' | 'OURO' | 'PREMIUM';
export type BookingStatus = 'SOLICITADO' | 'ACEITO' | 'RECUSADO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';

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
  user: { name: string; avatarUrl?: string | null; phone?: string | null; verified?: boolean };
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
