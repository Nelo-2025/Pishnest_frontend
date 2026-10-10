function showMessage(elementId, message, isError = false) {
  const element = document.getElementById(elementId);
  if (!element) return;
  element.textContent = message;
  element.classList.remove('hidden', 'success-box', 'notice');
  element.classList.add(isError ? 'notice' : 'success-box');
}

function getRegisterRole() {
  const roleInput = document.getElementById('role');
  return roleInput ? roleInput.value : 'attendee';
}

function defaultSubmitLabel(role) {
  return role === 'organiser' ? 'Create organiser account' : 'Sign up';
}

function getRegisterRedirect(role) {
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
  return role === 'organiser' ? 'dashboard.html' : 'dashboard.html';
}

function showOtpStep(email, extraMessage) {
  const details = document.getElementById('register-details');
  const otp = document.getElementById('register-otp');
  const title = document.getElementById('register-card-title');
  const lead = document.getElementById('otp-lead');
  const codeInput = document.getElementById('verify-code');

  if (details) details.classList.add('hidden');
  if (otp) otp.classList.remove('hidden');
  if (title) title.textContent = 'Verify your email';
  if (lead) lead.textContent = `Enter the 6 digit code we sent to ${email}.`;
  if (codeInput) {
    codeInput.required = true;
    codeInput.focus();
  }

  sessionStorage.setItem('pending_verify_email', email);
  showMessage('register-message', extraMessage || 'Check your inbox and junk folder for a 6 digit code.');
}

async function verifySignupCode(email, code, submitBtn) {
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
    showMessage('register-message', data.message || 'Email verified.');
    window.location.href = getRegisterRedirect(data.user.role || getRegisterRole());
    return;
  }

  showMessage('register-message', (data && (data.message || data.error)) || 'Could not verify that code.', true);
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Verify and continue';
  }
}

const registerForm = document.getElementById('register-form');
if (registerForm) {
  const codeInput = document.getElementById('verify-code');
  if (codeInput) {
    codeInput.addEventListener('input', () => {
      codeInput.value = codeInput.value.replace(/\D/g, '').slice(0, 6);
    });
  }

  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const otpStep = document.getElementById('register-otp');
    const onOtpStep = otpStep && !otpStep.classList.contains('hidden');
    const role = getRegisterRole();

    if (onOtpStep) {
      const email = (document.getElementById('email').value || sessionStorage.getItem('pending_verify_email') || '').trim().toLowerCase();
      const code = (document.getElementById('verify-code') || {}).value.trim();
      if (!email || !code) {
        showMessage('register-message', 'Enter the 6 digit code we emailed you.', true);
        return;
      }
      if (!/^\d{6}$/.test(code)) {
        showMessage('register-message', 'Enter the 6 digit verification code.', true);
        return;
      }
      await verifySignupCode(email, code, document.getElementById('otp-submit-btn'));
      return;
    }

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

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

    const submitBtn = document.getElementById('register-submit-btn') || registerForm.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account…';
    }

    const data = await fetchJSON(`https://pishnest.co.uk/backend/register.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ name, email, password, role })
    });

    if (data && data.success && data.user && !data.needs_verification) {
      if (data.session_token) setSessionToken(data.session_token);
      setCurrentUser(data.user);
      showMessage('register-message', data.message || 'Account created.');
      window.location.href = getRegisterRedirect(data.user.role || role);
      return;
    }

    if (data && data.success && data.needs_verification) {
      if (data.dev_code) {
        sessionStorage.setItem('pending_verify_dev_code', data.dev_code);
        const otpField = document.getElementById('verify-code');
        if (otpField) otpField.value = data.dev_code;
        showOtpStep(email, `Use this code to verify your email: ${data.dev_code}`);
      } else {
        sessionStorage.removeItem('pending_verify_dev_code');
        showOtpStep(email, data.message || 'Check your inbox and junk folder for a 6 digit code.');
      }
      return;
    }

    if (data && data.success) {
      showMessage('register-message', data.message || 'Account created. You can now log in.');
      window.location.href = role === 'organiser' ? 'login.html?next=dashboard.html' : 'login.html';
      return;
    }

    showMessage('register-message', (data && (data.message || data.error)) || 'Could not register.', true);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = defaultSubmitLabel(role);
    }
  });
}

const resendBtn = document.getElementById('resend-otp-btn');
if (resendBtn) {
  resendBtn.addEventListener('click', async () => {
    const email = (document.getElementById('email').value || sessionStorage.getItem('pending_verify_email') || '').trim().toLowerCase();
    if (!email) {
      showMessage('register-message', 'Enter your email first.', true);
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
        const otpField = document.getElementById('verify-code');
        if (otpField) otpField.value = data.dev_code;
        showMessage('register-message', `${data.message || 'A new code is ready.'} Code: ${data.dev_code}`);
      } else {
        sessionStorage.removeItem('pending_verify_dev_code');
        showMessage('register-message', data.message || 'A new code has been sent.');
      }
    } else {
      showMessage('register-message', (data && (data.message || data.error)) || 'Could not resend the code.', true);
    }
    resendBtn.disabled = false;
  });
}
