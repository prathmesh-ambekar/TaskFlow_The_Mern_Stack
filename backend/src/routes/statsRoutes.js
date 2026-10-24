const express = require('express');
const { getMonthly } = require('../controllers/statsController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/monthly', getMonthly);

module.exports = router;
