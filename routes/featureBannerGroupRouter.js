// routes/featureBannerGroupRouter.js
const router = require('express').Router();
const ctl = require('../controllers/featureBannerGroupController');

router.get('/', ctl.list);
router.get('/active', ctl.listActive);
router.post('/', ctl.create);
router.put('/:id', ctl.update);
router.delete('/:id', ctl.remove);

module.exports = router;
