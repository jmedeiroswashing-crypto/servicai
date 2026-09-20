import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

/**
 * Sem SMTP configurado, o e-mail nunca é enviado de verdade — só registra o
 * link no log do servidor. Isso deixa o fluxo inteiro testável e honesto: o
 * app nunca finge que mandou um e-mail que não chegou a lugar nenhum. Pra
 * entrega real, configure SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/EMAIL_FROM.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private from: string;

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<string>('SMTP_PORT');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    this.from = this.config.get<string>('EMAIL_FROM') ?? 'ServiçAi <no-reply@servicai.app>';

    if (host && port && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(port),
        secure: Number(port) === 465,
        auth: { user, pass },
      });
    } else {
      this.logger.warn('SMTP não configurado — e-mails serão apenas registrados no log, não entregues de verdade.');
    }
  }

  get enabled() {
    return this.transporter !== null;
  }

  async send(to: string, subject: string, html: string, textFallbackForLog: string) {
    if (!this.transporter) {
      this.logger.warn(`[E-MAIL NÃO ENVIADO — SMTP ausente] Para: ${to} | Assunto: ${subject}\n${textFallbackForLog}`);
      return;
    }

    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
    } catch (err) {
      this.logger.error(`Falha ao enviar e-mail para ${to}`, err as Error);
    }
  }
}
