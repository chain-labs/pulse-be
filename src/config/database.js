// src/config/database.js

const { MongoClient } = require("mongodb");
require('dotenv').config();

const MONGODB_URL = process.env.MONGO_URL;
const DB_NAME = "websocket-sessions";

let db;
let sessionsCollection;

async function connectToDatabase() {
    if (!MONGODB_URL) {
        console.error("MONGODB_URL environment variable is not set!");
        process.exit(1);
    }

    try {
        const client = await MongoClient.connect(MONGODB_URL, {
            maxPoolSize: 10,
            minPoolSize: 5,
            retryWrites: true,
            w: 'majority',
            useUnifiedTopology: true
        });

        db = client.db(DB_NAME);
        sessionsCollection = db.collection("sessions");

        await sessionsCollection.createIndex({ sessionId: 1 });
        await sessionsCollection.createIndex({ "users.telegramId": 1 });

        console.log("Connected to Railway MongoDB");

        client.on('error', (error) => {
            console.error('MongoDB connection error:', error);
            process.exit(1);
        });

        client.on('close', () => {
            console.error('MongoDB connection closed. Attempting to reconnect...');
            setTimeout(connectToDatabase, 5000);
        });

    } catch (error) {
        console.error("Failed to connect to MongoDB:", error);
        setTimeout(connectToDatabase, 5000);
    }
}

module.exports = { connectToDatabase, getDb: () => db, getSessionsCollection: () => sessionsCollection };