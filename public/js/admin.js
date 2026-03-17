/**
 * admin.js — Tasty Foods Admin Panel
 *
 * Handles:
 *  - Login / logout / session check
 *  - Panel navigation
 *  - Menu items: add, edit, delete, image upload
 *  - Home slots: select and update
 *  - Translations: load and save all
 *  - Overview stats
 */

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function adminLogin() {
  const passInput = document.getElementById('login-pass');
  const errorEl   = document.getElementById('login-error');
  const password  = passInput.value;

  errorEl.textContent = '';

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    if (res.ok) {
      showDashboard();
    } else {
      const data = await res.json();
      errorEl.textContent = data.error || 'Wrong password.';
      passInput.value = '';

      // Shake animation
      const card = passInput.closest('.login-card');
      card.classList.remove('shake');
      void card.offsetWidth; // reflow to restart animation
      card.classList.add('shake');
    }
  } catch {
    errorEl.textContent = 'Server error. Is the server running?';
  }
}

async function adminLogout() {
  await fetch('/api/admin/logout', { method: 'POST' });
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-pass').value = '';
}

async function checkAuth() {
  try {
    const res  = await fetch('/api/admin/check');
    const data = await res.json();
    if (data.authenticated) {
      showDashboard();
    }
  } catch { /* stay on login screen */ }
}

function showDashboard() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'flex';
  loadOverview();
  loadMenuPanel();
}

// Allow pressing Enter on login input
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  document.getElementById('login-pass')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') adminLogin();
  });
  setupDragDrop('menu-drop', 'menu-file', handleMenuUpload);
  setupDragDrop('slot-drop', 'slot-file', handleSlotUpload);
});

// ─── Panel Navigation ──────────────────────────────────────────────────────────

const PANELS = ['overview', 'menu', 'home', 'translations', 'daily'];
const TITLES = {
  overview:     'Overview',
  menu:         'Menu Items',
  home:         'Home Slots',
  translations: 'Translations',
  daily: 'Daily Pick',
};

function showPanel(name) {
  PANELS.forEach(p => {
    document.getElementById(`panel-${p}`)?.classList.remove('active');
    document.getElementById(`nav-${p}`)?.classList.remove('active');
  });

  document.getElementById(`panel-${name}`)?.classList.add('active');
  document.getElementById(`nav-${name}`)?.classList.add('active');
  document.getElementById('panel-title').textContent = TITLES[name] || name;

  // Lazy-load each panel
  if (name === 'overview')     loadOverview();
  if (name === 'menu')         loadMenuPanel();
  if (name === 'home')         loadHomePanel();
  if (name === 'translations') loadTranslationsPanel();
  if (name === 'translations') loadTranslationsPanel();
  if (name === 'daily') loadDailyPanel();
}

// ─── Toast ─────────────────────────────────────────────────────────────────────

function toast(msg, isError = false) {
  const el = document.getElementById('admin-toast');
  el.textContent = msg;
  el.className = 'admin-toast' + (isError ? ' error' : '');
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3500);
}

// ─── API Helper ───────────────────────────────────────────────────────────────

async function api(method, url, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// ─── Image Upload ─────────────────────────────────────────────────────────────

async function uploadImage(file, targetInputId, dropZoneId) {
  const dropZone = document.getElementById(dropZoneId);
  const originalHTML = dropZone.innerHTML;
  dropZone.innerHTML = `<p style="color:var(--brand)">Uploading...</p>`;

  const formData = new FormData();
  formData.append('image', file);

  try {
    const res  = await fetch('/api/admin/upload', { method: 'POST', body: formData });
    const data = await res.json();

    if (data.filePath) {
      document.getElementById(targetInputId).value = data.filePath;
      dropZone.innerHTML = `<img src="${data.filePath}" alt="Uploaded"><p style="color:var(--success);margin-top:6px">✓ Uploaded</p>`;
      return data.filePath;
    }
  } catch {
    toast('Upload failed', true);
    dropZone.innerHTML = originalHTML;
  }
}

function handleMenuUpload(file) {
  if (file) uploadImage(file, 'menu-image', 'menu-drop');
}

function handleSlotUpload(file) {
  if (file) uploadImage(file, 'slot-image', 'slot-drop');
}

// ─── Drag & Drop Setup ────────────────────────────────────────────────────────

function setupDragDrop(dropId, inputId, handler) {
  const zone = document.getElementById(dropId);
  if (!zone) return;

  zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', ()  => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handler(file);
  });
}

