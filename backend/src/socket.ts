import { Server, Namespace } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './middleware/auth';

let io: Server;

export function initSocket(httpServer: HttpServer): Server {
  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(s => s.trim())
    : ['http://localhost:5173'];

  io = new Server(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
  });

  // Namespace dinámico para cada tenant: /tenant/:slug
  io.of(/^\/tenant\/[a-z0-9-]+$/).on('connection', socket => {
    // Auth middleware ya verificó el token — está en socket.data.user
    const role = socket.data.user?.role;
    socket.join(role === 'cook' ? 'kitchen' : 'waiters');
  });

  // Middleware de autenticación aplicado a todos los namespaces
  io.of(/^\/tenant\/[a-z0-9-]+$/).use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No autorizado'));
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      socket.data.user = decoded;
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  return io;
}

/**
 * Obtiene el namespace Socket.io para un tenant específico.
 * Usado por los route handlers para emitir eventos aislados por tenant.
 */
export function getTenantIO(slug: string): Namespace {
  if (!io) {
    if (process.env.NODE_ENV === 'test') {
      // Mock silencioso para tests — no emite eventos reales
      return {
        to: () => ({ emit: () => {}, to: () => ({ emit: () => {} }) }),
      } as any;
    }
    throw new Error('Socket no inicializado');
  }
  return io.of(`/tenant/${slug}`);
}

/** @deprecated Usar getTenantIO(slug) — mantenido para compatibilidad de tests */
export function getIO(): Server {
  if (!io) {
    if (process.env.NODE_ENV === 'test') {
      return { to: () => ({ emit: () => {}, to: () => ({ emit: () => {} }) }) } as any;
    }
    throw new Error('Socket no inicializado');
  }
  return io;
}
