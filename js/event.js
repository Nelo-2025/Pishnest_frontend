// Requires common.js loaded first.

const params = new URLSearchParams(window.location.search);
const eventId = params.get('id');

let ticketState = {}; // { ticket_type_id: quantity }

function escapeHTML(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatListDate(dateStr) {
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

function renderEventList(events) {
  document.title = 'Events, PishNest';
  document.getElementById('breadcrumb-title').textContent = 'Events';
  document.getElementById('draft-banner-slot').innerHTML = '';

  const normalizedEvents = Array.isArray(events) ? events : [];

  if (normalizedEvents.length === 0) {
    document.getElementById('page-content').innerHTML = `
      <div class="error-block">
        <h2>No events available</h2>
        <p>There are currently no events to show.</p>
        <a href="organise.html" class="btn btn-primary">Create an event</a>
      </div>`;
    return;
  }

  const eventItems = normalizedEvents.map((ev) => {
    const id = Number(ev.id);
    const title = escapeHTML(ev.title || ev.event_name || 'Untitled event');
    const venue = escapeHTML(ev.venue || 'Location TBC');
    const category = escapeHTML(ev.category_name || 'General');
    const organiser = escapeHTML(ev.organiser_name || ev.organizer_name || 'Event organiser');
    const dateLabel = escapeHTML(formatListDate(ev.start_datetime));
    const status = String(ev.status || 'published').toLowerCase();
    const showStatus = status !== 'published';
    const statusBadge = showStatus
      ? `<span class="status-pill status-pill-draft">${escapeHTML(status)}</span>`
      : '';

    return `
      <a href="event.html?id=${encodeURIComponent(id)}" class="event-item record-card">
        <div class="record-head">
          <h3>${title}</h3>
          ${statusBadge}
        </div>
        <p class="record-meta">${category} • ${dateLabel}</p>
        <p class="record-meta">${icon('mapPin', 'icon icon-sm')} ${venue}</p>
        <p class="record-meta">By ${organiser}</p>
      </a>`;
  }).join('');

  document.getElementById('page-content').innerHTML = `
    <section>
      <h1>All Events</h1>
      <p class="section-subtitle">Browse upcoming events and open any event for full details and tickets.</p>
      <div class="event-list result-list page-stack">${eventItems}</div>
    </section>`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return { day: 'Date TBC', time: '' };
  const day = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return { day, time };
}

function initials(name) {
  return (name || 'O').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

function renderError(message) {
  document.getElementById('page-content').innerHTML = `
    <div class="error-block">
      <h2>Event not found</h2>
      <p>${message || "This event may have been removed or the link is incorrect."}</p>
      <a href="index.html" class="btn btn-primary">Back to events</a>
    </div>`;
}

function renderDraftBanner(ev) {
  if (!ev.is_owner_preview) return '';
  const label = ev.status === 'draft' ? 'Draft' : ev.status;
  return `
    <div class="draft-banner">
      <div class="inner">
        <span><strong>${label}, only visible to you.</strong> This is how your event will look once published.</span>
        <div class="actions">
          <a href="organise.html?edit=${ev.id}">Edit</a>
        </div>
      </div>
    </div>`;
}

function renderEvent(ev) {
  document.title = `${ev.title}, PishNest`;
  document.getElementById('breadcrumb-title').textContent = ev.title;
  document.getElementById('draft-banner-slot').innerHTML = renderDraftBanner(ev);

  const start = formatDate(ev.start_datetime);
  const end = ev.end_datetime ? formatDate(ev.end_datetime) : null;

  // Ownership is checked against THIS event's organiser_id specifically -
  // not just "is this user an organiser at all". The previous version
  // checked role only, which meant Organiser B would see a "Manage / Edit"
  // link and a "You (Organiser)" badge on Organiser A's event, even though
  // the backend would (correctly) reject any edit attempt. That mismatch
  // was confusing/misleading even though it wasn't exploitable.
  const currentUser = getCurrentUser();
  const isOwner = !!(currentUser && Number(currentUser.id) === Number(ev.organiser_id));

  const ticketTypes = ev.ticket_types && ev.ticket_types.length > 0 ? ev.ticket_types : [];
  const isPast = eventHasPassed(ev);
  const hasTicketTypes = ticketTypes.length > 0;
  const allSoldOut = hasTicketTypes && ticketTypes.every((t) => {
    const remaining = Number(t.quantity_available) - Number(t.quantity_sold);
    return remaining <= 0;
  });
  const ticketsUnavailable = isPast || !hasTicketTypes || allSoldOut;

  let ticketRows;
  let checkoutLabel = 'Select tickets to continue';

  if (isPast) {
    ticketRows = `<p class="text-muted">This event has already taken place. Tickets are no longer on sale.</p>`;
    checkoutLabel = 'Event has ended';
  } else if (!hasTicketTypes) {
    ticketRows = `<p class="text-muted">Tickets are not available for this event.</p>`;
    checkoutLabel = 'Not available';
  } else if (allSoldOut) {
    ticketRows = `
      <div class="ticket-soldout-banner">
        <strong>Sold out</strong>
        <p class="text-muted">All tickets for this event have been sold.</p>
      </div>
      ${ticketTypes.map((t) => {
        const priceLabel = Number(t.price) === 0
          ? '<div class="price free">Free</div>'
          : `<div class="price">£${Number(t.price).toFixed(2)}</div>`;
        return `
      <div class="ticket-row is-sold-out" data-ticket-id="${t.id}" data-price="${t.price}" data-max="0">
        <div class="info">
          <div class="name">${escapeHTML(t.name)}</div>
          ${priceLabel}
          <div class="stock">Sold out</div>
        </div>
        <div class="qty-control">
          <button class="qty-btn minus" disabled aria-label="Decrease quantity"></button>
          <span class="qty-value">0</span>
          <button class="qty-btn plus" disabled aria-label="Increase quantity">+</button>
        </div>
      </div>`;
      }).join('')}`;
    checkoutLabel = 'Sold out';
  } else {
    ticketRows = ticketTypes.map((t) => {
      const remaining = Number(t.quantity_available) - Number(t.quantity_sold);
      const soldOut = remaining <= 0;
      const priceLabel = Number(t.price) === 0
        ? '<div class="price free">Free</div>'
        : `<div class="price">£${Number(t.price).toFixed(2)}</div>`;

      return `
      <div class="ticket-row${soldOut ? ' is-sold-out' : ''}" data-ticket-id="${t.id}" data-price="${t.price}" data-max="${Math.max(0, remaining)}">
        <div class="info">
          <div class="name">${escapeHTML(t.name)}</div>
          ${priceLabel}
          <div class="stock">${soldOut ? 'Sold out' : remaining <= 10 ? `Only ${remaining} left` : 'Available'}</div>
        </div>
        <div class="qty-control">
          <button class="qty-btn minus" ${soldOut ? 'disabled' : ''} aria-label="Decrease quantity"></button>
          <span class="qty-value">0</span>
          <button class="qty-btn plus" ${soldOut ? 'disabled' : ''} aria-label="Increase quantity">+</button>
        </div>
      </div>`;
    }).join('');
  }

  document.getElementById('page-content').innerHTML = `
    <div class="event-layout">
      <div>
        <div class="banner" style="background-image:url('${getEventImageUrl(ev)}'); background-size:cover; background-position:center;">
          <span class="category-tag">${ev.category_name || 'General'}</span>
          <div class="banner-actions">
            ${isOwner ? `<a href="organise.html?edit=${ev.id}" class="btn btn-ghost">${icon('settings', 'icon icon-sm')} Manage / Edit</a>` : ''}
            <button class="save-btn" aria-label="Save event">${icon('heart', 'icon')}</button>
          </div>
        </div>

        <div class="title-block">
          <h1>${ev.title}</h1>

          <div class="meta-row">
            <div class="meta-item">
              <div class="meta-icon">${icon('calendar', 'icon')}</div>
              <div><div class="label">Date</div><div class="value">${start.day}</div></div>
            </div>
            <div class="meta-item">
              <div class="meta-icon">${icon('clock', 'icon')}</div>
              <div><div class="label">Time</div><div class="value">${start.time}${end ? ' to ' + end.time : ''}</div></div>
            </div>
            <div class="meta-item">
              <div class="meta-icon">${icon('mapPin', 'icon')}</div>
              <div><div class="label">Venue</div><div class="value">${ev.venue || 'TBC'}</div></div>
            </div>
          </div>

          <div class="organiser-card">
            <div class="organiser-avatar">${initials(ev.organiser_name)}</div>
            <div>
              <div class="name">${ev.organiser_name || 'Event organiser'}</div>
              <div class="role">${isOwner ? 'You (Organiser)' : 'Organiser'}</div>
            </div>
            ${!isOwner ? `<button class="btn btn-ghost">Follow</button>` : `<span class="status-pill">Managing</span>`}
          </div>

          <div class="section-title">About this event</div>
          <div class="description">${(ev.description || 'No description provided yet.').split('\n').map((p) => `<p>${p}</p>`).join('')}</div>

          <div class="section-title">Location</div>
          <div class="venue-box">
            <div class="venue-map">${icon('mapPin', 'icon')} Map preview</div>
            <div class="venue-info">
              <div class="name">${ev.venue || 'Location TBC'}</div>
              <div class="address">${ev.address || 'Full address shown after booking'}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="ticket-panel${ticketsUnavailable ? ' is-unavailable' : ''}">
        <h2>Tickets</h2>
        <div id="ticket-rows">${ticketRows}</div>

        <div class="perforation"></div>

        <div class="summary-row"><span>Tickets</span><span id="summary-count">0</span></div>
        <div class="summary-row total"><span>Total</span><span id="summary-total">£0.00</span></div>

        <button class="checkout-btn" id="checkout-btn" disabled>${checkoutLabel}</button>
        ${ticketsUnavailable ? '' : '<p class="ticket-guest-note">No account needed, you can book with just your name and email.</p>'}
        <div class="low-stock-note hidden-inline" id="low-stock-note">Almost sold out, grab yours before they're gone.</div>
      </div>
    </div>
  `;

  if (!ticketsUnavailable) attachTicketHandlers(ev.id);
}

function attachTicketHandlers(eventId) {
  document.querySelectorAll('.ticket-row').forEach((row) => {
    const ticketId = row.dataset.ticketId;
    const price = parseFloat(row.dataset.price);
    const max = parseInt(row.dataset.max, 10);
    const qtyEl = row.querySelector('.qty-value');

    ticketState[ticketId] = { qty: 0, price, max };

    row.querySelector('.minus').addEventListener('click', () => {
      const s = ticketState[ticketId];
      if (s.qty > 0) s.qty--;
      qtyEl.textContent = s.qty;
      updateSummary();
    });
    row.querySelector('.plus').addEventListener('click', () => {
      const s = ticketState[ticketId];
      if (s.qty < s.max) s.qty++;
      qtyEl.textContent = s.qty;
      updateSummary();
    });
  });

  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      const items = Object.entries(ticketState)
        .filter(([, s]) => s.qty > 0)
        .map(([ticketTypeId, s]) => ({ ticket_type_id: ticketTypeId, quantity: s.qty }));

      if (items.length === 0) return;

      sessionStorage.setItem('checkout_event_id', eventId);
      sessionStorage.setItem('checkout_items', JSON.stringify(items));
      window.location.href = 'checkout.html';
    });
  }
}

