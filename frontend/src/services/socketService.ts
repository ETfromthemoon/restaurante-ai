import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Extract the tenant slug from the current hostname.
 * e.g. "elfogon.miapp.com" → "elfogon"
 * In development (localhost / IP) falls back to "demo".
 */
function getTenantSlug(): string {
  const hostname = window.location.hostname;
  // If running on localhost or an IP address, use 'demo'
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return 'demo';
  }
  // Extract first subdomain: "elfogon.miapp.com" → "elfogon"
  const parts = hostname.split('.');
  return parts.length >= 3 ? parts[0] : 'demo';
}

let socket: Socket | null = null;

export const socketService = {
  connect(token: string) {
    if (socket?.connected) return;
    const slug = getTenantSlug();
    socket = io(`${SOCKET_URL}/tenant/${slug}`, {
      auth: { token },
      transports: ['websocket'],
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
};
