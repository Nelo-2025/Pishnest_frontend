// Requires common.js loaded first.

const API = 'https://pishnest.co.uk/backend';

const SECTION_META = {
  overview: {
    eyebrow: 'Account',
    title: 'Overview',
    sub: 'See bookings, listings and what is next in one place.'
  },
  bookings: {
    eyebrow: 'Tickets',
    title: 'Bookings',
    sub: 'Review the activities you have booked and upcoming dates.'
  },
  activities: {
    eyebrow: 'Organiser',
    title: 'Activities',
    sub: 'Create and manage the events you list on PishNest.'
  },
  sales: {
    eyebrow: 'Organiser',
    title: 'Sales',
    sub: 'Track bookings, tickets sold and revenue across your listings.'
  },
  impact: {
    eyebrow: 'Organiser',
    title: 'Impact report',
    sub: 'Upload session data, set goals, and generate charts and summaries for funders.'
  },
  discover: {
    eyebrow: 'Explore',
    title: 'Discover',
    sub: 'Find kids activities and community events near you.'
  },
  settings: {
    eyebrow: 'Account',
    title: 'Settings',
    sub: 'Manage your profile, bio and sign in options.'
  }
};

let dashState = {
  user: null,
  isOrg: false,
  orders: [],
  events: [],
  summary: {}
};

function getRole(user) {
  return normalizeRole((user && user.role) || 'attendee');
}