function updateSummary() {
  let count = 0, total = 0;
  Object.values(ticketState).forEach((s) => { count += s.qty; total += s.qty * s.price; });

  document.getElementById('summary-count').textContent = count;
  document.getElementById('summary-total').textContent = `£${total.toFixed(2)}`;

  const btn = document.getElementById('checkout-btn');
  btn.disabled = count === 0;
  btn.textContent = count === 0 ? 'Select tickets to continue' : `Continue, ${count} ticket${count > 1 ? 's' : ''}`;
}

async function init() {
  await syncHeaderAuthUI(getCurrentUser());

  if (!eventId) {
    const listData = await fetchJSON(`https://pishnest.co.uk/backend/events.php`);
    const events = (listData && listData.events)
      || (listData && listData.data)
      || (Array.isArray(listData) ? listData : []);

    if (listData && listData.success === false && !Array.isArray(events)) {
      renderError((listData && listData.error) || 'Could not load events.');
      return;
    }

    renderEventList(events);
    return;
  }
// search for a specific event by scrolling down the list of
//  events and selecting it from the dropdown menu. 
// If the event is not found, an error message will be displayed.
 document.getElementById('search-event-button').addEventListener('click', async () => {
    const selectEl = document.getElementById('search-event-select');
    const selectedEventId = selectEl.value;
    if (!selectedEventId) {
      alert('Please select an event to search for.');
      return;
    }
    window.location.href = `event.html?id=${encodeURIComponent(selectedEventId)}`;
  });

  const data = await fetchJSON(`https://pishnest.co.uk/backend/event.php?id=${encodeURIComponent(eventId)}`);
  const eventData = (data && data.event)
    || (data && data.data)
    || ((data && data.success && data.id) ? data : null);

  if (!eventData) {
    renderError();
    return;
  }
  renderEvent(eventData);
}

init();
