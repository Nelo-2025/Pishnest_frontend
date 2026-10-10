// Shared across pages. Include this BEFORE any page-specific script.
//
// IMPORTANT ARCHITECTURE NOTE:
// Real auth is enforced server-side via the PHP session cookie, every
// protected endpoint (organise.php, update-event.php, checkout.php) checks
// $_SESSION on the server, so a user can never fake their way into an
// action just by editing browser storage.
//
// The sessionStorage user object below is ONLY used to personalise the UI
// (show/hide the "Organise" link, greet the user by name, etc.) without
// having to call the server on every single page load. It is fetched once
// from me.php right after login and cached client-side. If it ever falls
// out of sync with the real session (e.g. the session expired), the
// server-side check on the actual action will still correctly reject it -
// this cache only controls what buttons/links are shown, not what's
// actually allowed.

const ICON_PATHS = {
  mapPin: '<path d="M12 21s-7-5.2-7-11a7 7 0 1 1 14 0c0 5.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="3"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  chart: '<path d="M4 19V5M4 19h16"/><path d="M8 16v-5M12 16V8M16 16v-3"/>',
  message: '<path d="M21 12a8 8 0 0 1-8 8H5l-3 3V12a8 8 0 0 1 8-8h3a8 8 0 0 1 8 8z"/>',
  ticket: '<path d="M3 9a2 2 0 0 0 2-2V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2v6a2 2 0 0 0-2 2v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-2a2 2 0 0 0-2-2z"/><path d="M13 5v2M13 11v2M13 17v2"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  sparkles: '<path d="M10 3l1.9 5.6L17.5 10.5l-5.6 1.9L10 18l-1.9-5.6L2.5 10.5l5.6-1.9z"/><path d="M19 3v4M17 5h4M19 16v4M17 18h4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  send: '<path d="M22 2 11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 5.1A10.5 10.5 0 0 1 12 5c6.5 0 10 7 10 7a17.4 17.4 0 0 1-3.2 4.1"/><path d="M6.1 6.1C3.7 7.8 2 12 2 12s3.5 7 10 7a9.8 9.8 0 0 0 4.4-1"/>'
};

const SITE_NAME = 'PishNest';
const LOGO_SRC = 'assets/logo.jpeg';

function icon(name, className = 'icon') {
  const paths = ICON_PATHS[name];
  if (!paths) return '';
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
}

function logoInnerHtml() {
  return `<img src="${LOGO_SRC}" alt="" class="logo-img" aria-hidden="true"><span class="logo-wordmark">${SITE_NAME}</span>`;
}

function logoHtml(href = 'index.html', extraClass = '') {
  const cls = ['logo', extraClass].filter(Boolean).join(' ');
  return `<a class="${cls}" href="${href}" aria-label="${SITE_NAME}">${logoInnerHtml()}</a>`;
}

function logoMarkHtml() {
  return `<img src="${LOGO_SRC}" alt="" class="logo-img logo-img-mark" aria-hidden="true">`;
}

function applySiteBranding() {
  document.querySelectorAll('a.logo').forEach((link) => {
    if (link.querySelector('.logo-wordmark')) return;
    const img = link.querySelector('.logo-img');
    if (img) {
      img.setAttribute('alt', '');
      img.setAttribute('aria-hidden', 'true');
      if (!link.querySelector('.logo-wordmark')) {
        img.insertAdjacentHTML('afterend', `<span class="logo-wordmark">${SITE_NAME}</span>`);
      }
    } else {
      link.innerHTML = logoInnerHtml();
    }
    if (!link.getAttribute('aria-label')) {
      link.setAttribute('aria-label', SITE_NAME);
    }
  });

  document.querySelectorAll('.brand-lockup').forEach((lockup) => {
    if (lockup.querySelector('.logo-wordmark')) return;
    const img = lockup.querySelector('.logo-img');
    if (img) {
      img.insertAdjacentHTML('afterend', `<span class="logo-wordmark">${SITE_NAME}</span>`);
    } else {
      lockup.innerHTML = `<img src="${LOGO_SRC}" alt="" class="logo-img logo-img-hero" aria-hidden="true"><span class="logo-wordmark">${SITE_NAME}</span>`;
    }
  });
}