function getBioStorageKey(user) {
  const idPart = (user && user.id)
    ? `id_${user.id}`
    : `email_${String((user && user.email) || 'guest').toLowerCase()}`;
  return `nearby_profile_bio_${idPart}`;
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return 'Date TBC';
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function isUpcoming(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return false;
  return d.getTime() >= Date.now() - 60 * 60 * 1000;
}

function showBoot(show) {
  const boot = document.getElementById('dash-boot');
  if (boot) boot.hidden = !show;
  document.body.classList.toggle('is-dash-booting', !!show);
}

function showGate(show) {
  const gate = document.getElementById('dash-gate');
  const app = document.getElementById('dash-app');
  if (gate) gate.hidden = !show;
  if (app) app.hidden = show;
  document.body.classList.toggle('is-dash-ready', !show);
  if (!show) showBoot(false);
}

function closeSidebar() {
  document.body.classList.remove('dash-sidebar-open');
  const backdrop = document.getElementById('dash-backdrop');
  if (backdrop) backdrop.hidden = true;
}

function openSidebar() {
  document.body.classList.add('dash-sidebar-open');
  const backdrop = document.getElementById('dash-backdrop');
  if (backdrop) backdrop.hidden = false;
}

function renderEmptyState(title, body, ctaHref, ctaLabel, emptyIcon = 'ticket') {
  return `
    <div class="dash-empty">
      <div class="dash-empty-icon" aria-hidden="true">${icon(emptyIcon, 'icon')}</div>
      <h3>${title}</h3>
      <p>${body}</p>
      ${ctaHref ? `<a class="btn btn-primary" href="${ctaHref}">${ctaLabel}</a>` : ''}
    </div>
  `;
}

function renderMetrics(targetId, items) {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.innerHTML = items.map((item) => `
    <article class="dash-metric">
      <div class="dash-metric-top">
        <span class="dash-metric-icon" aria-hidden="true">${icon(item.icon || 'chart', 'icon')}</span>
        <h2>${item.label}</h2>
      </div>
      <p class="dash-metric-value">${item.value}</p>
      ${item.hint ? `<p class="dash-metric-hint">${item.hint}</p>` : ''}
    </article>
  `).join('');
}

function bookingCards(orders, limit) {
  const list = Array.isArray(orders) ? orders : [];
  const sliced = typeof limit === 'number' ? list.slice(0, limit) : list;

  if (!sliced.length) {
    return renderEmptyState(
      'No bookings yet',
      'Discover kids and general activities happening near you.',
      'discover.html',
      'Browse activities',
      'ticket'
    );
  }

  return `
    <div class="dash-list">
      ${sliced.map((order) => `
        <article class="dash-list-item">
          <div>
            <h3>${order.event_title || 'Event'}</h3>
            <p class="record-meta">${icon('calendar', 'icon icon-sm')} ${formatShortDate(order.start_datetime)}</p>
            <p class="record-meta">${icon('mapPin', 'icon icon-sm')} ${order.venue || 'Location TBC'}</p>
            <p class="record-meta">${icon('ticket', 'icon icon-sm')} ${Number(order.tickets_count || 0)} ticket(s)</p>
          </div>
          <div class="dash-list-meta">
            <span class="status-pill">${order.status || 'booked'}</span>
            <a href="event.html?id=${encodeURIComponent(order.event_id)}" class="btn btn-ghost">View</a>
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

function activityCards(events, limit) {
  const list = Array.isArray(events) ? events : [];
  const sliced = typeof limit === 'number' ? list.slice(0, limit) : list;

  if (!sliced.length) {
    return renderEmptyState(
      'No activities yet',
      'List your first activity and start taking bookings.',
      'organise.html',
      'Create an activity',
      'calendar'
    );
  }

  return `
    <div class="dash-list">
      ${sliced.map((ev) => {
        const dt = ev.start_datetime
          ? new Date(ev.start_datetime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          : 'Date TBC';
        const status = String(ev.status || 'published').toLowerCase();
        return `
          <article class="dash-list-item">
            <div>
              <div class="dash-list-tags">
                <span class="status-pill">${ev.category_name || 'Event'}</span>
                ${status !== 'published' ? `<span class="status-pill status-pill-draft">${status}</span>` : ''}
              </div>
              <h3>${ev.title}</h3>
              <p class="record-meta">${icon('calendar', 'icon icon-sm')} ${dt}</p>
              <p class="record-meta">${icon('mapPin', 'icon icon-sm')} ${ev.venue || 'Location TBC'}</p>
            </div>
            <div class="dash-list-meta">
              <a href="organise.html?edit=${ev.id}" class="btn btn-primary">Edit</a>
              <a href="event.html?id=${ev.id}" class="btn btn-ghost">View</a>
            </div>
          </article>
        `;
      }).join('')}
    </div>
  `;
}

function setActiveSection(sectionId) {
  const allowed = dashState.isOrg
    ? ['overview', 'bookings', 'activities', 'sales', 'impact', 'discover', 'settings']
    : ['overview', 'bookings', 'discover', 'settings'];

  const next = allowed.includes(sectionId) ? sectionId : 'overview';
  const meta = SECTION_META[next] || SECTION_META.overview;

  document.querySelectorAll('.dash-nav-item').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.section === next);
  });

  document.querySelectorAll('[data-section-panel]').forEach((panel) => {
    const match = panel.dataset.sectionPanel === next;
    panel.hidden = !match;
    panel.classList.toggle('is-active', match);
  });

  const eyebrow = document.getElementById('dash-eyebrow');
  const title = document.getElementById('dash-section-title');
  const subcopy = document.getElementById('dash-subcopy');
  if (eyebrow) eyebrow.textContent = meta.eyebrow;
  if (title) title.textContent = meta.title;
  if (subcopy) subcopy.textContent = meta.sub;

  closeSidebar();

  if (window.location.hash !== `#${next}`) {
    window.history.replaceState({}, '', `${window.location.pathname}#${next}`);
  }

  if (next === 'impact' && dashState.isOrg && typeof window.loadImpactSection === 'function') {
    window.loadImpactSection();
  }
}

function bindNavigation() {
  const nav = document.getElementById('dash-side-nav');
  if (nav) {
    nav.querySelectorAll('.dash-nav-item').forEach((btn) => {
      const ico = btn.querySelector('.dash-nav-ico');
      const name = btn.dataset.icon;
      if (ico && name) ico.innerHTML = icon(name, 'icon icon-sm');
    });

    nav.addEventListener('click', (event) => {
      const btn = event.target.closest('.dash-nav-item');
      if (!btn || !btn.dataset.section) return;
      event.preventDefault();
      setActiveSection(btn.dataset.section);
    });
  }

  document.querySelectorAll('[data-goto]').forEach((el) => {
    el.addEventListener('click', () => setActiveSection(el.getAttribute('data-goto')));
  });

  const toggle = document.getElementById('dash-sidebar-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      if (document.body.classList.contains('dash-sidebar-open')) closeSidebar();
      else openSidebar();
    });
  }

  const backdrop = document.getElementById('dash-backdrop');
  if (backdrop) backdrop.addEventListener('click', closeSidebar);

  const hash = String(window.location.hash || '').replace('#', '');
  setActiveSection(hash || 'overview');

  document.querySelectorAll('[data-discover-icon]').forEach((el) => {
    el.innerHTML = icon(el.getAttribute('data-discover-icon'), 'icon');
  });
}

