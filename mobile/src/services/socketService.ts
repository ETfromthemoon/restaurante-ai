/**
 * socketService — Mobile (Expo / React Native)
 * Wrapper sobre socket.io-client para recibir eventos en tiempo real del backend.
 * Uso: socketService.connect(token)  → llamar desde App.tsx al autenticarse.
 */
import { io, Socket } from 'socket.io-client';

// En emulador Android usar 10.0.2.2; en dispositivo físico usar la IP de tu PC.
const SOCKET_URL = 'http://10.0.2.2:3000';

let socket: Socket | null = null;

export const socketService = {
  connect(token: string) {
    if (socket?.connected) return;
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1500,
    });

    socket.on('connect', () => {
      console.log('[Socket] Conectado al servidor');
    });

    socket.on('disconnect', reason => {
      console.log('[Socket] Desconectado:', reason);
    });

    socket.on('connect_error', err => {
      console.warn('[Socket] Error de conexión:', err.message);
    });
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

  isConnected(): boolean {
    return socket?.connected ?? false;
  },
};
