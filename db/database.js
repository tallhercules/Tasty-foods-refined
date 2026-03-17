const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'tasty.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Create Tables ──────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS menu_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name_en     TEXT    NOT NULL,
    name_mn     TEXT    DEFAULT '',
    price       INTEGER NOT NULL DEFAULT 0,
    image       TEXT    DEFAULT '',
    tags        TEXT    DEFAULT '',
    is_available    INTEGER DEFAULT 1,
    is_best_seller  INTEGER DEFAULT 0,
    display_order   INTEGER DEFAULT 0,
    created_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS home_slots (
    slot_number INTEGER PRIMARY KEY,
    name_en     TEXT    DEFAULT '',
    name_mn     TEXT    DEFAULT '',
    price       INTEGER DEFAULT 0,
    image       TEXT    DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS translations (
    key   TEXT NOT NULL,
    lang  TEXT NOT NULL,
    value TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (key, lang)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT DEFAULT ''
  );
`);

// ─── Seed 6 home slots if empty ─────────────────────────────────────────────
const slotCount = db.prepare('SELECT COUNT(*) as c FROM home_slots').get().c;
if (slotCount === 0) {
  const insertSlot = db.prepare(`
    INSERT INTO home_slots (slot_number, name_en, name_mn, price, image)
    VALUES (?, '', '', 0, '')
  `);
  for (let i = 1; i <= 6; i++) insertSlot.run(i);
}

// ─── Seed default translations if empty ─────────────────────────────────────
const transCount = db.prepare('SELECT COUNT(*) as c FROM translations').get().c;
if (transCount === 0) {
  const defaults = [
    // key, en, mn
    ['brand_name',     'TASTY FOODS',                  'TASTY FOODS'],
    ['nav_home',       'Home',                         'Гэр'],
    ['nav_menu',       'Menu',                         'Цэс'],
    ['nav_about',      'About Us',                     'Бидний тухай'],
    ['nav_contact',    'Contact',                      'Холбоо барих'],
    ['nav_order',      'Order',                        'Захиалга'],
    ['hero_tag',       'Takeout & Delivery',            'Хүргэлт ба Авч явах'],
    ['hero_title',     'Welcome to the Freshest Ready-To-Go Food in Mongolia!', 'Монголын хамгийн шинэлэг, бэлэн хоолонд тавтай морил!'],
    ['hero_sub',       'Grab your next favorite meal today.', 'Өнөөдөр дуртай хоолоо сонгож идээрэй.'],
    ['order_btn',      'Order Online',                 'ЗАХИАЛАХ'],
    ['gallery_tag',    'Gallery',                      'Зургийн цомог'],
    ['gallery_title',  'FRESH EATS',                   'ШИНЭ ХООЛНУУД'],
    ['search_ph',      'Search for chicken, pork, noodles...', 'Хоол хайх...'],
    ['see_more',       'See Full Menu',                'Бүх цэсийг үзэх'],
    ['process_tag',    'Quality First',                'Чанарт анхаарна'],
    ['process_title',  'MADE FRESH EVERY DAY',         'ӨДӨР БҮР ШИНЭЭР НЬ'],
    ['feat1_title',    'Local Ingredients',            'Орон нутгийн орц'],
    ['feat1_desc',     'We source the finest ingredients from local Mongolian farms.', 'Бид хамгийн шинэ байлгахын тулд Монгол фермээс орцоо авдаг.'],
    ['feat2_title',    'Ready To Go',                  'Бэлэн хоол'],
    ['feat2_desc',     'Perfectly packaged meals for your busy lifestyle.', 'Таны завгүй амьдралын хэв маягт зориулсан амттай бэлэн хоолнууд.'],
    ['feat3_title',    'Fast Delivery',                'Шуурхай хүргэлт'],
    ['feat3_desc',     'From our store to your door in under 30 minutes.', 'Манай дэлгүүрээс таны үүдэнд 30 минутын дотор халуунаар нь.'],
    ['cart_title',     'Your Order',                   'Таны захиалга'],
    ['cart_total',     'Total:',                       'Нийт:'],
    ['cart_checkout',  'Order Now 🚀',                 'Захиалах 🚀'],
    ['add_to_order',   'Add to Order +',               'Нэмэх +'],
    ['menu_title',     'Our Full Menu',                'Бүрэн Цэс'],
    ['filter_all',     'All',                          'Бүгд'],
  ];

  const ins = db.prepare(`INSERT OR IGNORE INTO translations (key, lang, value) VALUES (?, ?, ?)`);
  const insertAll = db.transaction((rows) => {
    for (const [key, en, mn] of rows) {
      ins.run(key, 'en', en);
      ins.run(key, 'mn', mn);
    }
  });
  insertAll(defaults);
}
// ─── Seed default daily pick setting ─────────────────────
const hasDailyPick = db.prepare(`SELECT value FROM settings WHERE key = 'daily_pick'`).get();
if (!hasDailyPick) {
  db.prepare(`INSERT INTO settings (key, value) VALUES ('daily_pick', ?)`).run(
    JSON.stringify({ enabled: false, item_id: null })
  );
}
module.exports = db;
