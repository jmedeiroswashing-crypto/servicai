import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import { SearchLeadsDto } from './dto/search-leads.dto.js';
import { SaveLeadDto } from './dto/save-lead.dto.js';
import { matchSearchTerms } from './osm-categories.js';

export interface LeadResult {
  name: string;
  phone: string | null;
  address: string | null;
  website: string | null;
  rating: number | null;
  ratingCount: number | null;
  mapsUrl: string | null;
  // O OpenStreetMap não informa se o número tem WhatsApp de verdade — isso é
  // uma estimativa (número de celular brasileiro válido), deixada clara pro
  // prestador na interface, nunca apresentada como confirmação de ninguém.
  likelyWhatsapp: boolean;
}

interface NominatimPlace {
  osm_type: 'node' | 'way' | 'relation';
  osm_id: number;
  display_name: string;
  address?: Record<string, string>;
  extratags?: Record<string, string>;
  namedetails?: Record<string, string>;
}

const NOMINATIM_USER_AGENT = 'ServicAi-Leads/1.0 (+https://servicai.app)';
const ENTRE_CHAMADAS_MS = 1100; // Nominatim pede no máximo 1 requisição por segundo.

function looksLikeBrazilianMobile(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  // DDD (2) + 9 + 8 dígitos = celular; com código do país (+55) soma 13.
  const local = digits.length > 11 ? digits.slice(-11) : digits;
  return local.length === 11 && local[2] === '9';
}

function leadFromPlace(p: NominatimPlace): LeadResult {
  const phone = p.extratags?.phone ?? p.extratags?.['contact:phone'] ?? null;
  const a = p.address;
  const partes = a ? [a.road, a.house_number, a.suburb ?? a.neighbourhood, a.city ?? a.town ?? a.village, a.state].filter(Boolean) : [];
  return {
    name: p.namedetails?.name ?? p.display_name.split(',')[0]?.trim() ?? 'Sem nome',
    phone,
    address: partes.length ? partes.join(', ') : p.display_name || null,
    website: p.extratags?.website ?? p.extratags?.['contact:website'] ?? null,
    rating: null,
    ratingCount: null,
    mapsUrl: `https://www.openstreetmap.org/${p.osm_type}/${p.osm_id}`,
    likelyWhatsapp: looksLikeBrazilianMobile(phone),
  };
}

function leadKey(l: LeadResult): string {
  return l.mapsUrl ?? `${l.name}|${l.address}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private prisma: PrismaService,
    private subscriptionsService: SubscriptionsService,
  ) {}

  async search(providerId: string, dto: SearchLeadsDto): Promise<{ results: LeadResult[]; usage: { usedSoFar: number; limit: number } }> {
    // Confere e já debita a cota ANTES de gastar a consulta de verdade — se a
    // chamada ao OpenStreetMap falhar depois, o prestador não teria como
    // "devolver" o crédito mesmo, então mantemos simples: cota é por tentativa.
    const usage = await this.subscriptionsService.consumeLeadSearch(providerId);
    const limit = dto.limit ?? 20;

    let results: LeadResult[] = [];
    try {
      // "Salão de beleza" quase nunca aparece literalmente no nome de um
      // estabelecimento — mas "cabeleireiro" ou "barbearia" sim. Se o nicho
      // digitado bater com um grupo conhecido, tenta cada termo alternativo
      // até juntar leads suficientes, em vez de só a frase genérica original.
      const termos = matchSearchTerms(dto.query);
      for (const termo of termos) {
        if (results.length >= limit) break;
        const novos = await this.buscarNoNominatim(termo, dto.location, limit);
        results = this.mesclar(results, novos, limit);
        if (termos.indexOf(termo) < termos.length - 1) await sleep(ENTRE_CHAMADAS_MS);
      }

      if (results.length === 0) {
        if (termos.length) await sleep(ENTRE_CHAMADAS_MS);
        const novos = await this.buscarNoNominatim(dto.query, dto.location, limit);
        results = this.mesclar(results, novos, limit);
      }
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err;
      this.logger.error('Falha ao buscar leads', err as Error);
      throw new ServiceUnavailableException('Não foi possível buscar leads agora. Tente novamente em instantes.');
    }

    return { results, usage };
  }

  private mesclar(atual: LeadResult[], novos: LeadResult[], limit: number): LeadResult[] {
    const vistos = new Set(atual.map(leadKey));
    const combinado = [...atual];
    for (const lead of novos) {
      const chave = leadKey(lead);
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      combinado.push(lead);
      if (combinado.length >= limit) break;
    }
    return combinado;
  }

  private async buscarNoNominatim(termo: string, location: string, limit: number): Promise<LeadResult[]> {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', `${termo}, ${location}`);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('extratags', '1');
    url.searchParams.set('namedetails', '1');
    url.searchParams.set('countrycodes', 'br');
    url.searchParams.set('accept-language', 'pt-BR');
    url.searchParams.set('limit', String(limit));

    const res = await fetch(url, { headers: { 'User-Agent': NOMINATIM_USER_AGENT } });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.error(`Nominatim respondeu ${res.status}: ${body.slice(0, 300)}`);
      throw new ServiceUnavailableException('Não foi possível buscar leads agora. Tente novamente em instantes.');
    }

    const places = (await res.json()) as NominatimPlace[];
    return places.map(leadFromPlace);
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