function getNameStorageKey(user) {
  const idPart = (user && user.id)
    ? `id_${user.id}`
    : `email_${String((user && user.email) || 'guest').toLowerCase()}`;
  return `nearby_profile_name_${idPart}`;
}

function getPreferredDisplayName(user) {
  const stored = localStorage.getItem(getNameStorageKey(user));
  if (stored && stored.trim()) return stored.trim();
  return getUserDisplayName(user) || user.email || 'there';
}

function bindProfileForm(user) {
  const form = document.getElementById('dashboard-settings-form');
  const bioField = document.getElementById('dashboard-bio');
  const nameField = document.getElementById('dashboard-display-name');
  const countEl = document.getElementById('dashboard-bio-count');
  const messageEl = document.getElementById('dashboard-settings-message');
  if (!form || !bioField || !nameField || !countEl || !messageEl) return;

  const bioKey = getBioStorageKey(user);
  const nameKey = getNameStorageKey(user);
  const existingBio = localStorage.getItem(bioKey) || '';
  const existingName = localStorage.getItem(nameKey) || getUserDisplayName(user) || '';

  bioField.value = existingBio;
  nameField.value = existingName;
  countEl.textContent = `${existingBio.length}/280`;

  bioField.addEventListener('input', () => {
    countEl.textContent = `${bioField.value.length}/280`;
    messageEl.classList.add('hidden-inline');
  });

  nameField.addEventListener('input', () => {
    messageEl.classList.add('hidden-inline');
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const nextName = nameField.value.trim();
    const nextBio = bioField.value.trim();
    localStorage.setItem(nameKey, nextName);
    localStorage.setItem(bioKey, nextBio);
    countEl.textContent = `${bioField.value.length}/280`;
    messageEl.textContent = 'Profile saved.';
    messageEl.classList.remove('hidden-inline');

    const display = nextName || getUserDisplayName(user) || user.email || 'there';
    const sidebarName = document.getElementById('dash-sidebar-name');
    const settingsName = document.getElementById('dash-settings-name');
    const avatar = document.getElementById('dash-avatar');
    const settingsAvatar = document.getElementById('dash-settings-avatar');
    if (sidebarName) sidebarName.textContent = display;
    if (settingsName) settingsName.textContent = display;
    const initial = display.charAt(0).toUpperCase() || '?';
    if (avatar) avatar.textContent = initial;
    if (settingsAvatar) settingsAvatar.textContent = initial;
  });
}

function renderShell(user) {
  const role = getRole(user);
  const name = getPreferredDisplayName(user);
  const isOrg = isOrganiserRole(user);

  const sidebarName = document.getElementById('dash-sidebar-name');
  const sidebarEmail = document.getElementById('dash-sidebar-email');
  const rolePill = document.getElementById('dash-role-pill');
  const settingsMeta = document.getElementById('dash-settings-meta');
  const settingsName = document.getElementById('dash-settings-name');
  const settingsEmail = document.getElementById('dash-settings-email');
  const settingsRole = document.getElementById('dash-settings-role');
  const settingsAvatar = document.getElementById('dash-settings-avatar');
  const sideCta = document.getElementById('dash-side-cta');

  if (sidebarName) sidebarName.textContent = name;
  if (sidebarEmail) sidebarEmail.textContent = user.email || 'None';
  if (rolePill) rolePill.textContent = role;
  if (settingsName) settingsName.textContent = name;
  if (settingsEmail) settingsEmail.textContent = user.email || 'None';
  if (settingsRole) settingsRole.textContent = role;

  const avatar = document.getElementById('dash-avatar');
  const initial = String(name).trim().charAt(0).toUpperCase() || '?';
  if (avatar) avatar.textContent = initial;
  if (settingsAvatar) settingsAvatar.textContent = initial;

  document.querySelectorAll('[data-org-only]').forEach((el) => {
    el.hidden = !isOrg;
  });

  if (sideCta) {
    if (isOrg) {
      sideCta.textContent = 'Create an activity';
      sideCta.href = 'organise.html';
    } else {
      sideCta.textContent = 'Browse activities';
      sideCta.href = 'discover.html';
    }
  }

  if (settingsMeta) {
    settingsMeta.innerHTML = `
      <div class="dash-field-readonly">
        <span class="dash-field-label">Full name</span>
        <span class="dash-field-value">${user.name || name}</span>
      </div>
      <div class="dash-field-readonly">
        <span class="dash-field-label">Email</span>
        <span class="dash-field-value">${user.email || 'None'}</span>
      </div>
      <div class="dash-field-readonly">
        <span class="dash-field-label">Account type</span>
        <span class="dash-field-value">${role}</span>
      </div>
    `;
  }
}

