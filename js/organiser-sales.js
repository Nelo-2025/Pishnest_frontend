// Requires common.js loaded first.

function showSalesMessage(message, isError = false) {
  const el = document.getElementById('sales-message');
  if (!el) return;
  el.textContent = message;
  el.className = `form-notice ${isError ? 'error' : 'success'}`;
  el.style.display = 'block';
}

let currentSelectedEventId = '';

function formatDateTime(dateStr) {
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

function renderSummary(summary) {
  document.getElementById('sales-total-bookings').textContent = Number(summary.bookings_count || 0);
  document.getElementById('sales-total-tickets').textContent = Number(summary.tickets_sold || 0);
  document.getElementById('sales-total-revenue').textContent = `£${Number(summary.revenue || 0).toFixed(2)}`;
}

function renderEventFilter(events, selectedEventId) {
  const filterEl = document.getElementById('event-filter');
  if (!filterEl) return;

  const options = ['<option value="">All my events</option>'];
  (events || []).forEach((ev) => {
    const selected = String(ev.id) === String(selectedEventId) ? ' selected' : '';
    options.push(`<option value="${ev.id}"${selected}>${ev.title}</option>`);
  });
  filterEl.innerHTML = options.join('');
}

function renderEventPerformance(events) {
  const container = document.getElementById('event-performance-list');
  if (!container) return;

  if (!Array.isArray(events) || events.length === 0) {
    container.innerHTML = '<p>No organiser events found yet.</p>';
    return;
  }

  container.innerHTML = events.map((ev) => {
    return `
      <article class="record-card stack-sm">
        <h3>${ev.title}</h3>
        <p class="record-meta">📍 ${ev.venue || 'Location TBC'}</p>
        <p class="record-meta">🕒 ${formatDateTime(ev.start_datetime)}</p>
        <div class="metric-grid">
          <div class="metric-card">
            <h2>Bookings</h2>
            <div class="metric-value">${Number(ev.bookings_count || 0)}</div>
          </div>
          <div class="metric-card">
            <h2>Tickets</h2>
            <div class="metric-value">${Number(ev.tickets_sold || 0)}</div>
          </div>
          <div class="metric-card">
            <h2>Revenue</h2>
            <div class="metric-value">£${Number(ev.revenue || 0).toFixed(2)}</div>
          </div>
        </div>
      </article>`;
  }).join('');
}

function renderBookings(bookings) {
  const container = document.getElementById('attendee-bookings-list');
  if (!container) return;

  if (!Array.isArray(bookings) || bookings.length === 0) {
    container.innerHTML = '<p>No bookings found for this filter.</p>';
    return;
  }

  container.innerHTML = bookings.map((row) => {
    const status = String(row.status || '').toLowerCase();
    const actionButtons = [
      row.can_refund
        ? `<button type="button" class="btn" data-booking-action="refund" data-order-id="${row.order_id}">Refund</button>`
        : '',
      row.can_cancel
        ? `<button type="button" class="btn btn-ghost" data-booking-action="cancel" data-order-id="${row.order_id}">Cancel</button>`
        : ''
    ].filter(Boolean).join('');

    return `
      <article class="record-card stack-sm">
        <div class="record-head">
          <div>
            <h3>${row.event_title}</h3>
            <p class="record-meta">Attendee: ${row.attendee_name || 'Unknown'} (${row.attendee_email || 'no-email'})</p>
          </div>
          <span class="status-pill">${status || 'unknown'}</span>
        </div>
        <p class="record-meta">Order #${row.order_id} • ${formatDateTime(row.created_at)}</p>
        <p class="record-meta">Tickets: ${Number(row.tickets_count || 0)} • ${row.ticket_summary || 'No ticket summary'}</p>
        <p class="record-total">Total: £${Number(row.total_amount || 0).toFixed(2)}</p>
        ${actionButtons ? `<div class="button-row">${actionButtons}</div>` : ''}
      </article>`;
  }).join('');

  container.querySelectorAll('[data-booking-action]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const action = String(btn.getAttribute('data-booking-action') || '').toLowerCase();
      const orderId = Number(btn.getAttribute('data-order-id'));
      if (!orderId || (action !== 'cancel' && action !== 'refund')) return;

      const promptText = action === 'refund'
        ? 'Refund and cancel this booking? Ticket stock will be restored.'
        : 'Cancel this booking? Ticket stock will be restored.';

      if (!window.confirm(promptText)) return;

      btn.disabled = true;
      const data = await fetchJSON(`https://darkgoldenrod-reindeer-637131.hostingersite.com/backend/organiser-bookings.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, order_id: orderId })
      });

      if (data && data.success) {
        showSalesMessage(data.message || 'Booking updated successfully.');
        await loadSalesData(currentSelectedEventId);
      } else {
        showSalesMessage((data && data.error) || 'Could not update this booking.', true);
        btn.disabled = false;
      }
    });
  });
}

async function loadSalesData(eventId = '') {
  currentSelectedEventId = eventId || '';
  const query = new URLSearchParams();
  if (eventId) query.set('event_id', String(eventId));

  const data = await fetchJSON(`https://darkgoldenrod-reindeer-637131.hostingersite.com/backend/organiser-bookings.php${query.toString() ? `?${query.toString()}` : ''}`);
  if (!data || !data.success) {
    renderSummary({});
    renderEventPerformance([]);
    renderBookings([]);
    showSalesMessage((data && data.error) || 'Could not load sales and attendee data.', true);
    return;
  }

  renderSummary(data.summary || {});
  renderEventFilter(data.events || [], eventId);
  renderEventPerformance(data.events || []);
  renderBookings(data.bookings || []);
}

(async () => {
  const currentUser = await syncHeaderAuthUI(getCurrentUser());
  if (!currentUser) {
    window.location.href = `login.html?next=${encodeURIComponent('organiser-sales.html')}`;
    return;
  }

  if (!isOrganiserRole(currentUser)) {
    showSalesMessage('Only organiser accounts can access this page.', true);
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1000);
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const selectedEventId = params.get('event_id') || '';

  await loadSalesData(selectedEventId);

  const filterEl = document.getElementById('event-filter');
  if (filterEl) {
    filterEl.addEventListener('change', async () => {
      const eventId = filterEl.value;
      const nextUrl = eventId ? `organiser-sales.html?event_id=${encodeURIComponent(eventId)}` : 'organiser-sales.html';
      window.history.replaceState({}, '', nextUrl);
      await loadSalesData(eventId);
    });
  }
})();
