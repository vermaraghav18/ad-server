// routes/tickerRouter.js
const router = require('express').Router();
const ctrl = require('../controllers/tickerController');

router.get('/plan', ctrl.getPlan);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
