const { getSessionsCollection } = require('../config/database');

async function getUserStats(req, res) {
    try {
        const sessionsCollection = getSessionsCollection();
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        // Aggregate users from all sessions
        const sessions = await sessionsCollection.find().toArray();
        const allUsers = sessions.flatMap(session => session.users);

        // Calculate stats
        const newUsers = allUsers.filter(user => user.joinedAt >= oneHourAgo).length;
        const activeUsers = allUsers.filter(user => user.lastActiveAt >= oneHourAgo).length;
        const totalUsers = allUsers.length;

        res.json({
            newUsers,
            activeUsers,
            totalUsers
        });
    } catch (error) {
        console.error("Error fetching user stats:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

module.exports = { getUserStats };