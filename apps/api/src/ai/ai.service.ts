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

const REQUIRED_INTAKE_FIELDS: (keyof RequestDraft)[] = ['category', 'title', 'description', 'city'];

/** Categorias canônicas (mesmas de apps/web/src/lib/categories.ts) associadas a palavras-chave de detecção. */
const CATEGORY_KEYWORDS: [string, string][] = [
  ['eletricist', 'Eletricista'],
  ['encanador', 'Encanador'],
  ['hidráulic', 'Encanador'],
  ['pedreiro', 'Pedreiro'],
  ['alvenaria', 'Pedreiro'],
  ['pintor', 'Pintor'],
  ['pintura', 'Pintor'],
  ['marceneiro', 'Marceneiro'],
  ['marcenaria', 'Marceneiro'],
  ['advogad', 'Advogado'],
  ['psicólog', 'Psicólogo'],
  ['médic', 'Médico'],
  ['mecânic', 'Mecânico'],
  ['lava rápido', 'Lava Rápido'],
  ['lava-rápido', 'Lava Rápido'],
  ['estétic', 'Estética'],
  ['odont', 'Odontologia'],
  ['dentista', 'Odontologia'],
  ['cabeleireir', 'Salão'],
  ['salão', 'Salão'],
  ['barbeiro', 'Barbeiro'],
  ['barbearia', 'Barbeiro'],
  ['faxina', 'Limpeza'],
  ['limpeza', 'Limpeza'],
  ['diarista', 'Limpeza'],
  ['mudança', 'Mudanças'],
  ['frete', 'Mudanças'],
  ['refrigeração', 'Refrigeração'],
  ['geladeira', 'Refrigeração'],
  ['ar-condicionado', 'Ar-condicionado'],
  ['ar condicionado', 'Ar-condicionado'],
  ['assistência técnica', 'Assist. Técnica'],
  ['conserto de celular', 'Assist. Técnica'],
  ['desenvolvedor', 'Desenvolvedor'],
  ['programador', 'Desenvolvedor'],
  ['desenvolvimento de site', 'Desenvolvedor'],
  ['designer', 'Designer'],
  ['professor particular', 'Professor Particular'],
  ['aula particular', 'Professor Particular'],
  ['reforço escolar', 'Professor Particular'],
];

function matchCategory(lower: string): string | undefined {
  return CATEGORY_KEYWORDS.find(([keyword]) => lower.includes(keyword))?.[1];
}

function matchAllCategories(lower: string): string[] {
  const found = new Set<string>();
  for (const [keyword, label] of CATEGORY_KEYWORDS) {
    if (lower.includes(keyword)) found.add(label);
  }
  return [...found];
}

const STATE_NAMES_BY_UF: [string, string][] = [
  ['distrito federal', 'DF'], ['espírito santo', 'ES'], ['mato grosso do sul', 'MS'],
  ['mato grosso', 'MT'], ['minas gerais', 'MG'], ['rio de janeiro', 'RJ'],
  ['rio grande do norte', 'RN'], ['rio grande do sul', 'RS'], ['santa catarina', 'SC'],
  ['são paulo', 'SP'], ['acre', 'AC'], ['alagoas', 'AL'], ['amapá', 'AP'], ['amazonas', 'AM'],
  ['bahia', 'BA'], ['ceará', 'CE'], ['goiás', 'GO'], ['maranhão', 'MA'], ['pará', 'PA'],
  ['paraíba', 'PB'], ['paraná', 'PR'], ['pernambuco', 'PE'], ['piauí', 'PI'], ['rondônia', 'RO'],
  ['roraima', 'RR'], ['sergipe', 'SE'], ['tocantins', 'TO'],
];
const STATE_NAMES = [...STATE_NAMES_BY_UF].sort((a, b) => b[0].length - a[0].length);

const UF_CODES = new Set(['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']);

/**
 * Extrai cidade (e estado, se identificável) de uma resposta livre. Aceita "Recife",
 * "Recife, PE", "Recife - Pernambuco", "moro em Recife" etc. Sempre retorna uma cidade
 * não vazia quando `raw` tem conteúdo, para nunca travar o fluxo esperando um formato exato.
 */
