const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/extractController');

router.post('/', express.json(), ctrl.extract);

module.exports = router;
