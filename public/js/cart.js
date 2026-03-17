/**
 * cart.js — Tasty Foods Cart Engine
 * Handles all cart state, UI updates, sidebar open/close, and toast notifications.
 * Import this on every customer-facing page.
 */

const Cart = (() => {

  // ─── State ──────────────────────────────────────────────────────────────────
  let items = [];

  function load() {
    try { items = JSON.parse(localStorage.getItem('tf_cart')) || []; }
    catch { items = []; }
  }

  function save() {
    localStorage.setItem('tf_cart', JSON.stringify(items));
  }
  // Always start at top on load
history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

  // ─── Public API ──────────────────────────────────────────────────────────────
  function add(name, price, image) {
    load();
    items.push({ name, price: Number(price), image: image || '' });
    save();
    render();
    toast(`${name} added to order!`);
    open();
  }

  function remove(index) {
    load();
    items.splice(index, 1);
    save();
    render();
    // Also update order page if it's open
    if (typeof window.renderOrderPage === 'function') window.renderOrderPage();
  }

  function clear() {
    items = [];
    save();
    render();
  }

  function getItems() { load(); return [...items]; }
  function getCount() { load(); return items.length; }
  function getTotal() { load(); return items.reduce((s, i) => s + i.price, 0); }

  // ─── Render ──────────────────────────────────────────────────────────────────
  function render() {
    load();

    // Float badge
    const badge = document.getElementById('cart-badge');
    if (badge) badge.textContent = items.length;

    // Nav order link badge
    const navBadge = document.getElementById('nav-cart-badge');
    if (navBadge) {
      navBadge.textContent = items.length;
      navBadge.style.display = items.length > 0 ? 'inline-flex' : 'none';
    }

    // Cart sidebar items
    const container = document.getElementById('cart-items');
    if (!container) return;

    if (items.length === 0) {
      container.innerHTML = `
        <div class="cart-empty">
          <div class="empty-icon">🍱</div>
          <p>Your tray is empty</p>
        </div>`;
    } else {
      container.innerHTML = items.map((item, i) => {
        const img = resolveImage(item.image);
        return `
          <div class="cart-item">
            <img src="${img}" alt="${item.name}" onerror="this.src='images/placeholder.png'">
            <div class="cart-item-info">
              <strong>${item.name}</strong>
              <p>${item.price.toLocaleString()}₮</p>
            </div>
            <button class="cart-remove" onclick="Cart.remove(${i})" aria-label="Remove">✕</button>
          </div>`;
      }).join('');
    }

    // Total
    const totalEl = document.getElementById('cart-total');
    if (totalEl) totalEl.textContent = getTotal().toLocaleString() + '₮';
  }

  // ─── Sidebar Controls ────────────────────────────────────────────────────────
  function open() {
    document.getElementById('cart-sidebar')?.classList.add('open');
    document.getElementById('cart-overlay')?.classList.add('active');
    document.querySelector('.float-cart')?.style.setProperty('display', 'none');
  }

  function close() {
    document.getElementById('cart-sidebar')?.classList.remove('open');
    document.getElementById('cart-overlay')?.classList.remove('active');
    document.querySelector('.float-cart')?.style.setProperty('display', 'flex');
  }

  function toggle() {
    const sidebar = document.getElementById('cart-sidebar');
    if (!sidebar) return;
    sidebar.classList.contains('open') ? close() : open();
  }

  // ─── Toast ───────────────────────────────────────────────────────────────────
  function toast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 3000);
  }

  // ─── Utils ───────────────────────────────────────────────────────────────────
  function resolveImage(src) {
    if (!src) return 'images/placeholder.png';
    if (src.startsWith('http') || src.startsWith('/')) return src;
    if (src.startsWith('images/')) return src;
    return 'images/' + src;
  }

  // ─── Init ────────────────────────────────────────────────────────────────────
  function init() {
    load();
    render();

    document.getElementById('cart-overlay')?.addEventListener('click', close);

    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-add]');
      if (!btn) return;
      add(btn.dataset.name, btn.dataset.price, btn.dataset.image);
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  return { add, remove, clear, getItems, getCount, getTotal, open, close, toggle, render, toast };

})();

window.Cart = Cart;

// ─── Page transition on link click ───────────────────────
document.addEventListener('click', e => {
  const link = e.target.closest('a[href]');
  if (!link) return;

  const href = link.getAttribute('href');

  if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto')) return;

  e.preventDefault();
  document.body.classList.add('fade-out');

  setTimeout(() => {
    window.location.href = href;
  }, 380);
});

// ─── Scroll animations ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const scrollEls = document.querySelectorAll(
    '.gallery-section, .features-section, .feature-card, .filter-bar, .menu-grid-wrap'
  );

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('scroll-visible');
      } else {
        entry.target.style.transitionDelay = '0s';
        entry.target.classList.remove('scroll-visible');
        setTimeout(() => entry.target.style.transitionDelay = '', 50);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -80px 0px' });

  scrollEls.forEach(el => observer.observe(el));
});