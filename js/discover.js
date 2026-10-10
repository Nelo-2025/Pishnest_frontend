// Requires common.js loaded first.

const PAGE_SIZE = 9;
const DEFAULT_AUDIENCE = '';

let filteredEvents = [];
let currentPage = 1;

function getFiltersFromForm() {
  return {
    q: document.getElementById('discover-q').value.trim(),
    audience: document.getElementById('discover-audience').value,
    category: document.getElementById('discover-category').value,
    date: document.getElementById('discover-date').value
  };
}

function syncFiltersToUrl(filters, page) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (key === 'audience') {
      params.set('audience', value || 'all');
      return;
    }
    if (value) params.set(key, value);
  });
  if (page > 1) params.set('page', String(page));
  const next = params.toString();
  window.history.replaceState({}, '', next ? `discover.html?${next}` : 'discover.html');
}

function applyFiltersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const section = (params.get('section') || '').toLowerCase();
  const rawAudience = params.get('audience') || (section === 'kids' || section === 'general' ? section : '');
  const audience = rawAudience === 'all' || rawAudience === 'general' ? '' : rawAudience;
  const page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);

  document.getElementById('discover-q').value = params.get('q') || '';
  document.getElementById('discover-audience').value = audience || DEFAULT_AUDIENCE;
  document.getElementById('discover-date').value = params.get('date') || params.get('from') || '';
  currentPage = page;
  return params.get('category') || '';
}

function getTotalPages() {
  return Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
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

function renderPagination() {
  const pagination = document.getElementById('discover-pagination');
  if (!pagination) return;

  const totalPages = getTotalPages();
  if (filteredEvents.length === 0 || totalPages <= 1) {
    pagination.innerHTML = '';
    pagination.classList.add('hidden');
    return;
  }

  pagination.classList.remove('hidden');
  const prevDisabled = currentPage <= 1 ? 'disabled' : '';
  const nextDisabled = currentPage >= totalPages ? 'disabled' : '';

  let pageButtons = '';
  for (let page = 1; page <= totalPages; page += 1) {
    pageButtons += `
      <button type="button" class="page-btn${page === currentPage ? ' is-active' : ''}" data-page="${page}" aria-label="Page ${page}"${page === currentPage ? ' aria-current="page"' : ''}>
        ${page}
      </button>`;
  }

  pagination.innerHTML = `
    <button type="button" class="page-btn" data-page="${currentPage - 1}" ${prevDisabled} aria-label="Previous page">Previous</button>
    <div class="page-numbers">${pageButtons}</div>
    <button type="button" class="page-btn" data-page="${currentPage + 1}" ${nextDisabled} aria-label="Next page">Next</button>
  `;

  pagination.querySelectorAll('[data-page]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.disabled) return;
      const page = Number(button.dataset.page);
      if (!page || page === currentPage) return;
      currentPage = page;
      renderCurrentPage();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

function renderCurrentPage() {
  const grid = document.getElementById('event-grid');
  const countEl = document.getElementById('discover-count');
  const filters = getFiltersFromForm();
  const totalPages = getTotalPages();

  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  syncFiltersToUrl(filters, currentPage);

  if (countEl) {
    if (filteredEvents.length === 0) {
      countEl.textContent = '0 activities found';
    } else {
      const start = (currentPage - 1) * PAGE_SIZE + 1;
      const end = Math.min(currentPage * PAGE_SIZE, filteredEvents.length);
      countEl.textContent = filteredEvents.length === 1
        ? '1 activity found'
        : `Showing ${start} to ${end} of ${filteredEvents.length} activities`;
    }
  }

  if (filteredEvents.length === 0) {
    grid.innerHTML = `<div class="empty-state empty-state-full"><h3>No activities match</h3><p>Try clearing a filter or choosing another date.</p></div>`;
    renderPagination();
    return;
  }

  const pageItems = filteredEvents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  grid.innerHTML = pageItems.map(renderEventCard).join('');
  renderPagination();
}

async function loadCategories(selectedCategory) {
  const raw = await fetchJSON('https://pishnest.co.uk/backend/categories.php');
  const categories = Array.isArray(raw)
    ? raw
    : ((raw && Array.isArray(raw.categories)) ? raw.categories : []);

  const combo = document.querySelector('#discover-filters [data-category-combo]');
  if (combo) {
    setupCategoryCombo(combo, categories, { initialValue: selectedCategory || '' });
    return;
  }

  const select = document.getElementById('discover-category');
  if (!select) return;
  categories.forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.name;
    select.appendChild(opt);
  });
  if (selectedCategory) select.value = selectedCategory;
}

async function loadDiscoverEvents({ resetPage = true } = {}) {
  const grid = document.getElementById('event-grid');
  const filters = getFiltersFromForm();
  if (resetPage) currentPage = 1;
  renderSkeletons(grid, 6);

  const query = new URLSearchParams({
    ...(filters.q && { q: filters.q }),
    ...(filters.category && { category: filters.category })
  }).toString();

  const data = await fetchJSON(`https://pishnest.co.uk/backend/events.php${query ? `?${query}` : ''}`);
  let events = Array.isArray(data)
    ? data
    : ((data && Array.isArray(data.events)) ? data.events : ((data && Array.isArray(data.data)) ? data.data : []));

  filteredEvents = sortEventsUpcomingFirst(events
    .filter((ev) => matchesAudience(ev, filters.audience))
    .filter((ev) => matchesEventDate(ev, filters.date)));

  renderCurrentPage();
}

async function setupDiscoverPage() {
  const selectedCategory = applyFiltersFromUrl();
  await loadCategories(selectedCategory);

  document.getElementById('discover-filters').addEventListener('submit', (event) => {
    event.preventDefault();
    loadDiscoverEvents({ resetPage: true });
  });

  document.getElementById('discover-reset').addEventListener('click', () => {
    document.getElementById('discover-q').value = '';
    document.getElementById('discover-audience').value = DEFAULT_AUDIENCE;
    document.getElementById('discover-date').value = '';
    const categoryHidden = document.getElementById('discover-category');
    if (categoryHidden) categoryHidden.value = '';
    const label = document.querySelector('#discover-filters .category-combo-label');
    if (label) label.textContent = 'All categories';
    loadDiscoverEvents({ resetPage: true });
  });

  ['discover-audience', 'discover-category', 'discover-date'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => loadDiscoverEvents({ resetPage: true }));
  });

  loadDiscoverEvents({ resetPage: false });
}

setupDiscoverPage();
