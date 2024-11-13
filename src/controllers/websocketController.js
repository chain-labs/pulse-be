// src/controllers/websocketController.js
const { getSessionsCollection } = require('../config/database');
const { handleWebSocketConnection } = require('../utils/websocketUtils');

function setupWebSocketServer(wss) {
    wss.on("connection", (ws) => {
        console.log("New WebSocket connection established");
        handleWebSocketConnection(ws, getSessionsCollection());
    });
}

module.exports = { setupWebSocketServer };