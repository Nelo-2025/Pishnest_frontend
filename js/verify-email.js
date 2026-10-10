// Requires common.js loaded first.

function showVerifyMessage(message, isError = false) {
  const element = document.getElementById('verify-message');
  if (!element) return;
  element.textContent = message;
  element.classList.remove('hidden', 'success-box', 'notice');
  element.classList.add(isError ? 'notice' : 'success-box');
}

function getVerifyRedirect(role) {
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next');
  if (next && !next.includes('://') && !next.startsWith('//')) {
    const [pathOnly] = next.split('?');
    const allowed = new Set([
      'dashboard.html', 'organise.html', 'index.html', 'discover.html',
      'event.html', 'checkout.html', 'my-bookings.html', 'become-organiser.html',
      'organiser-sales.html', 'pricing.html'
    ]);
    if (allowed.has(pathOnly)) return next;
  }
  return (String(role || '').toLowerCase() === 'organiser') ? 'dashboard.html' : 'dashboard.html';
}

function prefillFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const email = (params.get('email') || sessionStorage.getItem('pending_verify_email') || '').trim().toLowerCase();
  const emailInput = document.getElementById('verify-email');
  const lead = document.getElementById('verify-lead');
  if (emailInput && email) {
    emailInput.value = email;
  }
  if (lead && email) {
    lead.textContent = `Enter the 6 digit code we sent to ${email}.`;
  }

  const devCode = sessionStorage.getItem('pending_verify_dev_code');
  if (devCode) {
    showVerifyMessage(`Email sending was unavailable, use this code: ${devCode}`);
    const codeInput = document.getElementById('verify-code');
    if (codeInput && !codeInput.value) codeInput.value = devCode;
  }
}

const verifyForm = document.getElementById('verify-otp-form');
if (verifyForm) {
  verifyForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('verify-email').value.trim().toLowerCase();
    const code = document.getElementById('verify-code').value.trim();

    if (!email || !code) {
      showVerifyMessage('Enter your email and the 6 digit code.', true);
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      showVerifyMessage('Enter the 6 digit verification code.', true);
      return;
    }

    const submitBtn = verifyForm.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Verifying…';
    }

    const data = await fetchJSON('https://pishnest.co.uk/backend/verify-otp.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ action: 'verify', email, code })
    });

    if (data && data.success && data.user) {
      if (data.session_token) setSessionToken(data.session_token);
      setCurrentUser(data.user);
      sessionStorage.removeItem('pending_verify_email');
      sessionStorage.removeItem('pending_verify_dev_code');
      showVerifyMessage(data.message || 'Email verified.');
      window.location.href = getVerifyRedirect(data.user.role);
      return;
    }

    showVerifyMessage((data && (data.message || data.error)) || 'Could not verify that code.', true);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Verify and continue';
    }
  });
}

const resendBtn = document.getElementById('resend-otp-btn');
if (resendBtn) {
  resendBtn.addEventListener('click', async () => {
    const email = document.getElementById('verify-email').value.trim().toLowerCase();
    if (!email) {
      showVerifyMessage('Enter your email first.', true);
      return;
    }

    resendBtn.disabled = true;
    const data = await fetchJSON('https://pishnest.co.uk/backend/verify-otp.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ action: 'resend', email })
    });

    if (data && data.success) {
      if (data.dev_code) {
        sessionStorage.setItem('pending_verify_dev_code', data.dev_code);
        showVerifyMessage(`${data.message} Code: ${data.dev_code}`);
        const codeInput = document.getElementById('verify-code');
        if (codeInput) codeInput.value = data.dev_code;
      } else {
        sessionStorage.removeItem('pending_verify_dev_code');
        showVerifyMessage(data.message || 'A new code has been sent.');
      }
    } else {
      showVerifyMessage((data && (data.message || data.error)) || 'Could not resend the code.', true);
    }
    resendBtn.disabled = false;
  });
}

prefillFromQuery();
syncHeaderAuthUI();

const codeInput = document.getElementById('verify-code');
if (codeInput) {
  codeInput.addEventListener('input', () => {
    codeInput.value = codeInput.value.replace(/\D/g, '').slice(0, 6);
  });
}
