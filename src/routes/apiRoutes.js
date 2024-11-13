const express = require('express');
const { healthCheck } = require('../controllers/healthController');
const { checkTelegramId } = require('../controllers/telegramController');

const router = express.Router();

router.get('/health', healthCheck);
router.get('/check-telegram-id/:telegramId', checkTelegramId);

module.exports = router;