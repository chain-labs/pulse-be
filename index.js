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
    let cleanupTimeout;
  
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        const { type, sessionId, userInfo } = data;
  
        switch (type) {
          case 'join':
            if (!sessions[sessionId]) sessions[sessionId] = [];
            const existingUserIndex = sessions[sessionId].findIndex((u) => u.telegramId === userInfo.telegramId);
            if (existingUserIndex !== -1) {
              // Update existing user with new WebSocket connection
              sessions[sessionId][existingUserIndex].ws = ws;
              // Clear the cleanup timeout if the user rejoins
              if (cleanupTimeout) {
                clearTimeout(cleanupTimeout);
                cleanupTimeout = null;
              }
            } else {
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
          const user = sessions[sessionId]?.find((u) => u.telegramId === swipeTarget);
          if (user) {
            user.swipes[userInfo.telegramId] = true;

            if (user.swipes[userInfo.telegramId]) {
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
          ws.send(JSON.stringify({ type: 'error', message: 'Unknown type' }));
        }
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', message: err.message }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    cleanupTimeout = setTimeout(() => {
      for (const sessionId in sessions) {
        sessions[sessionId] = sessions[sessionId].filter((user) => user.ws !== ws);
        if (sessions[sessionId].length === 0) {
          delete sessions[sessionId];
        }
      }
    }, 5 * 60 * 1000); // 5 minutes
  });
});