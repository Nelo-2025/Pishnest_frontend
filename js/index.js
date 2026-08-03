// Requires common.js loaded first (API_BASE, fetchJSON, getCurrentUser, etc.)

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
        <div class="foot">
          <span class="from">from</span>
          ${price}
        </div>
      </div>
    </a>`;
}

function renderSkeletons(container, count) {
  container.innerHTML = Array.from({ length: count }).map(() => `
    <div class="event-card">
      <div class="thumb skeleton skeleton-thumb"></div>
      <div class="body">
        <div class="skeleton skeleton-line-lg"></div>
        <div class="skeleton skeleton-line-sm"></div>
      </div>
    </div>`).join('');
}

async function loadEvents(params = {}) {
  const grid = document.getElementById('event-grid');
  if (!grid) return;
  renderSkeletons(grid, 6);

  const query = new URLSearchParams(params).toString();
  const data = await fetchJSON(`https://darkgoldenrod-reindeer-637131.hostingersite.com/backend/events.php${query ? '?' + query : ''}`);
  const events = (data && data.events) || [];

  if (events.length === 0) {
    grid.innerHTML = `
      <div class="empty-state empty-state-full">
        <h3>No events found</h3>
        <p>Try a different search, or check back soon.</p>
      </div>`;
    document.getElementById('stat-events').textContent = '0';
    document.getElementById('stat-cities').textContent = '0';
    return;
  }

  grid.innerHTML = events.map(eventCard).join('');
  document.getElementById('stat-events').textContent = events.length;
  const cities = new Set(events.map((e) => e.venue).filter(Boolean));
  document.getElementById('stat-cities').textContent = cities.size;
}

function setupOrganiseLinkGuard() {
  const organiseLink = document.getElementById('organise-link');
  if (!organiseLink) return;

  organiseLink.addEventListener('click', (event) => {
    const currentUser = getCurrentUser();

    if (!currentUser) {
      event.preventDefault();
      window.location.href = `login.html?next=${encodeURIComponent('organise.html')}`;
      return;
    }
    if (!isOrganiserRole(currentUser)) {
      event.preventDefault();
      window.alert('Only organiser accounts can create events.');
      window.location.href = 'dashboard.html';
    }
  });
}

document.getElementById('search-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = document.getElementById('search-input').value.trim();
  const category = document.getElementById('category-select').value;
  loadEvents({ q, category });
});

(async () => {
  await syncHeaderAuthUI();
  await populateCategories((categoryId) => loadEvents({ category: categoryId }));
  loadEvents();
  setupOrganiseLinkGuard();
})();