function setupPasswordToggles() {
  document.querySelectorAll('[data-toggle-password]').forEach((button) => {
    if (button.dataset.toggleBound === 'true') return;
    button.dataset.toggleBound = 'true';
    button.type = 'button';
    button.innerHTML = icon('eye', 'icon');
    button.setAttribute('aria-label', 'Show password');

    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.togglePassword);
      if (!input) return;
      const shouldReveal = input.type === 'password';
      input.type = shouldReveal ? 'text' : 'password';
      button.innerHTML = icon(shouldReveal ? 'eyeOff' : 'eye', 'icon');
      button.setAttribute('aria-label', shouldReveal ? 'Hide password' : 'Show password');
    });
  });
}

function setupMobileNav() {
  const header = document.querySelector('.site-header, header');
  if (!header) return;

  let toggle = header.querySelector('.nav-toggle');
  const navInner = header.querySelector('.nav-inner');
  if (!navInner) return;

  if (!toggle) {
    toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'nav-toggle';
    const logo = navInner.querySelector('.logo');
    if (logo && logo.nextSibling) {
      navInner.insertBefore(toggle, logo.nextSibling);
    } else {
      navInner.appendChild(toggle);
    }
  }

  toggle.setAttribute('aria-label', 'Open menu');
  toggle.setAttribute('aria-expanded', 'false');
  if (!toggle.innerHTML.trim()) {
    toggle.innerHTML = icon('menu', 'icon');
  }

  toggle.addEventListener('click', () => {
    const open = header.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    toggle.innerHTML = icon(open ? 'close' : 'menu', 'icon');
  });
}

// Central backend URL used by all pages.
const DEFAULT_API_BASE = 'https://pishnest.co.uk/backend';
const SAME_HOST_NO_PORT_API_BASE = DEFAULT_API_BASE;
const LOCALHOST_API_BASE = DEFAULT_API_BASE;
const LOOPBACK_API_BASE = DEFAULT_API_BASE;

function sanitizeApiBase(base) {
  if (!base) return null;
  try {
    const parsed = new URL(String(base));
    const cleanedPath = parsed.pathname.replace(/\/+$/, '');
    if (!cleanedPath.endsWith('/backend')) return null;
    return `${parsed.origin}${cleanedPath}`;
  } catch (err) {
    return null;
  }
}

const SAVED_API_BASE = sanitizeApiBase(sessionStorage.getItem('nearby_api_base'));
if (!SAVED_API_BASE && sessionStorage.getItem('nearby_api_base')) {
  sessionStorage.removeItem('nearby_api_base');
}

const API_BASE = sanitizeApiBase(window.NEARBY_API_BASE) || SAVED_API_BASE || DEFAULT_API_BASE;

function buildApiBaseCandidates() {
  if (window.NEARBY_API_BASE) {
    return [sanitizeApiBase(window.NEARBY_API_BASE)].filter(Boolean);
  }
  const host = String(window.location.hostname || '').toLowerCase();
  const isLoopbackHost = (host === 'localhost' || host === '127.0.0.1');

  const candidates = [SAME_HOST_NO_PORT_API_BASE, DEFAULT_API_BASE, API_BASE];

  // For loopback development (including Live Server on :5500), also try
  // localhost and 127.0.0.1 backend bases explicitly.
  if (isLoopbackHost) {
    candidates.push(LOCALHOST_API_BASE, LOOPBACK_API_BASE);
  }

  return Array.from(new Set(candidates.map(sanitizeApiBase).filter(Boolean)));
}

function swapApiBase(url, fromBase, toBase) {
  const fromPrefix = `${fromBase}/`;
  if (!String(url || '').startsWith(fromPrefix)) return null;
  return `${toBase}/${String(url).slice(fromPrefix.length)}`;
}

const USER_STORAGE_KEY = 'nearby_current_user';
const SESSION_TOKEN_KEY = 'nearby_session_token';

function readStoredUser(storage) {
  try {
    const raw = storage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

function getSessionToken() {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY) || sessionStorage.getItem(SESSION_TOKEN_KEY) || '';
  } catch (err) {
    return '';
  }
}

