// src/index.js
const express = require("express");
const { WebSocketServer } = require("ws");
const cors = require("cors");
const { connectToDatabase } = require('./config/database');
const apiRoutes = require('./routes/apiRoutes');
const { setupWebSocketServer } = require('./controllers/websocketController');
const { setupWebSocketHeartbeat } = require('./utils/websocketUtils');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

connectToDatabase();

app.use('/api', apiRoutes);

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

const wss = new WebSocketServer({ server });
setupWebSocketServer(wss);
setupWebSocketHeartbeat(wss);