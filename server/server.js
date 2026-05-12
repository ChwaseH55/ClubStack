import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import orgRoutes from './routes/orgs.js';
import dashboardRoutes from './routes/dashboard.js';

const app = express();
const httpServer = createServer(app);
const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:5173';

const io = new Server(httpServer, { cors: { origin: clientUrl } });

app.use(cors({ origin: clientUrl }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orgs', orgRoutes);
app.use('/api/orgs', dashboardRoutes);

io.on('connection', socket => {
  socket.on('join-room', roomId => socket.join(roomId));
  socket.on('chat-message', ({ roomId, message }) => {
    io.to(roomId).emit('chat-message', message);
  });
});

const PORT = process.env.PORT ?? 5000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