function setSessionToken(token) {
  try {
    if (token) {
      localStorage.setItem(SESSION_TOKEN_KEY, String(token));
    } else {
      localStorage.removeItem(SESSION_TOKEN_KEY);
    }
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
  } catch (err) {
    // Ignore storage failures (private mode, etc.).
  }
}

function clearSessionToken() {
  setSessionToken('');
}

function getCurrentUser() {
  // Prefer localStorage so login survives tab closes / refreshes.
  // Fall back to legacy sessionStorage and migrate if found.
  const localUser = readStoredUser(localStorage);
  if (localUser) return localUser;

  const sessionUser = readStoredUser(sessionStorage);
  if (sessionUser) {
    setCurrentUser(sessionUser);
    sessionStorage.removeItem(USER_STORAGE_KEY);
    return sessionUser;
  }
  return null;
}

function setCurrentUser(user) {
  const payload = JSON.stringify(user);
  localStorage.setItem(USER_STORAGE_KEY, payload);
  sessionStorage.removeItem(USER_STORAGE_KEY);
}

function clearCurrentUser() {
  localStorage.removeItem(USER_STORAGE_KEY);
  sessionStorage.removeItem(USER_STORAGE_KEY);
  clearSessionToken();
}

function normalizeRole(role) {
  const normalized = String(role || '').trim().toLowerCase();
  return normalized === 'organizer' ? 'organiser' : normalized;
}

function isOrganiserRole(user) {
  const role = normalizeRole(user && user.role);
  return role === 'organiser' || role === 'admin';
}

function getUserDisplayName(user) {
  if (!user) return '';
  const username = String(user.username || '').trim();
  if (username) return username;
  const name = String(user.name || user.full_name || '').trim();
  if (name) return name;
  const email = String(user.email || '').trim();
  return email ? email.split('@')[0] : 'User';
}

function getCurrentPagePath() {
  const pathname = String(window.location.pathname || '');
  const fileName = pathname.split('/').pop() || 'index.html';
  return `${fileName}${window.location.search || ''}`;
}

function getCurrentPageFile() {
  const pathname = String(window.location.pathname || '');
  return pathname.split('/').pop() || 'index.html';
}

const EVENT_IMAGE_MAP = {
  music: 'assets/media/events/music.jpg',
  sports: 'assets/media/events/sports.jpg',
  sport: 'assets/media/events/sports.jpg',
  art: 'assets/media/events/art.jpg',
  food: 'assets/media/events/food.jpg',
  festivals: 'assets/media/events/festival.jpg',
  festival: 'assets/media/events/festival.jpg',
  workshop: 'assets/media/events/workshop.jpg',
  education: 'assets/media/events/education.jpg',
  networking: 'assets/media/events/networking.jpg',
  theatre: 'assets/media/events/theatre.jpg',
  theater: 'assets/media/events/theatre.jpg',
  technology: 'assets/media/events/tech.jpg',
  tech: 'assets/media/events/tech.jpg',
  kids: 'assets/media/events/kids.jpg',
  general: 'assets/media/events/general.jpg'
};

const EVENT_IMAGE_FALLBACKS = [
  'assets/media/events/general.jpg',
  'assets/media/events/festival.jpg',
  'assets/media/events/music.jpg',
  'assets/media/events/workshop.jpg',
  'assets/media/events/networking.jpg',
  'assets/media/events/kids.jpg'
];

function getEventImageUrl(ev) {
  const direct = ev && (ev.image_url || ev.cover_image || ev.image || ev.thumbnail || ev.photo);
  if (direct) return String(direct);

  const category = String((ev && (ev.category_name || ev.category)) || '').toLowerCase();
  for (const [key, path] of Object.entries(EVENT_IMAGE_MAP)) {
    if (category.includes(key)) return path;
  }

  const title = String((ev && ev.title) || '').toLowerCase();
  if (/\b(kid|child|family|junior|school)\b/.test(title)) {
    return EVENT_IMAGE_MAP.kids;
  }

  const id = Number((ev && ev.id) || 0);
  return EVENT_IMAGE_FALLBACKS[Math.abs(id) % EVENT_IMAGE_FALLBACKS.length];
}

