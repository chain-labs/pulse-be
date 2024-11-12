const express = require('express');
const { WebSocketServer } = require('ws');
const cors = require('cors');

const app = express();
app.use(cors());

// In-memory session storage
const sessions = {};

// Start the HTTP server
const server = app.listen(8080, () => {
  console.log('HTTP server running on http://localhost:8080');
});

// WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    console.log('New WebSocket connection established');
    let cleanupTimeout;
  
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        console.log('Received message:', data);
        const { type, sessionId, userInfo } = data;
  
        switch (type) {
          case 'join':
            console.log(`User ${userInfo.telegramId} attempting to join session ${sessionId}`);
            if (!sessions[sessionId]) sessions[sessionId] = [];
            const existingUserIndex = sessions[sessionId].findIndex((u) => u.telegramId === userInfo.telegramId);
            if (existingUserIndex !== -1) {
              console.log(`User ${userInfo.telegramId} rejoining session ${sessionId}`);
              // Update existing user with new WebSocket connection
              sessions[sessionId][existingUserIndex].ws = ws;
              // Clear the cleanup timeout if the user rejoins
              if (cleanupTimeout) {
                clearTimeout(cleanupTimeout);
                cleanupTimeout = null;
              }
            } else {
              console.log(`User ${userInfo.telegramId} joining session ${sessionId} for the first time`);
              // Add new user
              sessions[sessionId].push({ ...userInfo, swipes: {}, ws });
            }
            ws.send(
              JSON.stringify({
                type: 'sessionUpdate',
                users: sessions[sessionId].map(({ ws, ...user }) => user), // Exclude WebSocket object from response
              })
            );
            break;

        case 'swipe':
          console.log(`User ${userInfo.telegramId} swiped on session ${sessionId}`);
          const user = sessions[sessionId]?.find((u) => u.telegramId === swipeTarget);
          if (user) {
            user.swipes[userInfo.telegramId] = true;

            if (user.swipes[userInfo.telegramId]) {
              console.log(`Match found between ${userInfo.telegramId} and ${user.telegramId}`);
              ws.send(
                JSON.stringify({ type: 'match', handle: user.telegramId })
              );
              user.ws.send(
                JSON.stringify({ type: 'match', handle: userInfo.telegramId })
              );
            }
          }
          break;

        default:
          console.log('Unknown message type received:', type);
          ws.send(JSON.stringify({ type: 'error', message: 'Unknown type' }));
        }
    } catch (err) {
      console.log('Error processing message:', err.message);
      ws.send(JSON.stringify({ type: 'error', message: err.message }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    cleanupTimeout = setTimeout(() => {
      console.log('Cleaning up disconnected client sessions');
      for (const sessionId in sessions) {
        sessions[sessionId] = sessions[sessionId].filter((user) => user.ws !== ws);
        if (sessions[sessionId].length === 0) {
          console.log(`Deleting empty session ${sessionId}`);
          delete sessions[sessionId];
        }
      }
    }, 5 * 60 * 1000); // 5 minutes
  });
});

app.get('/check-telegram-id/:telegramId', (req, res) => {
  const { telegramId } = req.params;
  console.log(`Checking existence of Telegram ID: ${telegramId}`);
  let exists = false;

  for (const sessionId in sessions) {
    if (sessions[sessionId].some(user => user.telegramId === telegramId)) {
      exists = true;
      break;
    }
  }

  console.log(`Telegram ID ${telegramId} exists: ${exists}`);
  res.json({ exists });
});