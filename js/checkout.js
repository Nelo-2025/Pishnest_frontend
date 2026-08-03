// Requires common.js loaded first.

async function loadOrderSummary() {
  const summaryEl = document.getElementById('order-summary');
  const eventId = sessionStorage.getItem('checkout_event_id');
  const items = JSON.parse(sessionStorage.getItem('checkout_items') || 'null');

  if (!eventId || !items || items.length === 0) {
    summaryEl.innerHTML = `<p>No tickets selected. <a href="index.html">Browse events</a> to pick some first.</p>`;
    document.getElementById('checkout-submit').disabled = true;
    return;
  }

  const data = await fetchJSON(`https://darkgoldenrod-reindeer-637131.hostingersite.com/backend/event.php?id=${encodeURIComponent(eventId)}`);
  if (!data || !data.success || !data.event) {
    summaryEl.innerHTML = `<p>Could not load this event.</p>`;
    document.getElementById('checkout-submit').disabled = true;
    return;
  }

  const ev = data.event;
  let total = 0;
  const rows = items.map((item) => {
    const ticket = (ev.ticket_types || []).find((t) => String(t.id) === String(item.ticket_type_id));
    const price = ticket ? Number(ticket.price) : 0;
    const lineTotal = price * item.quantity;
    total += lineTotal;
    return `<p>${item.quantity} × ${ticket ? ticket.name : 'Ticket'} — £${lineTotal.toFixed(2)}</p>`;
  }).join('');

  summaryEl.innerHTML = `
    <h3 class="order-summary-title">${ev.title}</h3>
    <p class="text-muted">📍 ${ev.venue || 'TBC'}</p>
    <div class="order-lines">${rows}</div>
    <p class="record-total">Total: £${total.toFixed(2)}</p>
  `;
}

function showCheckoutMessage(msg, isError = false) {
  const el = document.getElementById('checkout-message');
  el.textContent = msg;
  el.className = `form-notice ${isError ? 'error' : 'success'}`;
  el.style.display = 'block';
}

document.getElementById('checkout-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  const eventId = sessionStorage.getItem('checkout_event_id');
  const items = JSON.parse(sessionStorage.getItem('checkout_items') || 'null');

  // Validation happens BEFORE any network request now — the previous
  // version fired the fetch first and only checked afterward.
  if (!eventId || !items || items.length === 0) {
    showCheckoutMessage('No items selected for checkout.', true);
    return;
  }
  if (items.some((item) => item.quantity <= 0)) {
    showCheckoutMessage('Invalid item quantity selected.', true);
    return;
  }

  if (!getCurrentUser()) {
    window.location.href = `login.html?next=${encodeURIComponent('checkout.html')}`;
    return;
  }

  const submitBtn = document.getElementById('checkout-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Processing…';

  const data = await fetchJSON(`https://darkgoldenrod-reindeer-637131.hostingersite.com/backend/checkout.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_id: eventId, items })
  });

  if (data && data.success) {
    sessionStorage.setItem('last_order_id', data.order_id);
    sessionStorage.setItem('last_order_total', data.total_amount);
    sessionStorage.removeItem('checkout_event_id');
    sessionStorage.removeItem('checkout_items');
    document.getElementById('checkout-form').reset();
    window.location.href = 'confirmation.html';
  } else {
    showCheckoutMessage((data && data.error) || 'Checkout failed. Please try again.', true);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Confirm booking (demo — no payment taken)';
  }
});

(async () => {
  await refreshCurrentUser();
  loadOrderSummary();
})();
