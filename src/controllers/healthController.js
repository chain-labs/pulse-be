// src/controllers/healthController.js
const { getDb, getSessionsCollection } = require('../config/database');

function healthCheck(req, res) {
    if (getDb() && getSessionsCollection()) {
        res.status(200).json({ status: 'healthy', database: 'connected' });
    } else {
        res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
    }
}

module.exports = { healthCheck };