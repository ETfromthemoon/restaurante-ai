import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './middleware/auth';

let io: Server;

export function initSocket(httpServer: HttpServer): Server {
  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(s => s.trim())
    : ['http://localhost:5173'];

  io = new Server(httpServer, { cors: { origin: allowedOrigins, credentials: true } });

  // Auth middleware: valida JWT ANTES de permitir la conexion
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No autorizado'));
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      socket.data.user = decoded;
      next();
    } catch { next(new Error('Token inválido')); }
  });

  io.on('connection', socket => {
    const role = socket.data.user?.role;
    socket.join(role === 'cook' ? 'kitchen' : 'waiters');
  });
  return io;
}

export function getIO(): Server {
  if (!io) {
    if (process.env.NODE_ENV === 'test') {
      // Mock silencioso para tests de integración — no emite eventos reales
      return { to: () => ({ emit: () => {}, to: () => ({ emit: () => {} }) }) } as any;
    }
    throw new Error('Socket no inicializado');
  }
  return io;
}
