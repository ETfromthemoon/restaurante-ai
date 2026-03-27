import { createServer } from 'http';
import app from './app';
import { initSocket } from './socket';

const PORT = process.env.PORT || 3000;

const httpServer = createServer(app);
initSocket(httpServer);
httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
