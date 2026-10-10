// Requires common.js loaded first.

function guardOrganiseAccess(currentUser) {
    const next = `organise.html${window.location.search || ''}`;
    const gate = document.getElementById('dash-gate');
    const app = document.getElementById('dash-app');

    if (!currentUser) {
        if (gate) gate.hidden = false;
        if (app) app.hidden = true;
        document.body.classList.remove('is-dash-ready');
        window.location.href = `login.html?next=${encodeURIComponent(next)}`;
        return null;
    }
    if (!isOrganiserRole(currentUser)) {
        if (gate) {
            gate.hidden = false;
            const copy = gate.querySelector('p');
            const title = gate.querySelector('h1');
            if (title) title.textContent = 'Organiser access needed';
            if (copy) copy.textContent = 'Only organiser accounts can create or edit activities. Redirecting to your dashboard…';
        }
        if (app) app.hidden = true;
        document.body.classList.remove('is-dash-ready');
        window.setTimeout(() => { window.location.href = 'dashboard.html'; }, 1200);
        return null;
    }

    if (gate) gate.hidden = true;
    if (app) app.hidden = false;
    document.body.classList.add('is-dash-ready');
    return currentUser;
}

function fillOrganiseShell(user) {
    const name = getUserDisplayName(user) || user.email || 'Organiser';
    const nameEl = document.getElementById('dash-sidebar-name');
    const emailEl = document.getElementById('dash-sidebar-email');
    const roleEl = document.getElementById('dash-role-pill');
    const avatar = document.getElementById('dash-avatar');
    if (nameEl) nameEl.textContent = name;
    if (emailEl) emailEl.textContent = user.email || 'None';
    if (roleEl) roleEl.textContent = normalizeRole(user.role) || 'organiser';
    if (avatar) avatar.textContent = String(name).charAt(0).toUpperCase() || '?';

    document.querySelectorAll('[data-nav-icon]').forEach((el) => {
        el.innerHTML = icon(el.getAttribute('data-nav-icon'), 'icon icon-sm');
    });

    const logoutBtn = document.getElementById('dash-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await logout();
            window.location.href = 'login.html?next=organise.html';
        });
    }

    const toggle = document.getElementById('dash-sidebar-toggle');
    const backdrop = document.getElementById('dash-backdrop');
    if (toggle) {
        toggle.addEventListener('click', () => {
            document.body.classList.toggle('dash-sidebar-open');
            if (backdrop) backdrop.hidden = !document.body.classList.contains('dash-sidebar-open');
        });
    }
    if (backdrop) {
        backdrop.addEventListener('click', () => {
            document.body.classList.remove('dash-sidebar-open');
            backdrop.hidden = true;
        });
    }
}

function showNotice(msg, isError = false) {
    let noticeEl = document.getElementById('organise-message');
    if (!noticeEl) {
        noticeEl = document.createElement('div');
        noticeEl.id = 'organise-message';
        noticeEl.className = 'form-notice';
        document.getElementById('organise-form').prepend(noticeEl);
    }
    noticeEl.textContent = msg;
    noticeEl.className = `form-notice ${isError ? 'error' : 'success'}`;
    noticeEl.style.display = 'block';
}

function showSettingsNotice(message, isError = false) {
    // Legacy helper kept for compatibility; settings live on the dashboard now.
    showNotice(message, isError);
}

function getBioStorageKey(user) {
    const idPart = user && user.id ? String(user.id) : 'guest';
    return `nearby_profile_bio_${idPart}`;
}

function wireOrganiserSettings() {
    // Organiser profile settings moved to dashboard.html#settings.
}

