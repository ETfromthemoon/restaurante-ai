import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './middleware/auth';

let io: Server;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, { cors: { origin: '*' } });
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
    socket.join(role === 'cook' ? 'kitchen' : 'waiters'); // manager → waiters
  });
  return io;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket no inicializado');
  return io;
}
