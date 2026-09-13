import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface SearchIntent {
  category: string;
  keywords: string[];
  urgency: 'baixa' | 'media' | 'alta';
  location: string | null;
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

const REQUIRED_INTAKE_FIELDS: (keyof RequestDraft)[] = ['category', 'title', 'description', 'city'];

const FALLBACK_CATEGORIES = [
  'eletricista', 'encanador', 'pedreiro', 'pintor', 'marceneiro', 'advogado',
  'psicólogo', 'médico', 'mecânico', 'lava rápido', 'estética', 'odontológica',
  'dentista', 'salão', 'barbeiro', 'limpeza', 'mudança', 'refrigeração',
  'ar condicionado', 'assistência técnica', 'desenvolvedor', 'designer', 'professor',
];

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

  /**
   * Intake conversacional para publicar uma solicitação de serviço: em vez de um
   * formulário, o cliente descreve em texto livre e a IA vai preenchendo um
   * rascunho estruturado, mesclando cada nova mensagem com o que já foi dito,
   * até ter os campos obrigatórios (categoria, título, descrição, cidade).
   */
  async parseServiceRequestIntake(message: string, draftSoFar: RequestDraft): Promise<IntakeResult> {
    if (!this.enabled) return this.fallbackIntake(message, draftSoFar);

    try {
      const completion = await this.client!.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Você ajuda um cliente a publicar um pedido de serviço em um marketplace brasileiro através de uma ' +
              'conversa natural e curta. Você recebe o rascunho já preenchido (JSON) e a nova mensagem do cliente. ' +
              'Atualize o rascunho combinando as informações novas com as existentes — nunca apague um campo já ' +
              'preenchido a menos que o cliente peça explicitamente para mudar. Campos possíveis: category ' +
              '(categoria do serviço, ex: "Eletricista"), title (título curto do pedido), description (o que ' +
              'precisa, ao menos uma frase), city (cidade), state (sigla UF de 2 letras, se souber), budgetMin e ' +
              'budgetMax (números em reais, opcionais), desiredDate (formato AAAA-MM-DD, opcional), desiredTime ' +
              '(período/horário em texto livre, opcional). Campos obrigatórios para publicar: category, title, ' +
              'description, city. Responda em JSON com: draft (objeto com todos os campos mesclados), ' +
              'assistantReply (resposta curta e amigável em português perguntando o próximo campo obrigatório que ' +
              'falta, ou confirmando que está pronto para publicar) e readyToPublish (true só se os 4 campos ' +
              'obrigatórios estiverem preenchidos).',
          },
          {
            role: 'user',
            content: `Rascunho atual: ${JSON.stringify(draftSoFar)}\n\nMensagem do cliente: ${message}`,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(raw);
      const draft: RequestDraft = { ...draftSoFar, ...parsed.draft };
      const readyToPublish = REQUIRED_INTAKE_FIELDS.every((f) => !!draft[f]);

      return {
        draft,
        assistantReply: parsed.assistantReply ?? 'Certo!',
        readyToPublish,
      };
    } catch (err) {
      this.logger.error('Falha no intake de solicitação por IA, usando fallback', err as Error);
      return this.fallbackIntake(message, draftSoFar);
    }
  }

  private fallbackIntake(message: string, draftSoFar: RequestDraft): IntakeResult {
    const draft: RequestDraft = { ...draftSoFar };
    const lower = message.toLowerCase();

    if (!draft.category) {
      const found = FALLBACK_CATEGORIES.find((c) => lower.includes(c));
      if (found) draft.category = found.charAt(0).toUpperCase() + found.slice(1);
    }

    if (draft.budgetMin == null && draft.budgetMax == null) {
      const numbers = [...message.matchAll(/(\d+)/g)].map((m) => Number(m[1])).filter((n) => n >= 10 && n <= 100000);
      if (numbers.length >= 2) {
        draft.budgetMin = Math.min(...numbers);
        draft.budgetMax = Math.max(...numbers);
      } else if (numbers.length === 1) {
        draft.budgetMax = numbers[0];
      }
    }

    if (!draft.desiredDate) {
      if (lower.includes('hoje')) {
        draft.desiredDate = new Date().toISOString().slice(0, 10);
      } else if (lower.includes('amanh')) {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        draft.desiredDate = d.toISOString().slice(0, 10);
      }
    }

    if (!draft.description || draft.description.length < message.length) {
      draft.description = draft.description ? `${draft.description} ${message}` : message;
    }

    if (!draft.city) {
      const cityMatch = message.match(/\bem ([A-ZÀ-Ú][\wÀ-ú]+(?: [A-ZÀ-Ú][\wÀ-ú]+)*)/);
      if (cityMatch) draft.city = cityMatch[1];
    }

    let assistantReply: string;
    if (!draft.category) {
      assistantReply = 'Entendi! Que tipo de serviço você precisa? (ex: eletricista, encanador, pintor...)';
    } else if (!draft.city) {
      assistantReply = `Show, ${draft.category}! Em qual cidade você está?`;
    } else {
      if (!draft.title) draft.title = `Preciso de ${draft.category.toLowerCase()}`;
      assistantReply =
        'Perfeito, já tenho o essencial! Se quiser, me diga um orçamento ou data desejada — ou já pode revisar e publicar.';
    }

    const readyToPublish = REQUIRED_INTAKE_FIELDS.every((f) => !!draft[f]);
    return { draft, assistantReply, readyToPublish };
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