function ensureOtherCategorySupport() {
    const categorySelect = document.getElementById('category-select');
    if (!categorySelect) return;

    let otherOption = categorySelect.querySelector('option[value="__other__"]');
    if (!otherOption) {
        otherOption = document.createElement('option');
        otherOption.value = '__other__';
        otherOption.textContent = 'Other (type your own)';
        categorySelect.appendChild(otherOption);
    }

    let wrapper = document.getElementById('custom-category-wrapper');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = 'custom-category-wrapper';
        wrapper.className = 'hidden-inline';
        wrapper.innerHTML = `
            <label for="custom-category-name">Custom Category:</label>
            <input type="text" id="custom-category-name" name="custom-category-name" placeholder="Type a category name" maxlength="80" disabled>
        `;
        categorySelect.insertAdjacentElement('afterend', wrapper);
    }

    const customInput = document.getElementById('custom-category-name');
    const toggleOtherInput = () => {
        const isOther = categorySelect.value === '__other__';
        wrapper.classList.toggle('hidden-inline', !isOther);
        if (customInput) {
            customInput.disabled = !isOther;
            customInput.required = isOther;
            if (isOther) {
                customInput.focus();
            }
        }
    };

    categorySelect.addEventListener('change', toggleOtherInput);
    toggleOtherInput();
}

function buildDescriptionWithCategory(description, customCategoryName) {
    const cleanDescription = String(description || '').trim();
    const cleanCategory = String(customCategoryName || '').trim();
    if (!cleanCategory) return cleanDescription;

    const categoryTag = `[Category: ${cleanCategory}]`;
    const existingTagPattern = /^\[Category:[^\]]+\]\s*/i;

    if (existingTagPattern.test(cleanDescription)) {
        return cleanDescription.replace(existingTagPattern, `${categoryTag}\n`);
    }

    return `${categoryTag}\n${cleanDescription}`;
}

// ---------- Ticket type row management ----------
let ticketRowCount = 0;

function addTicketTypeRow(prefill = {}) {
    ticketRowCount++;
    const rowId = `ticket-row-${ticketRowCount}`;
    const container = document.getElementById('ticket-type-rows');
    const row = document.createElement('div');
    row.id = rowId;
    row.className = 'ticket-type-row';
    row.innerHTML = `
        <input type="text" placeholder="Ticket name (e.g. General Admission)" class="tt-name" value="${prefill.name || ''}">
        <input type="number" placeholder="Price (£)" min="0" step="0.01" class="tt-price" value="${prefill.price ?? ''}">
        <input type="number" placeholder="Quantity" min="0" step="1" class="tt-qty" value="${prefill.quantity_available ?? ''}">
        <button type="button" class="tt-remove" aria-label="Remove ticket type">✕</button>
    `;
    row.querySelector('.tt-remove').addEventListener('click', () => row.remove());
    container.appendChild(row);
}

function collectTicketTypes() {
    const rows = document.querySelectorAll('.ticket-type-row');
    const types = [];
    rows.forEach((row) => {
        const name = row.querySelector('.tt-name').value.trim();
        const price = parseFloat(row.querySelector('.tt-price').value);
        const qty = parseInt(row.querySelector('.tt-qty').value, 10);
        if (name) {
            types.push({
                name,
                price: isNaN(price) ? 0 : price,
                quantity_available: isNaN(qty) ? 0 : qty
            });
        }
    });
    return types;
}

const addTicketBtn = document.getElementById('add-ticket-type');
if (addTicketBtn) {
    addTicketBtn.addEventListener('click', () => addTicketTypeRow());
}

// ---------- Live text preview ----------
function updatePreview() {
    const nameInput = document.getElementById('event-name');
    const locationInput = document.getElementById('event-venue');
    const dateInput = document.getElementById('event-startdatetime');
    const timeInput = document.getElementById('event-enddatetime');
    const descInput = document.getElementById('event-description');

    document.getElementById('preview-name').textContent = nameInput.value.trim() || 'Event Name';
    document.getElementById('preview-location').textContent = 'Location: ' + (locationInput.value.trim() || 'None');
    document.getElementById('preview-date').textContent = 'Date: ' + (dateInput.value || 'None');
    document.getElementById('preview-time').textContent = 'Time: ' + (timeInput.value || 'None');
    document.getElementById('preview-description').textContent = 'Description: ' + (descInput.value.trim() || 'None');
}

