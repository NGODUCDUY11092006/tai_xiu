// Game constants
const INITIAL_BALANCE = 10000;
const FACES = [1, 2, 3, 4, 5, 6];

// Game state
let balance = INITIAL_BALANCE;
let betAmount = 100;
let currentBet = null; // 'tài' or 'xỉu'
let isRolling = false;
let gameHistory = [];

// DOM elements
const balanceElement = document.getElementById('balance');
const panelBalanceElement = document.getElementById('panel-balance-amount');
const betAmountInput = document.getElementById('bet-amount');
const quickBetButtons = document.querySelectorAll('.quick-bet');
const betTaiButton = document.getElementById('bet-tai');
const betXiuButton = document.getElementById('bet-xiu');
const rollDiceButton = document.getElementById('roll-dice');
const diceElements = [
  document.getElementById('dice1'),
  document.getElementById('dice2'),
  document.getElementById('dice3')
];
const gameResultElement = document.getElementById('game-result');
const diceTotalElement = document.getElementById('dice-total');
const historyTableBody = document.getElementById('history-body');
const resetGameButton = document.getElementById('reset-game');
const toastElement = document.getElementById('toast');
const currentYearElement = document.getElementById('current-year');

// Set current year in footer
currentYearElement.textContent = new Date().getFullYear();

// Initialize the game
function initGame() {
  try {
    // Load saved balance and history from localStorage
    const savedBalance = localStorage.getItem('taixiu_balance');
    const savedHistory = localStorage.getItem('taixiu_history');
    
    if (savedBalance) {
      balance = parseInt(savedBalance);
      updateBalanceDisplay();
    }
    
    if (savedHistory) {
      gameHistory = JSON.parse(savedHistory);
      updateHistoryTable();
    }
  } catch (error) {
    console.error('Error loading game state:', error);
  }
}

// Update balance display
function updateBalanceDisplay() {
  balanceElement.textContent = `${balance.toLocaleString()} ₫`;
  panelBalanceElement.textContent = `${balance.toLocaleString()} ₫`;
}

// Update bet buttons state
function updateBetButtons() {
  betTaiButton.classList.toggle('selected', currentBet === 'tài');
  betXiuButton.classList.toggle('selected', currentBet === 'xỉu');
  
  const canRoll = currentBet !== null && balance >= betAmount && !isRolling;
  rollDiceButton.disabled = !canRoll;
}

// Update quick bet buttons state
function updateQuickBetButtons() {
  quickBetButtons.forEach(button => {
    const amount = button.dataset.amount;
    let value = 0;
    
    if (amount === 'half') {
      value = Math.floor(balance / 2);
    } else if (amount === 'max') {
      value = balance;
    } else {
      value = parseInt(amount);
    }
    
    button.disabled = balance < value || isRolling;
  });
}

// Handle bet amount change
betAmountInput.addEventListener('input', (e) => {
  let value = parseInt(e.target.value);
  
  if (isNaN(value) || value <= 0) {
    value = 100;
  }
  
  if (value > balance) {
    value = balance;
    showToast('Insufficient balance', 'error');
  }
  
  betAmount = value;
  e.target.value = value;
  updateBetButtons();
});

// Handle quick bet buttons
quickBetButtons.forEach(button => {
  button.addEventListener('click', () => {
    if (isRolling) return;
    
    const amount = button.dataset.amount;
    let value = 0;
    
    if (amount === 'half') {
      value = Math.floor(balance / 2);
    } else if (amount === 'max') {
      value = balance;
    } else {
      value = parseInt(amount);
    }
    
    if (value > balance) {
      showToast('Insufficient balance', 'error');
      return;
    }
    
    betAmount = value;
    betAmountInput.value = value;
    updateBetButtons();
  });
});

// Handle bet option buttons
betTaiButton.addEventListener('click', () => {
  if (isRolling) return;
  
  if (betAmount <= 0) {
    showToast('Please enter a valid bet amount', 'error');
    return;
  }
  
  if (betAmount > balance) {
    showToast('Insufficient balance', 'error');
    return;
  }
  
  currentBet = 'tài';
  updateBetButtons();
  showToast(`You bet ${betAmount.toLocaleString()} on Tài (Big)`, 'info');
});

betXiuButton.addEventListener('click', () => {
  if (isRolling) return;
  
  if (betAmount <= 0) {
    showToast('Please enter a valid bet amount', 'error');
    return;
  }
  
  if (betAmount > balance) {
    showToast('Insufficient balance', 'error');
    return;
  }
  
  currentBet = 'xỉu';
  updateBetButtons();
  showToast(`You bet ${betAmount.toLocaleString()} on Xỉu (Small)`, 'info');
});

