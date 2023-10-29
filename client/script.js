import { io } from 'socket.io-client';

//const socket = io('http://localhost:3000');
const socket = io('https://jxdmrpment.us-east-2.awsapprunner.com:3000');


localStorage.setItem('socketID', socket.id);

const loginContent = document.getElementById('login-content');
const gameContent = document.getElementById('game-content');
const aliasInput = document.getElementById('alias');
const connectButton = document.getElementById('connectButton');

connectButton.addEventListener('click', () => {
  const alias = aliasInput.value.trim();

  if (/^[a-zA-Z0-9]{3,16}$/.test(alias)) {
    // Valid alias, hide login content and reveal game content
    loginContent.style.display = 'none';
    gameContent.style.display = 'block';

    // Emit the alias to the server
    socket.emit('hello', alias);
  } else {
    alert('Please enter a valid alias with 3 to 16 alphanumeric characters.');
  }
});

socket.on('connect', () => {
  console.log(`You connected with id: ${socket.id}`);
});


const playerBalanceElement = document.getElementById('player-balance');
const playerBetInput = document.getElementById('player-bet');
const playerHandElement = document.getElementById('player-hand');
const dealerHandElement = document.getElementById('dealer-hand');
const roundResultElement = document.getElementById('round-result');
const startButton = document.getElementById('start');
const hitButton = document.getElementById('hit');
const standButton = document.getElementById('stand');
const doubleButton = document.getElementById('double');

let playerBalance = 1000;
// Set the minimum valid bet to 20
let playerBet = 20; 
let playerHand = [];
let dealerHand = [];
let deck = [];
let roundStarted = false;

requestLeaderboard();

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById("start").addEventListener('click', startGame)
});
document.addEventListener('DOMContentLoaded', function () {
  document.getElementById("hit").addEventListener('click', playerHit)
});
document.addEventListener('DOMContentLoaded', function () {
  document.getElementById("stand").addEventListener('click', playerStand)
});
document.addEventListener('DOMContentLoaded', function () {
  document.getElementById("double").addEventListener('click', doubleDown)
});

