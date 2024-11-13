// src/utils/websocketUtils.js
const wsConnections = new Map();

function heartbeat() {
    this.isAlive = true;
}

function handleWebSocketConnection(ws, sessionsCollection) {
    ws.isAlive = true;
    ws.on('pong', heartbeat);

    let cleanupTimeout;
    let currentSessionId;
    let currentUserInfo;

    ws.on("message", async (message) => {
        try {
            const data = JSON.parse(message);
            console.log("Received message:", data);
            const { type, sessionId, userInfo } = data;

            let session;
            
            switch (type) {
                case "join":
                    // Handle user joining a session
                    currentSessionId = sessionId;
                    currentUserInfo = userInfo;
                    console.log(`User ${userInfo?.telegramId} attempting to join session ${sessionId}`);
                    
                    // Store WebSocket connection
                    wsConnections.set(userInfo.telegramId, ws);

                    session = await sessionsCollection.findOne({ sessionId });
                    
                    if (!session) {
                        session = { sessionId, users: [] };
                        await sessionsCollection.insertOne(session);
                    }

                    const existingUserIndex = session.users.findIndex(
                        u => u.telegramId === userInfo.telegramId
                    );

                    if (existingUserIndex !== -1) {
                        console.log(`User ${userInfo.telegramId} rejoining session ${sessionId}`);
                        // Update existing user
                        session.users[existingUserIndex] = {
                            ...session.users[existingUserIndex],
                            ...userInfo
                        };
                    } else {
                        console.log(`User ${userInfo.telegramId} joining session ${sessionId} for the first time`);
                        session.users.push({
                            ...userInfo,
                            swipes: {}
                        });
                    }

                    await sessionsCollection.updateOne(
                        { sessionId },
                        { $set: { users: session.users } }
                    );

                    // Send update to all users in session
                    session.users.forEach(user => {
                        const userWs = wsConnections.get(user.telegramId);
                        if (userWs) {
                            userWs.send(JSON.stringify({
                                type: "sessionUpdate",
                                users: session.users
                            }));
                        }
                    });
                    break;

                case "swipe":
                    // Handle user swiping on another user
                    console.log(`User ${userInfo?.telegramId} swiped on session ${sessionId}`);
                        
                    session = await sessionsCollection.findOne({ sessionId });
                    if (!session) {
                        throw new Error("Session not found");
                    }

                    const swipingUser = session.users.find(u => u.telegramId === userInfo.telegramId);
                    const targetUser = session.users.find(u => u.telegramId === data.swipeTarget);

                    if (!swipingUser || !targetUser) {
                        throw new Error("User not found");
                    }

                    // Initialize swipes if needed
                    if (!swipingUser.swipes) swipingUser.swipes = {};
                    if (!targetUser.swipes) targetUser.swipes = {};

                    // Record the swipe
                    swipingUser.swipes[targetUser.telegramId] = true;

                    // Update in database
                    await sessionsCollection.updateOne(
                        { sessionId },
                        { $set: { users: session.users } }
                    );

                    // Check for match
                    if (targetUser.swipes[swipingUser.telegramId]) {
                        console.log(`Match found between ${swipingUser.telegramId} and ${targetUser.telegramId}`);
                        
                        const swipingUserWs = wsConnections.get(swipingUser.telegramId);
                        const targetUserWs = wsConnections.get(targetUser.telegramId);

                        if (swipingUserWs) {
                            swipingUserWs.send(JSON.stringify({
                                type: "match",
                                handle: targetUser
                            }));
                        }

                        if (targetUserWs) {
                            targetUserWs.send(JSON.stringify({
                                type: "match",
                                handle: swipingUser
                            }));
                        }
                    }
                    break;

                default:
                    console.log("Unknown message type received:", type);
                    ws.send(JSON.stringify({
                        type: "error",
                        message: "Unknown message type"
                    }));
            }
        } catch (err) {
            console.error("Error processing message:", err);
            if (ws.readyState === 1) {
                ws.send(JSON.stringify({ 
                    type: "error", 
                    message: err.message 
                }));
            }
        }
    });

    ws.on("close", async () => {
        if (currentUserInfo) {
            console.log(`User ${currentUserInfo.telegramId} disconnected`);
            wsConnections.delete(currentUserInfo.telegramId);

            cleanupTimeout = setTimeout(async () => {
                try {
                    const session = await sessionsCollection.findOne({ sessionId: currentSessionId });
                    if (session) {
                        const updatedUsers = session.users.filter(
                            user => user.telegramId !== currentUserInfo.telegramId
                        );

                        if (updatedUsers.length === 0) {
                            await sessionsCollection.deleteOne({ sessionId: currentSessionId });
                            console.log(`Deleted empty session ${currentSessionId}`);
                        } else {
                            await sessionsCollection.updateOne(
                                { sessionId: currentSessionId },
                                { 
                                    $set: { 
                                        users: updatedUsers,
                                        updatedAt: new Date()
                                    } 
                                }
                            );
                        }
                    }
                } catch (error) {
                    console.error("Error cleaning up disconnected user:", error);
                }
            }, 5 * 60 * 1000); // 5 minutes
        }
    });
}

function setupWebSocketHeartbeat(wss) {
    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.isAlive === false) {
                console.log("Terminating inactive connection");
                return ws.terminate();
            }
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);

    wss.on("close", () => {
        clearInterval(interval);
    });
}

module.exports = { handleWebSocketConnection, setupWebSocketHeartbeat };