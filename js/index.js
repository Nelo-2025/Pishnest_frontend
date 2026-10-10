// Requires common.js loaded first (API_BASE, fetchJSON, getCurrentUser, etc.)

const HOME_EVENT_LIMIT = 10;

function getHomeFilters() {
  return {
    q: (document.getElementById('search-input') && document.getElementById('search-input').value.trim()) || '',
    category: (document.getElementById('category-select') && document.getElementById('category-select').value) || '',
    date: (document.getElementById('date-select') && document.getElementById('date-select').value) || ''
  };
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

function setHomeResultsCopy(text) {
  const el = document.getElementById('home-results-copy');
  if (el) el.textContent = text;
}

async function loadEvents(params = {}) {
  const grid = document.getElementById('event-grid');
  if (!grid) return;
  renderSkeletons(grid, Math.min(HOME_EVENT_LIMIT, 6));

  const filters = { ...getHomeFilters(), ...params };
  const query = new URLSearchParams({
    ...(filters.q && { q: filters.q }),
    ...(filters.category && { category: filters.category })
  }).toString();

  const data = await fetchJSON(`https://pishnest.co.uk/backend/events.php${query ? '?' + query : ''}`);
  let events = (data && data.events) || [];
  events = events.filter((ev) => matchesEventDate(ev, filters.date));
  events = sortEventsUpcomingFirst(events).slice(0, HOME_EVENT_LIMIT);

  const hasFilters = !!(filters.q || filters.category || filters.date);
  if (hasFilters) {
    setHomeResultsCopy(events.length === 1
      ? '1 activity matches your search.'
      : `${events.length} activities match your search.`);
  } else {
    setHomeResultsCopy('Latest activities from organisers, launching with Essex families first.');
  }

  if (events.length === 0) {
    grid.innerHTML = `
      <div class="empty-state empty-state-full">
        <h3>No activities found</h3>
        <p>Try a different search or date, or <a href="discover.html">browse all activities</a>.</p>
      </div>`;
    return;
  }

  grid.innerHTML = events.map(renderEventCard).join('');
}

document.getElementById('search-form').addEventListener('submit', (e) => {
  e.preventDefault();
  loadEvents();
  const happening = document.getElementById('happening');
  if (happening) happening.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.getElementById('date-select')?.addEventListener('change', () => loadEvents());

(async () => {
  await syncHeaderAuthUI();
  await populateCategories((categoryId) => {
    loadEvents({ category: categoryId });
  });
  loadEvents();
})();
