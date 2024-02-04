const fs = require('fs');

const logFilePath = 'chatLog.txt';

const PORT = process.env.PORT || 3000;


const { instrument } = require('@socket.io/admin-ui');
const io = require('socket.io')(PORT, {
  cors: {
    origin: ["https://admin.socket.io", "http://localhost:8081","https://jaceroell.dev/blackjack.html:8081"],
    credentials: true,
  },
});

// Initialize the leaderboard as an array of objects.
const leaderboard = [];
// Initialize an object to store chat messages for each connected user.
const userChatMessages = {};
const allChatMessages = [];

const MAX_CHAT_MESSAGES = 10; // Set the maximum number of chat messages

io.on('connection', (socket) => {
  console.log(socket.id);

  socket.on('hello', (alias) => {
    console.log(`Player ${alias} connected with balance: 1000`);
    const player = {
      id: socket.id,
      alias: alias,
      balance: 1000,
    };
    leaderboard.push(player);
    leaderboard.sort((a, b) => b.balance - a.balance);
    leaderboard.splice(10);
    io.emit('leaderboard', leaderboard);
    console.log("leaderboard", leaderboard);

    // Initialize empty chat messages for the connected user
    userChatMessages[socket.id] = [];
  });

  // Handle balance updates for the player
  socket.on('updateBalance', (data) => {
    const player = leaderboard.find((p) => p.id === socket.id);

    if (player) {
      player.balance = data.newBalance;
      leaderboard.sort((a, b) => b.balance - a.balance);
      io.emit('leaderboard', leaderboard);
    }
  });

  // Listen for incoming chat messages
  socket.on('chatMessage', (message) => {
    const sender = leaderboard.find((p) => p.id === socket.id);
    if (sender) {
      const chatMessage = {
        sender: sender.alias,
        message: message,
        timestamp: new Date(), // Add timestamp to the chat message
      };

      // Add the chat message to the array of all chat messages
      allChatMessages.push(chatMessage);

      // Keep only the last 15 messages in the array
      if (allChatMessages.length > MAX_CHAT_MESSAGES) {
        allChatMessages.splice(0, allChatMessages.length - MAX_CHAT_MESSAGES);
      }
      
      // Broadcast all chat messages to all connected users, sorted chronologically
      io.emit('chatMessages', allChatMessages);
      logChatMessage(sender.alias, message);
    }
  });

  socket.on('disconnect', () => {
    const player = leaderboard.find((p) => p.id === socket.id);

    if (player) {
      console.log(`Player ${player.alias} disconnected`);
      const index = leaderboard.indexOf(player);
      if (index !== -1) {
        leaderboard.splice(index, 1);
        io.emit('leaderboard', leaderboard);
      }

      // Remove the user's chat messages on disconnect
      delete userChatMessages[socket.id];
    }
  });
});

const MAX_MESSAGE_LENGTH = 64;

function logChatMessage(alias, message) {
  const timestamp = new Date().toISOString();
  const trimmedMessage = message.trim().slice(0, MAX_MESSAGE_LENGTH); // Trim and limit to 64 characters
  const logEntry = `${timestamp} - ${alias}: ${trimmedMessage}\n`;

  // Append the log entry to the log file
  fs.appendFile(logFilePath, logEntry, (err) => {
    if (err) {
      console.error('Error writing to log file:', err);
    }
  });
}

instrument(io, { auth: false });
