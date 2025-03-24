import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: "https://incomparable-empanada-16d9d0.netlify.app",
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: "https://incomparable-empanada-16d9d0.netlify.app",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Allowed users
const allowedUsers = ["saurabh&pragya", "pragya&saurabh"];
const connectedUsers = new Map(); // Store connected users with socket ID

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('user_join', (username) => {
    if (!allowedUsers.includes(username)) {
      console.log(`Unauthorized user (${username}) tried to join`);
      socket.emit('error_message', 'Unauthorized user');
      socket.disconnect(); // Kick unauthorized users
      return;
    }

    if (connectedUsers.size >= 2 && !connectedUsers.has(username)) {
      console.log(`Max users reached. ${username} cannot join`);
      socket.emit('error_message', 'Room is full');
      socket.disconnect();
      return;
    }

    // Add user to the list
    connectedUsers.set(username, socket.id);
    io.emit('user_list', Array.from(connectedUsers.keys())); // Send updated user list
    console.log(`User joined: ${username}`);
  });

  socket.on('send_message', (data) => {
    const { channelId, message, username } = data;
    
    if (!connectedUsers.has(username)) {
      socket.emit('error_message', 'You are not authorized to send messages');
      return;
    }

    const newMessage = {
      id: Date.now().toString(),
      content: message,
      username,
      timestamp: new Date().toISOString()
    };

    io.emit('receive_message', { channelId, message: newMessage });
  });

  socket.on('disconnect', () => {
    let disconnectedUser = null;

    for (const [username, id] of connectedUsers.entries()) {
      if (id === socket.id) {
        disconnectedUser = username;
        connectedUsers.delete(username);
        break;
      }
    }

    console.log(`User disconnected: ${disconnectedUser}`);
    io.emit('user_list', Array.from(connectedUsers.keys()));
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
