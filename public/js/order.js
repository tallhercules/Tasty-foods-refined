/**
 * order.js — Order page rendering and submission
 */

const DELIVERY_FEE = 5000;

function renderOrderPage() {
  const list = document.getElementById('order-list');
  if (!list) return;

  const items = Cart.getItems();

  if (items.length === 0) {
    list.innerHTML = `
      <div class="order-empty">
        <div class="empty-emoji">🍜</div>
        <p>Your cart is empty.</p>
        <p><a href="menu.html">Check out our menu</a> and add something delicious!</p>
      </div>`;
    updateSummary(0);
    document.getElementById('order-btn').disabled = true;
    return;
  }

  document.getElementById('order-btn').disabled = false;

  list.innerHTML = items.map((item, i) => {
    const img = resolveImg(item.image);
    const price = Number(item.price) || 0;
    return `
      <div class="order-item">
        <img src="${img}" alt="${item.name}" onerror="this.src='images/placeholder.png'">
        <div class="order-item-info">
          <h4>${item.name}</h4>
          <p>${price.toLocaleString()}₮</p>
        </div>
        <button class="order-remove" onclick="removeItem(${i})" title="Remove">✕</button>
      </div>`;
  }).join('');

  updateSummary(Cart.getTotal());
}

function removeItem(index) {
  Cart.remove(index);
  renderOrderPage();
}

function updateSummary(subtotal) {
  const delivery = subtotal > 0 ? DELIVERY_FEE : 0;
  const grand = subtotal + delivery;

  const sub = document.getElementById('subtotal');
  const del = document.getElementById('delivery');
  const grd = document.getElementById('grand-total');

  if (sub) sub.textContent = subtotal.toLocaleString() + '₮';
  if (del) del.textContent = delivery > 0 ? delivery.toLocaleString() + '₮' : 'Free';
  if (grd) grd.textContent = grand.toLocaleString() + '₮';
}

function sendOrder() {
  const items = Cart.getItems();
  if (items.length === 0) return;

  const address = document.getElementById('address')?.value.trim();
  const notes   = document.getElementById('notes')?.value.trim();

  if (!address) {
    Cart.toast('Please enter your delivery address.');
    document.getElementById('address')?.focus();
    return;
  }

  const subtotal = Cart.getTotal();
  const grand = subtotal + DELIVERY_FEE;

  const orderLines = items.map(i => `• ${i.name} — ${Number(i.price).toLocaleString()}₮`).join('\n');

  const message = [
    '🍖 *NEW ORDER — TASTY FOODS*',
    '',
    orderLines,
    '',
    `📦 Subtotal: ${subtotal.toLocaleString()}₮`,
    `🚚 Delivery: ${DELIVERY_FEE.toLocaleString()}₮`,
    `💰 *Total: ${grand.toLocaleString()}₮*`,
    '',
    `📍 Address: ${address}`,
    notes ? `📝 Notes: ${notes}` : '',
  ].filter(Boolean).join('\n');

  const whatsappNumber = '97686963877'; // Replace with real number
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/${whatsappNumber}?text=${encoded}`, '_blank');
}

function resolveImg(src) {
  if (!src) return 'images/placeholder.png';
  if (src.startsWith('http') || src.startsWith('/')) return src;
  if (src.startsWith('images/')) return src;
  return 'images/' + src;
}

// Expose globally so Cart.remove can trigger a re-render
window.renderOrderPage = renderOrderPage;

document.addEventListener('DOMContentLoaded', renderOrderPage);
