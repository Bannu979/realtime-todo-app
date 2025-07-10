const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const taskController = require('../controllers/taskController');

router.use(auth);

router.post('/', taskController.createTask);
router.get('/', taskController.getTasks);
router.get('/:id', taskController.getTask);
router.put('/:id', taskController.updateTask);
router.put('/:id/smart-assign', taskController.smartAssignTask);
router.delete('/:id', taskController.deleteTask);

module.exports = router; 