['event-name', 'event-venue', 'event-startdatetime', 'event-enddatetime', 'event-description']
    .forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updatePreview);
    });

// ---------- Edit mode ----------
const urlParams = new URLSearchParams(window.location.search);
const editEventId = urlParams.get('edit') || urlParams.get('id');

async function loadEventForEditing(id) {
    const data = await fetchJSON(`https://pishnest.co.uk/backend/event.php?id=${encodeURIComponent(id)}`);
    if (!data || !data.success || !data.event) {
        showNotice("Could not load this event for editing.", true);
        return;
    }
    const ev = data.event;

    document.getElementById('event-name').value = ev.title || '';
    document.getElementById('event-venue').value = ev.venue || '';
    document.getElementById('event-description').value = ev.description || '';

    if (ev.start_datetime) {
        const [datePart, timePart] = ev.start_datetime.split(' ');
        document.getElementById('event-startdatetime').value = datePart || '';
        document.getElementById('event-enddatetime').value = (timePart || '').substring(0, 5);
    }

    const categorySelect = document.getElementById('category-select');
    if (ev.category_id && categorySelect) categorySelect.value = ev.category_id;

    const saveDraftEl = document.getElementById('save-to-return');
    if (ev.status === 'draft' && saveDraftEl) {
        saveDraftEl.checked = true;
    }

    (ev.ticket_types || []).forEach((t) => addTicketTypeRow(t));

    updatePreview();
}

