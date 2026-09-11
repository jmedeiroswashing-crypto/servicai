import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface SearchIntent {
  category: string;
  keywords: string[];
  urgency: 'baixa' | 'media' | 'alta';
  location: string | null;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private client: OpenAI | null = null;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    } else {
      this.logger.warn('OPENAI_API_KEY não configurada — AiService usará respostas de fallback (heurísticas locais).');
    }
  }

  private get enabled() {
    return this.client !== null;
  }

  async parseSearchIntent(query: string): Promise<SearchIntent> {
    if (!this.enabled) return this.fallbackIntent(query);

    try {
      const completion = await this.client!.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Você extrai a intenção de busca por serviços de um marketplace brasileiro. ' +
              'Responda em JSON com: category (categoria do serviço, ex: "eletricista", "encanador", "advogado"), ' +
              'keywords (array de palavras-chave relevantes), urgency ("baixa" | "media" | "alta") e location (cidade/bairro mencionado ou null).',
          },
          { role: 'user', content: query },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(raw);
      return {
        category: parsed.category ?? this.fallbackIntent(query).category,
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
        urgency: ['baixa', 'media', 'alta'].includes(parsed.urgency) ? parsed.urgency : 'media',
        location: parsed.location ?? null,
      };
    } catch (err) {
      this.logger.error('Falha ao interpretar busca com IA, usando fallback', err as Error);
      return this.fallbackIntent(query);
    }
  }

  async generateServiceDescription(input: {
    specialty: string;
    keyPoints: string;
  }): Promise<string> {
    if (!this.enabled) {
      return `Serviço profissional de ${input.specialty}. ${input.keyPoints}`;
    }

    try {
      const completion = await this.client!.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Você escreve descrições curtas, profissionais e persuasivas (2 a 4 frases) para anúncios de serviços ' +
              'em uma plataforma de contratação de prestadores, em português do Brasil.',
          },
          {
            role: 'user',
            content: `Especialidade: ${input.specialty}. Pontos principais: ${input.keyPoints}`,
          },
        ],
      });
      return completion.choices[0]?.message?.content?.trim() ?? input.keyPoints;
    } catch (err) {
      this.logger.error('Falha ao gerar descrição com IA', err as Error);
      return `Serviço profissional de ${input.specialty}. ${input.keyPoints}`;
    }
  }

  async suggestPriceRange(input: {
    category: string;
    description: string;
    city: string;
  }): Promise<{ priceMin: number; priceMax: number; estimatedTime: string; reasoning: string }> {
    const fallback = this.fallbackPrice(input.category);

    if (!this.enabled) return fallback;

    try {
      const completion = await this.client!.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Você estima faixas de preço (em reais, BRL) e tempo estimado para serviços no Brasil, com base em ' +
              'categoria, descrição e cidade. Responda em JSON com priceMin, priceMax (números), estimatedTime (string, ex: "2 a 4 horas") ' +
              'e reasoning (breve justificativa em 1 frase).',
          },
          {
            role: 'user',
            content: `Categoria: ${input.category}\nDescrição: ${input.description}\nCidade: ${input.city}`,
          },
        ],
      });
      const raw = completion.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(raw);
      return {
        priceMin: Number(parsed.priceMin) || fallback.priceMin,
        priceMax: Number(parsed.priceMax) || fallback.priceMax,
        estimatedTime: parsed.estimatedTime ?? fallback.estimatedTime,
        reasoning: parsed.reasoning ?? fallback.reasoning,
      };
    } catch (err) {
      this.logger.error('Falha ao sugerir preço com IA', err as Error);
      return fallback;
    }
  }

  private fallbackIntent(query: string): SearchIntent {
    const lower = query.toLowerCase();
    const urgent = ['urgente', 'agora', 'hoje', 'emergência', 'rápido'].some((w) => lower.includes(w));

    const categories = [
      'eletricista', 'encanador', 'pedreiro', 'pintor', 'marceneiro', 'advogado',
      'psicólogo', 'médico', 'mecânico', 'lava rápido', 'estética', 'odontológica',
      'dentista', 'salão', 'barbeiro', 'limpeza', 'mudança', 'refrigeração',
      'ar condicionado', 'assistência técnica', 'desenvolvedor', 'designer', 'professor',
    ];
    const found = categories.find((c) => lower.includes(c));

    return {
      category: found ?? 'geral',
      keywords: query.split(/\s+/).filter((w) => w.length > 3),
      urgency: urgent ? 'alta' : 'media',
      location: null,
    };
  }

  private fallbackPrice(category: string) {
    return {
      priceMin: 80,
      priceMax: 300,
      estimatedTime: '1 a 3 horas',
      reasoning: `Estimativa padrão para a categoria "${category}" (IA generativa não configurada).`,
    };
  }
}
