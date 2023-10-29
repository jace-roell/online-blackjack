const { instrument } = require('@socket.io/admin-ui') 

const io = require('socket.io')(3000, {
  cors: {
    //origin: ['https://nqppsn342q.us-east-2.awsapprunner.com:8080'], ['https://admin.socket.io/']
    origin: ["https://admin.socket.io", "http://localhost:8081"],
    credentials: true,
    },
    });
  
  // Initialize the leaderboard as an array of objects.
  const leaderboard = [];
  
  io.on('connection', (socket) => {
    console.log(socket.id);
  
    socket.on('hello', (alias) => {
      console.log(`Player ${alias} connected with balance: 1000`); // Log player's alias and balance
  
      // Initialize the player's balance as needed.
      const player = {
        id: socket.id,
        alias: alias,
        balance: 1000, // You can set the initial balance as desired.
      };
  
      // Add the player to the leaderboard.
      leaderboard.push(player);
  
      // Sort the leaderboard by balance in descending order.
      leaderboard.sort((a, b) => b.balance - a.balance);
  
      // Keep only the top 10 players.
      leaderboard.splice(10);
  
      // Broadcast the updated leaderboard to all connected clients.
      io.emit('leaderboard', leaderboard);
      console.log("leaderboard", leaderboard);
    });
  
    // Handle balance updates for the player
    socket.on('updateBalance', (data) => {
      const player = leaderboard.find((p) => p.id === socket.id);
  
      if (player) {
        player.balance = data.newBalance;
  
        // Sort the leaderboard by balance in descending order.
        leaderboard.sort((a, b) => b.balance - a.balance);
  
        // Broadcast the updated leaderboard to all connected clients.
        io.emit('leaderboard', leaderboard);
      }
    });
  
    socket.on('disconnect', () => {
      // Find the disconnected player.
      const player = leaderboard.find((p) => p.id === socket.id);
  
      if (player) {
        console.log(`Player ${player.alias} disconnected`);
  
        // Remove the disconnected player from the leaderboard.
        const index = leaderboard.indexOf(player);
        if (index !== -1) {
          leaderboard.splice(index, 1);
  
          // Broadcast the updated leaderboard to all connected clients.
          io.emit('leaderboard', leaderboard);
        }
      }
    });
  });
  
  instrument(io, {auth: false});