// ---------- Submit ----------
async function handleSubmit(event) {
    event.preventDefault();

    // Reconfirm server-side session right before writing data.
    const serverUser = await refreshCurrentUser();
    if (!serverUser || !isOrganiserRole(serverUser)) {
        showNotice('Your organiser session has expired. Please log in again.', true);
        setTimeout(() => {
            window.location.href = `login.html?next=${encodeURIComponent('organise.html')}`;
        }, 900);
        return;
    }

    const eventName = document.getElementById('event-name').value.trim();
    const categorySelectEl = document.getElementById('category-select');
    const categoryValue = categorySelectEl ? categorySelectEl.value : '';
    const customCategoryInput = document.getElementById('custom-category-name');
    const customCategoryName = customCategoryInput ? customCategoryInput.value.trim() : '';
    const eventLocation = document.getElementById('event-venue').value.trim();
    const eventDate = document.getElementById('event-startdatetime').value;
    const eventTime = document.getElementById('event-enddatetime').value;
    const eventDescription = document.getElementById('event-description').value.trim();
    const saveDraftEl = document.getElementById('save-to-return');
    const saveForLater = !!(saveDraftEl && saveDraftEl.checked);

    if (!eventName || !eventDate || !eventLocation || !eventDescription) {
        showNotice("Please fill in all required event fields.", true);
        return;
    }
    if (categoryValue === '__other__' && !customCategoryName) {
        showNotice("Please type a custom category name.", true);
        return;
    }

    const fullDateTime = eventTime ? `${eventDate} ${eventTime}:00` : `${eventDate} 00:00:00`;
    const ticketTypes = collectTicketTypes();

    const finalDescription = (categoryValue === '__other__')
        ? buildDescriptionWithCategory(eventDescription, customCategoryName)
        : eventDescription;

    const payload = {
        event_id: editEventId || '',
        event_name: eventName,
        event_description: finalDescription,
        start_datetime: fullDateTime,
        venue: eventLocation,
        category_id: (categoryValue && categoryValue !== '__other__') ? categoryValue : null,
        custom_category_name: customCategoryName || null,
        status: saveForLater ? 'draft' : 'published',
        ticket_types: JSON.stringify(ticketTypes)
    };

    const endpoint = editEventId ? `https://pishnest.co.uk/backend/update-event.php` : `https://pishnest.co.uk/backend/organise.php`;
    const submitBtn = document.getElementById('organise-event');
    submitBtn.disabled = true;

    const data = await fetchJSON(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    submitBtn.disabled = false;

    if (data && data.success) {
        const backendRedirect = String(data.redirect_url || data.event_url || '').trim();
        let targetIdFromRedirect = null;
        if (backendRedirect) {
            try {
                const parsed = new URL(backendRedirect, window.location.origin);
                targetIdFromRedirect = parsed.searchParams.get('id')
                    || parsed.searchParams.get('event_id')
                    || parsed.searchParams.get('event-id');
            } catch (e) {
                // Keep fallbacks below if redirect URL is malformed.
            }
        }

        const currentUser = getCurrentUser();
        let targetId = editEventId
            || targetIdFromRedirect
            || data.event_id
            || data.id
            || (data.event && data.event.id)
            || (data.event && data.event.event_id);

        if (!targetId) {
            // Fallback: some backend responses return success without event_id.
            // Resolve the newest matching event for this organiser.
            const listData = await fetchJSON(`https://pishnest.co.uk/backend/events.php`);
            const allEvents = Array.isArray(listData)
                ? listData
                : ((listData && Array.isArray(listData.events)) ? listData.events : []);

            const matchingEvents = allEvents.filter((ev) => {
                const sameTitle = String(ev.title || '').trim().toLowerCase() === eventName.toLowerCase();
                const sameVenue = String(ev.venue || '').trim().toLowerCase() === eventLocation.toLowerCase();
                const sameStart = String(ev.start_datetime || '').trim() === fullDateTime;
                const sameOwner = currentUser ? Number(ev.organiser_id) === Number(currentUser.id) : true;
                return sameTitle && sameVenue && sameStart && sameOwner;
            });

            if (matchingEvents.length > 0) {
                matchingEvents.sort((a, b) => Number(b.id) - Number(a.id));
                targetId = matchingEvents[0].id;
            }
        }

        if (targetId) {
            showNotice('Event saved successfully. Redirecting to your event page...');
            setTimeout(() => { window.location.href = `event.html?id=${encodeURIComponent(targetId)}`; }, 900);
        } else {
            showNotice('Event saved successfully, but we could not open it automatically. Opening browse page...', false);
            setTimeout(() => { window.location.href = 'discover.html'; }, 900);
        }
    } else {
        showNotice((data && data.error) || "Could not save event.", true);
    }
}

// ---------- Init ----------
(async () => {
    const cachedUser = getCurrentUser();
    const serverUser = await syncHeaderAuthUI(cachedUser);
    const currentUser = serverUser || cachedUser;

    if (currentUser && !serverUser) {
        // Keep UI auth state usable if session refresh temporarily fails.
        setCurrentUser(currentUser);
    }

    if (!guardOrganiseAccess(currentUser)) return;
    fillOrganiseShell(currentUser);
    wireOrganiserSettings(currentUser);

    const categories = await populateCategories(); // no chip row on this page, just fills the <select>
    ensureOtherCategorySupport();

    if (!categories || categories.length === 0) {
        const categorySelect = document.getElementById('category-select');
        if (categorySelect) {
            categorySelect.value = '__other__';
            categorySelect.dispatchEvent(new Event('change'));
        }
    }

    if (editEventId) {
        const pageTitle = document.getElementById('organise-page-title');
        const formHeading = document.getElementById('organise-form-heading');
        const lead = document.getElementById('organise-page-lead');
        const submitBtn = document.getElementById('organise-event');
        if (pageTitle) pageTitle.textContent = 'Edit activity';
        if (formHeading) formHeading.textContent = 'Update details';
        if (lead) lead.textContent = 'Change the listing details, then save. Drafts stay private until you publish.';
        if (submitBtn) submitBtn.textContent = 'Save changes';
        document.title = 'Edit activity, PishNest';
        await loadEventForEditing(editEventId);
    }

    document.getElementById('organise-form').addEventListener('submit', handleSubmit);
})();
