# 🍖 Tasty Foods — v2.0

Complete rebuild: Node.js + Express + SQLite. Secure, organized, clean.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Create your .env file
Copy `.env.example` to `.env` and fill it in:
```bash
cp .env.example .env
```

Edit `.env`:
```
PORT=3000
ADMIN_PASSWORD=PASSNO880
SESSION_SECRET=neckhurttidontknowwhattotypehere
```

### 3. Add your logo
Copy your logo image to:
```
public/images/logo.png
```

### 4. Start the server
```bash
npm start
```

Or with auto-restart on file changes (Node 18+):
```bash
npm run dev
```

### 5. Open the site
- Customer site: http://localhost:3000
- Admin panel:   http://localhost:3000/admin.html

---

## File Structure

```
tasty-foods/
├── server.js              # Entry point - clean, 40 lines
├── .env                   # Your secrets (never commit this!)
├── db/
│   ├── database.js        # SQLite setup, tables, seed data
│   └── tasty.db           # Auto-created on first run
├── routes/
│   ├── api.js             # Public API (menu, home, translations)
│   └── admin.js           # Protected admin API (requires session)
├── middleware/
│   └── auth.js            # Session check middleware
└── public/
    ├── index.html         # Home page
    ├── menu.html          # Full menu
    ├── order.html         # Order page
    ├── admin.html         # Admin dashboard
    ├── css/
    │   ├── main.css       # All customer-facing styles
    │   └── admin.css      # Admin panel styles
    ├── js/
    │   ├── cart.js        # Cart engine (shared)
    │   ├── lang.js        # Translation engine (shared)
    │   ├── home.js        # Home page logic
    │   ├── menu-page.js   # Menu page logic
    │   ├── order.js       # Order page logic
    │   └── admin.js       # Admin panel logic
    └── images/
        ├── logo.png       # Your logo (add manually)
        └── uploads/       # Uploaded dish images go here
```

## Security improvements over v1

| Issue | v1 | v2 |
|---|---|---|
| Admin password | Hardcoded in `indexJS.js` (visible to anyone) | In `.env`, checked server-side |
| Admin access | Secret URL in client JS | Session-based, server validates |
| Data storage | JSON files (corruption risk) | SQLite database |
| Auth | None (just a URL) | express-session with httpOnly cookie |

## Admin Panel

Log in at `/admin.html` with your `ADMIN_PASSWORD` from `.env`.

Features:
- **Overview** — stats: total items, available, best sellers, home slots filled
- **Menu Items** — add, edit, delete dishes with image upload
- **Home Slots** — manage the 6 featured items on the homepage
- **Translations** — edit all EN/MN text directly from the browser

## WhatsApp Orders

In `public/js/order.js`, find this line and replace with your number:
```js
const whatsappNumber = '97699XXXXXX';
```

Format: country code + number, no spaces or +. Example: `97699112233`
