/**
 * home.js — Home page featured gallery
 */

let allHomeItems = [];

async function loadHomeGallery() {
  const grid = document.getElementById('food-grid');
  if (!grid) return;

  try {
    const res = await fetch('/api/home');
    if (!res.ok) throw new Error('API error');
    allHomeItems = await res.json();
    renderGallery(allHomeItems);
  } catch (err) {
    grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#999;padding:60px">
      Could not load menu. Make sure the server is running.
    </p>`;
    console.error('[home.js] Failed to load home items:', err);
  }
}

function renderGallery(items) {
  const grid = document.getElementById('food-grid');
  if (!grid) return;

  const lang = Lang?.getLang?.() || 'mn';
  const validItems = items.filter(item => item.name_en);

  if (validItems.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:#999;">
      No items in the home gallery yet. Add some from the admin panel.
    </div>`;
    return;
  }

  grid.innerHTML = validItems.map(item => {
    const name = lang === 'mn' && item.name_mn ? item.name_mn : item.name_en;
    const img = item.image || 'images/placeholder.png';
    const price = Number(item.price) || 0;

    return `
      <div class="grid-item">
        <img src="${img}" alt="${name}" loading="lazy" onerror="this.src='images/placeholder.png'">
        <div class="item-overlay">
          <div class="overlay-inner">
            <h4>${name}</h4>
            <div class="overlay-price">${price.toLocaleString()}<span>₮</span></div>
            <button class="add-btn" data-add
              data-name="${item.name_en}"
              data-price="${price}"
              data-image="${img}"
              data-key="add_to_order">Add to Order +</button>
          </div>
        </div>
      </div>`;
  }).join('');

  // Reapply translations for the add buttons
  Lang?.applyAll?.();
}

function filterGallery(query) {
  const q = query.toLowerCase().trim();
  const items = document.querySelectorAll('#food-grid .grid-item');
  items.forEach(item => {
    const name = item.querySelector('h4')?.textContent.toLowerCase() || '';
    item.classList.toggle('item-hidden', q !== '' && !name.includes(q));
  });
}

// Re-render when language changes
document.addEventListener('langchange', () => renderGallery(allHomeItems));

document.addEventListener('DOMContentLoaded', loadHomeGallery);

// ─── Daily Pick Popup ─────────────────────────────────────

async function loadDailyPopup() {
  try {
    const res = await fetch('/api/daily-pick');
    const data = await res.json();

    // Don't show if disabled or no item set
    if (!data.enabled || !data.item) return;

    // Check if user already saw it today
    const lastSeen = localStorage.getItem('tf_popup_seen');
    const today = new Date().toDateString();
    if (lastSeen === today) return;

    // Fill in the popup content
    const lang = Lang?.getLang?.() || 'mn';
    const name = lang === 'mn' && data.item.name_mn 
      ? data.item.name_mn 
      : data.item.name_en;

    document.getElementById('popup-name').textContent = name;
    document.getElementById('popup-price').textContent = 
      Number(data.item.price).toLocaleString() + '₮';
    document.getElementById('popup-img').src = data.item.image || '';

    // Wire up the add button
    const addBtn = document.getElementById('popup-add-btn');
    addBtn.onclick = () => {
      Cart.add(data.item.name_en, data.item.price, data.item.image);
      closePopup();
    };

    // Show after a small delay so page loads first
    setTimeout(() => {
      document.getElementById('daily-popup').classList.add('active');
      document.getElementById('daily-overlay').classList.add('active');
    }, 1500);

  } catch (err) {
    console.warn('[Popup] Could not load daily pick:', err.message);
  }
}

function closePopup() {
  document.getElementById('daily-popup').classList.remove('active');
  document.getElementById('daily-overlay').classList.remove('active');
  // Save today's date so it won't show again until tomorrow
  localStorage.setItem('tf_popup_seen', new Date().toDateString());
}

document.addEventListener('DOMContentLoaded', loadDailyPopup);