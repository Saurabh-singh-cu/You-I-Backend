import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://incomparable-empanada-16d9d0.netlify.app/",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// In-memory data store (would use a database in production)
const users = [];
const channels = [
  { id: 'general', name: 'General', messages: [] },
  { id: 'random', name: 'Random', messages: [] }
];

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Handle user joining
  socket.on('user_join', (username) => {
    const user = {
      id: socket.id,
      username,
      online: true
    };
    users.push(user);
    io.emit('user_list', users);
    socket.emit('channels', channels);
  });
  
  // Handle channel messages
  socket.on('send_message', (data) => {
    const { channelId, message, username } = data;
    const channel = channels.find(c => c.id === channelId);
    
    if (channel) {
      const newMessage = {
        id: Date.now().toString(),
        content: message,
        username,
        timestamp: new Date().toISOString(),
        userId: socket.id
      };
      
      channel.messages.push(newMessage);
      io.emit('receive_message', { channelId, message: newMessage });
    }
  });
  
  // Handle user disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const index = users.findIndex(user => user.id === socket.id);
    if (index !== -1) {
      users.splice(index, 1);
      io.emit('user_list', users);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});