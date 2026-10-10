// Requires common.js loaded first.

function showMessage(elementId, message, isSuccess = false) {
  const element = document.getElementById(elementId);
  if (!element) return;
  element.textContent = message;
  element.classList.remove('hidden', 'success-box', 'notice');
  element.classList.add(isSuccess ? 'success-box' : 'notice');
}

// Password visibility toggles are handled in common.js (eye icons).

const forgotForm = document.getElementById('forgot-password-form');
const verifyForm = document.getElementById('verify-code-form');
const resetForm = document.getElementById('reset-password-form');

let pendingEmail = '';

if (forgotForm) {
  forgotForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('reset-email').value.trim().toLowerCase();

    if (!email) {
      showMessage('forgot-message', 'Enter the email address on your account.');
      return;
    }

    const data = await fetchJSON(`https://pishnest.co.uk/backend/forgot-password.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ action: 'request', email })
    });

    if (data && data.success) {
      pendingEmail = email;
      verifyForm.classList.remove('hidden');
      forgotForm.querySelector('button[type="submit"]').disabled = true;

      // dev_code is only present because there's no real email server in
      // this project, remove this line once you wire up actual email
      // sending, and don't return dev_code from the backend either.
      const devNote = data.dev_code ? ` (dev mode, your code is ${data.dev_code})` : '';
      showMessage('forgot-message', `Verification code generated for ${email}.${devNote}`, true);
    } else {
      showMessage('forgot-message', (data && data.message) || 'Something went wrong.');
    }
  });
}

if (verifyForm) {
  verifyForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const code = document.getElementById('verification-code').value.trim();

    const data = await fetchJSON(`https://pishnest.co.uk/backend/forgot-password.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ action: 'verify', email: pendingEmail, code })
    });

    if (data && data.success) {
      resetForm.classList.remove('hidden');
      showMessage('forgot-message', 'Email verified. Set your new password below.', true);
    } else {
      showMessage('forgot-message', (data && data.message) || 'The verification code is invalid or has expired.');
    }
  });
}

if (resetForm) {
  resetForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const newPassword = document.getElementById('new-password').value;

    if (newPassword.length < 6) {
      showMessage('forgot-message', 'Password must be at least 6 characters long.');
      return;
    }

    const data = await fetchJSON(`https://pishnest.co.uk/backend/forgot-password.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ action: 'reset', new_password: newPassword })
    });

    if (data && data.success) {
      document.getElementById('forgot-success').classList.remove('hidden');
      document.getElementById('forgot-success').textContent = 'Password updated successfully. You can now log in with your new password.';
      forgotForm.reset();
      verifyForm.reset();
      resetForm.reset();
      verifyForm.classList.add('hidden');
      resetForm.classList.add('hidden');
      forgotForm.querySelector('button[type="submit"]').disabled = false;
    } else {
      showMessage('forgot-message', (data && data.message) || 'Could not update password.');
    }
  });
}
