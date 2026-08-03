// Requires common.js loaded first.

function getRole(user) {
    return String((user && user.role) || '').trim().toLowerCase();
}

function createShortcutLink(href, title, description) {
    return `
        <a class="event-item shortcut-card" href="${href}">
            <h3>${title}</h3>
            <p class="text-muted">${description}</p>
        </a>
    `;
}

function getBioStorageKey(user) {
    const idPart = (user && user.id) ? `id_${user.id}` : `email_${String((user && user.email) || 'guest').toLowerCase()}`;
    return `nearby_profile_bio_${idPart}`;
}

function renderDashboardSettings(user) {
    if (!user || document.getElementById('dashboard-settings')) return;

    const role = getRole(user) || 'attendee';
    const displayName = user.name || user.email || 'there';
    const bioKey = getBioStorageKey(user);
    const existingBio = localStorage.getItem(bioKey) || '';

    const section = document.createElement('section');
    section.id = 'dashboard-settings';
    section.className = 'page-card';
    section.classList.add('page-stack');
    section.innerHTML = `
        <div class="section-header">
            <div>
                <h2>${(role === 'organiser' || role === 'admin') ? `Welcome, organiser ${displayName}` : `Welcome, ${displayName}`}</h2>
                <p class="section-subtitle">Update a short bio to personalise your dashboard profile.</p>
            </div>
            <span class="pill">${role}</span>
        </div>
        <form id="dashboard-settings-form">
            <label for="dashboard-bio">Bio</label>
            <textarea id="dashboard-bio" rows="4" maxlength="280" placeholder="Tell people a little about you...">${existingBio}</textarea>
            <div class="section-header page-stack">
                <small id="dashboard-bio-count" class="text-muted">${existingBio.length}/280</small>
                <button type="submit" class="btn">Save bio</button>
            </div>
            <p id="dashboard-settings-message" class="helper-text hidden-inline">Saved.</p>
        </form>
    `;

    const shortcuts = document.getElementById('dashboard-shortcuts');
    if (shortcuts && shortcuts.parentNode) {
        if (shortcuts.nextSibling) {
            shortcuts.parentNode.insertBefore(section, shortcuts.nextSibling);
        } else {
            shortcuts.parentNode.appendChild(section);
        }
    } else {
        document.body.prepend(section);
    }

    const form = document.getElementById('dashboard-settings-form');
    const bioField = document.getElementById('dashboard-bio');
    const countEl = document.getElementById('dashboard-bio-count');
    const messageEl = document.getElementById('dashboard-settings-message');

    if (!form || !bioField || !countEl || !messageEl) return;

    const updateCount = () => {
        countEl.textContent = `${bioField.value.length}/280`;
    };

    bioField.addEventListener('input', () => {
        updateCount();
        messageEl.classList.add('hidden-inline');
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const bio = bioField.value.trim();
        localStorage.setItem(bioKey, bio);
        updateCount();
        messageEl.textContent = 'Your bio has been saved.';
        messageEl.classList.remove('hidden-inline');
    });
}

