// backend/routes/adsRouter.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const os = require("os");
const path = require("path");

const ctrl = require("../controllers/adsController");

// Multer temp storage: file lands in OS tmp, controller uploads to Cloudinary, then deletes temp
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, os.tmpdir()),
    filename: (_req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`),
  }),
});

router.get("/", ctrl.list);
router.post("/", upload.single("image"), ctrl.create); // field name must be 'image'
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

module.exports = router;
