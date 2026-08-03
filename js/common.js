// Shared across pages. Include this BEFORE any page-specific script.
//
// IMPORTANT ARCHITECTURE NOTE:
// Real auth is enforced server-side via the PHP session cookie — every
// protected endpoint (organise.php, update-event.php, checkout.php) checks
// $_SESSION on the server, so a user can never fake their way into an
// action just by editing browser storage.
//
// The sessionStorage user object below is ONLY used to personalise the UI
// (show/hide the "Organise" link, greet the user by name, etc.) without
// having to call the server on every single page load. It is fetched once
// from me.php right after login and cached client-side. If it ever falls
// out of sync with the real session (e.g. the session expired), the
// server-side check on the actual action will still correctly reject it —
// this cache only controls what buttons/links are shown, not what's
// actually allowed.

// Central backend URL used by all pages.
const DEFAULT_API_BASE = 'https://darkgoldenrod-reindeer-637131.hostingersite.com/backend';
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

function getCurrentUser() {
  try {
    return JSON.parse(sessionStorage.getItem('nearby_current_user'));
  } catch (err) {
    return null;
  }
}

function setCurrentUser(user) {
  sessionStorage.setItem('nearby_current_user', JSON.stringify(user));
}

function clearCurrentUser() {
  sessionStorage.removeItem('nearby_current_user');
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
      || text === 'log in'
      || text === 'login'
      || text === 'log out'
      || text === 'logout'
      || text === 'back to login';
  });

  if (!authLink) {
    authLink = document.createElement('a');
    authLink.className = 'btn btn-ghost';
    navActions.appendChild(authLink);
  }
  authLink.setAttribute('data-header-auth', 'true');

  const signUpLink = authLinkCandidates.find((link) => {
    const href = String(link.getAttribute('href') || '').toLowerCase();
    const text = String(link.textContent || '').trim().toLowerCase();
    return href.includes('register.html') || text === 'sign up' || text === 'register';
  }) || null;

  return { navActions, welcomeEl, authLink, signUpLink };
}

function renderHeaderAuthUI(currentUser) {
  const headerEls = ensureHeaderAuthElements();
  if (!headerEls) return;

  const { welcomeEl, authLink, signUpLink } = headerEls;

  if (currentUser) {
    welcomeEl.textContent = `Welcome, ${getUserDisplayName(currentUser)}!`;
    welcomeEl.classList.remove('hidden-inline');

    authLink.textContent = 'Logout';
    authLink.href = '#';
    authLink.onclick = async (event) => {
      event.preventDefault();
      await logout();
    };

    if (signUpLink) signUpLink.style.display = 'none';
    return;
  }

  welcomeEl.textContent = '';
  welcomeEl.classList.add('hidden-inline');

  authLink.textContent = 'Login';
  authLink.href = `login.html?next=${encodeURIComponent(getCurrentPagePath())}`;
  authLink.onclick = null;

  if (signUpLink) signUpLink.style.display = '';
}

let headerAuthSyncPromise = null;

async function syncHeaderAuthUI(initialUser) {
  renderHeaderAuthUI(initialUser || getCurrentUser());

  if (!headerAuthSyncPromise) {
    headerAuthSyncPromise = refreshCurrentUser();
  }

  const serverUser = await headerAuthSyncPromise;
  renderHeaderAuthUI(serverUser);
  return serverUser;
}

async function fetchJSON(url, options) {
  const requestOptions = {
    credentials: 'include',
    ...(options || {})
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
  const data = await fetchJSON(`https://darkgoldenrod-reindeer-637131.hostingersite.com/backend/me.php`);
  if (data && data.success && data.user) {
    setCurrentUser(data.user);
    return data.user;
  }
  clearCurrentUser();
  return null;
}

async function logout() {
  await fetchJSON(`https://darkgoldenrod-reindeer-637131.hostingersite.com/backend/logout.php`, { method: 'POST' });
  clearCurrentUser();
  window.location.href = 'index.html';
}

// Populates any <select> with id="category-select" and any chip row with
// id="category-chips" from the real categories.php endpoint. Calls
// onSelect(categoryId) when a chip is clicked, so the caller can trigger
// its own event reload.
async function populateCategories(onSelect) {
  const rawCategories = await fetchJSON(`https://darkgoldenrod-reindeer-637131.hostingersite.com/backend/categories.php`);
  const categories = Array.isArray(rawCategories)
    ? rawCategories
    : ((rawCategories && Array.isArray(rawCategories.categories)) ? rawCategories.categories : []);
  const select = document.getElementById('category-select');
  const chipRow = document.getElementById('category-chips');

  if (!Array.isArray(categories) || categories.length === 0) return [];

  categories.forEach((cat) => {
    if (select) {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      select.appendChild(opt);
    }

    if (chipRow) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.dataset.category = cat.id;
      chip.textContent = cat.name;
      chip.addEventListener('click', () => {
        chipRow.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        if (onSelect) onSelect(cat.id);
      });
      chipRow.appendChild(chip);
    }
  });

  const allChip = chipRow && chipRow.querySelector('.chip[data-category=""]');
  if (allChip) {
    allChip.addEventListener('click', (e) => {
      chipRow.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
      e.target.classList.add('active');
      if (onSelect) onSelect('');
    });
  }

  return categories;
}

document.addEventListener('DOMContentLoaded', () => {
  syncHeaderAuthUI();
});
