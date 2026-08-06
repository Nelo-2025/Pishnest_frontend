// Requires common.js loaded first (API_BASE, fetchJSON, getCurrentUser, etc.)

const HOME_EVENT_LIMIT = 10;

function sortEventsNewestFirst(events) {
  return [...events].sort((a, b) => {
    const aTime = new Date(a.start_datetime || 0).getTime();
    const bTime = new Date(b.start_datetime || 0).getTime();
    if (bTime !== aTime) return bTime - aTime;
    return Number(b.id || 0) - Number(a.id || 0);
  });
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
  renderSkeletons(grid, Math.min(HOME_EVENT_LIMIT, 6));

  const query = new URLSearchParams(params).toString();
  const data = await fetchJSON(`https://darkgoldenrod-reindeer-637131.hostingersite.com/backend/events.php${query ? '?' + query : ''}`);
  const events = sortEventsNewestFirst((data && data.events) || []).slice(0, HOME_EVENT_LIMIT);

  if (events.length === 0) {
    grid.innerHTML = `
      <div class="empty-state empty-state-full">
        <h3>No events found</h3>
        <p>Try a different search, or check back soon.</p>
      </div>`;
    return;
  }

  grid.innerHTML = events.map(renderEventCard).join('');
}

document.getElementById('search-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = document.getElementById('search-input').value.trim();
  const category = document.getElementById('category-select').value;
  loadEvents({ q, category });
});

(async () => {
  await syncHeaderAuthUI();
  await populateCategories((categoryId) => {
    const q = document.getElementById('search-input').value.trim();
    loadEvents({ q, category: categoryId });
  });
  loadEvents();
})();
