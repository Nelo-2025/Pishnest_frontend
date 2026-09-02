// Requires common.js loaded first.

function fillCheckoutContactFields() {
  const user = getCurrentUser();
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const loginRow = document.getElementById('checkout-login-row');
  const lead = document.getElementById('checkout-lead');
  const optIn = document.getElementById('create-account-label');
  const fields = document.getElementById('create-account-fields');
  const createAccount = document.getElementById('create-account');

  if (user) {
    if (nameInput && !nameInput.value) {
      nameInput.value = String(user.name || user.full_name || getUserDisplayName(user) || '').trim();
    }
    if (emailInput && !emailInput.value) {
      emailInput.value = String(user.email || '').trim();
    }
    if (loginRow) loginRow.hidden = true;
    if (optIn) optIn.hidden = true;
    if (fields) fields.hidden = true;
    if (createAccount) createAccount.checked = false;
    if (lead) lead.textContent = 'Confirm your details to finish this booking.';
    return;
  }

  if (loginRow) loginRow.hidden = false;
  if (optIn) optIn.hidden = false;
  if (lead) lead.textContent = 'Book with your name and email, an account is optional.';
}

function toggleCreateAccountFields() {
  const checkbox = document.getElementById('create-account');
  const fields = document.getElementById('create-account-fields');
  const password = document.getElementById('checkout-password');
  if (!checkbox || !fields) return;
  const show = checkbox.checked && !getCurrentUser();
  fields.hidden = !show;
  if (password) {
    password.required = show;
    if (!show) password.value = '';
  }
}

async function loadOrderSummary() {
  const summaryEl = document.getElementById('order-summary');
  const eventId = sessionStorage.getItem('checkout_event_id');
  const items = JSON.parse(sessionStorage.getItem('checkout_items') || 'null');

  if (!eventId || !items || items.length === 0) {
    summaryEl.innerHTML = `<p>No tickets selected. <a href="discover.html?audience=kids">Browse activities</a> to pick some first.</p>`;
    document.getElementById('checkout-submit').disabled = true;
    return;
  }

  const data = await fetchJSON(`https://pishnest.co.uk/backend/event.php?id=${encodeURIComponent(eventId)}`);
  if (!data || !data.success || !data.event) {
    summaryEl.innerHTML = `<p>Could not load this event.</p>`;
    document.getElementById('checkout-submit').disabled = true;
    return;
  }

  const ev = data.event;

  if (eventHasPassed(ev)) {
    summaryEl.innerHTML = `
      <h3 class="order-summary-title">${ev.title}</h3>
      <p class="form-notice error" style="display:block">This event has already taken place. Tickets are no longer available.</p>
      <p><a href="event.html?id=${encodeURIComponent(eventId)}">Back to event</a>, <a href="discover.html?audience=kids">Browse activities</a></p>
    `;
    document.getElementById('checkout-submit').disabled = true;
    sessionStorage.removeItem('checkout_event_id');
    sessionStorage.removeItem('checkout_items');
    return;
  }

  let total = 0;
  const rows = items.map((item) => {
    const ticket = (ev.ticket_types || []).find((t) => String(t.id) === String(item.ticket_type_id));
    const price = ticket ? Number(ticket.price) : 0;
    const lineTotal = price * item.quantity;
    total += lineTotal;
    return `<p>${item.quantity} × ${ticket ? ticket.name : 'Ticket'}, £${lineTotal.toFixed(2)}</p>`;
  }).join('');

  summaryEl.innerHTML = `
    <h3 class="order-summary-title">${ev.title}</h3>
    <p class="text-muted">${icon('mapPin', 'icon icon-sm')} ${ev.venue || 'TBC'}</p>
    <div class="order-lines">${rows}</div>
    <p class="record-total">Total: £${total.toFixed(2)}</p>
  `;
}

function showCheckoutMessage(msg, isError = false) {
  const el = document.getElementById('checkout-message');
  el.innerHTML = msg;
  el.className = `form-notice ${isError ? 'error' : 'success'}`;
  el.style.display = 'block';
}

document.getElementById('create-account')?.addEventListener('change', toggleCreateAccountFields);

document.getElementById('checkout-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  const eventId = sessionStorage.getItem('checkout_event_id');
  const items = JSON.parse(sessionStorage.getItem('checkout_items') || 'null');

  if (!eventId || !items || items.length === 0) {
    showCheckoutMessage('No items selected for checkout.', true);
    return;
  }
  if (items.some((item) => item.quantity <= 0)) {
    showCheckoutMessage('Invalid item quantity selected.', true);
    return;
  }

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim().toLowerCase();
  const createAccount = !!(document.getElementById('create-account') && document.getElementById('create-account').checked && !getCurrentUser());
  const password = (document.getElementById('checkout-password') && document.getElementById('checkout-password').value) || '';

  if (!name || !email) {
    showCheckoutMessage('Please enter your name and email to complete this booking.', true);
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showCheckoutMessage('Please enter a valid email address.', true);
    return;
  }
  if (createAccount && password.length < 6) {
    showCheckoutMessage('Choose a password of at least 6 characters, or leave account creation unticked.', true);
    return;
  }

  const submitBtn = document.getElementById('checkout-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Processing…';

  const eventData = await fetchJSON(`https://pishnest.co.uk/backend/event.php?id=${encodeURIComponent(eventId)}`);
  const ev = eventData && eventData.event;
  if (!ev || eventHasPassed(ev)) {
    showCheckoutMessage('This event has already taken place. Tickets are no longer available.', true);
    sessionStorage.removeItem('checkout_event_id');
    sessionStorage.removeItem('checkout_items');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Event has ended';
    return;
  }

  const ticketTypes = ev.ticket_types || [];
  const soldOutOrShort = items.some((item) => {
    const ticket = ticketTypes.find((t) => String(t.id) === String(item.ticket_type_id));
    if (!ticket) return true;
    const remaining = Number(ticket.quantity_available) - Number(ticket.quantity_sold);
    return remaining < Number(item.quantity);
  });
  if (soldOutOrShort) {
    showCheckoutMessage('Sorry, those tickets are sold out or no longer available.', true);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Confirm booking (demo, no payment taken)';
    return;
  }

  const data = await fetchJSON(`https://pishnest.co.uk/backend/checkout.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_id: eventId,
      items,
      name,
      email,
      create_account: createAccount,
      password: createAccount ? password : undefined
    })
  });

  if (data && data.success) {
    if (data.session_token) setSessionToken(data.session_token);
    if (data.user) setCurrentUser(data.user);
    sessionStorage.setItem('last_order_id', data.order_id);
    sessionStorage.setItem('last_order_total', data.total_amount);
    sessionStorage.setItem('last_order_guest', data.guest ? '1' : '0');
    sessionStorage.setItem('last_order_email', email);
    sessionStorage.removeItem('checkout_event_id');
    sessionStorage.removeItem('checkout_items');
    window.location.href = 'confirmation.html';
    return;
  }

  if (data && data.login_required) {
    showCheckoutMessage(
      `${data.error || 'Please log in to complete this booking.'} <a href="login.html?next=${encodeURIComponent('checkout.html')}">Log in</a>`,
      true
    );
  } else {
    showCheckoutMessage((data && data.error) || 'Checkout failed. Please try again.', true);
  }
  submitBtn.disabled = false;
  submitBtn.textContent = 'Confirm booking (demo, no payment taken)';
});

(async () => {
  await refreshCurrentUser();
  fillCheckoutContactFields();
  toggleCreateAccountFields();
  await syncHeaderAuthUI(getCurrentUser());
  loadOrderSummary();
})();
