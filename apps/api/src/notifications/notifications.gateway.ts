import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({ cors: { origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000' }, namespace: 'notifications' })
export class NotificationsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(private jwtService: JwtService) {}

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) throw new Error('Token ausente');
      const payload = this.jwtService.verify(token);
      client.join(payload.sub);
    } catch {
      client.disconnect();
    }
  }

  emitToUser(userId: string, notification: unknown) {
    this.server.to(userId).emit('notification', notification);
  }
}
