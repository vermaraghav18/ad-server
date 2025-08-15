const express = require('express');
const router = express.Router();
const multer = require('multer')(); // memory storage
const { uploadToCloudinary } = require('../utils/cloudinary'); // you already have this helper
const ctrl = require('../controllers/customNewsController');

// middleware to optionally upload image
const maybeUpload = async (req, _res, next) => {
  try {
    if (req.file) {
      const upload = await uploadToCloudinary(req.file.buffer, 'custom-news');
      req.file.secure_url = upload.secure_url;
    }
    next();
  } catch (e) { next(e); }
};

router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.post('/', multer.single('image'), maybeUpload, ctrl.create);
router.put('/:id', multer.single('image'), maybeUpload, ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
