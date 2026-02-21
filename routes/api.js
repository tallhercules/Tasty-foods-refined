const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/menu - all available menu items
router.get('/menu', (req, res) => {
  try {
    const items = db.prepare(`
      SELECT id, name_en, name_mn, price, image, tags, is_best_seller
      FROM menu_items
      WHERE is_available = 1
      ORDER BY display_order ASC, id ASC
    `).all();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/home - 6 home slots
router.get('/home', (req, res) => {
  try {
    const slots = db.prepare(`
      SELECT slot_number, name_en, name_mn, price, image
      FROM home_slots
      ORDER BY slot_number ASC
    `).all();
    res.json(slots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/translations - all translation keys for both languages
router.get('/translations', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, lang, value FROM translations').all();
    const result = { en: {}, mn: {} };
    for (const row of rows) {
      result[row.lang][row.key] = row.value;
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
