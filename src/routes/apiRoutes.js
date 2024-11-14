const express = require('express');
const { healthCheck } = require('../controllers/healthController');
const { checkTelegramId } = require('../controllers/telegramController');
const { getUserStats } = require('../controllers/statsController');

const router = express.Router();

router.get('/health', healthCheck);
router.get('/check-telegram-id/:telegramId', checkTelegramId);
router.get('/stats', getUserStats);

module.exports = router;