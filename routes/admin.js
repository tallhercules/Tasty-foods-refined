const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

// ─── Image Upload Setup ──────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../public/images/uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `dish-${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// ─── Auth Routes ─────────────────────────────────────────────────────────────

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    req.session.save(err => {
      if (err) return res.status(500).json({ error: 'Session error' });
      res.json({ success: true });
    });
  } else {
    // Small delay to slow down brute force attempts
    setTimeout(() => res.status(401).json({ error: 'Wrong password' }), 800);
  }
});

// POST /api/admin/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

// GET /api/admin/check - check if logged in
router.get('/check', (req, res) => {
  res.json({ authenticated: req.session?.isAdmin === true });
});

// ─── All routes below require admin session ───────────────────────────────────

router.use(requireAdmin);

// ─── Image Upload ─────────────────────────────────────────────────────────────

// POST /api/admin/upload
router.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ filePath: `/images/uploads/${req.file.filename}` });
});

// ─── Menu Item Routes ─────────────────────────────────────────────────────────

// GET /api/admin/menu - all items (including unavailable)
router.get('/menu', (req, res) => {
  const items = db.prepare('SELECT * FROM menu_items ORDER BY display_order ASC, id ASC').all();
  res.json(items);
});

// POST /api/admin/menu - add new item
router.post('/menu', (req, res) => {
  const { name_en, name_mn, price, image, tags, is_best_seller } = req.body;
  if (!name_en || !price) return res.status(400).json({ error: 'Name and price required' });

  const maxOrder = db.prepare('SELECT MAX(display_order) as m FROM menu_items').get().m || 0;

  const result = db.prepare(`
    INSERT INTO menu_items (name_en, name_mn, price, image, tags, is_best_seller, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(name_en, name_mn || '', Number(price), image || '', tags || '', is_best_seller ? 1 : 0, maxOrder + 1);

  const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(result.lastInsertRowid);
  res.json(item);
});

// PUT /api/admin/menu/:id - update item
router.put('/menu/:id', (req, res) => {
  const { name_en, name_mn, price, image, tags, is_available, is_best_seller } = req.body;
  const id = parseInt(req.params.id);

  db.prepare(`
    UPDATE menu_items
    SET name_en = ?, name_mn = ?, price = ?, image = ?, tags = ?,
        is_available = ?, is_best_seller = ?
    WHERE id = ?
  `).run(name_en, name_mn || '', Number(price), image || '', tags || '',
    is_available !== undefined ? (is_available ? 1 : 0) : 1,
    is_best_seller ? 1 : 0, id);

  res.json({ success: true });
});

// DELETE /api/admin/menu/:id
router.delete('/menu/:id', (req, res) => {
  db.prepare('DELETE FROM menu_items WHERE id = ?').run(parseInt(req.params.id));
  res.json({ success: true });
});

// PUT /api/admin/menu/reorder - update display order
router.put('/menu/reorder', (req, res) => {
  const { orderedIds } = req.body; // array of ids in new order
  if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds must be array' });

  const update = db.prepare('UPDATE menu_items SET display_order = ? WHERE id = ?');
  const reorderAll = db.transaction((ids) => {
    ids.forEach((id, index) => update.run(index, id));
  });
  reorderAll(orderedIds);
  res.json({ success: true });
});

// ─── Home Slot Routes ──────────────────────────────────────────────────────────

// GET /api/admin/home
router.get('/home', (req, res) => {
  const slots = db.prepare('SELECT * FROM home_slots ORDER BY slot_number ASC').all();
  res.json(slots);
});

// PUT /api/admin/home/:slot - update a home slot
router.put('/home/:slot', (req, res) => {
  const slot = parseInt(req.params.slot);
  const { name_en, name_mn, price, image } = req.body;

  db.prepare(`
    UPDATE home_slots SET name_en = ?, name_mn = ?, price = ?, image = ?
    WHERE slot_number = ?
  `).run(name_en || '', name_mn || '', Number(price) || 0, image || '', slot);

  res.json({ success: true });
});

// ─── Translation Routes ────────────────────────────────────────────────────────

// GET /api/admin/translations - all translations for editing
router.get('/translations', (req, res) => {
  const rows = db.prepare('SELECT key, lang, value FROM translations ORDER BY key').all();
  res.json(rows);
});

// PUT /api/admin/translations - update a single translation
router.put('/translations', (req, res) => {
  const { key, lang, value } = req.body;
  if (!key || !lang) return res.status(400).json({ error: 'key and lang required' });

  db.prepare(`
    INSERT INTO translations (key, lang, value) VALUES (?, ?, ?)
    ON CONFLICT(key, lang) DO UPDATE SET value = excluded.value
  `).run(key, lang, value || '');

  res.json({ success: true });
});

// ─── Daily Pick Routes ────────────────────────────────────

// GET /api/admin/daily-pick
router.get('/daily-pick', (req, res) => {
  try {
    const row = db.prepare(`SELECT value FROM settings WHERE key = 'daily_pick'`).get();
    const data = JSON.parse(row?.value || '{}');
    
    // If there's an item_id, fetch the full item details too
    if (data.item_id) {
      const item = db.prepare(`SELECT * FROM menu_items WHERE id = ?`).get(data.item_id);
      data.item = item || null;
    }
    
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/daily-pick
router.put('/daily-pick', (req, res) => {
  try {
    const { enabled, item_id } = req.body;
    const value = JSON.stringify({ 
      enabled: !!enabled, 
      item_id: item_id || null 
    });
    
    db.prepare(`
      INSERT INTO settings (key, value) VALUES ('daily_pick', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(value);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
