import { io, type Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

export function createChatSocket(token: string): Socket {
  return io(`${SOCKET_URL}/chat`, {
    auth: { token },
    transports: ['websocket'],
  });
}
