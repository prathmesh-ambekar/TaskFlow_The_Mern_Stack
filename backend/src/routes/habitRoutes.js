const express = require('express');
const { createHabit, getHabits, updateHabit, deleteHabit } = require('../controllers/habitController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // every habit route requires login

router.route('/').post(createHabit).get(getHabits);
router.route('/:id').put(updateHabit).delete(deleteHabit);

module.exports = router;
