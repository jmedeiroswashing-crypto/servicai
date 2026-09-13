import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationType } from '../generated/prisma/enums.js';
import { NotificationsGateway } from './notifications.gateway.js';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
  ) {}

  async create(input: CreateNotificationInput) {
    const notification = await this.prisma.notification.create({ data: input });
    this.gateway.emitToUser(input.userId, notification);
    return notification;
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
