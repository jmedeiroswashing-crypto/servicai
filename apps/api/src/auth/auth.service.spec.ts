import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as bcrypt from 'bcrypt';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { Role } from '../generated/prisma/enums.js';

function buildService() {
  const prisma = {
    user: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    providerProfile: { create: vi.fn() },
    subscription: { create: vi.fn() },
  };
  const jwt = { sign: vi.fn().mockReturnValue('signed-token') };
  const config = { get: vi.fn().mockReturnValue(undefined) };
  const emailService = { send: vi.fn().mockResolvedValue(undefined) };

  const service = new AuthService(prisma as never, jwt as never, config as never, emailService as never);
  return { service, prisma, jwt, emailService };
}

describe('AuthService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('login', () => {
    it('rejeita credenciais inválidas quando o e-mail não existe', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login({ email: 'a@a.com', password: 'x' })).rejects.toThrow(UnauthorizedException);
    });

    it('rejeita login de conta excluída (soft delete)', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue({ id: '1', deletedAt: new Date(), passwordHash: 'hash' });

      await expect(service.login({ email: 'a@a.com', password: 'x' })).rejects.toThrow(UnauthorizedException);
    });

    it('rejeita senha incorreta', async () => {
      const { service, prisma } = buildService();
      const passwordHash = await bcrypt.hash('correta', 10);
      prisma.user.findUnique.mockResolvedValue({ id: '1', deletedAt: null, passwordHash, email: 'a@a.com', role: Role.CLIENTE, name: 'A' });

      await expect(service.login({ email: 'a@a.com', password: 'errada' })).rejects.toThrow(UnauthorizedException);
    });

    it('autentica com sucesso e retorna accessToken + user', async () => {
      const { service, prisma } = buildService();
      const passwordHash = await bcrypt.hash('correta', 10);
      prisma.user.findUnique.mockResolvedValue({ id: '1', deletedAt: null, passwordHash, email: 'a@a.com', role: Role.CLIENTE, name: 'A' });

      const result = await service.login({ email: 'a@a.com', password: 'correta' });

      expect(result.accessToken).toBe('signed-token');
      expect(result.user).toEqual({ id: '1', email: 'a@a.com', role: Role.CLIENTE, name: 'A' });
    });
  });

  describe('register', () => {
    it('rejeita e-mail já cadastrado', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({ email: 'dup@a.com', password: 'senha123', name: 'N', role: Role.CLIENTE } as never),
      ).rejects.toThrow(ConflictException);
    });

    it('cria uma ProviderProfile + Subscription apenas para role PRESTADOR', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'u1', email: 'p@a.com', role: Role.PRESTADOR, name: 'P' });
      prisma.providerProfile.create.mockResolvedValue({ id: 'prov1' });
      prisma.user.update.mockResolvedValue({});

      await service.register({ email: 'p@a.com', password: 'senha123', name: 'P', role: Role.PRESTADOR, city: 'SP' } as never);

      expect(prisma.providerProfile.create).toHaveBeenCalledTimes(1);
      expect(prisma.subscription.create).toHaveBeenCalledWith({ data: { providerId: 'prov1' } });
    });

    it('não cria ProviderProfile para role CLIENTE', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'u2', email: 'c@a.com', role: Role.CLIENTE, name: 'C' });
      prisma.user.update.mockResolvedValue({});

      await service.register({ email: 'c@a.com', password: 'senha123', name: 'C', role: Role.CLIENTE } as never);

      expect(prisma.providerProfile.create).not.toHaveBeenCalled();
    });

    it('emite um token de verificação de e-mail e envia o e-mail', async () => {
      const { service, prisma, emailService } = buildService();
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'u3', email: 'c@a.com', role: Role.CLIENTE, name: 'C' });
      prisma.user.update.mockResolvedValue({});

      await service.register({ email: 'c@a.com', password: 'senha123', name: 'C', role: Role.CLIENTE } as never);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u3' },
          data: expect.objectContaining({ emailVerificationToken: expect.any(String) }),
        }),
      );
      expect(emailService.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('verifyEmail', () => {
    it('rejeita token inexistente', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.verifyEmail({ token: 'invalido' })).rejects.toThrow(BadRequestException);
    });

    it('rejeita token expirado', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue({ id: '1', emailVerificationExpiresAt: new Date(Date.now() - 1000) });

      await expect(service.verifyEmail({ token: 'expirado' })).rejects.toThrow(BadRequestException);
    });

    it('marca o usuário como verificado e limpa o token quando válido', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue({ id: '1', emailVerificationExpiresAt: new Date(Date.now() + 1000 * 60) });
      prisma.user.update.mockResolvedValue({});

      const result = await service.verifyEmail({ token: 'valido' });

      expect(result).toEqual({ success: true });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { verified: true, emailVerificationToken: null, emailVerificationExpiresAt: null },
      });
    });
  });

  describe('forgotPassword', () => {
    it('não revela se o e-mail existe (retorna success mesmo para e-mail inexistente)', async () => {
      const { service, prisma, emailService } = buildService();
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword({ email: 'naoexiste@a.com' });

      expect(result).toEqual({ success: true });
      expect(emailService.send).not.toHaveBeenCalled();
    });

    it('não envia e-mail de redefinição para conta excluída', async () => {
      const { service, prisma, emailService } = buildService();
      prisma.user.findUnique.mockResolvedValue({ id: '1', email: 'a@a.com', deletedAt: new Date() });

      const result = await service.forgotPassword({ email: 'a@a.com' });

      expect(result).toEqual({ success: true });
      expect(emailService.send).not.toHaveBeenCalled();
    });

    it('gera token e envia e-mail para conta válida', async () => {
      const { service, prisma, emailService } = buildService();
      prisma.user.findUnique.mockResolvedValue({ id: '1', email: 'a@a.com', name: 'A', deletedAt: null });
      prisma.user.update.mockResolvedValue({});

      await service.forgotPassword({ email: 'a@a.com' });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ passwordResetToken: expect.any(String) }) }),
      );
      expect(emailService.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetPassword', () => {
    it('rejeita token de redefinição inválido ou expirado', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.resetPassword({ token: 'x', newPassword: 'novaSenha123' })).rejects.toThrow(BadRequestException);
    });

    it('atualiza a senha e limpa o token quando válido', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue({ id: '1', passwordResetExpiresAt: new Date(Date.now() + 60_000) });
      prisma.user.update.mockResolvedValue({});

      const result = await service.resetPassword({ token: 'valido', newPassword: 'novaSenha123' });

      expect(result).toEqual({ success: true });
      const updateCall = prisma.user.update.mock.calls[0][0];
      expect(updateCall.data.passwordResetToken).toBeNull();
      expect(updateCall.data.passwordHash).not.toBe('novaSenha123');
    });
  });
});
