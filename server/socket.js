import { Server } from 'socket.io';

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL ?? 'http://localhost:5173' },
  });

  io.on('connection', socket => {
    socket.on('join-room', roomId => socket.join(roomId));
    socket.on('chat-message', ({ roomId, message }) => io.to(roomId).emit('chat-message', message));
  });

  return io;
}
