// backend/routes/adsRouter.js
const express = require("express");
const fs = require("fs");
const multer = require("multer");
const path = require("path");

const router = express.Router();
const adsFilePath = path.join(__dirname, '..', 'ads.json');
const ADS_IMAGE_DIR = path.join(__dirname, "../uploads/ads");

if (!fs.existsSync(ADS_IMAGE_DIR)) fs.mkdirSync(ADS_IMAGE_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: ADS_IMAGE_DIR,
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

function loadAds() {
  if (!fs.existsSync(adsFilePath)) return [];
  const data = fs.readFileSync(adsFilePath);
  return JSON.parse(data);
}

function saveAds(data) {
  fs.writeFileSync(adsFilePath, JSON.stringify(data, null, 2));
}

// GET all ads
router.get("/", (req, res) => {
  const ads = loadAds();
  res.json(ads);
});

// POST new ad
router.post("/", upload.single("image"), (req, res) => {
  try {
    const ads = loadAds();
    const { title, link, target, description, type } = req.body;
    const adType = type || "normal";

    console.log("📦 Received:", { type, title, link, description });

    if (!req.file || !link) {
      console.error("❌ Missing image or link");
      return res.status(400).json({ error: "Image and link are required." });
    }

    if (adType === "normal" && (!title || !description)) {
      console.error("❌ Missing title or description for normal ad");
      return res.status(400).json({ error: "Title and description required for normal ads." });
    }

    const newAd = {
      id: Date.now().toString(),
      title: adType === "fullpage" ? "" : title,
      link,
      target: target || "All",
      description: adType === "fullpage" ? "" : (description || ""),
      type: adType,
      enabled: true,
      imageUrl: `/uploads/ads/${req.file.filename}`,
    };

    ads.push(newAd);
    saveAds(ads);
    console.log("✅ Ad saved:", newAd);
    res.status(201).json(newAd);
  } catch (err) {
    console.error("🔥 Upload error:", err);
    res.status(500).json({ error: "Server error during ad upload." });
  }
});

// PUT update ad
router.put("/:id", (req, res) => {
  const ads = loadAds();
  const { id } = req.params;
  const { target, enabled } = req.body;

  const adIndex = ads.findIndex(ad => ad.id === id);
  if (adIndex === -1) return res.status(404).json({ error: "Ad not found" });

  if (target) ads[adIndex].target = target;
  if (typeof enabled === "boolean") ads[adIndex].enabled = enabled;

  saveAds(ads);
  res.json(ads[adIndex]);
});

// DELETE ad
router.delete("/:id", (req, res) => {
  let ads = loadAds();
  const { id } = req.params;
  const ad = ads.find(ad => ad.id === id);
  if (!ad) return res.status(404).json({ error: "Ad not found" });

  const imagePath = path.join(__dirname, "..", "uploads", "ads", path.basename(ad.imageUrl));
  if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);

  ads = ads.filter(ad => ad.id !== id);
  saveAds(ads);
  res.json({ message: "Ad deleted" });
});

module.exports = router;
