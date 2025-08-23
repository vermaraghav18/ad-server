// routes/bannerConfigRouter.js
const express = require('express');
const router = express.Router();

const multerLib = require('multer');
const upload = multerLib({ storage: multerLib.memoryStorage() });

const { uploadToCloudinary } = require('../utils/cloudinary');
const ctrl = require('../controllers/bannerConfigController');

const maybeUpload = async (req, _res, next) => {
  try {
    if (req.file) {
      console.log('[banner-config] file: size=', req.file.size, 'type=', req.file.mimetype);
      const up = await uploadToCloudinary(req.file.buffer, 'banner-configs');
      req.file.secure_url = up.secure_url;
    }
    next();
  } catch (e) { next(e); }
};

// CRUD
router.get('/', ctrl.list);
router.get('/active', ctrl.listActive);
router.get('/:id', ctrl.get);

// Create/update accept optional image file for AD mode
router.post('/', upload.single('image'), maybeUpload, ctrl.create);
router.put('/:id', upload.single('image'), maybeUpload, ctrl.update);

router.delete('/:id', ctrl.remove);

module.exports = router;