function formatDateBadge(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return { day: '?', month: '???' };
  return { day: d.getDate(), month: d.toLocaleString('en-GB', { month: 'short' }).toUpperCase() };
}

/** True when the event's end (or start) datetime is already in the past. */
function eventHasPassed(ev) {
  if (!ev) return false;
  let cutoff = ev.end_datetime || ev.start_datetime || '';
  if (!cutoff && ev.event_date) {
    const time = (ev.event_time || '23:59:59').toString().slice(0, 8);
    cutoff = `${ev.event_date} ${time}`;
  }
  if (!cutoff) return false;
  const d = new Date(String(cutoff).replace(' ', 'T'));
  return !isNaN(d.getTime()) && d.getTime() < Date.now();
}

const KIDS_KEYWORDS = /\b(kid|kids|child|children|family|families|junior|toddler|youth|school|ages?\s*\d)\b/i;
const ESSEX_KEYWORDS = /\b(essex|colchester|chelmsford|southend|basildon|harlow|brentwood|clacton|witham|braintree|maldon|rayleigh|epping|grays|thurrock|billericay|wickford|loughton|saffron walden|canvey|halstead|tendring|castle park)\b/i;

function eventSearchHaystack(ev) {
  return [ev && ev.title, ev && ev.description, ev && ev.category_name, ev && ev.venue, ev && ev.address]
    .filter(Boolean)
    .join(' ');
}

function matchesAudience(ev, audience) {
  if (!audience) return true;
  const looksKids = KIDS_KEYWORDS.test(eventSearchHaystack(ev));
  if (audience === 'kids') return looksKids;
  return true;
}

function matchesRegion(ev, region) {
  if (!region || region === 'all') return true;
  if (region !== 'essex') return true;
  return ESSEX_KEYWORDS.test(eventSearchHaystack(ev));
}

