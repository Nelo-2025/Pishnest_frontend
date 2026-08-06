// Requires common.js loaded first.

function showMessage(elementId, message, isError = false) {
  const element = document.getElementById(elementId);
  if (!element) return;
  element.textContent = message;
  element.classList.remove('hidden', 'success-box', 'notice');
  element.classList.add(isError ? 'notice' : 'success-box');
}

// Password visibility toggles are handled in common.js (eye icons).

function getPostLoginRedirect() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next');
  if (!next) return 'dashboard.html';

  // Prevent external/open redirects — only allow known app pages.
  if (next.includes('://') || next.startsWith('//')) return 'dashboard.html';

  const [pathOnly] = next.split('?');
  const allowedPaths = new Set([
    'dashboard.html', 'organise.html', 'index.html', 'browse.html', 'discover.html',
    'categories.html', 'event.html', 'checkout.html', 'my-bookings.html',
    'become-organiser.html', 'organiser-sales.html'
  ]);
  return allowedPaths.has(pathOnly) ? next : 'dashboard.html';
}

function getDefaultRoleRedirect(user) {
  const role = normalizeRole(user && user.role);
  return (role === 'organiser' || role === 'admin') ? 'dashboard.html' : 'dashboard.html';
}

const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;

    if (!email || !password) {
      showMessage('login-message', 'Please fill in all fields.', true);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showMessage('login-message', 'Please enter a valid email address.', true);
      return;
    }

    // NOTE: this used to also call get-user.php right after login to fetch
    // the user's role — that endpoint let anyone look up ANY user's name
    // and role by email, with no auth check at all. login.php already
    // returns the full user object on success, so that second call has
    // been removed entirely; it was both insecure and unnecessary.
    const data = await fetchJSON(`https://darkgoldenrod-reindeer-637131.hostingersite.com/backend/login.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email, password })
    });

    if (data && data.success && data.user) {
      if (data.session_token) setSessionToken(data.session_token);
      setCurrentUser(data.user);
      showMessage('login-message', data.message || 'Login successful');
      loginForm.reset();
      window.location.href = getPostLoginRedirect();
    } else {
      showMessage('login-message', (data && (data.message || data.error)) || 'Invalid email or password.', true);
    }
  });
}
