const STORAGE_KEY = "padel-players";
const DUOS_STORAGE_KEY = "padel-duos";
const SESSION_STORAGE_KEY = "padel-session";

let editingPlayerId = null;
let sessionTimer = null;
let gameTimer = null;
let sessionStartTime = null;
let gameStartTime = null;
let currentSession = null;
let currentGame = null;
let rotationSelections = { goingOut: [], comingIn: [] };
let sessionTimerRunning = false;
let gameTimerRunning = false;

// Session Management
function getSession() {
  return JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY)) || null;
}

function saveSession(session) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function startNewSession() {
  const session = {
    id: Date.now().toString(),
    startTime: null,
    players: [],
    games: [],
    isActive: true,
    playingPlayers: [],
    waitingPlayers: [],
    playerStats: {} // Track games played per player for fair play
  };
  saveSession(session);
  currentSession = session;
  renderSessionPlayers();
  renderSessionStats();
  updateSessionInfo();
  populatePlayerDropdown();
}

function resetSession() {
  if (confirm("Are you sure you want to reset the session? This will clear all session data but keep all-time stats.")) {
    stopSessionTimer();
    stopGameTimer();
    currentSession = null;
    currentGame = null;
    localStorage.removeItem(SESSION_STORAGE_KEY);
    document.getElementById('game-time').textContent = '00:00';
    resetTimerButtons();
    renderSessionPlayers();
    renderSessionStats();
    updateSessionInfo();
    renderCurrentGame();
  }
}

function endSession() {
  if (currentSession) {
    currentSession.isActive = false;
    currentSession.endTime = Date.now();
    saveSession(currentSession);
    stopSessionTimer();
    stopGameTimer();
    currentSession = null;
    currentGame = null;
    resetTimerButtons();
    navigateTo('home');
  }
}

// Timer Functions
function startSessionTimer() {
  if (!sessionTimerRunning) {
    // If sessionStartTime is null, start from now. If not, resume from pause.
    if (!sessionStartTime) {
      sessionStartTime = Date.now();
      currentSession.startTime = sessionStartTime;
      currentSession.elapsedSessionTime = 0;
      saveSession(currentSession);
    } else if (currentSession.elapsedSessionTime) {
      // Resume: set sessionStartTime to now minus elapsed
      sessionStartTime = Date.now() - currentSession.elapsedSessionTime;
      currentSession.startTime = sessionStartTime;
      saveSession(currentSession);
    }
    sessionTimer = setInterval(updateSessionTimer, 1000);
    sessionTimerRunning = true;
    document.getElementById('session-start-btn').style.display = 'none';
    document.getElementById('session-pause-btn').style.display = 'inline-block';
  }
}

function pauseSessionTimer() {
  if (sessionTimerRunning) {
    stopSessionTimer();
    sessionTimerRunning = false;
    // Save elapsed time
    if (sessionStartTime) {
      const elapsed = Date.now() - sessionStartTime;
      currentSession.elapsedSessionTime = elapsed;
      saveSession(currentSession);
    }
    document.getElementById('session-start-btn').style.display = 'inline-block';
    document.getElementById('session-pause-btn').style.display = 'none';
  }
}

function resetSessionTimer() {
  stopSessionTimer();
  sessionStartTime = null;
  sessionTimerRunning = false;
  document.getElementById('session-time').textContent = '00:00:00';
  document.getElementById('session-start-btn').style.display = 'inline-block';
  document.getElementById('session-pause-btn').style.display = 'none';
  if (currentSession) {
    currentSession.startTime = null;
    currentSession.elapsedSessionTime = 0;
    saveSession(currentSession);
  }
}

function stopSessionTimer() {
  if (sessionTimer) {
    clearInterval(sessionTimer);
    sessionTimer = null;
  }
}