function updateLeaderboard(leaderboardData) {
  const leaderboardList = document.getElementById('leaderboard-list');
  leaderboardList.innerHTML = ''; // Clear the current leaderboard entries

  for (const entry of leaderboardData) {
    const listItem = document.createElement('li');
    listItem.textContent = `${entry.alias}: $${entry.balance}`;
    leaderboardList.appendChild(listItem);
  }
  io.emit('leaderboardUpdate', leaderboard);
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

socket.on('leaderboard', (leaderboardData) => {
  updateLeaderboard(leaderboardData);
});

// Function to send a request to the server to get the leaderboard
function requestLeaderboard() {
  socket.emit('update', { getLeaderboard: true });
}

// Function to update the player's balance and send it to the server
function updatePlayerBalance(newBalance) {
  playerBalance = newBalance;
  playerBalanceElement.textContent = playerBalance;

  // Send the updated balance to the server
  socket.emit('update', { balance: newBalance });
}

function updatePlayerBalanceAndLeaderboard(newBalance) {
  updatePlayerBalance(newBalance);
  socket.emit('updateBalance', { newBalance });
}

function calculateScore(hand) {
let score = 0;
let numAces = 0;

for (const card of hand) {
  const cardValue = card.slice(0, -1);
  const cardSuit = card.slice(-1);

  if (cardValue === 'A') {
    score += 11;
    numAces++;
  } else if (['K', 'Q', 'J'].includes(cardValue)) {
    score += 10;
  } else {
    score += parseInt(cardValue);
  }
}

while (score > 21 && numAces > 0) {
  score -= 10;
  numAces--;
}

return score;
}

function displayHands(showHiddenCard = false) {
playerHandElement.textContent = `Player's hand: ${playerHand.join(', ')} (Score: ${calculateScore(playerHand)})`;
if (showHiddenCard) {
  dealerHandElement.textContent = `Dealer's hand: ${dealerHand.join(', ')} (Score: ${calculateScore(dealerHand)})`;
} else {
  dealerHandElement.textContent = `Dealer's hand: ${dealerHand[0]}, ?`;
}
playerBalanceElement.textContent = playerBalance;
playerBetInput.value = playerBet;
}

function drawCard() {
if (deck.length === 0) {
  deck = [
    '2S', '3S', '4S', '5S', '6S', '7S', '8S', '9S', '10S', 'JS', 'QS', 'KS', 'AS',
    '2H', '3H', '4H', '5H', '6H', '7H', '8H', '9H', '10H', 'JH', 'QH', 'KH', 'AH',
    '2D', '3D', '4D', '5D', '6D', '7D', '8D', '9D', '10D', 'JD', 'QD', 'KD', 'AD',
    '2C', '3C', '4C', '5C', '6C', '7C', '8C', '9C', '10C', 'JC', 'QC', 'KC', 'AC'
  ];
  shuffle(deck);
}
return deck.pop();
}

function startGame() {
  if (!roundStarted) {
    const betValue = parseInt(playerBetInput.value);
    if (betValue >= 20 && betValue <= playerBalance) {
      roundStarted = true;
      startButton.disabled = true;
      hitButton.disabled = false;
      standButton.disabled = false;
      doubleButton.disabled = false;

      playerBet = betValue;
      playerBalance -= playerBet;
      playerHand = [drawCard(), drawCard()];
      dealerHand = [drawCard(), drawCard()];
      
      // Check for blackjack
      if (calculateScore(playerHand) === 21) {
        if (calculateScore(dealerHand) === 21) {
          endRound('Blackjack! It\'s a tie!', 0); // Tie, no payout
        } else {
          // Update the player's balance and leaderboard
          updatePlayerBalanceAndLeaderboard(playerBalance + playerBet * 2);
          endRound('Blackjack! You win 2x!', 2);
        }
      } else {
        displayHands();
      }
    } else {
      alert('Please enter a valid bet between 20 and your available balance.');
    }
  }
}

function playerHit() {
if (roundStarted) {
  playerHand.push(drawCard());
  displayHands();
  if (calculateScore(playerHand) > 21) {
     // Multiplier for payout is zero so no money is returned
    endRound('Bust! You lose.', 0);
  }
}
}

function playerStand() {
if (roundStarted) {
// Show the hidden card
displayHands(true); 
while (calculateScore(dealerHand) < 17) {
dealerHand.push(drawCard());
 // Update the dealer's hand in real-time
displayHands(true);
}

const playerScore = calculateScore(playerHand);
const dealerScore = calculateScore(dealerHand);

if (playerScore > 21) {
 // No payout when the player busts
endRound('Bust! You lose.', 0);
} else if (dealerScore > 21 || playerScore > dealerScore) {
 // Player wins, 2x payout
endRound('You win!', 2);
} else if (playerScore === dealerScore) {
// Tie, 1x payout
endRound('It\'s a tie!', 1); 
} else {
// Player loses, no payout
endRound('Dealer wins!', 0); 
}
}
}

function doubleDown() {
if (roundStarted && playerBalance >= playerBet) {
  playerBet *= 2;
  playerHit();
  if (calculateScore(playerHand) <= 21) {
    playerStand();
  }
} else {
  alert('Insufficient balance to double down or round not started.');
}
}



function endRound(result = '', payoutMultiplier = 2) {
  if (roundStarted) {
    displayHands(true); // Show the hidden card

    if (payoutMultiplier > 0) {
      playerBalance += playerBet * payoutMultiplier;
      // Update the player's balance and leaderboard
    }
    updatePlayerBalanceAndLeaderboard(playerBalance);
    startButton.disabled = false;
    hitButton.disabled = true;
    standButton.disabled = true;
    doubleButton.disabled = true;

    const roundResultElement = document.createElement('p');
    roundResultElement.textContent = result;
    roundResultElement.style.fontSize = '24px';
    roundResultElement.id = 'round-result';
    document.body.appendChild(roundResultElement);

    setTimeout(() => {
      roundResultElement.remove();
      roundStarted = false;
      displayHands(); // Clear the hands
      playerBalanceElement.textContent = playerBalance; // Update balance
    }, 2000);
  }
}