function renderRoleShortcuts(currentUser) {
    const shortcuts = document.getElementById('dashboard-shortcuts');
    if (!shortcuts || !currentUser) return;

    const role = getRole(currentUser) || 'attendee';

    const commonLinks = [
        { href: 'browse.html', title: 'Browse events', description: 'Discover events you can book right now.' },
        { href: 'categories.html', title: 'Browse by category', description: 'Filter events by music, sports, food, and more.' }
    ];

    const attendeeLinks = [
        { href: 'event.html', title: 'Go to events', description: 'Open the event page and start booking tickets.' },
        { href: 'my-bookings.html', title: 'My bookings', description: 'Review, track, and manage your ticket bookings.' }
    ];

    const organiserLinks = [
        { href: 'organise.html', title: 'Organise an event', description: 'Create or edit your event listing.' },
        { href: 'dashboard.html#organiser-control-panel', title: 'Manage my events', description: 'Review your organiser control panel and event list.' },
        { href: 'organiser-sales.html', title: 'Sales and attendees', description: 'Track bookings, attendees, and revenue by event.' }
    ];

    const roleLinks = (role === 'organiser' || role === 'admin') ? organiserLinks : attendeeLinks;

    shortcuts.innerHTML = `
        <div class="section-header">
            <div>
                <h2>Your dashboard links</h2>
                <p class="section-subtitle">Signed in as ${currentUser.name || currentUser.email} (${role.toUpperCase()})</p>
            </div>
            <a href="#" id="logout-link" class="btn btn-ghost">Log out</a>
        </div>
        <div class="shortcut-grid">
            ${commonLinks.map((l) => createShortcutLink(l.href, l.title, l.description)).join('')}
            ${roleLinks.map((l) => createShortcutLink(l.href, l.title, l.description)).join('')}
        </div>
    `;

    document.getElementById('logout-link').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });

    if (role === 'organiser' || role === 'admin') {
        renderOrganiserDashboardPanel(currentUser);
    }
}

function showInlineMessage(msg, isError = false) {
    let msgEl = document.getElementById('dashboard-notice');
    if (!msgEl) {
        msgEl = document.createElement('div');
        msgEl.id = 'dashboard-notice';
        msgEl.className = 'form-notice';
        const formEl = document.getElementById('newsletter-form');
        if (formEl) formEl.prepend(msgEl);
    }
    msgEl.textContent = msg;
    msgEl.className = `form-notice ${isError ? 'error' : 'success'}`;
    msgEl.style.display = 'block';
}