function matchesEventDate(ev, date) {
  if (!date) return true;
  const start = new Date(ev && ev.start_datetime);
  if (isNaN(start)) return true;
  const yyyy = start.getFullYear();
  const mm = String(start.getMonth() + 1).padStart(2, '0');
  const dd = String(start.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}` === date;
}

function sortEventsUpcomingFirst(events) {
  const now = Date.now();
  return [...events].sort((a, b) => {
    const aTime = new Date((a && a.start_datetime) || 0).getTime();
    const bTime = new Date((b && b.start_datetime) || 0).getTime();
    const aPast = aTime < now;
    const bPast = bTime < now;
    if (aPast !== bPast) return aPast ? 1 : -1;
    if (aTime !== bTime) return aTime - bTime;
    return Number((a && a.id) || 0) - Number((b && b.id) || 0);
  });
}

function renderEventCard(ev) {
  const badge = formatDateBadge(ev.start_datetime);
  const price = (ev.min_price === 0 || ev.min_price === null)
    ? '<span class="amount free">Free</span>'
    : `<span class="amount">£${Number(ev.min_price).toFixed(2)}</span>`;
  const imageUrl = getEventImageUrl(ev);

  return `
    <a class="event-card" href="event.html?id=${ev.id}">
      <div class="thumb">
        <img src="${imageUrl}" alt="" loading="lazy">
        <span class="category-tag">${ev.category_name || 'General'}</span>
        <div class="date-badge"><strong>${badge.day}</strong>${badge.month}</div>
      </div>
      <div class="body">
        <h3>${ev.title}</h3>
        <div class="loc">${icon('mapPin', 'icon icon-sm')} ${ev.venue || 'Location TBC'}</div>
        <div class="foot">
          <span class="from">from</span>
          ${price}
        </div>
      </div>
    </a>`;
}

function renderPrimaryNav() {
  const nav = document.querySelector('.nav-links');
  if (!nav) return;

  const file = getCurrentPageFile().toLowerCase();

  const organiserActive = file === 'become-organiser.html';
  const bookActive = file === 'discover.html' || file === 'browse.html';
  const impactActive = false;
  const assistantActive = false;

  nav.innerHTML = `
    <a class="nav-link${organiserActive ? ' is-active' : ''}" data-nav-organiser="true" href="become-organiser.html"${organiserActive ? ' aria-current="page"' : ''}>Become an Organiser</a>
    <a class="nav-link${bookActive ? ' is-active' : ''}" href="discover.html"${bookActive ? ' aria-current="page"' : ''}>Book Event</a>
    <a class="nav-link${impactActive ? ' is-active' : ''}" href="dashboard.html#impact">Impact Report</a>
    <a class="nav-link${assistantActive ? ' is-active' : ''}" data-nav-assistant="true" href="#organiser-assistant" hidden>Organiser Assistant</a>
  `;

  nav.querySelectorAll('a').forEach((link) => {
    const text = String(link.textContent || '').trim().toLowerCase();
    const href = String(link.getAttribute('href') || '').toLowerCase();
    if (text === 'general' || href.includes('audience=general') || href.includes('section=general')) {
      link.remove();
    }
  });

  ensureNavCluster();
}

function ensureNavCluster() {
  const navInner = document.querySelector('header .nav-inner');
  const navLinks = document.querySelector('header .nav-links');
  const navActions = document.querySelector('header .nav-actions');
  if (!navInner || !navLinks || !navActions) return;

  let cluster = navInner.querySelector('.nav-cluster');
  if (!cluster) {
    cluster = document.createElement('div');
    cluster.className = 'nav-cluster';
    navInner.appendChild(cluster);
  }

  if (navLinks.parentElement !== cluster) cluster.appendChild(navLinks);
  if (navActions.parentElement !== cluster) cluster.appendChild(navActions);
}

function ensureHeaderAuthElements() {
  const navInner = document.querySelector('header .nav-inner');
  if (!navInner) return null;

  let navActions = navInner.querySelector('.nav-actions');
  if (!navActions) {
    navActions = document.createElement('div');
    navActions.className = 'nav-actions';
    navInner.appendChild(navActions);
  }

  let welcomeEl = navActions.querySelector('[data-header-welcome="true"]')
    || navActions.querySelector('#organiser-welcome');
  if (!welcomeEl) {
    welcomeEl = document.createElement('span');
    welcomeEl.setAttribute('data-header-welcome', 'true');
    welcomeEl.className = 'hidden-inline';
    navActions.prepend(welcomeEl);
  }

  const authLinkCandidates = Array.from(navActions.querySelectorAll('a'));
  let authLink = authLinkCandidates.find((link) => {
    const href = String(link.getAttribute('href') || '').toLowerCase();
    const text = String(link.textContent || '').trim().toLowerCase();
    return link.getAttribute('data-header-auth') === 'true'
      || link.id === 'organiser-auth-link'
      || link.id === 'logout-link'
      || href.includes('login.html')
      || href.includes('dashboard.html')
      || text === 'log in'
      || text === 'login'
      || text === 'log out'
      || text === 'logout'
      || text === 'dashboard'
      || text === 'back to login';
  });

  if (!authLink) {
    authLink = document.createElement('a');
    authLink.className = 'btn btn-ghost';
    navActions.appendChild(authLink);
  }
  authLink.setAttribute('data-header-auth', 'true');
  authLink.classList.add('btn', 'btn-ghost');

  // Primary CTA: Become an Organiser (replaces Sign up / Get started)
  let organiserCta = navActions.querySelector('[data-header-organiser-cta="true"]');
  if (!organiserCta) {
    organiserCta = authLinkCandidates.find((link) => {
      const href = String(link.getAttribute('href') || '').toLowerCase();
      const text = String(link.textContent || '').trim().toLowerCase();
      return href.includes('become-organiser.html')
        || href.includes('register.html')
        || text === 'sign up'
        || text === 'register'
        || text === 'get started'
        || text === 'become an organiser';
    }) || null;
  }

  if (!organiserCta) {
    organiserCta = document.createElement('a');
    navActions.appendChild(organiserCta);
  }

  organiserCta.setAttribute('data-header-organiser-cta', 'true');
  organiserCta.className = 'btn btn-primary';
  organiserCta.textContent = 'Become an Organiser';
  organiserCta.href = 'become-organiser.html';
  organiserCta.style.display = '';

  // Hide leftover Sign up / Get started links that aren't the CTA we just set
  authLinkCandidates.forEach((link) => {
    if (link === authLink || link === organiserCta) return;
    const href = String(link.getAttribute('href') || '').toLowerCase();
    const text = String(link.textContent || '').trim().toLowerCase();
    if (
      href.includes('register.html')
      || href.includes('#organiser-signup')
      || text === 'sign up'
      || text === 'get started'
      || text === 'become an organiser'
      || href.includes('my-bookings.html')
    ) {
      link.remove();
    }
  });

  return { navActions, welcomeEl, authLink, organiserCta };
}

function renderHeaderAuthUI(currentUser) {
  const headerEls = ensureHeaderAuthElements();
  if (!headerEls) return;

  const { welcomeEl, authLink, organiserCta } = headerEls;
  const file = getCurrentPageFile().toLowerCase();

  if (organiserCta) {
    organiserCta.className = 'btn btn-primary';
    organiserCta.textContent = 'Become an Organiser';
    organiserCta.href = file === 'become-organiser.html' ? '#organiser-signup' : 'become-organiser.html';
    organiserCta.style.color = '#fff';
  }

  // "Become an Organiser" now lives in the main nav links, so the extra
  // header button is hidden to avoid showing it twice.
  const navOrganiserLink = document.querySelector('.nav-links [data-nav-organiser="true"]');
  const navAssistantLink = document.querySelector('.nav-links [data-nav-assistant="true"]');
  if (organiserCta) organiserCta.style.display = 'none';

  // Kilo (the assistant) only exists for logged-in organisers: the nav link
  // is hidden and the floating button is removed for everyone else.
  const isOrganiser = !!(currentUser && isOrganiserRole(currentUser));
  if (navAssistantLink) {
    navAssistantLink.hidden = !isOrganiser;
    if (isOrganiser) {
      navAssistantLink.href = '#organiser-assistant';
      navAssistantLink.setAttribute('data-open-assistant', 'true');
    } else {
      navAssistantLink.removeAttribute('data-open-assistant');
    }
  }
  if (!isOrganiser) removeAssistantWidget();

  if (currentUser) {
    welcomeEl.textContent = '';
    welcomeEl.classList.add('hidden-inline');

    authLink.textContent = 'Dashboard';
    authLink.href = 'dashboard.html';
    authLink.onclick = null;

    if (navOrganiserLink && isOrganiserRole(currentUser)) {
      navOrganiserLink.textContent = 'List an activity';
      navOrganiserLink.href = 'organise.html';
    }
    return;
  }

  welcomeEl.textContent = '';
  welcomeEl.classList.add('hidden-inline');

  authLink.textContent = 'Login';
  authLink.href = `login.html?next=${encodeURIComponent(getCurrentPagePath())}`;
  authLink.onclick = null;

  if (navOrganiserLink) {
    navOrganiserLink.textContent = 'Become an Organiser';
    navOrganiserLink.href = file === 'become-organiser.html' ? '#organiser-signup' : 'become-organiser.html';
  }
}

let headerAuthSyncPromise = null;

async function syncHeaderAuthUI(initialUser) {
  renderHeaderAuthUI(initialUser || getCurrentUser());

  if (!headerAuthSyncPromise) {
    headerAuthSyncPromise = refreshCurrentUser();
  }

  const serverUser = await headerAuthSyncPromise;
  const resolvedUser = serverUser || getCurrentUser();
  renderHeaderAuthUI(resolvedUser);
  return resolvedUser;
}

async function fetchJSON(url, options) {
  const sessionToken = getSessionToken();

  const requestOptions = {
    credentials: 'include',
    ...(options || {}),
    headers: {
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      ...((options && options.headers) || {})
    }
  };

  const candidates = buildApiBaseCandidates();
  const candidateUrls = [url];

  const matchedBase = candidates.find((base) => String(url || '').startsWith(`${base}/`));
  if (matchedBase) {
    candidates.forEach((base) => {
      if (base === matchedBase) return;
      const swapped = swapApiBase(url, matchedBase, base);
      if (swapped) candidateUrls.push(swapped);
    });
  }

  let lastFailure = { success: false, error: 'Could not reach the server.' };

  for (let i = 0; i < candidateUrls.length; i++) {
    const attemptUrl = candidateUrls[i];
    try {
      const res = await fetch(attemptUrl, requestOptions);
      const data = await res.json().catch(() => null);

      if (res.ok) {
        const usedBase = candidates.find((base) => String(attemptUrl).startsWith(`${base}/`));
        if (usedBase) {
          sessionStorage.setItem('nearby_api_base', sanitizeApiBase(usedBase) || usedBase);
        }
        return data;
      }

      lastFailure = {
        ...(data && typeof data === 'object' ? data : {}),
        success: false,
        error: (data && (data.error || data.message)) || `Request failed: ${res.status}`,
        status: res.status
      };

      const canRetryPath = (res.status === 404 || res.status === 405);
      const hasAnotherAttempt = i < candidateUrls.length - 1;
      if (!(canRetryPath && hasAnotherAttempt)) {
        return lastFailure;
      }
    } catch (err) {
      console.error(err);
      const hasAnotherAttempt = i < candidateUrls.length - 1;
      if (!hasAnotherAttempt) {
        return lastFailure;
      }
    }
  }

  return lastFailure;
}

// Re-checks the real session on the server and refreshes the cached user.
// Call this on page load for pages that need to know the current auth
// state reliably (dashboard, organise, event pages).
async function refreshCurrentUser() {
  const cachedUser = getCurrentUser();
  const data = await fetchJSON(`https://pishnest.co.uk/backend/me.php`);

  if (data && data.success && data.user) {
    setCurrentUser(data.user);
    return data.user;
  }

  // Do not clear the cache here. Cross-origin cookie blocks and brief API
  // blips would otherwise log people out on every page load. Only logout()
  // clears the cached user; protected API calls still enforce the real session.
  return cachedUser;
}