function renderOverview() {
  const { isOrg, orders, events, summary } = dashState;
  const upcoming = orders.filter((o) => {
    const status = String(o.status || '').toLowerCase();
    return status !== 'cancelled' && isUpcoming(o.start_datetime);
  });
  const tickets = orders.reduce((sum, o) => sum + Number(o.tickets_count || 0), 0);

  if (isOrg) {
    const published = events.filter((ev) => String(ev.status || 'published').toLowerCase() === 'published').length;
    renderMetrics('dash-metrics', [
      { label: 'Your events', value: String(events.length), hint: `${published} published`, icon: 'calendar' },
      { label: 'Bookings', value: String(Number(summary.bookings_count || 0)), hint: 'Across your listings', icon: 'ticket' },
      { label: 'Tickets sold', value: String(Number(summary.tickets_sold || 0)), hint: 'Confirmed tickets', icon: 'users' },
      { label: 'Revenue', value: `£${Number(summary.revenue || 0).toFixed(2)}`, hint: 'Gross from bookings', icon: 'chart' }
    ]);
  } else {
    renderMetrics('dash-metrics', [
      { label: 'Total bookings', value: String(orders.length), hint: 'All time', icon: 'ticket' },
      { label: 'Upcoming', value: String(upcoming.length), hint: 'Still to attend', icon: 'calendar' },
      { label: 'Tickets', value: String(tickets), hint: 'Across bookings', icon: 'users' }
    ]);
  }

  const listTitle = document.getElementById('dash-overview-list-title');
  const gotoBtn = document.getElementById('dash-overview-goto');
  const listEl = document.getElementById('dash-overview-list');
  const linksEl = document.getElementById('dash-overview-links');

  if (isOrg) {
    if (listTitle) listTitle.textContent = 'Your activities';
    if (gotoBtn) {
      gotoBtn.setAttribute('data-goto', 'activities');
      gotoBtn.textContent = 'All activities';
    }
    if (listEl) listEl.innerHTML = activityCards(events, 4);
    if (linksEl) {
      linksEl.innerHTML = `
        <a href="organise.html"><span class="dash-link-ico" aria-hidden="true">${icon('spark', 'icon icon-sm')}</span><span>Create activity</span></a>
        <button type="button" data-goto="sales"><span class="dash-link-ico" aria-hidden="true">${icon('chart', 'icon icon-sm')}</span><span>View sales</span></button>
        <button type="button" data-goto="impact"><span class="dash-link-ico" aria-hidden="true">${icon('chart', 'icon icon-sm')}</span><span>Impact report</span></button>
        <a href="discover.html?audience=kids"><span class="dash-link-ico" aria-hidden="true">${icon('search', 'icon icon-sm')}</span><span>Discover</span></a>
        <button type="button" data-goto="settings"><span class="dash-link-ico" aria-hidden="true">${icon('settings', 'icon icon-sm')}</span><span>Settings</span></button>
      `;
    }
  } else {
    if (listTitle) listTitle.textContent = 'Upcoming bookings';
    if (gotoBtn) {
      gotoBtn.setAttribute('data-goto', 'bookings');
      gotoBtn.textContent = 'All bookings';
    }
    if (listEl) listEl.innerHTML = bookingCards(upcoming, 4);
    if (linksEl) {
      linksEl.innerHTML = `
        <a href="discover.html?audience=kids"><span class="dash-link-ico" aria-hidden="true">${icon('search', 'icon icon-sm')}</span><span>Discover activities</span></a>
        <a href="discover.html?audience=kids"><span class="dash-link-ico" aria-hidden="true">${icon('users', 'icon icon-sm')}</span><span>Kids &amp; families</span></a>
        <a href="become-organiser.html#organiser-signup"><span class="dash-link-ico" aria-hidden="true">${icon('spark', 'icon icon-sm')}</span><span>Become an organiser</span></a>
        <button type="button" data-goto="settings"><span class="dash-link-ico" aria-hidden="true">${icon('settings', 'icon icon-sm')}</span><span>Settings</span></button>
      `;
    }
  }

  if (linksEl) {
    linksEl.querySelectorAll('[data-goto]').forEach((el) => {
      el.addEventListener('click', () => setActiveSection(el.getAttribute('data-goto')));
    });
  }

  if (gotoBtn) {
    gotoBtn.onclick = () => setActiveSection(gotoBtn.getAttribute('data-goto'));
  }
}