async function renderOrganiserDashboardPanel(user) {
    if (document.getElementById('organiser-control-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'organiser-control-panel';
    panel.className = 'surface-card page-container-wide page-stack';
    panel.innerHTML = `
        <div class="dashboard-panel-head">
            <div>
                <h2>Organiser Control Panel</h2>
                <p class="text-muted">Manage your created events, track ticket sales, and create new experiences.</p>
            </div>
            <a href="organise.html" id="organiser-create-event-link" class="btn btn-primary">+ Create Event</a>
        </div>
        <div id="organiser-events-list"><p class="text-muted">Loading your events…</p></div>
    `;

    const nav = document.querySelector('nav');
    if (nav && nav.nextSibling) {
        nav.parentNode.insertBefore(panel, nav.nextSibling);
    } else {
        document.body.prepend(panel);
    }

    try {
        // events.php now returns organiser_id on every event, and (for
        // logged-in organisers) also includes their own draft/cancelled
        // events, not just published ones. Filtering client-side by
        // organiser_id — the previous version filtered by organiser_name,
        // a field the backend never actually returned, so this list was
        // always empty even for organisers who had created events.
        const data = await fetchJSON(`https://darkgoldenrod-reindeer-637131.hostingersite.com/backend/events.php`);
        const allEvents = (data && data.events) || [];

        const myEvents = getRole(user) === 'admin'
            ? allEvents
            : allEvents.filter((ev) => Number(ev.organiser_id) === Number(user.id));

        const listEl = document.getElementById('organiser-events-list');
        if (myEvents.length === 0) {
            listEl.innerHTML = `<p class="text-muted">You haven't created any events yet. <a href="organise.html">Create your first event</a>.</p>`;
            return;
        }

        listEl.innerHTML = `
            <div class="dashboard-event-grid">
                ${myEvents.map((ev) => {
                    const dt = ev.start_datetime ? new Date(ev.start_datetime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date TBC';
                    const statusBadge = ev.status !== 'published' ? `<span class="status-pill status-pill-draft">${ev.status}</span>` : '';
                    return `
                        <div class="record-card">
                            <div>
                                <span class="status-pill">${ev.category_name || 'Event'}</span> ${statusBadge}
                                <h3 class="page-stack">${ev.title}</h3>
                                <p class="record-meta">📅 ${dt}</p>
                                <p class="record-meta">📍 ${ev.venue || 'Location TBC'}</p>
                            </div>
                            <div class="button-row border-top-soft">
                                <a href="organise.html?edit=${ev.id}" class="btn btn-primary">Edit</a>
                                <a href="event.html?id=${ev.id}" class="btn btn-ghost">View</a>
                            </div>
                        </div>`;
                }).join('')}
            </div>
        `;
    } catch (err) {
        document.getElementById('organiser-events-list').innerHTML = `<p class="notice">Could not load your events.</p>`;
    }
}

async function loadFeaturedEvents() {
    const container = document.querySelector('.event-list');
    if (!container) return;

    const data = await fetchJSON(`https://darkgoldenrod-reindeer-637131.hostingersite.com/backend/events.php`);
    const events = (data && data.events) || [];

    if (events.length === 0) {
        container.innerHTML = `<p>No events yet — check back soon.</p>`;
        return;
    }

    container.innerHTML = events.slice(0, 6).map((ev) => {
        const formattedDate = ev.start_datetime
            ? new Date(ev.start_datetime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
            : 'Date TBC';
        const price = (ev.min_price !== null && ev.min_price !== undefined)
            ? (Number(ev.min_price) === 0 ? 'Free Entry' : `£${Number(ev.min_price).toFixed(2)}`)
            : 'Free Entry';

        return `
        <div class="event-item record-card"
             data-id="${ev.id}" data-name="${ev.title}" data-location="${ev.venue || 'TBC'}"
             data-time="${formattedDate}" data-price="${price}">
            <h3>${ev.title}</h3>
            <p>📍 ${ev.venue || 'Location TBC'}</p>
            <p>🕒 ${formattedDate}</p>
            <p class="record-total">${price}</p>
            <a href="event.html?id=${ev.id}">View Page →</a>
        </div>`;
    }).join('');

    attachEventClickHandlers();
}

function attachEventClickHandlers() {
    const dialog = document.getElementById('event-dialog');
    const closeBtn = document.getElementById('close-dialog');
    if (closeBtn && dialog) closeBtn.onclick = () => dialog.close();

    document.querySelectorAll('.event-item').forEach((item) => {
        item.addEventListener('click', (e) => {
            if (e.target.tagName.toLowerCase() === 'a') return;
            const { name, location, time, price } = item.dataset;
            if (!dialog) return;
            document.getElementById('event-name').textContent = `Event Name: ${name || 'Event'}`;
            document.getElementById('event-location').textContent = `Location: ${location || 'TBC'}`;
            document.getElementById('event-time').textContent = `Time: ${time || 'TBC'}`;
            document.getElementById('event-price').textContent = `Price: ${price || 'Free'}`;
            if (typeof dialog.showModal === 'function') dialog.showModal();
        });
    });
}

const newsletterForm = document.getElementById('newsletter-form');
if (newsletterForm) {
    newsletterForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const emailInput = document.getElementById('newsletter-email');
        const email = emailInput.value.trim().toLowerCase();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showInlineMessage('Please enter a valid email address.', true);
            return;
        }

        const submitBtn = newsletterForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        // Real endpoint now — the old version faked a success message even
        // when newsletter.php didn't exist at all.
        const data = await fetchJSON(`https://darkgoldenrod-reindeer-637131.hostingersite.com/backend/newsletter.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ email })
        });

        submitBtn.disabled = false;
        if (data && data.success) {
            emailInput.value = '';
            showInlineMessage(data.message || 'Thanks for subscribing!');
        } else {
            showInlineMessage((data && data.message) || 'Could not subscribe right now.', true);
        }
    });
}

(async () => {
    // Prefer the real server session, but fall back to cached login data so
    // dashboard controls still render if the session check temporarily fails.
    const cachedUser = getCurrentUser();
    const serverUser = await refreshCurrentUser();
    const currentUser = serverUser || cachedUser;

    if (currentUser) {
        if (!serverUser) setCurrentUser(currentUser);
        renderRoleShortcuts(currentUser);
        renderDashboardSettings(currentUser);
    }
    loadFeaturedEvents();
})();