function updateSessionTimer() {
  let elapsed = 0;
  if (sessionStartTime) {
    elapsed = Date.now() - sessionStartTime;
  } else if (currentSession && currentSession.elapsedSessionTime) {
    elapsed = currentSession.elapsedSessionTime;
  }
  const hours = Math.floor(elapsed / 3600000);
  const minutes = Math.floor((elapsed % 3600000) / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);
  document.getElementById('session-time').textContent = 
    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function startGameTimer() {
  if (!gameTimerRunning) {
    // If gameStartTime is null, start from now. If not, resume from pause.
    if (!gameStartTime) {
      gameStartTime = Date.now();
      if (currentGame) currentGame.startTime = gameStartTime;
      if (currentGame) currentGame.elapsedGameTime = 0;
    } else if (currentGame && currentGame.elapsedGameTime) {
      // Resume: set gameStartTime to now minus elapsed
      gameStartTime = Date.now() - currentGame.elapsedGameTime;
      if (currentGame) currentGame.startTime = gameStartTime;
    }
    gameTimer = setInterval(updateGameTimer, 1000);
    gameTimerRunning = true;
    document.getElementById('game-start-btn').style.display = 'none';
    document.getElementById('game-pause-btn').style.display = 'inline-block';
  }
}

function pauseGameTimer() {
  if (gameTimerRunning) {
    stopGameTimer();
    gameTimerRunning = false;
    // Save elapsed time
    if (gameStartTime && currentGame) {
      const elapsed = Date.now() - gameStartTime;
      currentGame.elapsedGameTime = elapsed;
    }
    document.getElementById('game-start-btn').style.display = 'inline-block';
    document.getElementById('game-pause-btn').style.display = 'none';
  }
}

function resetGameTimer() {
  stopGameTimer();
  gameStartTime = null;
  gameTimerRunning = false;
  document.getElementById('game-time').textContent = '00:00';
  document.getElementById('game-start-btn').style.display = 'inline-block';
  document.getElementById('game-pause-btn').style.display = 'none';
  if (currentGame) {
    currentGame.startTime = null;
    currentGame.elapsedGameTime = 0;
  }
}

function stopGameTimer() {
  if (gameTimer) {
    clearInterval(gameTimer);
    gameTimer = null;
  }
}

function updateGameTimer() {
  let elapsed = 0;
  if (gameStartTime) {
    elapsed = Date.now() - gameStartTime;
  } else if (currentGame && currentGame.elapsedGameTime) {
    elapsed = currentGame.elapsedGameTime;
  }
  const minutes = Math.floor(elapsed / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);
  document.getElementById('game-time').textContent = 
    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function resetTimerButtons() {
  document.getElementById('session-start-btn').style.display = 'inline-block';
  document.getElementById('session-pause-btn').style.display = 'none';
  document.getElementById('game-start-btn').style.display = 'inline-block';
  document.getElementById('game-pause-btn').style.display = 'none';
}

// Player Management
function getPlayers() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

function savePlayers(players) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
}

function populatePlayerDropdown() {
  const dropdown = document.getElementById('player-select');
  const allPlayers = getPlayers();
  const sessionPlayerIds = currentSession ? currentSession.players.map(p => p.id) : [];
  
  // Clear existing options except the first one
  dropdown.innerHTML = '<option value="">Select a player to add...</option>';
  
  // Add players not in session
  allPlayers.forEach(player => {
    if (!sessionPlayerIds.includes(player.id)) {
      const option = document.createElement('option');
      option.value = player.id;
      option.textContent = player.name;
      dropdown.appendChild(option);
    }
  });
}

function addPlayerToSession() {
  const dropdown = document.getElementById("player-select");
  const playerId = dropdown.value;
  if (!playerId) return;

  const allPlayers = getPlayers();
  const player = allPlayers.find(p => p.id === playerId);
  if (!player) return;

  // Add to session
  const sessionPlayer = {
    id: player.id,
    name: player.name,
    sessionGames: 0,
    sessionWins: 0,
    totalGames: player.games || 0,
    totalWins: player.wins || 0
  };
  currentSession.players.push(sessionPlayer);
  
  // Initialize player stats for fair play
  if (!currentSession.playerStats[player.id]) {
    currentSession.playerStats[player.id] = {
      gamesPlayed: 0,
      gamesWon: 0,
      lastGameTime: null
    };
  }

  // Always add to waitingPlayers
  currentSession.waitingPlayers.push(sessionPlayer.id);

  saveSession(currentSession);
  dropdown.value = "";
  populatePlayerDropdown();
  renderSessionPlayers();
  renderSessionStats();
  updateSessionInfo();
}

// Move player from waiting to playing (if <4 in playing)
function movePlayerToPlaying(playerId) {
  if (!currentSession) return;
  if (currentSession.playingPlayers.length >= 4) return;
  // Remove from waiting
  currentSession.waitingPlayers = currentSession.waitingPlayers.filter(id => id !== playerId);
  // Add to playing
  currentSession.playingPlayers.push(playerId);
  saveSession(currentSession);
  renderSessionPlayers();
}

// Move player from playing to waiting
function movePlayerToWaiting(playerId) {
  if (!currentSession) return;
  // Remove from playing
  currentSession.playingPlayers = currentSession.playingPlayers.filter(id => id !== playerId);
  // Add to waiting
  currentSession.waitingPlayers.push(playerId);
  saveSession(currentSession);
  renderSessionPlayers();
}

function renderSessionPlayers() {
  const playingContainer = document.getElementById("playing-players");
  const waitingContainer = document.getElementById("waiting-players");
  
  playingContainer.innerHTML = "";
  waitingContainer.innerHTML = "";
  
  if (!currentSession || currentSession.players.length === 0) {
    playingContainer.innerHTML = "<p>No players in session. Add some players to get started.</p>";
    return;
  }

  // Render playing players (max 4)
  currentSession.playingPlayers.forEach((playerId, index) => {
    const player = currentSession.players.find(p => p.id === playerId);
    if (player) {
      const div = document.createElement("div");
      div.className = "player-card playing";
      div.innerHTML = `
        <div class="player-name">${player.name}</div>
        <div class="player-stats">Session: ${player.sessionWins || 0}W/${player.sessionGames || 0}G</div>
        <button onclick="movePlayerToWaiting('${player.id}')" class="secondary-btn" style="margin-top:0.5rem;">Move to Waiting</button>
      `;
      playingContainer.appendChild(div);
    }
  });

  // Render waiting players
  currentSession.waitingPlayers.forEach((playerId) => {
    const player = currentSession.players.find(p => p.id === playerId);
    if (player) {
      const div = document.createElement("div");
      div.className = "player-card waiting";
      div.innerHTML = `
        <div class="player-name">${player.name}</div>
        <div class="player-stats">Session: ${player.sessionWins || 0}W/${player.sessionGames || 0}G</div>
        <button onclick="movePlayerToPlaying('${player.id}')" class="primary-btn" style="margin-top:0.5rem;" ${currentSession.playingPlayers.length >= 4 ? 'disabled' : ''}>Move to Playing</button>
      `;
      waitingContainer.appendChild(div);
    }
  });
}

function selectPlayerForRotation(playerId, status) {
  const player = currentSession.players.find(p => p.id === playerId);
  if (!player) return;

  // Toggle selection
  const isSelected = rotationSelections.goingOut.includes(playerId) || 
                    rotationSelections.comingIn.includes(playerId);
  
  if (isSelected) {
    // Remove from selections
    rotationSelections.goingOut = rotationSelections.goingOut.filter(id => id !== playerId);
    rotationSelections.comingIn = rotationSelections.comingIn.filter(id => id !== playerId);
  } else {
    // Add to appropriate selection based on current status
    if (status === 'playing' && rotationSelections.goingOut.length < 2) {
      rotationSelections.goingOut.push(playerId);
    } else if (status === 'waiting' && rotationSelections.comingIn.length < 2) {
      rotationSelections.comingIn.push(playerId);
    }
  }
  
  renderRotationModal();
}

// Enhanced Fair Play Logic with Detailed Scenarios
function getFairPlayRotation() {
  if (!currentSession || currentSession.players.length <= 4) return null;
  
  const playingPlayers = currentSession.playingPlayers;
  const waitingPlayers = currentSession.waitingPlayers;
  const totalPlayers = currentSession.players.length;
  
  console.log('Fair play rotation check:', {
    totalPlayers,
    playingPlayers: playingPlayers.map(id => currentSession.players.find(p => p.id === id)?.name),
    waitingPlayers: waitingPlayers.map(id => currentSession.players.find(p => p.id === id)?.name)
  });

  // Get the last game result to determine winners/losers
  const lastGame = currentSession.games[currentSession.games.length - 1];
  if (!lastGame) {
    console.log('No previous game found, using simple rotation');
    return getSimpleRotation();
  }

  const winningTeam = lastGame.winner === 1 ? lastGame.team1 : lastGame.team2;
  const losingTeam = lastGame.winner === 1 ? lastGame.team2 : lastGame.team1;

  console.log('Last game result:', {
    winningTeam: winningTeam.map(id => currentSession.players.find(p => p.id === id)?.name),
    losingTeam: losingTeam.map(id => currentSession.players.find(p => p.id === id)?.name)
  });

  // Scenario 1: 1 Player Waiting (5 Players Total)
  if (totalPlayers === 5) {
    return getScenario1Rotation(losingTeam, waitingPlayers);
  }
  
  // Scenario 2: 2 Players Waiting (6 Players Total)
  if (totalPlayers === 6) {
    return getScenario2Rotation(losingTeam, waitingPlayers);
  }
  
  // Scenario 3: 3 Players Waiting (7 Players Total)
  if (totalPlayers === 7) {
    return getScenario3Rotation(losingTeam, waitingPlayers, winningTeam);
  }
  
  // Scenario 4: 4+ Players Waiting (8+ Players Total)
  if (totalPlayers >= 8) {
    return getScenario4Rotation(losingTeam, waitingPlayers);
  }

  return getSimpleRotation();
}

function getScenario1Rotation(losingTeam, waitingPlayers) {
  // One player from losing team goes out, one waiting player comes in
  const goingOut = [getPlayerToSubOut(losingTeam)];
  const comingIn = waitingPlayers.slice(0, 1);
  
  console.log('Scenario 1 (5 players):', {
    goingOut: goingOut.map(id => currentSession.players.find(p => p.id === id)?.name),
    comingIn: comingIn.map(id => currentSession.players.find(p => p.id === id)?.name)
  });
  
  return { goingOut, comingIn };
}

function getScenario2Rotation(losingTeam, waitingPlayers) {
  // Entire losing team goes out, all waiting players come in
  const goingOut = [...losingTeam];
  const comingIn = [...waitingPlayers];
  
  console.log('Scenario 2 (6 players):', {
    goingOut: goingOut.map(id => currentSession.players.find(p => p.id === id)?.name),
    comingIn: comingIn.map(id => currentSession.players.find(p => p.id === id)?.name)
  });
  
  return { goingOut, comingIn };
}

function getScenario3Rotation(losingTeam, waitingPlayers, winningTeam) {
  // Losing team goes out, all 3 waiting players come in, 1 winner goes out
  const goingOut = [...losingTeam, getPlayerToSubOut(winningTeam)];
  const comingIn = [...waitingPlayers];
  
  console.log('Scenario 3 (7 players):', {
    goingOut: goingOut.map(id => currentSession.players.find(p => p.id === id)?.name),
    comingIn: comingIn.map(id => currentSession.players.find(p => p.id === id)?.name)
  });
  
  return { goingOut, comingIn };
}

function getScenario4Rotation(losingTeam, waitingPlayers) {
  // Losing team goes out, next 2 in queue come in (FIFO)
  const goingOut = [...losingTeam];
  const comingIn = waitingPlayers.slice(0, 2);
  
  console.log('Scenario 4 (8+ players):', {
    goingOut: goingOut.map(id => currentSession.players.find(p => p.id === id)?.name),
    comingIn: comingIn.map(id => currentSession.players.find(p => p.id === id)?.name)
  });
  
  return { goingOut, comingIn };
}

function getSimpleRotation() {
  // Fallback: simple rotation based on games played
  const playingPlayers = currentSession.playingPlayers;
  const waitingPlayers = currentSession.waitingPlayers;
  
  // Sort by games played (most first for going out, least first for coming in)
  const playerGameCounts = {};
  currentSession.players.forEach(player => {
    playerGameCounts[player.id] = currentSession.playerStats[player.id]?.gamesPlayed || 0;
  });
  
  const sortedPlaying = playingPlayers.sort((a, b) => playerGameCounts[b] - playerGameCounts[a]);
  const sortedWaiting = waitingPlayers.sort((a, b) => playerGameCounts[a] - playerGameCounts[b]);
  
  const goingOut = sortedPlaying.slice(0, 2);
  const comingIn = sortedWaiting.slice(0, 2);
  
  return { goingOut, comingIn };
}

function getPlayerToSubOut(team) {
  // Prefer removing player with most consecutive games or highest total games
  const playerStats = team.map(playerId => {
    const stats = currentSession.playerStats[playerId] || { gamesPlayed: 0, consecutiveGames: 0, lastPlayedTime: 0 };
    return {
      id: playerId,
      name: currentSession.players.find(p => p.id === playerId)?.name,
      gamesPlayed: stats.gamesPlayed,
      consecutiveGames: stats.consecutiveGames || 0,
      lastPlayedTime: stats.lastPlayedTime || 0
    };
  });
  
  console.log('Player stats for sub-out selection:', playerStats);
  
  // Sort by consecutive games (descending), then by total games (descending)
  playerStats.sort((a, b) => {
    if (b.consecutiveGames !== a.consecutiveGames) {
      return b.consecutiveGames - a.consecutiveGames;
    }
    return b.gamesPlayed - a.gamesPlayed;
  });
  
  console.log('Sorted player stats:', playerStats);
  
  // If equal, random choice
  if (playerStats.length > 1 && 
      playerStats[0].consecutiveGames === playerStats[1].consecutiveGames &&
      playerStats[0].gamesPlayed === playerStats[1].gamesPlayed) {
    const randomIndex = Math.floor(Math.random() * 2);
    console.log('Random selection between equal players:', {
      player1: playerStats[0].name,
      player2: playerStats[1].name,
      selectedIndex: randomIndex,
      selectedPlayer: playerStats[randomIndex].name
    });
    return playerStats[randomIndex].id;
  }
  
  const selectedPlayer = playerStats[0];
  console.log('Selected player to sub out:', selectedPlayer.name, 'with stats:', {
    consecutiveGames: selectedPlayer.consecutiveGames,
    gamesPlayed: selectedPlayer.gamesPlayed
  });
  
  return selectedPlayer.id;
}

// Update player stats to track consecutive games
function updatePlayerStatsAfterGame(winningTeam, losingTeam) {
  const allGamePlayers = [...winningTeam, ...losingTeam];
  
  // Reset consecutive games for players not in this game
  currentSession.players.forEach(player => {
    if (!allGamePlayers.includes(player.id)) {
      if (!currentSession.playerStats[player.id]) {
        currentSession.playerStats[player.id] = { gamesPlayed: 0, gamesWon: 0, consecutiveGames: 0, lastPlayedTime: null };
      }
      currentSession.playerStats[player.id].consecutiveGames = 0;
    }
  });
  
  // Update stats for players in this game
  allGamePlayers.forEach(playerId => {
    if (!currentSession.playerStats[playerId]) {
      currentSession.playerStats[playerId] = { gamesPlayed: 0, gamesWon: 0, consecutiveGames: 0, lastPlayedTime: null };
    }
    
    const stats = currentSession.playerStats[playerId];
    stats.gamesPlayed++;
    stats.consecutiveGames++;
    stats.lastPlayedTime = Date.now();
    
    if (winningTeam.includes(playerId)) {
      stats.gamesWon++;
    }
  });
}

// Game Management
function makeRandomTeams() {
  if (!currentSession || currentSession.playingPlayers.length < 2) {
    alert("Need at least 2 players to make teams.");
    return;
  }

  const shuffled = [...currentSession.playingPlayers].sort(() => Math.random() - 0.5);
  const team1 = shuffled.slice(0, Math.ceil(shuffled.length / 2));
  const team2 = shuffled.slice(Math.ceil(shuffled.length / 2));

  currentGame = {
    id: Date.now().toString(),
    players: shuffled,
    startTime: Date.now(),
    team1: team1,
    team2: team2
  };

  // Reset scores for new game
  resetGameScores();

  renderCurrentGame();
  startGameTimer();
}

function renderCurrentGame() {
  if (!currentGame) {
    document.getElementById('team1-players').innerHTML = '<p>No active game</p>';
    document.getElementById('team2-players').innerHTML = '<p>No active game</p>';
    return;
  }

  const team1Container = document.getElementById('team1-players');
  const team2Container = document.getElementById('team2-players');
  
  team1Container.innerHTML = currentGame.team1.map(playerId => {
    const player = currentSession.players.find(p => p.id === playerId);
    return `<div class="team-player">${player.name}</div>`;
  }).join('');
  
  team2Container.innerHTML = currentGame.team2.map(playerId => {
    const player = currentSession.players.find(p => p.id === playerId);
    return `<div class="team-player">${player.name}</div>`;
  }).join('');
}

function endGame() {
  if (!currentGame) {
    alert("No active game to end.");
    return;
  }

  const team1Names = currentGame.team1.map(id => 
    currentSession.players.find(p => p.id === id).name
  ).join(' & ');
  
  const team2Names = currentGame.team2.map(id => 
    currentSession.players.find(p => p.id === id).name
  ).join(' & ');

  document.getElementById('team1-display').textContent = team1Names;
  document.getElementById('team2-display').textContent = team2Names;
  
  // Pre-fill the scores from the scoring system
  document.getElementById('team1-score').value = currentGameScores.team1;
  document.getElementById('team2-score').value = currentGameScores.team2;
  
  document.getElementById('game-result-modal').classList.remove('hidden');
}

function saveGameResult() {
  const team1Score = parseInt(document.getElementById('team1-score').value) || 0;
  const team2Score = parseInt(document.getElementById('team2-score').value) || 0;
  
  if (team1Score === 0 && team2Score === 0) {
    alert("Please enter scores for both teams.");
    return;
  }

  const winner = team1Score > team2Score ? 1 : 2;
  const winningTeam = winner === 1 ? currentGame.team1 : currentGame.team2;
  const losingTeam = winner === 1 ? currentGame.team2 : currentGame.team1;

  // Update session game
  const gameResult = {
    ...currentGame,
    endTime: Date.now(),
    team1Score,
    team2Score,
    winner,
    duration: currentGame.startTime ? Date.now() - currentGame.startTime : 0
  };

  currentSession.games.push(gameResult);

  // Update session player stats with enhanced tracking
  updatePlayerStatsAfterGame(winningTeam, losingTeam);

  // Update session player stats (legacy)
  currentSession.players.forEach(player => {
    if (currentGame.players.includes(player.id)) {
      player.sessionGames++;
      if (winningTeam.includes(player.id)) {
        player.sessionWins++;
      }
    }
  });

  // Update all-time player stats
  let allPlayers = getPlayers();
  allPlayers = allPlayers.map(player => {
    if (currentGame.players.includes(player.id)) {
      player.games = (player.games || 0) + 1;
      if (winningTeam.includes(player.id)) {
        player.wins = (player.wins || 0) + 1;
      }
    }
    return player;
  });
  savePlayers(allPlayers);

  // Update duos
  updateDuosStats(currentGame.team1, currentGame.team2, winningTeam);

  saveSession(currentSession);
  closeGameResultModal();
  
  // Reset game
  currentGame = null;
  stopGameTimer();
  resetGameTimer();
  resetGameScores();
  
  renderCurrentGame();
  renderSessionStats();
  updateSessionInfo();
  
  // Suggest fair play rotation if more than 4 players
  if (currentSession.players.length > 4) {
    const fairRotation = getFairPlayRotation();
    if (fairRotation) {
      showFairPlayModal(fairRotation);
      return; // Wait for user action
    }
  }
  
  alert("Game result saved!");
}

// Show fair play modal with scenario-specific messaging
function showFairPlayModal(fairRotation) {
  const modal = document.getElementById('fairplay-modal');
  const suggestionDiv = document.getElementById('fairplay-suggestion');
  
  const totalPlayers = currentSession.players.length;
  const goingOutNames = fairRotation.goingOut.map(id => currentSession.players.find(p => p.id === id).name).join(', ');
  const comingInNames = fairRotation.comingIn.map(id => currentSession.players.find(p => p.id === id).name).join(', ');
  
  let scenarioMessage = '';
  if (totalPlayers === 5) {
    scenarioMessage = 'Scenario 1: One player from losing team rotates out, one waiting player comes in.';
  } else if (totalPlayers === 6) {
    scenarioMessage = 'Scenario 2: Entire losing team rotates out, all waiting players come in.';
  } else if (totalPlayers === 7) {
    scenarioMessage = 'Scenario 3: Losing team out, all waiting players in, one winner rotates out.';
  } else if (totalPlayers >= 8) {
    scenarioMessage = 'Scenario 4: Losing team out, next 2 in queue come in (FIFO rotation).';
  }
  
  suggestionDiv.innerHTML = `
    <div style="margin-bottom: 1rem; padding: 0.5rem; background: #f8f9fa; border-radius: 8px;">
      <small><strong>${scenarioMessage}</strong></small>
    </div>
    <p><strong>Going out:</strong> ${goingOutNames}</p>
    <p><strong>Coming in:</strong> ${comingInNames}</p>
    <p>You can apply this suggestion or customize manually.</p>
  `;
  
  // Store for apply
  window._fairRotation = fairRotation;
  modal.classList.remove('hidden');
}

function applyFairPlayRotation() {
  const fairRotation = window._fairRotation;
  if (fairRotation) {
    applyRotation(fairRotation.goingOut, fairRotation.comingIn);
  }
  closeFairPlayModal();
  alert("Game result saved!");
}

function closeFairPlayModal() {
  document.getElementById('fairplay-modal').classList.add('hidden');
  window._fairRotation = null;
}

function applyRotation(goingOut, comingIn) {
  console.log('Applying rotation:', { goingOut, comingIn });
  // Remove goingOut from playingPlayers
  currentSession.playingPlayers = currentSession.playingPlayers.filter(
    id => !goingOut.includes(id)
  );
  // Add comingIn to playingPlayers
  currentSession.playingPlayers.push(...comingIn);

  // Remove comingIn from waitingPlayers
  currentSession.waitingPlayers = currentSession.waitingPlayers.filter(
    id => !comingIn.includes(id)
  );
  // Add goingOut to waitingPlayers
  currentSession.waitingPlayers.push(...goingOut);

  saveSession(currentSession);
  renderSessionPlayers();
  renderCurrentGame();
  renderSessionStats();
  updateSessionInfo();
  console.log('After rotation:', {
    playingPlayers: currentSession.playingPlayers.map(id => currentSession.players.find(p => p.id === id)?.name),
    waitingPlayers: currentSession.waitingPlayers.map(id => currentSession.players.find(p => p.id === id)?.name)
  });
}

function showManualRotationModal() {
  closeFairPlayModal();
  if (!currentSession) return;
  const modal = document.getElementById('rotation-modal');
  // Do not reset selections if already present
  if (!rotationSelections.goingOut.length && !rotationSelections.comingIn.length) {
    rotationSelections.goingOut = [];
    rotationSelections.comingIn = [];
  }
  // Render going out (from currently playing)
  const goingOutDiv = document.getElementById('going-out-players');
  goingOutDiv.innerHTML = '';
  currentSession.playingPlayers.forEach(id => {
    const player = currentSession.players.find(p => p.id === id);
    if (!player) return;
    const div = document.createElement('div');
    div.className = 'rotation-player';
    div.textContent = player.name;
    div.onclick = function() {
      // Toggle selection
      if (rotationSelections.goingOut.includes(id)) {
        rotationSelections.goingOut = rotationSelections.goingOut.filter(pid => pid !== id);
      } else if (rotationSelections.goingOut.length < 2) {
        rotationSelections.goingOut.push(id);
      }
      renderManualRotationSelections();
    };
    if (rotationSelections.goingOut.includes(id)) div.classList.add('selected');
    goingOutDiv.appendChild(div);
  });
  // Render coming in (from waiting)
  const comingInDiv = document.getElementById('coming-in-players');
  comingInDiv.innerHTML = '';
  currentSession.waitingPlayers.forEach(id => {
    const player = currentSession.players.find(p => p.id === id);
    if (!player) return;
    const div = document.createElement('div');
    div.className = 'rotation-player';
    div.textContent = player.name;
    div.onclick = function() {
      // Toggle selection
      if (rotationSelections.comingIn.includes(id)) {
        rotationSelections.comingIn = rotationSelections.comingIn.filter(pid => pid !== id);
      } else if (rotationSelections.comingIn.length < 2) {
        rotationSelections.comingIn.push(id);
      }
      renderManualRotationSelections();
    };
    if (rotationSelections.comingIn.includes(id)) div.classList.add('selected');
    comingInDiv.appendChild(div);
  });
  renderManualRotationSelections();
  modal.classList.remove('hidden');
}

function renderManualRotationSelections() {
  // Highlight selected players (already handled in showManualRotationModal)
  // Enable/disable confirm button
  const confirmBtn = document.querySelector('#rotation-modal .primary-btn');
  if (confirmBtn) {
    confirmBtn.disabled = !(rotationSelections.goingOut.length === 2 && rotationSelections.comingIn.length === 2);
  }
}

function confirmRotation() {
  if (rotationSelections.goingOut.length !== 2 || rotationSelections.comingIn.length !== 2) {
    alert('Select 2 going out and 2 coming in.');
    return;
  }
  applyRotation(rotationSelections.goingOut, rotationSelections.comingIn);
  closeRotationModal();
  alert('Rotation applied!');
}

function closeRotationModal() {
  document.getElementById('rotation-modal').classList.add('hidden');
  rotationSelections.goingOut = [];
  rotationSelections.comingIn = [];
}

function closeGameResultModal() {
  document.getElementById('game-result-modal').classList.add('hidden');
  document.getElementById('team1-score').value = '';
  document.getElementById('team2-score').value = '';
}

function updateSessionInfo() {
  if (currentSession) {
    document.getElementById('session-games').textContent = currentSession.games.length;
    document.getElementById('session-players-count').textContent = currentSession.players.length;
  }
}

function renderSessionStats() {
  const container = document.getElementById("session-stats");
  container.innerHTML = "";
  
  if (!currentSession || currentSession.players.length === 0) {
    container.innerHTML = "<p>No session statistics available.</p>";
    return;
  }

  // Only show current session statistics
  const sessionLeaderboard = currentSession.players
    .sort((a, b) => (b.sessionWins || 0) - (a.sessionWins || 0))
    .slice(0, 5);

  sessionLeaderboard.forEach((player, index) => {
    const div = document.createElement("div");
    div.className = "stat-card";
    const winRate = player.sessionGames > 0 ? Math.round((player.sessionWins / player.sessionGames) * 100) : 0;
    const gamesPlayed = currentSession.playerStats[player.id]?.gamesPlayed || 0;
    div.innerHTML = `
      <h4>#${index + 1} ${player.name}</h4>
      <div class="stat-value">${player.sessionWins || 0}W / ${player.sessionGames || 0}G (${winRate}%)</div>
      <small>Games played this session: ${gamesPlayed}</small>
    `;
    container.appendChild(div);
  });
}

// All-time functions
function getDuos() {
  return JSON.parse(localStorage.getItem(DUOS_STORAGE_KEY)) || [];
}

function saveDuos(duos) {
  localStorage.setItem(DUOS_STORAGE_KEY, JSON.stringify(duos));
}

function deletePlayer(playerId) {
  if (!confirm("Are you sure you want to delete this player?")) return;
  
  let players = getPlayers();
  players = players.filter(p => p.id !== playerId);
  savePlayers(players);
  
  // Also remove from current session if exists
  if (currentSession) {
    currentSession.players = currentSession.players.filter(p => p.id !== playerId);
    currentSession.playingPlayers = currentSession.playingPlayers.filter(id => id !== playerId);
    currentSession.waitingPlayers = currentSession.waitingPlayers.filter(id => id !== playerId);
    delete currentSession.playerStats[playerId];
    saveSession(currentSession);
  }
  
  renderPlayerList();
  renderLeaderboard();
  renderDuosTable();
  if (currentSession) {
    renderSessionPlayers();
    renderSessionStats();
    updateSessionInfo();
    populatePlayerDropdown();
  }
}

function editPlayer(playerId) {
  const players = getPlayers();
  const player = players.find(p => p.id === playerId);
  if (!player) return;
  
  editingPlayerId = playerId;
  document.getElementById("edit-player-name").value = player.name;
  document.getElementById("edit-player-wins").value = player.wins || 0;
  document.getElementById("edit-player-games").value = player.games || 0;
  document.getElementById("edit-modal").classList.remove("hidden");
}

function savePlayerEdit() {
  const nameInput = document.getElementById("edit-player-name");
  const winsInput = document.getElementById("edit-player-wins");
  const gamesInput = document.getElementById("edit-player-games");
  
  const name = nameInput.value.trim();
  const wins = parseInt(winsInput.value) || 0;
  const games = parseInt(gamesInput.value) || 0;
  
  if (!name) {
    alert("Player name cannot be empty.");
    return;
  }
  
  if (wins > games) {
    alert("Wins cannot be greater than total games.");
    return;
  }
  
  let players = getPlayers();
  const existingPlayer = players.find(p => 
    p.id !== editingPlayerId && 
    p.name.toLowerCase() === name.toLowerCase()
  );
  
  if (existingPlayer) {
    alert("A player with this name already exists.");
    return;
  }
  
  players = players.map(p => 
    p.id === editingPlayerId ? { ...p, name, wins, games } : p
  );
  
  savePlayers(players);
  
  // Update session player name if exists
  if (currentSession) {
    currentSession.players = currentSession.players.map(p => 
      p.id === editingPlayerId ? { ...p, name } : p
    );
    saveSession(currentSession);
  }
  
  closeEditModal();
  renderPlayerList();
  renderLeaderboard();
  renderDuosTable();
  if (currentSession) {
    renderSessionPlayers();
    renderSessionStats();
    populatePlayerDropdown();
  }
}

function closeEditModal() {
  document.getElementById("edit-modal").classList.add("hidden");
  editingPlayerId = null;
  document.getElementById("edit-player-name").value = "";
  document.getElementById("edit-player-wins").value = "";
  document.getElementById("edit-player-games").value = "";
}

function renderPlayerList() {
  const container = document.getElementById("player-list");
  container.innerHTML = "";
  const players = getPlayers();
  
  if (players.length === 0) {
    container.innerHTML = "<p>No players yet. Add some to get started.</p>";
    return;
  }
  
  players.forEach((player) => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <div class="card-actions">
        <button onclick="editPlayer('${player.id}')" class="action-btn edit-btn">✏️</button>
        <button onclick="deletePlayer('${player.id}')" class="action-btn delete-btn">🗑️</button>
      </div>
      <strong>${player.name}</strong><br>
      All-Time: ${player.games || 0}G / ${player.wins || 0}W<br>
      Win Rate: ${player.games > 0 ? Math.round((player.wins / player.games) * 100) : 0}%
    `;
    container.appendChild(div);
  });
}

function renderLeaderboard() {
  const container = document.getElementById("leaderboard-list");
  container.innerHTML = "";
  const players = getPlayers().sort((a, b) => (b.wins || 0) - (a.wins || 0));
  
  if (players.length === 0) {
    container.innerHTML = "<p>No players yet.</p>";
    return;
  }
  
  players.forEach((player, index) => {
    const div = document.createElement("div");
    div.className = `card rank-${index + 1}`;
    const winRate = player.games > 0 ? Math.round((player.wins / player.games) * 100) : 0;
    div.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <span style="font-size: 1.2rem; font-weight: bold; color: var(--primary-color);">#${index + 1}</span>
        <div>
          <strong>${player.name}</strong><br>
          ${player.wins || 0}W / ${player.games || 0}G (${winRate}%)
        </div>
      </div>
    `;
    container.appendChild(div);
  });
}

