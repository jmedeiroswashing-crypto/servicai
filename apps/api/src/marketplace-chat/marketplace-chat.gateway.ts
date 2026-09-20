import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { MarketplaceChatService } from './marketplace-chat.service.js';

interface JoinConversationPayload {
  conversationId: string;
}

interface SendMessagePayload {
  conversationId: string;
  content: string;
}

@WebSocketGateway({ cors: { origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000' }, namespace: 'marketplace-chat' })
export class MarketplaceChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(
    private marketplaceChatService: MarketplaceChatService,
    private jwtService: JwtService,
  ) {}

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) throw new Error('Token ausente');
      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;
    } catch {
      client.disconnect();
    }
  }

  @SubscribeMessage('join')
  async handleJoin(@ConnectedSocket() client: Socket, @MessageBody() payload: JoinConversationPayload) {
    await this.marketplaceChatService.assertParticipant(client.data.userId, payload.conversationId);
    await client.join(payload.conversationId);
    return { joined: payload.conversationId };
  }

  @SubscribeMessage('message')
  async handleMessage(@ConnectedSocket() client: Socket, @MessageBody() payload: SendMessagePayload) {
    const message = await this.marketplaceChatService.sendMessage(
      client.data.userId,
      payload.conversationId,
      payload.content,
    );
    this.server.to(payload.conversationId).emit('message', message);
    return message;
  }
}
