// Requires common.js loaded first.

function showBookingsMessage(message, isError = false) {
  const el = document.getElementById('bookings-message');
  if (!el) return;
  el.textContent = message;
  el.className = `form-notice ${isError ? 'error' : 'success'}`;
  el.style.display = 'block';
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return 'Date TBC';
  return d.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function renderBookings(orders) {
  const listEl = document.getElementById('bookings-list');
  if (!listEl) return;

  if (!Array.isArray(orders) || orders.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <h3>No bookings yet</h3>
        <p>You have not booked any tickets yet.</p>
        <a class="btn btn-primary" href="browse.html">Browse events</a>
      </div>`;
    return;
  }

  listEl.innerHTML = orders.map((order) => {
    const status = String(order.status || '').toLowerCase();
    const canCancel = !!order.can_cancel;

    return `
      <article class="record-card">
        <div class="record-head">
          <div>
            <h3>${order.event_title || 'Event'}</h3>
            <p class="record-meta">📍 ${order.venue || 'Location TBC'}</p>
            <p class="record-meta">🕒 ${formatDate(order.start_datetime)}</p>
          </div>
          <span class="status-pill">${status || 'unknown'}</span>
        </div>

        <div class="stack-sm page-stack">
          <p>Order #${order.id}</p>
          <p>Tickets: ${Number(order.tickets_count || 0)}</p>
          <p>${order.ticket_summary || 'Ticket details unavailable.'}</p>
          <p class="record-total">Total: £${Number(order.total_amount || 0).toFixed(2)}</p>
        </div>

        <div class="button-row">
          <a href="event.html?id=${encodeURIComponent(order.event_id)}" class="btn btn-ghost">View event</a>
          ${canCancel ? `<button type="button" class="btn" data-cancel-order="${order.id}">Cancel booking</button>` : ''}
        </div>
      </article>`;
  }).join('');

  listEl.querySelectorAll('[data-cancel-order]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const orderId = Number(btn.getAttribute('data-cancel-order'));
      if (!orderId) return;

      const ok = window.confirm('Cancel this booking? Your ticket quantities will be released back to stock.');
      if (!ok) return;

      btn.disabled = true;
      const data = await fetchJSON(`https://darkgoldenrod-reindeer-637131.hostingersite.com/backend/orders.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', order_id: orderId })
      });

      if (data && data.success) {
        showBookingsMessage(data.message || 'Booking cancelled successfully.');
        await loadMyBookings();
      } else {
        showBookingsMessage((data && data.error) || 'Could not cancel booking.', true);
        btn.disabled = false;
      }
    });
  });
}

async function loadMyBookings() {
  const data = await fetchJSON(`https://darkgoldenrod-reindeer-637131.hostingersite.com/backend/orders.php`);
  if (!data || !data.success) {
    renderBookings([]);
    showBookingsMessage((data && data.error) || 'Could not load your bookings.', true);
    return;
  }
  renderBookings(data.orders || []);
}

(async () => {
  const currentUser = await syncHeaderAuthUI(getCurrentUser());
  if (!currentUser) {
    window.location.href = `login.html?next=${encodeURIComponent('my-bookings.html')}`;
    return;
  }

  await loadMyBookings();
})();