// Roll the dice
rollDiceButton.addEventListener('click', () => {
  if (isRolling || !currentBet) return;
  
  // Deduct bet amount from balance
  balance -= betAmount;
  updateBalanceDisplay();
  saveGameState();
  
  isRolling = true;
  gameResultElement.textContent = '';
  gameResultElement.className = 'game-result';
  
  // Disable buttons during roll
  updateBetButtons();
  updateQuickBetButtons();
  
  // Add rolling animation
  diceElements.forEach(dice => {
    dice.classList.add('rolling');
  });
  
  // Random dice values during animation
  const rollInterval = setInterval(() => {
    diceElements.forEach((dice, index) => {
      const randomFace = Math.floor(Math.random() * 6) + 1;
      rotateDice(dice, randomFace);
    });
  }, 100);
  
  // Stop rolling after 2 seconds and determine result
  setTimeout(() => {
    clearInterval(rollInterval);
    
    // Generate final dice values
    const finalDiceValues = [
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1
    ];
    
    // Display final dice
    diceElements.forEach((dice, index) => {
      dice.classList.remove('rolling');
      rotateDice(dice, finalDiceValues[index]);
    });
    
    const sum = finalDiceValues.reduce((acc, val) => acc + val, 0);
    const isTai = sum >= 11 && sum <= 18;
    const isXiu = sum >= 3 && sum <= 10;
    
    // Update dice total display
    const totalElement = diceTotalElement.querySelector('.total');
    const resultElement = diceTotalElement.querySelector('.result');
    
    totalElement.textContent = `Total: ${sum}`;
    resultElement.textContent = isTai ? 'Tài (Big)' : 'Xỉu (Small)';
    resultElement.className = `result ${isTai ? 'tai' : 'xiu'}`;
    
    let result = '';
    
    if ((currentBet === 'tài' && isTai) || (currentBet === 'xỉu' && isXiu)) {
      // Win: return bet amount + equal amount as profit
      balance += betAmount * 2;
      result = 'win';
      gameResultElement.textContent = 'You Won!';
      gameResultElement.className = 'game-result win';
      showToast(`Dice sum: ${sum}. You won ${betAmount.toLocaleString()} chips.`, 'success');
    } else {
      // Already deducted bet amount
      result = 'lose';
      gameResultElement.textContent = 'You Lost!';
      gameResultElement.className = 'game-result lose';
      showToast(`Dice sum: ${sum}. You lost ${betAmount.toLocaleString()} chips.`, 'error');
    }
    
    // Add to game history
    const historyItem = {
      id: Date.now(),
      diceValues: finalDiceValues,
      betType: currentBet,
      betAmount,
      result,
      totalSum: sum,
      timestamp: new Date()
    };
    
    gameHistory.unshift(historyItem);
    if (gameHistory.length > 10) {
      gameHistory.pop();
    }
    
    updateHistoryTable();
    updateBalanceDisplay();
    saveGameState();
    
    isRolling = false;
    currentBet = null;
    updateBetButtons();
    updateQuickBetButtons();
  }, 2000);
});

// Rotate dice to show specific face
function rotateDice(diceElement, faceValue) {
  switch (faceValue) {
    case 1:
      diceElement.style.transform = 'rotateX(0deg) rotateY(0deg)';
      break;
    case 2:
      diceElement.style.transform = 'rotateY(90deg)';
      break;
    case 3:
      diceElement.style.transform = 'rotateX(90deg)';
      break;
    case 4:
      diceElement.style.transform = 'rotateX(-90deg)';
      break;
    case 5:
      diceElement.style.transform = 'rotateY(-90deg)';
      break;
    case 6:
      diceElement.style.transform = 'rotateY(180deg)';
      break;
  }
}

// Update history table
function updateHistoryTable() {
  if (gameHistory.length === 0) {
    historyTableBody.innerHTML = `
      <tr class="no-history">
        <td colspan="4">No games played yet. Place your bets and roll the dice!</td>
      </tr>
    `;
    return;
  }
  
  historyTableBody.innerHTML = gameHistory.map(item => {
    const sum = item.diceValues.reduce((acc, val) => acc + val, 0);
    
    return `
      <tr>
        <td>${new Date(item.timestamp).toLocaleTimeString()}</td>
        <td>
          <div class="history-dice">
            ${item.diceValues.map(dice => `
              <span class="dice-value">${dice}</span>
            `).join('')}
            <span>(${sum})</span>
          </div>
        </td>
        <td>
          <span class="history-bet ${item.betType === 'tài' ? 'tai' : 'xiu'}">
            ${item.betType === 'tài' ? 'Tài' : 'Xỉu'} (${item.betAmount.toLocaleString()}₫)
          </span>
        </td>
        <td>
          <span class="history-result ${item.result}">
            ${item.result === 'win' ? 'Win' : 'Lose'}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

// Reset game
resetGameButton.addEventListener('click', () => {
  balance = INITIAL_BALANCE;
  betAmount = 100;
  currentBet = null;
  gameHistory = [];
  
  diceElements.forEach(dice => {
    rotateDice(dice, 1);
  });
  
  betAmountInput.value = betAmount;
  gameResultElement.textContent = '';
  gameResultElement.className = 'game-result';
  
  const totalElement = diceTotalElement.querySelector('.total');
  const resultElement = diceTotalElement.querySelector('.result');
  totalElement.textContent = 'Total: 3';
  resultElement.textContent = 'Xỉu (Small)';
  resultElement.className = 'result xiu';
  
  updateHistoryTable();
  updateBalanceDisplay();
  updateBetButtons();
  updateQuickBetButtons();
  
  localStorage.removeItem('taixiu_balance');
  localStorage.removeItem('taixiu_history');
  
  showToast('Your balance and game history have been reset', 'info');
});

// Show toast notification
function showToast(message, type = 'info') {
  toastElement.textContent = message;
  toastElement.className = `toast ${type}`;
  
  // Force reflow
  void toastElement.offsetWidth;
  
  toastElement.classList.add('show');
  
  setTimeout(() => {
    toastElement.classList.remove('show');
  }, 3000);
}

// Save game state to localStorage
function saveGameState() {
  try {
    localStorage.setItem('taixiu_balance', balance.toString());
    localStorage.setItem('taixiu_history', JSON.stringify(gameHistory));
  } catch (error) {
    console.error('Error saving game state:', error);
  }
}

// Initialize the game on load
document.addEventListener('DOMContentLoaded', () => {
  initGame();
  updateBalanceDisplay();
  updateBetButtons();
  updateQuickBetButtons();
});