function extractCityState(raw: string): { city: string; state?: string } {
  let text = raw
    .trim()
    .replace(/^(atendo em|atendo na|trabalho em|trabalho na|moro em|moro na|resido em|estou em|estou na|sou de|sou da|fico em|em|na)\s+/i, '')
    .trim();
  text = text.replace(/[.,;]+$/, '').trim();
  if (!text) return { city: raw.trim() };

  const sepMatch = text.match(/^(.+?)\s*[,\-–]\s*(.+)$/);
  if (sepMatch) {
    const left = sepMatch[1].trim();
    const right = sepMatch[2].trim();
    const rightUpper = right.toUpperCase();
    if (left && UF_CODES.has(rightUpper)) return { city: left, state: rightUpper };
    const byName = STATE_NAMES.find(([name]) => name === right.toLowerCase());
    if (left && byName) return { city: left, state: byName[1] };
    return { city: left || text };
  }

  const lowerText = text.toLowerCase();
  for (const [name, uf] of STATE_NAMES) {
    if (lowerText === name) break;
    if (lowerText.endsWith(' ' + name)) {
      const city = text.slice(0, text.length - name.length).trim();
      if (city) return { city, state: uf };
    }
  }

  const tokenMatch = text.match(/^(.*\S)\s+([A-Za-z]{2})$/);
  if (tokenMatch && UF_CODES.has(tokenMatch[2].toUpperCase())) {
    const city = tokenMatch[1].trim();
    if (city) return { city, state: tokenMatch[2].toUpperCase() };
  }

  return { city: text };
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

  /**
   * Heurística local (sem chave OpenAI). Cada pergunta feita ao cliente é respondida de
   * forma garantida: se a cidade foi perguntada, o texto digitado vira a cidade — nunca
   * repetimos a mesma pergunta esperando um formato específico que o usuário não sabe.
   */
  private fallbackIntake(message: string, draftSoFar: RequestDraft): IntakeResult {
    const draft: RequestDraft = { ...draftSoFar };
    const trimmed = message.trim();
    const lower = trimmed.toLowerCase();

    if (!draft.category) {
      const found = matchCategory(lower);
      if (found) draft.category = found;
    }

    if (draft.budgetMin == null && draft.budgetMax == null) {
      // Remove horários (14:00) e datas (15/09) antes de procurar valores em reais,
      // senão "amanhã às 14:00" vira um orçamento de R$14.
      const withoutTimeAndDate = trimmed.replace(/\d{1,2}:\d{2}/g, '').replace(/\d{1,2}\/\d{1,2}(\/\d{2,4})?/g, '');
      const numbers = [...withoutTimeAndDate.matchAll(/(\d+)/g)].map((m) => Number(m[1])).filter((n) => n >= 10 && n <= 100000);
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

    // Cada resposta só é consumida pelo campo que estava faltando no momento da pergunta,
    // na mesma ordem em que as perguntas são feitas (categoria -> descrição -> cidade).
    if (draft.category && !draft.description) {
      draft.description = trimmed;
    } else if (draft.category && draft.description && !draft.city) {
      const { city, state } = extractCityState(trimmed);
      draft.city = city;
      if (state && !draft.state) draft.state = state;
    }

    if (!draft.title && draft.category) {
      draft.title = `Preciso de ${draft.category.toLowerCase()}`;
    }

    let assistantReply: string;
    if (!draft.category) {
      assistantReply = 'Entendi! Que tipo de serviço você precisa? (ex: eletricista, encanador, pintor...)';
    } else if (!draft.description) {
      assistantReply = `Show, ${draft.category}! Me conta rapidinho o que precisa ser feito.`;
    } else if (!draft.city) {
      assistantReply = 'Em qual cidade você está? Pode escrever só o nome (ex: "Recife" ou "Recife, PE").';
    } else {
      assistantReply =
        'Perfeito, já tenho o essencial! Se quiser, me diga um orçamento ou data desejada — ou já pode revisar e publicar.';
    }

    const readyToPublish = REQUIRED_INTAKE_FIELDS.every((f) => !!draft[f]);
    return { draft, assistantReply, readyToPublish };
  }

  /**
   * Intake conversacional para o prestador preencher/atualizar o perfil profissional
   * (especialidade, categorias atendidas e cidade) em vez de usar o formulário manual.
   */
  async parseProviderIntake(message: string, draftSoFar: ProviderDraft): Promise<ProviderIntakeResult> {
    if (!this.enabled) return this.fallbackProviderIntake(message, draftSoFar);

    try {
      const completion = await this.client!.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Você ajuda um prestador de serviços a configurar o perfil dele em um marketplace brasileiro através ' +
              'de uma conversa natural e curta. Você recebe o rascunho já preenchido (JSON) e a nova mensagem do ' +
              'prestador. Atualize o rascunho combinando as informações novas com as existentes — nunca apague um ' +
              'campo já preenchido a menos que o prestador peça para mudar. Campos possíveis: specialty ' +
              '(especialidade principal em poucas palavras, ex: "Eletricista residencial"), categories (array com ' +
              'as categorias de serviço que ele atende, ex: ["Eletricista"], pode ter mais de uma), city (cidade ' +
              'onde atende), bio (uma descrição curta e atrativa do trabalho dele, opcional), yearsExperience ' +
              '(anos de experiência, número, opcional). Campos obrigatórios: specialty, categories (ao menos um ' +
              'item), city. Responda em JSON com: draft (objeto com todos os campos mesclados), assistantReply ' +
              '(resposta curta e amigável em português perguntando o próximo campo obrigatório que falta, ou ' +
              'confirmando que está pronto para salvar) e readyToSave (true só se os 3 campos obrigatórios ' +
              'estiverem preenchidos).',
          },
          {
            role: 'user',
            content: `Rascunho atual: ${JSON.stringify(draftSoFar)}\n\nMensagem do prestador: ${message}`,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(raw);
      const draft: ProviderDraft = { ...draftSoFar, ...parsed.draft };
      const readyToSave = !!draft.specialty && !!draft.categories?.length && !!draft.city;

      return {
        draft,
        assistantReply: parsed.assistantReply ?? 'Certo!',
        readyToSave,
      };
    } catch (err) {
      this.logger.error('Falha no intake de perfil por IA, usando fallback', err as Error);
      return this.fallbackProviderIntake(message, draftSoFar);
    }
  }

  private fallbackProviderIntake(message: string, draftSoFar: ProviderDraft): ProviderIntakeResult {
    const draft: ProviderDraft = { ...draftSoFar, categories: [...(draftSoFar.categories ?? [])] };
    const trimmed = message.trim();
    const lower = trimmed.toLowerCase();

    if (!draft.yearsExperience) {
      const yearsMatch = lower.match(/(\d+)\s*(anos?|ano de experi)/);
      if (yearsMatch) draft.yearsExperience = Number(yearsMatch[1]);
    }

    // Extrações oportunistas: uma mensagem rica como "Sou encanador, atendo em
    // Olinda" já responde duas ou três perguntas de uma vez — não esperamos o
    // próximo turno para aproveitar categoria e cidade se já vierem com um
    // marcador claro (palavra-chave de categoria, "atendo em X").
    if (!draft.categories?.length) {
      const detected = matchAllCategories(lower);
      if (detected.length) draft.categories = detected;
    }
    if (!draft.city) {
      const cityMarkerMatch =
        trimmed.match(/\b(?:atendo|trabalho|moro|resido|estou|fico)\s+(?:em|na)\s+(.+)$/i) ??
        trimmed.match(/^(?:em|na)\s+(.+)$/i);
      if (cityMarkerMatch) {
        const { city } = extractCityState(cityMarkerMatch[1]);
        if (city) draft.city = city;
      }
    }

    // Cada pergunta dedicada consome a mensagem inteira como resposta, garantindo
    // que o fluxo sempre avança mesmo se a extração oportunista acima não pegou nada.
    const wasSpecialtyMissing = !draftSoFar.specialty;
    if (!draft.specialty) {
      draft.specialty = trimmed;
    } else if (!draft.categories?.length && !wasSpecialtyMissing) {
      draft.categories = [trimmed];
    } else if (!draft.city && !wasSpecialtyMissing) {
      const { city } = extractCityState(trimmed);
      draft.city = city;
    } else if (draft.bio === undefined && !wasSpecialtyMissing) {
      const skip = ['pular', 'não', 'nao', 'n/a', 'sem descrição', 'sem descricao'].includes(lower);
      draft.bio = skip ? '' : trimmed;
    }

    let assistantReply: string;
    if (!draft.specialty) {
      assistantReply = 'Vamos montar seu perfil! Qual é a sua especialidade principal? (ex: "Eletricista residencial")';
    } else if (!draft.categories?.length) {
      assistantReply = 'Certo! Quais categorias de serviço você atende? (ex: "eletricista e encanador")';
    } else if (!draft.city) {
      assistantReply = 'Em qual cidade você atende? Pode escrever só o nome (ex: "Recife" ou "Recife, PE").';
    } else if (draft.bio === undefined) {
      assistantReply =
        'Ótimo, já tenho o essencial! Quer escrever uma descrição curta sobre seu trabalho para atrair mais clientes? (opcional — pode dizer "pular")';
    } else {
      assistantReply = 'Perfeito, seu perfil está pronto para ser salvo!';
    }

    const readyToSave = !!draft.specialty && !!draft.categories?.length && !!draft.city;
    return { draft, assistantReply, readyToSave };
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
