import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
let socket: Socket | null = null;

export const socketService = {
  connect(token: string) {
    if (socket?.connected) return;
    socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
  },
  disconnect() {
    socket?.disconnect();
    socket = null;
  },
  on<T>(event: string, cb: (data: T) => void) {
    socket?.on(event, cb);
  },
  off(event: string) {
    socket?.off(event);
  },
};
