import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationType } from '../generated/prisma/enums.js';
import { NotificationsGateway } from './notifications.gateway.js';
import { PushSubscribeDto } from './dto/push-subscribe.dto.js';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private pushEnabled = false;

  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
    private config: ConfigService,
  ) {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.config.get<string>('VAPID_SUBJECT');
    if (publicKey && privateKey && subject) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.pushEnabled = true;
    } else {
      this.logger.warn('VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY não configuradas — push notifications desativadas.');
    }
  }

  async create(input: CreateNotificationInput) {
    const notification = await this.prisma.notification.create({ data: input });
    this.gateway.emitToUser(input.userId, notification);
    this.sendPush(input).catch((err) => this.logger.error('Falha ao enviar push', err as Error));
    return notification;
  }

  async subscribeToPush(userId: string, dto: PushSubscribeDto) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      create: { userId, endpoint: dto.endpoint, p256dh: dto.keys.p256dh, auth: dto.keys.auth },
      update: { userId, p256dh: dto.keys.p256dh, auth: dto.keys.auth },
    });
  }

  async unsubscribeFromPush(userId: string, endpoint: string) {
    return this.prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
  }

  /**
   * Envia a notificação de verdade para o navegador/celular do usuário, mesmo
   * com o site fechado — diferente do WebSocket (que só entrega com a aba
   * aberta). Assinaturas expiradas (usuário desinstalou, trocou de navegador
   * etc.) são removidas automaticamente quando o provedor retorna 404/410.
   */
  private async sendPush(input: CreateNotificationInput) {
    if (!this.pushEnabled) return;
    const subscriptions = await this.prisma.pushSubscription.findMany({ where: { userId: input.userId } });
    if (subscriptions.length === 0) return;

    const payload = JSON.stringify({ title: input.title, body: input.body, link: input.link });

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          );
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await this.prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
          } else {
            this.logger.error(`Falha ao enviar push para ${sub.endpoint}`, err as Error);
          }
        }
      }),
    );
  }

  listMine(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, read: false } });
  }

  async markRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({ where: { id, userId }, data: { read: true } });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  }

  /**
   * Evita alertar repetidamente sobre o mesmo evento (ex.: plano expirando) —
   * só cria se não houver uma notificação do mesmo tipo ainda não lida nas
   * últimas `withinHours` horas.
   */
  async createIfNotRecentlyNotified(input: CreateNotificationInput, withinHours = 24) {
    const since = new Date(Date.now() - withinHours * 60 * 60 * 1000);
    const existing = await this.prisma.notification.findFirst({
      where: { userId: input.userId, type: input.type, createdAt: { gte: since } },
    });
    if (existing) return existing;
    return this.create(input);
  }
}