async function logout() {
  await fetchJSON(`https://pishnest.co.uk/backend/logout.php`, { method: 'POST' });
  clearCurrentUser();
  window.location.href = 'index.html';
}

// Searchable category dropdown used on homepage / discover.
// Markup: .category-combo[data-category-combo] with hidden input, trigger, panel, search, list.
function setupCategoryCombo(root, categories, { onSelect, initialValue = '' } = {}) {
  if (!root) return;

  const hidden = root.querySelector('input[type="hidden"]');
  const trigger = root.querySelector('.category-combo-trigger');
  const label = root.querySelector('.category-combo-label');
  const panel = root.querySelector('.category-combo-panel');
  const search = root.querySelector('.category-combo-search');
  const list = root.querySelector('.category-combo-list');
  if (!hidden || !trigger || !label || !panel || !search || !list) return;

  const options = [{ id: '', name: 'All categories' }, ...categories];

  function setValue(id, silent = false) {
    const match = options.find((opt) => String(opt.id) === String(id)) || options[0];
    hidden.value = match.id === '' || match.id == null ? '' : String(match.id);
    label.textContent = match.name;
    list.querySelectorAll('[role="option"]').forEach((el) => {
      el.setAttribute('aria-selected', String(el.dataset.value) === String(hidden.value) ? 'true' : 'false');
    });
    if (!silent) {
      hidden.dispatchEvent(new Event('change', { bubbles: true }));
      if (typeof onSelect === 'function') onSelect(hidden.value);
    }
  }

  function renderList(filterText = '') {
    const q = String(filterText || '').trim().toLowerCase();
    const filtered = options.filter((opt) => !q || String(opt.name).toLowerCase().includes(q));
    list.innerHTML = filtered.length
      ? filtered.map((opt) => {
          const value = opt.id === '' || opt.id == null ? '' : String(opt.id);
          const selected = value === String(hidden.value);
          return `<li role="option" tabindex="-1" data-value="${value}" aria-selected="${selected ? 'true' : 'false'}">${opt.name}</li>`;
        }).join('')
      : '<li class="category-combo-empty">No categories found</li>';
  }

  function openPanel() {
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    root.classList.add('is-open');
    search.value = '';
    renderList('');
    search.focus();
  }

  function closePanel() {
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    root.classList.remove('is-open');
  }

  trigger.addEventListener('click', (event) => {
    event.preventDefault();
    if (panel.hidden) openPanel();
    else closePanel();
  });

  search.addEventListener('input', () => renderList(search.value));
  search.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') event.preventDefault();
    if (event.key === 'Escape') {
      closePanel();
      trigger.focus();
    }
  });

  list.addEventListener('click', (event) => {
    const option = event.target.closest('[role="option"][data-value]');
    if (!option) return;
    setValue(option.dataset.value);
    closePanel();
  });

  document.addEventListener('click', (event) => {
    if (!root.contains(event.target)) closePanel();
  });

  renderList('');
  setValue(initialValue, true);
}

