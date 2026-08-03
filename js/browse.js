// Requires common.js loaded first.

function formatDateBadge(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return { day: '--', month: '---' };
  return { day: d.getDate(), month: d.toLocaleString('en-GB', { month: 'short' }).toUpperCase() };
}

function eventCard(ev) {
  const badge = formatDateBadge(ev.start_datetime);
  const price = (ev.min_price === 0 || ev.min_price === null)
    ? '<span class="amount free">Free</span>'
    : `<span class="amount">£${Number(ev.min_price).toFixed(2)}</span>`;

  return `
    <a class="event-card" href="event.html?id=${ev.id}">
      <div class="thumb">
        <span class="category-tag">${ev.category_name || 'General'}</span>
        <div class="date-badge"><strong>${badge.day}</strong>${badge.month}</div>
      </div>
      <div class="body">
        <h3>${ev.title}</h3>
        <div class="loc">📍 ${ev.venue || 'Location TBC'}</div>
        <div class="foot"><span class="from">from</span>${price}</div>
      </div>
    </a>`;
}

async function loadEvents() {
  const grid = document.getElementById('event-grid');
  const urlParams = new URLSearchParams(window.location.search);
  const category = urlParams.get('category') || '';
  const q = urlParams.get('q') || '';

  const query = new URLSearchParams({ ...(category && { category }), ...(q && { q }) }).toString();
  const data = await fetchJSON(`https://darkgoldenrod-reindeer-637131.hostingersite.com/backend/events.php${query ? '?' + query : ''}`);
  const events = Array.isArray(data)
    ? data
    : ((data && Array.isArray(data.events)) ? data.events : ((data && Array.isArray(data.data)) ? data.data : []));

  grid.innerHTML = events.length
    ? events.map(eventCard).join('')
    : `<div class="empty-state"><h3>No events found</h3><p>Try a different search, or check back soon.</p></div>`;
}

loadEvents();
