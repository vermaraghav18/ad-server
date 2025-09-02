// routes/geoAdsRouter.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const os = require('os');
const path = require('path');

const ctrl = require('../controllers/geoAdsController');

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, os.tmpdir()),
    filename: (_req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`),
  }),
});

router.get('/', ctrl.list);
router.post('/', upload.single('image'), ctrl.create);
router.delete('/:id', ctrl.remove);

module.exports = router;