// ─── OVERVIEW ─────────────────────────────────────────────────────────────────

async function loadOverview() {
  try {
    const [menuItems, homeSlots] = await Promise.all([
      api('GET', '/api/admin/menu'),
      api('GET', '/api/admin/home')
    ]);

    document.getElementById('stat-menu').textContent       = menuItems.length;
    document.getElementById('stat-available').textContent  = menuItems.filter(i => i.is_available).length;
    document.getElementById('stat-bestseller').textContent = menuItems.filter(i => i.is_best_seller).length;
    document.getElementById('stat-slots').textContent      = homeSlots.filter(s => s.name_en).length + '/6';
  } catch (err) {
    console.error('Overview load error:', err);
  }
}

// ─── MENU PANEL ───────────────────────────────────────────────────────────────

let editingMenuId = null;

async function loadMenuPanel() {
  const grid = document.getElementById('menu-grid');
  const countEl = document.getElementById('menu-count');
  if (!grid) return;

  try {
    const items = await api('GET', '/api/admin/menu');
    countEl.textContent = `${items.length} item${items.length !== 1 ? 's' : ''}`;

    if (items.length === 0) {
      grid.innerHTML = `<div style="padding:40px;text-align:center;color:var(--muted);grid-column:1/-1">
        No items yet. Add your first menu item using the form.
      </div>`;
      return;
    }

    grid.innerHTML = items.map(item => `
      <div class="admin-card ${item.is_available ? '' : 'unavailable'}" id="card-${item.id}">
        ${item.is_best_seller ? '<div class="admin-card-badge">★ Best</div>' : ''}
        <img class="admin-card-img" src="${item.image || ''}" alt="${item.name_en}"
          onerror="this.src=''" style="background:var(--bg2)">
        <div class="admin-card-body">
          <div class="admin-card-name">${item.name_en}</div>
          ${item.name_mn ? `<div class="admin-card-tags">${item.name_mn}</div>` : ''}
          <div class="admin-card-price">${Number(item.price).toLocaleString()}₮</div>
          ${item.tags ? `<div class="admin-card-tags">${item.tags}</div>` : ''}
        </div>
        <div class="admin-card-actions">
          <button class="btn btn-ghost" style="flex:1;padding:8px;font-size:0.78rem" onclick="editMenuItem(${item.id})">Edit</button>
          <button class="btn btn-danger" style="padding:8px 10px;font-size:0.78rem" onclick="deleteMenuItem(${item.id}, '${item.name_en.replace(/'/g,"\\'")}')">✕</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    grid.innerHTML = `<div style="color:var(--danger);padding:20px">Error loading: ${err.message}</div>`;
  }
}

async function editMenuItem(id) {
  try {
    const items = await api('GET', '/api/admin/menu');
    const item = items.find(i => i.id === id);
    if (!item) return;

    editingMenuId = id;

    document.getElementById('menu-edit-id').value    = id;
    document.getElementById('menu-name-en').value    = item.name_en || '';
    document.getElementById('menu-name-mn').value    = item.name_mn || '';
    document.getElementById('menu-price').value      = item.price || '';
    document.getElementById('menu-tags').value       = item.tags || '';
    document.getElementById('menu-image').value      = item.image || '';
    document.getElementById('menu-available').checked   = !!item.is_available;
    document.getElementById('menu-bestseller').checked  = !!item.is_best_seller;

    const drop = document.getElementById('menu-drop');
    if (item.image) {
      drop.innerHTML = `<img src="${item.image}" alt="Current image"><p style="margin-top:6px;font-size:0.78rem;color:var(--muted)">Click to change</p>`;
    }

    document.getElementById('menu-form-title').textContent = 'Editing Item';
    document.getElementById('menu-save-label').textContent = 'SAVE CHANGES';
    document.getElementById('menu-cancel-btn').style.display = 'inline-flex';

    // Highlight card
    document.querySelectorAll('.admin-card').forEach(c => c.classList.remove('selected'));
    document.getElementById(`card-${id}`)?.classList.add('selected');

    // Scroll form into view on small screens
    document.getElementById('menu-name-en').scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (err) {
    toast('Could not load item for editing', true);
  }
}

async function saveMenuItem() {
  const name_en = document.getElementById('menu-name-en').value.trim();
  const price   = document.getElementById('menu-price').value.trim();

  if (!name_en) { toast('Please enter a name (English)', true); return; }
  if (!price)   { toast('Please enter a price', true); return; }

  const payload = {
    name_en,
    name_mn:       document.getElementById('menu-name-mn').value.trim(),
    price:         Number(price),
    image:         document.getElementById('menu-image').value.trim(),
    tags:          document.getElementById('menu-tags').value.trim(),
    is_available:  document.getElementById('menu-available').checked,
    is_best_seller: document.getElementById('menu-bestseller').checked
  };

  try {
    if (editingMenuId) {
      await api('PUT', `/api/admin/menu/${editingMenuId}`, payload);
      toast('Item updated ✓');
    } else {
      await api('POST', '/api/admin/menu', payload);
      toast('Item added to menu ✓');
    }
    resetMenuForm();
    loadMenuPanel();
    loadOverview();
  } catch (err) {
    toast(err.message, true);
  }
}

async function deleteMenuItem(id, name) {
  if (!confirm(`Permanently delete "${name}"?`)) return;
  try {
    await api('DELETE', `/api/admin/menu/${id}`);
    toast(`"${name}" deleted`);
    if (editingMenuId === id) resetMenuForm();
    loadMenuPanel();
    loadOverview();
  } catch (err) {
    toast(err.message, true);
  }
}

function resetMenuForm() {
  editingMenuId = null;
  document.getElementById('menu-edit-id').value = '';
  document.getElementById('menu-name-en').value = '';
  document.getElementById('menu-name-mn').value = '';
  document.getElementById('menu-price').value   = '';
  document.getElementById('menu-tags').value    = '';
  document.getElementById('menu-image').value   = '';
  document.getElementById('menu-available').checked    = true;
  document.getElementById('menu-bestseller').checked   = false;
  document.getElementById('menu-drop').innerHTML = `<div class="icon">📷</div><p>Click or drag & drop to upload</p>`;
  document.getElementById('menu-form-title').textContent = 'Add New Item';
  document.getElementById('menu-save-label').textContent = '+ ADD TO MENU';
  document.getElementById('menu-cancel-btn').style.display = 'none';
  document.querySelectorAll('.admin-card').forEach(c => c.classList.remove('selected'));
}

// ─── HOME SLOTS PANEL ─────────────────────────────────────────────────────────

let slots = [];

async function loadHomePanel() {
  const grid = document.getElementById('slots-grid');
  if (!grid) return;

  try {
    slots = await api('GET', '/api/admin/home');
    renderSlotGrid();
  } catch (err) {
    grid.innerHTML = `<div style="color:var(--danger)">Error: ${err.message}</div>`;
  }
}

function renderSlotGrid() {
  const grid = document.getElementById('slots-grid');
  grid.innerHTML = slots.map(slot => {
    const filled = slot.name_en ? true : false;
    return `
      <div class="slot-card" id="slot-card-${slot.slot_number}" onclick="selectSlot(${slot.slot_number})">
        <img src="${slot.image || ''}" alt="Slot ${slot.slot_number}"
          onerror="this.src=''" style="background:var(--bg2)">
        <div class="slot-card-body">
          <div class="slot-num">Slot ${slot.slot_number}</div>
          <div class="slot-name">${filled ? slot.name_en : '— empty —'}</div>
          ${filled ? `<div class="slot-price">${Number(slot.price).toLocaleString()}₮</div>` : ''}
        </div>
      </div>`;
  }).join('');
}

function selectSlot(num) {
  const slot = slots.find(s => s.slot_number === num);
  if (!slot) return;

  // Update form
  document.getElementById('slot-num').value        = num;
  document.getElementById('slot-name-en').value    = slot.name_en || '';
  document.getElementById('slot-name-mn').value    = slot.name_mn || '';
  document.getElementById('slot-price').value      = slot.price || '';
  document.getElementById('slot-image').value      = slot.image || '';

  const drop = document.getElementById('slot-drop');
  drop.innerHTML = slot.image
    ? `<img src="${slot.image}" alt="Slot image"><p style="margin-top:6px;font-size:0.78rem;color:var(--muted)">Click to change</p>`
    : `<div class="icon">📷</div><p>Click or drag & drop</p>`;

  // Enable form
  ['slot-name-en','slot-name-mn','slot-price','slot-image'].forEach(id => {
    document.getElementById(id).disabled = false;
  });
  document.getElementById('slot-save-btn').disabled = false;
  document.getElementById('slot-title').textContent = `#${num}`;

  // Highlight selected slot
  document.querySelectorAll('.slot-card').forEach(c => c.classList.remove('active'));
  document.getElementById(`slot-card-${num}`)?.classList.add('active');
}

async function saveSlot() {
  const num = document.getElementById('slot-num').value;
  if (!num) return;

  const payload = {
    name_en: document.getElementById('slot-name-en').value.trim(),
    name_mn: document.getElementById('slot-name-mn').value.trim(),
    price:   Number(document.getElementById('slot-price').value) || 0,
    image:   document.getElementById('slot-image').value.trim()
  };

  try {
    await api('PUT', `/api/admin/home/${num}`, payload);
    toast(`Slot ${num} saved ✓`);

    // Update local state and re-render grid
    const idx = slots.findIndex(s => s.slot_number === Number(num));
    if (idx !== -1) slots[idx] = { ...slots[idx], ...payload };
    renderSlotGrid();
    document.getElementById(`slot-card-${num}`)?.classList.add('active');
    loadOverview();
  } catch (err) {
    toast(err.message, true);
  }
}

// ─── TRANSLATIONS PANEL ───────────────────────────────────────────────────────

let transData = [];

async function loadTranslationsPanel() {
  const tbody = document.getElementById('trans-body');
  if (!tbody) return;

  try {
    const rows = await api('GET', '/api/admin/translations');
    // Group by key: { key: { en, mn } }
    const grouped = {};
    for (const row of rows) {
      if (!grouped[row.key]) grouped[row.key] = { en: '', mn: '' };
      grouped[row.key][row.lang] = row.value;
    }
    transData = grouped;

    tbody.innerHTML = Object.entries(grouped).map(([key, vals]) => `
      <tr>
        <td>${key}</td>
        <td><input type="text" value="${escHTML(vals.en || '')}" data-key="${key}" data-lang="en"></td>
        <td><input type="text" value="${escHTML(vals.mn || '')}" data-key="${key}" data-lang="mn"></td>
      </tr>`
    ).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="3" style="color:var(--danger)">Error: ${err.message}</td></tr>`;
  }
}

async function saveAllTranslations() {
  const inputs = document.querySelectorAll('#trans-body input[data-key]');
  const updates = Array.from(inputs).map(inp => ({
    key:  inp.dataset.key,
    lang: inp.dataset.lang,
    value: inp.value
  }));

  try {
    await Promise.all(updates.map(u => api('PUT', '/api/admin/translations', u)));
    toast(`${updates.length} translation entries saved ✓`);
    // Clear sessionStorage so the frontend reloads fresh translations
    sessionStorage.removeItem('tf_translations');
  } catch (err) {
    toast('Save failed: ' + err.message, true);
  }
}
// ─── DAILY PICK PANEL ────────────────────────────────────────

async function loadDailyPanel() {
  try {
    const [pickData, menuItems] = await Promise.all([
      api('GET', '/api/admin/daily-pick'),
      api('GET', '/api/admin/menu')
    ]);

    // Fill the enabled checkbox
    document.getElementById('daily-enabled').checked = !!pickData.enabled;

    // Fill the dropdown with all available menu items
    const select = document.getElementById('daily-item-select');
    select.innerHTML = '<option value="">— Choose an item —</option>';
    menuItems.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = `${item.name_en} — ${Number(item.price).toLocaleString()}₮`;
      if (pickData.item_id === item.id) opt.selected = true;
      select.appendChild(opt);
    });

    // Show preview if item already selected
    if (pickData.item) updateDailyPreview(pickData.item);

    // Update preview when dropdown changes
    select.onchange = () => {
      const selected = menuItems.find(i => i.id === Number(select.value));
      if (selected) updateDailyPreview(selected);
      else hideDailyPreview();
    };

  } catch (err) {
    toast('Could not load daily pick: ' + err.message, true);
  }
}

function updateDailyPreview(item) {
  document.getElementById('daily-preview').style.display = 'block';
  document.getElementById('daily-preview-img').src = item.image || '';
  document.getElementById('daily-preview-name').textContent = item.name_en;
  document.getElementById('daily-preview-price').textContent =
    Number(item.price).toLocaleString() + '₮';
}

function hideDailyPreview() {
  document.getElementById('daily-preview').style.display = 'none';
}

async function saveDailyPick() {
  const enabled = document.getElementById('daily-enabled').checked;
  const item_id = Number(document.getElementById('daily-item-select').value) || null;

  if (enabled && !item_id) {
    toast('Please select a menu item first', true);
    return;
  }

  try {
    await api('PUT', '/api/admin/daily-pick', { enabled, item_id });
    toast('Daily pick saved ✓');
  } catch (err) {
    toast(err.message, true);
  }
}


// ─── DAILY PICK PANEL ────────────────────────────────────────

async function loadDailyPanel() {
  try {
    const [pickData, menuItems] = await Promise.all([
      api('GET', '/api/admin/daily-pick'),
      api('GET', '/api/admin/menu')
    ]);

    document.getElementById('daily-enabled').checked = !!pickData.enabled;

    const select = document.getElementById('daily-item-select');
    select.innerHTML = '<option value="">— Choose an item —</option>';
    menuItems.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = `${item.name_en} — ${Number(item.price).toLocaleString()}₮`;
      if (pickData.item_id === item.id) opt.selected = true;
      select.appendChild(opt);
    });

    if (pickData.item) updateDailyPreview(pickData.item);

    select.onchange = () => {
      const selected = menuItems.find(i => i.id === Number(select.value));
      if (selected) updateDailyPreview(selected);
      else hideDailyPreview();
    };

  } catch (err) {
    toast('Could not load daily pick: ' + err.message, true);
  }
}

function updateDailyPreview(item) {
  document.getElementById('daily-preview').style.display = 'block';
  document.getElementById('daily-preview-img').src = item.image || '';
  document.getElementById('daily-preview-name').textContent = item.name_en;
  document.getElementById('daily-preview-price').textContent =
    Number(item.price).toLocaleString() + '₮';
}

function hideDailyPreview() {
  document.getElementById('daily-preview').style.display = 'none';
}

async function saveDailyPick() {
  const enabled = document.getElementById('daily-enabled').checked;
  const item_id = Number(document.getElementById('daily-item-select').value) || null;

  if (enabled && !item_id) {
    toast('Please select a menu item first', true);
    return;
  }

  try {
    await api('PUT', '/api/admin/daily-pick', { enabled, item_id });
    toast('Daily pick saved ✓');
  } catch (err) {
    toast(err.message, true);
  }
}
// ─── Utils ────────────────────────────────────────────────────────────────────

function escHTML(str) {
  return str.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