function renderBookingsSection() {
  const body = document.getElementById('dash-bookings-body');
  if (body) body.innerHTML = bookingCards(dashState.orders);
}

function renderActivitiesSection() {
  const body = document.getElementById('dash-activities-body');
  if (body) body.innerHTML = activityCards(dashState.events);
}

function renderSalesSection() {
  const { summary, events } = dashState;
  renderMetrics('dash-sales-metrics', [
    { label: 'Bookings', value: String(Number(summary.bookings_count || 0)), icon: 'ticket' },
    { label: 'Tickets sold', value: String(Number(summary.tickets_sold || 0)), icon: 'users' },
    { label: 'Revenue', value: `£${Number(summary.revenue || 0).toFixed(2)}`, icon: 'chart' },
    { label: 'Events', value: String(events.length), icon: 'calendar' }
  ]);

  const body = document.getElementById('dash-sales-body');
  if (!body) return;
  body.innerHTML = `
    <p class="dash-card-copy">See attendee details, refunds and per-event performance on the full sales page.</p>
    <div class="button-row">
      <a href="organiser-sales.html" class="btn btn-primary">Open sales &amp; attendees</a>
      <a href="organise.html" class="btn btn-ghost">Create activity</a>
    </div>
  `;
}

async function loadDashboardData(user) {
  const isOrg = isOrganiserRole(user);
  dashState.user = user;
  dashState.isOrg = isOrg;

  if (isOrg) {
    const [ordersData, eventsData, salesData] = await Promise.all([
      fetchJSON(`${API}/orders.php`),
      fetchJSON(`${API}/events.php`),
      fetchJSON(`${API}/organiser-bookings.php`)
    ]);

    const allEvents = (eventsData && eventsData.events) || [];
    dashState.events = getRole(user) === 'admin'
      ? allEvents
      : allEvents.filter((ev) => Number(ev.organiser_id) === Number(user.id));
    dashState.orders = (ordersData && ordersData.orders) || [];
    dashState.summary = (salesData && salesData.success && salesData.summary) ? salesData.summary : {};
  } else {
    const ordersData = await fetchJSON(`${API}/orders.php`);
    dashState.orders = (ordersData && ordersData.orders) || [];
    dashState.events = [];
    dashState.summary = {};
  }

  renderOverview();
  renderBookingsSection();
  if (isOrg) {
    renderActivitiesSection();
    renderSalesSection();
  }
}

(async () => {
  showBoot(true);

  const cachedUser = getCurrentUser();
  // Prefer cached session for a fast path, then confirm with the server.
  const serverUser = await refreshCurrentUser();
  const currentUser = serverUser || cachedUser;

  if (!currentUser) {
    showBoot(false);
    showGate(true);
    return;
  }

  if (!serverUser) setCurrentUser(currentUser);
  showGate(false);
  renderShell(currentUser);
  bindProfileForm(currentUser);
  bindNavigation();

  const logoutBtn = document.getElementById('dash-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await logout();
      window.location.href = 'login.html?next=dashboard.html';
    });
  }

  try {
    await loadDashboardData(currentUser);
    if (String(window.location.hash || '').replace('#', '') === 'impact' && isOrganiserRole(currentUser) && typeof window.loadImpactSection === 'function') {
      window.loadImpactSection();
    }
  } catch (err) {
    const listEl = document.getElementById('dash-overview-list');
    if (listEl) {
      listEl.innerHTML = '<p class="notice">Could not load dashboard data. Please refresh.</p>';
    }
  }
})();