// Populates category <select id="category-select"> (organise form) and any
// searchable [data-category-combo] dropdowns. Calls onSelect(categoryId)
// when a combo option is chosen.
async function populateCategories(onSelect) {
  const rawCategories = await fetchJSON(`https://pishnest.co.uk/backend/categories.php`);
  const categories = Array.isArray(rawCategories)
    ? rawCategories
    : ((rawCategories && Array.isArray(rawCategories.categories)) ? rawCategories.categories : []);
  const select = document.getElementById('category-select');

  if (!Array.isArray(categories) || categories.length === 0) return [];

  if (select && select.tagName === 'SELECT') {
    categories.forEach((cat) => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      select.appendChild(opt);
    });
  }

  document.querySelectorAll('[data-category-combo]').forEach((root) => {
    const hidden = root.querySelector('input[type="hidden"]');
    setupCategoryCombo(root, categories, {
      onSelect,
      initialValue: hidden ? hidden.value : ''
    });
  });

  return categories;
}

// Floating Organiser Assistant (organisers only). Loaded on demand so other
// visitors never download it.
const ASSISTANT_HIDDEN_PAGES = ['login.html', 'register.html', 'verify-email.html', 'forgot-password.html'];
let assistantScriptPromise = null;

function loadAssistantWidget() {
  if (window.openOrganiserAssistant) return Promise.resolve();
  if (!assistantScriptPromise) {
    assistantScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'js/assistant.js';
      script.onload = resolve;
      script.onerror = () => {
        assistantScriptPromise = null;
        reject(new Error('Could not load the assistant.'));
      };
      document.body.appendChild(script);
    });
  }
  return assistantScriptPromise;
}