function updateDuosStats(team1, team2, winningTeam) {
  let duos = getDuos();
  
  // Update team 1 duo stats
  const team1Key = team1.sort().join('-');
  let team1Duo = duos.find(d => d.players.join('-') === team1Key);
  if (!team1Duo) {
    team1Duo = { players: team1, games: 0, wins: 0 };
    duos.push(team1Duo);
  }
  team1Duo.games++;
  if (winningTeam.includes(team1[0]) && winningTeam.includes(team1[1])) {
    team1Duo.wins++;
  }
  
  // Update team 2 duo stats
  const team2Key = team2.sort().join('-');
  let team2Duo = duos.find(d => d.players.join('-') === team2Key);
  if (!team2Duo) {
    team2Duo = { players: team2, games: 0, wins: 0 };
    duos.push(team2Duo);
  }
  team2Duo.games++;
  if (winningTeam.includes(team2[0]) && winningTeam.includes(team2[1])) {
    team2Duo.wins++;
  }
  
  saveDuos(duos);
}

function renderDuosTable() {
  const container = document.getElementById("duos-table");
  container.innerHTML = "";
  const duos = getDuos();
  const players = getPlayers();
  
  if (duos.length === 0) {
    container.innerHTML = "<p>No duo statistics yet. Play some games to see the best duos!</p>";
    return;
  }
  
  const sortedDuos = duos
    .map(duo => {
      const playerNames = duo.players.map(id => 
        players.find(p => p.id === id)?.name || 'Unknown'
      );
      const winRate = duo.games > 0 ? (duo.wins / duo.games) * 100 : 0;
      return { ...duo, playerNames, winRate };
    })
    .sort((a, b) => {
      if (Math.abs(a.winRate - b.winRate) < 0.1) {
        return b.wins - a.wins;
      }
      return b.winRate - a.winRate;
    });
  
  const table = document.createElement("table");
  table.className = "duos-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>Rank</th>
        <th>Duo</th>
        <th>Wins</th>
        <th>Games</th>
        <th>Win Rate</th>
      </tr>
    </thead>
    <tbody>
      ${sortedDuos.map((duo, index) => `
        <tr>
          <td><strong>#${index + 1}</strong></td>
          <td><strong>${duo.playerNames.join(' & ')}</strong></td>
          <td class="wins-cell">${duo.wins}</td>
          <td>${duo.games}</td>
          <td class="wins-cell">${Math.round(duo.winRate)}%</td>
        </tr>
      `).join('')}
    </tbody>
  `;
  
  container.appendChild(table);
}

function navigateTo(sectionId) {
  document.querySelectorAll("main section").forEach((s) => s.classList.add("hidden"));
  document.getElementById(sectionId).classList.remove("hidden");
  
  // Update navigation tabs
  document.querySelectorAll(".nav-tab").forEach(btn => btn.classList.remove("active"));
  document.getElementById(`nav-${sectionId}`).classList.add("active");
  
  if (sectionId === "session") {
    if (!currentSession) {
      startNewSession();
    }
    renderSessionPlayers();
    renderSessionStats();
    renderCurrentGame();
    updateSessionInfo();
    populatePlayerDropdown();
  }
  if (sectionId === "home") {
    renderPlayerList();
    renderLeaderboard();
    renderDuosTable();
  }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
  renderPlayerList();
  renderLeaderboard();
  renderDuosTable();
  
  // Load existing session if any
  currentSession = getSession();
  if (currentSession && currentSession.isActive) {
    renderSessionPlayers();
    renderSessionStats();
    updateSessionInfo();
    populatePlayerDropdown();
    renderCurrentGame();
  }
  
  // Add event listener for Enter key on player name input
  document.getElementById('player-name').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      addPlayer();
    }
  });
  
  document.getElementById("edit-player-name").addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
      savePlayerEdit();
    }
  });
  
  document.getElementById("team1-score").addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
      saveGameResult();
    }
  });
  
  document.getElementById("team2-score").addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
      saveGameResult();
    }
  });
});

function addPlayer() {
  const nameInput = document.getElementById("player-name");
  const name = nameInput.value.trim();
  
  if (!name) {
    alert("Please enter a player name.");
    return;
  }
  
  const players = getPlayers();
  const existingPlayer = players.find(p => p.name.toLowerCase() === name.toLowerCase());
  
  if (existingPlayer) {
    alert("A player with this name already exists.");
    return;
  }
  
  const newPlayer = {
    id: Date.now().toString(),
    name: name,
    wins: 0,
    games: 0
  };
  
  players.push(newPlayer);
  savePlayers(players);
  nameInput.value = "";
  renderPlayerList();
  renderLeaderboard();
  populatePlayerDropdown();
}

// Team Assignment Modal Logic
function showTeamAssignmentModal() {
  if (!currentSession || currentSession.playingPlayers.length !== 4) {
    alert('You need exactly 4 players in "Currently Playing" to assign teams.');
    return;
  }
  const modal = document.getElementById('team-assignment-modal');
  const form = document.getElementById('team-assignment-form');
  form.innerHTML = '';

  // Get player objects
  const players = currentSession.playingPlayers.map(id => currentSession.players.find(p => p.id === id));

  // Try to prefill from currentGame if available
  let team1 = [], team2 = [];
  if (currentGame && currentGame.team1 && currentGame.team2) {
    team1 = [...currentGame.team1];
    team2 = [...currentGame.team2];
  } else {
    // Default: first 2 to team1, last 2 to team2
    team1 = [players[0].id, players[1].id];
    team2 = [players[2].id, players[3].id];
  }

  // Render assignment UI
  form.innerHTML = `
    <div style="display: flex; gap: 2rem; justify-content: center;">
      <div>
        <h4>Team 1</h4>
        <div id="team1-assignment"></div>
      </div>
      <div>
        <h4>Team 2</h4>
        <div id="team2-assignment"></div>
      </div>
    </div>
    <div style="margin-top:1rem; text-align:center;">
      <small>Click a player to move them between teams.</small>
    </div>
  `;

  // Render players in each team
  function renderTeams() {
    const t1 = document.getElementById('team1-assignment');
    const t2 = document.getElementById('team2-assignment');
    t1.innerHTML = '';
    t2.innerHTML = '';
    [team1, team2].forEach((team, idx) => {
      team.forEach(pid => {
        const player = players.find(p => p.id === pid);
        if (!player) return;
        const div = document.createElement('div');
        div.className = 'team-player';
        div.textContent = player.name;
        div.style.cursor = 'pointer';
        div.onclick = function() {
          // Move player to other team if possible
          if (idx === 0 && team1.length > 1) {
            team1 = team1.filter(id => id !== pid);
            team2.push(pid);
            window._customTeamAssignment.team1 = team1;
            window._customTeamAssignment.team2 = team2;
          } else if (idx === 1 && team2.length > 1) {
            team2 = team2.filter(id => id !== pid);
            team1.push(pid);
            window._customTeamAssignment.team1 = team1;
            window._customTeamAssignment.team2 = team2;
          }
          renderTeams();
        };
        if (idx === 0) t1.appendChild(div); else t2.appendChild(div);
      });
    });
    // Always update the global assignment reference after rendering
    window._customTeamAssignment.team1 = team1;
    window._customTeamAssignment.team2 = team2;
  }

  // Store teams in window for saving
  window._customTeamAssignment = { team1, team2, players };
  renderTeams();

  modal.classList.remove('hidden');
}

function saveTeamAssignment() {
  const modal = document.getElementById('team-assignment-modal');
  const { team1, team2, players } = window._customTeamAssignment || {};
  if (!team1 || !team2 || team1.length !== 2 || team2.length !== 2) {
    alert('Each team must have exactly 2 players.');
    return;
  }
  currentGame = {
    id: Date.now().toString(),
    players: [...team1, ...team2],
    startTime: Date.now(),
    team1: [...team1],
    team2: [...team2]
  };
  
  // Reset scores for new game
  resetGameScores();
  
  renderCurrentGame();
  startGameTimer();
  closeTeamAssignmentModal();
}

function closeTeamAssignmentModal() {
  document.getElementById('team-assignment-modal').classList.add('hidden');
  window._customTeamAssignment = null;
}

// Test function for rotation scenarios
function testRotationScenarios() {
  console.log('=== Testing Rotation Scenarios ===');
  
  // Test Scenario 1 (5 players)
  console.log('\n--- Scenario 1 Test (5 players) ---');
  const testSession1 = {
    players: [
      { id: '1', name: 'Player1' }, { id: '2', name: 'Player2' },
      { id: '3', name: 'Player3' }, { id: '4', name: 'Player4' },
      { id: '5', name: 'Player5' }
    ],
    playingPlayers: ['1', '2', '3', '4'],
    waitingPlayers: ['5'],
    playerStats: {
      '1': { gamesPlayed: 3, consecutiveGames: 2 },
      '2': { gamesPlayed: 2, consecutiveGames: 1 },
      '3': { gamesPlayed: 2, consecutiveGames: 1 },
      '4': { gamesPlayed: 1, consecutiveGames: 1 },
      '5': { gamesPlayed: 0, consecutiveGames: 0 }
    },
    games: [{
      team1: ['1', '2'],
      team2: ['3', '4'],
      winner: 1
    }]
  };
  
  // Simulate the rotation logic
  const losingTeam = ['3', '4'];
  const waitingPlayers = ['5'];
  const goingOut = [getPlayerToSubOut(losingTeam)];
  const comingIn = waitingPlayers.slice(0, 1);
  
  console.log('Scenario 1 Result:', {
    goingOut: goingOut.map(id => testSession1.players.find(p => p.id === id)?.name),
    comingIn: comingIn.map(id => testSession1.players.find(p => p.id === id)?.name)
  });
  
  // Test Scenario 3 (7 players) - the problematic one
  console.log('\n--- Scenario 3 Test (7 players) ---');
  const testSession3 = {
    players: [
      { id: '1', name: 'Winner1' }, { id: '2', name: 'Winner2' },
      { id: '3', name: 'Loser1' }, { id: '4', name: 'Loser2' },
      { id: '5', name: 'Waiting1' }, { id: '6', name: 'Waiting2' },
      { id: '7', name: 'Waiting3' }
    ],
    playingPlayers: ['1', '2', '3', '4'],
    waitingPlayers: ['5', '6', '7'],
    playerStats: {
      '1': { gamesPlayed: 5, consecutiveGames: 3 }, // Most games, should go out
      '2': { gamesPlayed: 3, consecutiveGames: 2 },
      '3': { gamesPlayed: 2, consecutiveGames: 1 },
      '4': { gamesPlayed: 2, consecutiveGames: 1 },
      '5': { gamesPlayed: 1, consecutiveGames: 0 },
      '6': { gamesPlayed: 0, consecutiveGames: 0 },
      '7': { gamesPlayed: 0, consecutiveGames: 0 }
    },
    games: [{
      team1: ['1', '2'],
      team2: ['3', '4'],
      winner: 1
    }]
  };
  
  const winningTeam = ['1', '2'];
  const losingTeam3 = ['3', '4'];
  const waitingPlayers3 = ['5', '6', '7'];
  
  const goingOut3 = [...losingTeam3, getPlayerToSubOut(winningTeam)];
  const comingIn3 = [...waitingPlayers3];
  
  console.log('Scenario 3 Result:', {
    goingOut: goingOut3.map(id => testSession3.players.find(p => p.id === id)?.name),
    comingIn: comingIn3.map(id => testSession3.players.find(p => p.id === id)?.name)
  });
  
  console.log('=== End Test ===');
}

// Add test function to window for console access
window.testRotationScenarios = testRotationScenarios;

// Scoring System
let currentGameScores = { team1: 0, team2: 0 };
let currentRound = 1;

function addScoreToTeam(team, points) {
  if (team === 1) {
    currentGameScores.team1 += points;
  } else {
    currentGameScores.team2 += points;
  }
  updateScoreDisplay();
  checkForGameEnd();
}

function updateScoreDisplay() {
  const team1Score = document.getElementById('team1-score');
  const team2Score = document.getElementById('team2-score');
  const team1Display = document.getElementById('team1-display-score');
  const team2Display = document.getElementById('team2-display-score');
  
  if (team1Score && team2Score) {
    team1Score.value = currentGameScores.team1;
    team2Score.value = currentGameScores.team2;
  }
  
  if (team1Display && team2Display) {
    team1Display.textContent = currentGameScores.team1;
    team2Display.textContent = currentGameScores.team2;
  }
}

function checkForGameEnd() {
  // Check if a team has won (reached 3 rounds)
  if (currentGameScores.team1 >= 3 || currentGameScores.team2 >= 3) {
    // Game is over, show result modal
    endGame();
  }
}

function resetGameScores() {
  currentGameScores = { team1: 0, team2: 0 };
  currentRound = 1;
  updateScoreDisplay();
}

function goBackToFairPlay() {
  closeRotationModal();
  // Reopen the fair play modal
  const fairRotation = window._fairRotation;
  if (fairRotation) {
    showFairPlayModal(fairRotation);
  }
}
