// Impact report — single form: CSV + goals textarea + Analyze.

(function () {
  const API = typeof API_BASE !== 'undefined' ? API_BASE : 'https://darkgoldenrod-reindeer-637131.hostingersite.com/backend';

  let impactBound = false;

  function impactEl(id) {
    return document.getElementById(id);
  }

  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showMessage(el, text, isError) {
    if (!el) return;
    el.textContent = text;
    el.classList.remove('hidden-inline');
    el.classList.toggle('notice', !!isError);
    el.classList.toggle('helper-text', !isError);
  }

  async function postImpactFormData(formData) {
    const sessionToken = typeof getSessionToken === 'function' ? getSessionToken() : '';
    const candidates = typeof buildApiBaseCandidates === 'function'
      ? buildApiBaseCandidates()
      : [API];
    const urls = candidates.map((base) => `${base}/impact.php`);

    let lastError = new Error('Could not reach the server. Check that impact.php is uploaded to your backend.');

    for (let i = 0; i < urls.length; i++) {
      try {
        const res = await fetch(urls[i], {
          method: 'POST',
          credentials: 'include',
          headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {},
          body: formData
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success !== false) {
          return data;
        }
        lastError = new Error(data.error || `Request failed (${res.status}).`);
        if (res.status !== 404 && res.status !== 405) break;
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError;
  }

  async function fetchImpactReport() {
    return fetchJSON(`${API}/impact.php`);
  }

  function renderTrendChart(trend) {
    const points = Array.isArray(trend) ? trend.filter((p) => p.headcount !== null && p.headcount !== undefined) : [];
    if (!points.length) {
      return '<p class="text-muted">Add an attendance or headcount column to your CSV to see a trend chart.</p>';
    }

    const max = Math.max(...points.map((p) => Number(p.headcount) || 0), 1);

    return `
      <div class="impact-chart" aria-label="Attendance trend">
        ${points.map((p) => {
          const h = Math.max(8, Math.round((Number(p.headcount) / max) * 100));
          const label = new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          return `
            <div class="impact-chart-bar-wrap" title="${label}: ${p.headcount} people">
              <div class="impact-chart-bar" style="height:${h}%"></div>
              <span class="impact-chart-label">${label}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderImpactReport(report) {
    const body = impactEl('impact-report-body');
    if (!body) return;

    const summary = report.summary || {};
    const hasSessions = Number(report.sessions_count || 0) > 0;

    if (!hasSessions) {
      body.innerHTML = '<p class="text-muted">Upload a CSV and click Analyze to generate your report.</p>';
      return;
    }

    const goalsBlock = (report.goals_text || (report.goal_results && report.goal_results[0]?.label))
      ? `
        <div class="impact-report-section">
          <h3>Your impact goals</h3>
          <div class="impact-stated-goals">${escapeHtml(report.goals_text || report.goal_results[0].label).replace(/\n/g, '<br>')}</div>
        </div>
      `
      : '';

    body.innerHTML = `
      <div class="impact-report-summary">
        <p class="impact-summary-lead">${escapeHtml(summary.paragraph || '')}</p>
        <div class="metric-grid impact-report-metrics">
          <article class="dash-metric">
            <div class="dash-metric-top"><span class="dash-metric-icon" aria-hidden="true">${icon('calendar', 'icon')}</span><h2>Sessions</h2></div>
            <p class="dash-metric-value">${summary.session_count ?? report.sessions_count ?? 0}</p>
          </article>
          <article class="dash-metric">
            <div class="dash-metric-top"><span class="dash-metric-icon" aria-hidden="true">${icon('users', 'icon')}</span><h2>Avg attendance</h2></div>
            <p class="dash-metric-value">${summary.avg_headcount ?? '—'}</p>
          </article>
          <article class="dash-metric">
            <div class="dash-metric-top"><span class="dash-metric-icon" aria-hidden="true">${icon('chart', 'icon')}</span><h2>Total attendance</h2></div>
            <p class="dash-metric-value">${summary.total_headcount ?? '—'}</p>
          </article>
        </div>
      </div>
      ${goalsBlock}
      <div class="impact-report-section">
        <h3>Attendance over time</h3>
        ${renderTrendChart(report.trend)}
      </div>
    `;
  }

  function renderUploadMeta(report) {
    const meta = impactEl('impact-upload-meta');
    if (!meta) return;

    const upload = report.upload;
    const detected = report.detected || {};
    if (!upload) {
      meta.innerHTML = '';
      return;
    }

    const uploadedAt = upload.uploaded_at
      ? new Date(upload.uploaded_at).toLocaleString('en-GB')
      : '';

    meta.innerHTML = `
      <div class="impact-detected">
        <p><strong>Last CSV:</strong> ${escapeHtml(upload.original_filename)} (${upload.row_count} sessions)${uploadedAt ? ` · ${uploadedAt}` : ''}</p>
        ${detected.date_column ? `<p><strong>Date column:</strong> ${escapeHtml(detected.date_column)}</p>` : ''}
        ${detected.headcount_column ? `<p><strong>Attendance column:</strong> ${escapeHtml(detected.headcount_column)}</p>` : ''}
      </div>
    `;
  }

  function applySavedState(report) {
    const goalsField = impactEl('impact-goals');
    if (goalsField && report.goals_text) {
      goalsField.value = report.goals_text;
    }
    renderUploadMeta(report);
  }

  function bindImpactForm() {
    if (impactBound) return;
    impactBound = true;

    const form = impactEl('impact-form');
    const fileInput = impactEl('impact-session-file');
    const fileNameEl = impactEl('impact-file-name');
    const dropzone = form ? form.querySelector('.impact-dropzone') : null;
    const msgEl = impactEl('impact-form-message');
    const submitBtn = impactEl('impact-analyze-btn');

    if (fileInput && fileNameEl) {
      fileInput.addEventListener('change', () => {
        fileNameEl.textContent = fileInput.files[0] ? fileInput.files[0].name : 'No file selected';
      });
    }

    if (dropzone && fileInput) {
      ['dragenter', 'dragover'].forEach((evt) => {
        dropzone.addEventListener(evt, (e) => {
          e.preventDefault();
          dropzone.classList.add('is-dragover');
        });
      });
      ['dragleave', 'drop'].forEach((evt) => {
        dropzone.addEventListener(evt, (e) => {
          e.preventDefault();
          dropzone.classList.remove('is-dragover');
        });
      });
      dropzone.addEventListener('drop', (e) => {
        const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) {
          fileInput.files = e.dataTransfer.files;
          fileNameEl.textContent = file.name;
        }
      });
    }

    const dropIcon = document.querySelector('.impact-dropzone-icon');
    if (dropIcon && typeof icon === 'function') {
      dropIcon.innerHTML = icon('chart', 'icon');
    }

    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const goals = impactEl('impact-goals').value.trim();
      const file = fileInput && fileInput.files[0];

      if (!goals) {
        showMessage(msgEl, 'Describe your impact goals before analysing.', true);
        return;
      }

      if (!file && !(window.impactHasSessions)) {
        showMessage(msgEl, 'Choose a CSV file with your session data.', true);
        return;
      }

      const formData = new FormData();
      formData.append('action', 'analyze');
      formData.append('goals', goals);
      if (file) formData.append('session_file', file);

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Analyzing…';
      }

      try {
        const report = await postImpactFormData(formData);
        window.impactHasSessions = Number(report.sessions_count || 0) > 0;
        applySavedState(report);
        renderImpactReport(report);
        showMessage(msgEl, report.upload_message || 'Impact report generated.', false);
        if (file && fileNameEl) fileNameEl.textContent = file.name;
      } catch (err) {
        showMessage(msgEl, err.message || 'Could not generate report.', true);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Analyze & generate report';
        }
      }
    });
  }

  window.loadImpactSection = async function loadImpactSection() {
    if (!document.getElementById('section-impact')) return;

    bindImpactForm();

    try {
      const report = await fetchImpactReport();
      window.impactHasSessions = Number(report.sessions_count || 0) > 0;
      applySavedState(report);
      if (window.impactHasSessions && report.goals_text) {
        renderImpactReport(report);
      }
    } catch (err) {
      const body = impactEl('impact-report-body');
      if (body) {
        body.innerHTML = '<p class="notice">Could not load impact data. Make sure impact.php is on your backend.</p>';
      }
    }
  };
})();
