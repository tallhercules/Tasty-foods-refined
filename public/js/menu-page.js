/**
 * menu-page.js — Full menu page: load, filter, paginate
 */

let allItems = [];
let filtered = [];
let page = 1;
const PER_PAGE = 9;

async function loadMenu() {
  try {
    const res = await fetch('/api/menu');
    if (!res.ok) throw new Error('API error');
    allItems = await res.json();
    filtered = [...allItems];
    renderPage();
  } catch (err) {
    document.getElementById('food-grid').innerHTML =
      `<p style="grid-column:1/-1;text-align:center;padding:60px;color:#999">
        Could not load menu. Is the server running?
      </p>`;
  }
}

function renderPage() {
  const grid = document.getElementById('food-grid');
  if (!grid) return;

  const lang = Lang?.getLang?.() || 'mn';
  const start = (page - 1) * PER_PAGE;
  const pageItems = filtered.slice(start, start + PER_PAGE);

  if (pageItems.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:#999">
      No items in this category yet.
    </div>`;
    document.getElementById('pag-wrap').innerHTML = '';
    return;
  }

  grid.innerHTML = pageItems.map(item => {
    const name = lang === 'mn' && item.name_mn ? item.name_mn : item.name_en;
    const img = item.image || 'images/placeholder.png';
    const price = Number(item.price) || 0;

    return `
      <div class="grid-item">
        ${item.is_best_seller ? '<span class="best-tag">★ Best Seller</span>' : ''}
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

  Lang?.applyAll?.();
  renderPagination();
}

function renderPagination() {
  const wrap = document.getElementById('pag-wrap');
  if (!wrap) return;
  const total = Math.max(1, Math.ceil(filtered.length / PER_PAGE));

  wrap.innerHTML = total <= 1 ? '' : `
    <button class="pag-btn" onclick="changePage(-1)" ${page === 1 ? 'disabled' : ''}>← Prev</button>
    <span class="pag-info">Page ${page} of ${total}</span>
    <button class="pag-btn" onclick="changePage(1)" ${page === total ? 'disabled' : ''}>Next →</button>
  `;
}

function changePage(dir) {
  page += dir;
  renderPage();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function filterMenu(category, btn) {
  // Update button styles
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn?.classList.add('active');

  filtered = category === 'all'
    ? [...allItems]
    : allItems.filter(item => {
        const tags = (item.tags || '').toLowerCase();
        return tags.includes(category.toLowerCase());
      });

  page = 1;
  renderPage();
}

document.addEventListener('langchange', renderPage);
document.addEventListener('DOMContentLoaded', loadMenu);
