// routes/customNewsRouter.js
const express = require('express');
const router = express.Router();
const multerLib = require('multer');
const upload = multerLib({ storage: multerLib.memoryStorage() });

const { uploadToCloudinary } = require('../utils/cloudinary');
const ctrl = require('../controllers/customNewsController');

// optional logging + Cloudinary step
const maybeUpload = async (req, _res, next) => {
  try {
    if (req.file) {
      // Debug: log size & mimetype so we know Multer parsed the file:
      console.log('[custom-news] file? true size=', req.file.size, 'type=', req.file.mimetype);

      const uploadRes = await uploadToCloudinary(req.file.buffer, 'custom-news');
      req.file.secure_url = uploadRes.secure_url;
    }
    next();
  } catch (e) { next(e); }
};

router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.post('/', upload.single('image'), maybeUpload, ctrl.create);
router.put('/:id', upload.single('image'), maybeUpload, ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
