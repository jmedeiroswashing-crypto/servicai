import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import { SearchLeadsDto } from './dto/search-leads.dto.js';
import { SaveLeadDto } from './dto/save-lead.dto.js';

export interface LeadResult {
  name: string;
  phone: string | null;
  address: string | null;
  website: string | null;
  rating: number | null;
  ratingCount: number | null;
  mapsUrl: string | null;
  // Places não informa se o número tem WhatsApp de verdade — isso é uma
  // estimativa (número de celular brasileiro válido), deixada clara pro
  // prestador na interface, nunca apresentada como confirmação do Google.
  likelyWhatsapp: boolean;
}

interface GooglePlace {
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
}

const FIELD_MASK = [
  'places.displayName',
  'places.formattedAddress',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.googleMapsUri',
].join(',');

function looksLikeBrazilianMobile(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  // DDD (2) + 9 + 8 dígitos = celular; com código do país (+55) soma 13.
  const local = digits.length > 11 ? digits.slice(-11) : digits;
  return local.length === 11 && local[2] === '9';
}

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private subscriptionsService: SubscriptionsService,
  ) {}

  private get apiKey(): string | undefined {
    return this.config.get<string>('GOOGLE_PLACES_API_KEY');
  }

  async search(providerId: string, dto: SearchLeadsDto): Promise<{ results: LeadResult[]; usage: { usedSoFar: number; limit: number } }> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'Busca de leads ainda não configurada neste ambiente (falta a chave do Google Places).',
      );
    }

    // Confere e já debita a cota ANTES de gastar a consulta de verdade — se a
    // chamada ao Google falhar depois, o prestador não teria como "devolver"
    // o crédito mesmo, então mantemos simples: cota é por tentativa.
    const usage = await this.subscriptionsService.consumeLeadSearch(providerId);

    const limit = dto.limit ?? 20;
    const textQuery = `${dto.query} em ${dto.location}`;

    let places: GooglePlace[] = [];
    try {
      const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': FIELD_MASK,
        },
        body: JSON.stringify({ textQuery, languageCode: 'pt-BR', maxResultCount: limit }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        this.logger.error(`Google Places respondeu ${res.status}: ${body.slice(0, 300)}`);
        throw new ServiceUnavailableException('Não foi possível buscar leads agora. Tente novamente em instantes.');
      }

      const data = (await res.json()) as { places?: GooglePlace[] };
      places = data.places ?? [];
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err;
      this.logger.error('Falha ao chamar Google Places', err as Error);
      throw new ServiceUnavailableException('Não foi possível buscar leads agora. Tente novamente em instantes.');
    }

    const results: LeadResult[] = places.map((p) => {
      const phone = p.nationalPhoneNumber ?? p.internationalPhoneNumber ?? null;
      return {
        name: p.displayName?.text ?? 'Sem nome',
        phone,
        address: p.formattedAddress ?? null,
        website: p.websiteUri ?? null,
        rating: p.rating ?? null,
        ratingCount: p.userRatingCount ?? null,
        mapsUrl: p.googleMapsUri ?? null,
        likelyWhatsapp: looksLikeBrazilianMobile(phone),
      };
    });

    return { results, usage };
  }

  async listSaved(providerId: string) {
    return this.prisma.savedLead.findMany({ where: { providerId }, orderBy: { createdAt: 'desc' } });
  }

  async saveLead(providerId: string, dto: SaveLeadDto) {
    return this.prisma.savedLead.create({ data: { providerId, ...dto } });
  }

  async deleteSaved(providerId: string, id: string) {
    await this.prisma.savedLead.deleteMany({ where: { id, providerId } });
    return { success: true };
  }
}
