const { getSessionsCollection } = require('../config/database');

async function checkTelegramId(req, res) {
    const { telegramId } = req.params;
    console.log(`Checking existence of Telegram ID: ${telegramId}`);
    
    try {
        const session = await getSessionsCollection().findOne({
            "users.telegramId": telegramId
        });
        
        const exists = !!session;
        console.log(`Telegram ID ${telegramId} exists: ${exists}`);
        res.json({ exists });
    } catch (error) {
        console.error("Error checking Telegram ID:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

module.exports = { checkTelegramId };