function showMessage(elementId, message, isError = false) {
  const element = document.getElementById(elementId);
  if (!element) return;
  element.textContent = message;
  element.classList.remove('hidden', 'success-box', 'notice');
  element.classList.add(isError ? 'notice' : 'success-box');
}

document.querySelectorAll('[data-toggle-password]').forEach((button) => {
  button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.togglePassword);
    if (!input) return;
    const shouldReveal = input.type === 'password';
    input.type = shouldReveal ? 'text' : 'password';
    button.textContent = shouldReveal ? 'Hide' : 'Show';
  });
});

const registerForm = document.getElementById('register-form');
if (registerForm) {
  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const role = document.getElementById('role').value;

    if (!name || !email || !password || !confirmPassword || !role) {
      showMessage('register-message', 'Please fill in all fields.', true);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showMessage('register-message', 'Please enter a valid email address.', true);
      return;
    }
    if (password.length < 6) {
      showMessage('register-message', 'Password must be at least 6 characters long.', true);
      return;
    }
    if (password !== confirmPassword) {
      showMessage('register-message', 'Passwords do not match.', true);
      return;
    }

    const data = await fetchJSON(`https://darkgoldenrod-reindeer-637131.hostingersite.com/backend/register.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ name, email, password, role })
    });

    if (data && data.success) {
      showMessage('register-message', data.message || 'Account created! You can now log in.');
      registerForm.reset();
      window.location.href = 'login.html';
    } else {
      showMessage('register-message', (data && (data.message || data.error)) || 'Could not register.', true);
    }
  });
}

    