function removeAssistantWidget() {
  const widget = document.getElementById('pn-assistant');
  if (widget) widget.remove();
  delete window.openOrganiserAssistant;
  delete window.closeOrganiserAssistant;
  assistantScriptPromise = null;
}

// If the user logs out (or changes account) in another tab, update this one.
window.addEventListener('storage', (event) => {
  if (event.key !== USER_STORAGE_KEY && event.key !== null) return;
  const user = getCurrentUser();
  renderHeaderAuthUI(user);
  if (user && isOrganiserRole(user) && !ASSISTANT_HIDDEN_PAGES.includes(getCurrentPageFile().toLowerCase())) {
    loadAssistantWidget().catch(() => {});
  }
});

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-open-assistant]');
  if (!trigger) return;
  event.preventDefault();
  document.querySelector('.site-header, header')?.classList.remove('is-open');
  loadAssistantWidget().then(() => {
    if (window.openOrganiserAssistant) window.openOrganiserAssistant();
  }).catch(() => {});
});

document.addEventListener('DOMContentLoaded', () => {
  applySiteBranding();
  renderPrimaryNav();
  setupMobileNav();
  setupPasswordToggles();
  syncHeaderAuthUI()
    .then((user) => {
      if (user && isOrganiserRole(user) && !ASSISTANT_HIDDEN_PAGES.includes(getCurrentPageFile().toLowerCase())) {
        return loadAssistantWidget();
      }
      return null;
    })
    .catch(() => {})
    .finally(() => ensureNavCluster());
});
