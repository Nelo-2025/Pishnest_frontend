// Impact report, list hub, create form, detail view.

(function () {
  const API = typeof API_BASE !== 'undefined' ? API_BASE : 'https://pishnest.co.uk/backend';
  const PAGE_SIZE = 12;

  let impactBound = false;
  let impactPage = 1;

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

  function setImpactView(view) {
    const hub = impactEl('impact-hub');
    const create = impactEl('impact-create-panel');
    const detail = impactEl('impact-detail-panel');
    if (hub) hub.hidden = view !== 'list';
    if (create) create.hidden = view !== 'create';
    if (detail) detail.hidden = view !== 'detail';
    window.impactView = view;
    updateImpactPageHead(view);
  }

  function updateImpactPageHead(view) {
    const title = document.getElementById('dash-section-title');
    const subcopy = document.getElementById('dash-subcopy');
    if (!title || !subcopy) return;

    if (view === 'create') {
      title.textContent = 'Create impact report';
      subcopy.textContent = 'Upload session data and describe the goals you want to measure.';
    } else if (view === 'detail') {
      title.textContent = 'Impact report';
      subcopy.textContent = 'Review your summary, charts, and goal assessment.';
    } else {
      title.textContent = 'Impact report';
      subcopy.textContent = 'Upload session data, set goals, and generate charts and summaries for funders.';
    }
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
        lastError = new Error(data.error || data.message || `Request failed (${res.status}).`);
        if (res.status !== 404 && res.status !== 405) break;
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError;
  }

  async function fetchImpactOverview(page) {
    const p = Math.max(1, page || 1);
    return fetchJSON(`${API}/impact.php?page=${encodeURIComponent(p)}`);
  }

  async function fetchImpactReport(reportId) {
    return fetchJSON(`${API}/impact.php?report_id=${encodeURIComponent(reportId)}&page=${encodeURIComponent(impactPage)}`);
  }

  function formatReportDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatReportDateShort(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function renderImpactEmpty() {
    const empty = impactEl('impact-empty');
    const listWrap = impactEl('impact-list-wrap');
    if (empty) empty.hidden = false;
    if (listWrap) listWrap.hidden = true;

    const iconWrap = empty ? empty.querySelector('.impact-empty-icon') : null;
    if (iconWrap && typeof icon === 'function') {
      iconWrap.innerHTML = icon('chart', 'icon icon-lg');
    }
  }

  function renderImpactCard(item) {
    const when = formatReportDateShort(item.created_at);
    const file = item.original_filename ? escapeHtml(item.original_filename) : 'Session data';
    const rows = item.row_count ? `${item.row_count} rows` : '';
    const goals = item.goals_preview ? escapeHtml(item.goals_preview) : 'Impact report';

    return `
      <button type="button" class="impact-card" data-report-id="${item.id}">
        <div class="impact-card-top">
          <span class="impact-card-icon" aria-hidden="true">${typeof icon === 'function' ? icon('chart', 'icon') : ''}</span>
          <span class="impact-card-date">${escapeHtml(when)}</span>
        </div>
        <strong class="impact-card-title">${file}</strong>
        ${rows ? `<span class="impact-card-meta">${rows}</span>` : ''}
        <span class="impact-card-goals">${goals}</span>
        <span class="impact-card-action">View report →</span>
      </button>
    `;
  }

  function bindCardClicks() {
    const grid = impactEl('impact-cards-grid');
    if (!grid) return;

    grid.querySelectorAll('[data-report-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-report-id');
        if (id) openReportDetail(id);
      });
    });
  }

  function renderImpactPagination(pagination) {
    const nav = impactEl('impact-pagination');
    if (!nav || !pagination) {
      if (nav) nav.hidden = true;
      return;
    }

    const totalPages = Number(pagination.total_pages || 1);
    const page = Number(pagination.page || 1);
    impactPage = page;

    if (totalPages <= 1) {
      nav.hidden = true;
      nav.innerHTML = '';
      return;
    }

    nav.hidden = false;
    const prevDisabled = page <= 1;
    const nextDisabled = page >= totalPages;

    let pagesHtml = '';
    for (let i = 1; i <= totalPages; i += 1) {
      pagesHtml += `<button type="button" class="impact-page-btn${i === page ? ' is-active' : ''}" data-page="${i}" ${i === page ? 'aria-current="page"' : ''}>${i}</button>`;
    }

    nav.innerHTML = `
      <button type="button" class="impact-page-btn impact-page-nav" data-page="${page - 1}" ${prevDisabled ? 'disabled' : ''}>Previous</button>
      <div class="impact-page-numbers">${pagesHtml}</div>
      <button type="button" class="impact-page-btn impact-page-nav" data-page="${page + 1}" ${nextDisabled ? 'disabled' : ''}>Next</button>
    `;

    nav.querySelectorAll('[data-page]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const nextPage = Number(btn.getAttribute('data-page'));
        if (!nextPage || nextPage === page || nextPage < 1 || nextPage > totalPages) return;
        await loadImpactList(nextPage);
      });
    });
  }

  function renderImpactList(history, pagination) {
    const empty = impactEl('impact-empty');
    const listWrap = impactEl('impact-list-wrap');
    const grid = impactEl('impact-cards-grid');
    const items = Array.isArray(history) ? history : [];

    window.impactReportHistory = items;
    window.impactHasSessions = window.impactHasSessions || false;

    if (!items.length && (!pagination || !pagination.total)) {
      renderImpactEmpty();
      renderImpactPagination(null);
      return;
    }

    if (empty) empty.hidden = true;
    if (listWrap) listWrap.hidden = false;

    if (grid) {
      grid.innerHTML = items.map(renderImpactCard).join('');
      bindCardClicks();
    }

    renderImpactPagination(pagination);
  }

  async function loadImpactList(page) {
    impactPage = Math.max(1, page || 1);
    const grid = impactEl('impact-cards-grid');
    if (grid) grid.innerHTML = '<p class="text-muted">Loading reports…</p>';

    try {
      const data = await fetchImpactOverview(impactPage);
      window.impactHasSessions = !!data.has_sessions;
      renderImpactList(data.report_history || [], data.pagination || null);
      setImpactView('list');
    } catch (err) {
      if (grid) grid.innerHTML = '<p class="notice">Could not load impact reports.</p>';
    }
  }

  function openCreatePanel() {
    setImpactView('create');
    const msgEl = impactEl('impact-form-message');
    if (msgEl) {
      msgEl.textContent = '';
      msgEl.classList.add('hidden-inline');
    }
  }

  async function openReportDetail(reportId) {
    setImpactView('detail');
    const body = impactEl('impact-report-body');
    if (body) body.innerHTML = '<p class="text-muted">Loading report…</p>';

    try {
      const report = await fetchImpactReport(reportId);
      window.impactHasSessions = Number(report.sessions_count || 0) > 0 || !!report.has_sessions;
      renderImpactReport(report);
    } catch (err) {
      if (body) body.innerHTML = '<p class="notice">Could not load this report.</p>';
    }
  }

  function formatChartLabel(point, bucket) {
    if (point.label) return point.label.replace('W', ' wk ');
    const d = new Date(point.date);
    if (isNaN(d)) return point.date;
    if (bucket === 'week') {
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    }
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  function renderTrendChart(trend) {
    const bucket = trend && trend.bucket ? trend.bucket : 'day';
    const label = trend && trend.label ? trend.label : 'Attendance over time';
    const trimmed = trend && trend.trimmed;
    const points = (trend && trend.points ? trend.points : Array.isArray(trend) ? trend : [])
      .filter((p) => p.headcount !== null && p.headcount !== undefined);

    if (!points.length) {
      return '<p class="text-muted">No numeric attendance column detected, add headcount or group_size to your CSV for a trend chart.</p>';
    }

    const max = Math.max(...points.map((p) => Number(p.headcount) || 0), 1);

    return `
      <p class="impact-chart-caption">${escapeHtml(label)}${trimmed ? ', showing the most recent 24 periods' : ''}</p>
      <div class="impact-chart-shell">
        <div class="impact-chart-grid" aria-label="${escapeHtml(label)}" style="--impact-bars:${points.length}">
          ${points.map((p) => {
            const h = Math.max(6, Math.round((Number(p.headcount) / max) * 100));
            const lab = formatChartLabel(p, bucket);
            return `
              <div class="impact-chart-cell" title="${escapeHtml(lab)}: ${p.headcount}">
                <div class="impact-chart-bar-track">
                  <div class="impact-chart-bar" style="height:${h}%"></div>
                </div>
                <span class="impact-chart-label">${escapeHtml(lab)}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function renderWarnings(warnings) {
    if (!Array.isArray(warnings) || !warnings.length) return '';
    return `
      <div class="impact-warnings">
        ${warnings.map((w) => `<p class="impact-warning">${escapeHtml(w)}</p>`).join('')}
      </div>
    `;
  }

  const PIE_COLORS = ['#4f7cff', '#34a853', '#fbbc04', '#ea4335', '#9334e6', '#12b5cb', '#ff6d01', '#5f6368'];

  function buildPieGradient(slices) {
    let cursor = 0;
    const stops = slices.map((slice, i) => {
      const start = cursor;
      cursor += Number(slice.percent) || 0;
      return `${PIE_COLORS[i % PIE_COLORS.length]} ${start}% ${cursor}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }

  function renderPieChart(chart, index) {
    const slices = chart.slices || [];
    if (!slices.length) return '';

    const gradient = buildPieGradient(slices);

    return `
      <article class="impact-pie-card">
        <h4>${escapeHtml(chart.title || 'Breakdown')}</h4>
        <div class="impact-pie-layout">
          <div class="impact-pie" style="background:${gradient}" role="img" aria-label="${escapeHtml(chart.title || 'Breakdown chart')}"></div>
          <ul class="impact-pie-legend">
            ${slices.map((slice, i) => `
              <li>
                <span class="impact-pie-swatch" style="background:${PIE_COLORS[i % PIE_COLORS.length]}"></span>
                <span class="impact-pie-label">${escapeHtml(slice.label)}</span>
                <span class="impact-pie-value">${slice.value}, ${slice.percent}%</span>
              </li>
            `).join('')}
          </ul>
        </div>
        <p class="impact-pie-total">${chart.total} records</p>
      </article>
    `;
  }

  function renderPieCharts(charts) {
    if (!Array.isArray(charts) || !charts.length) return '';
    return `
      <div class="impact-report-section">
        <h3>Breakdown charts</h3>
        <div class="impact-pie-grid">
          ${charts.map((chart, i) => renderPieChart(chart, i)).join('')}
        </div>
      </div>
    `;
  }

  function renderLlmStatus(report, assessment) {
    if (report && report.llm_configured === false) {
      return `<p class="impact-assessment-ai-note">AI analysis is off, add your Claude API key to <strong>secrets.local.php</strong> on the server, then click Analyze again.</p>`;
    }
    if (report && report.llm_configured && assessment && assessment.source !== 'claude') {
      if (assessment.llm_error) {
        return `<p class="impact-assessment-ai-note impact-assessment-ai-warn">Claude could not run: ${escapeHtml(assessment.llm_error)}</p>`;
      }
      return `<p class="impact-assessment-ai-note impact-assessment-ai-warn">This saved report predates AI analysis. Re-run Analyze to refresh with AI.</p>`;
    }
    return '';
  }

  function assessmentBadgeClass(meetsGoals) {
    switch (meetsGoals) {
      case 'yes': return 'impact-goal-met';
      case 'partial': return 'impact-goal-track';
      case 'no': return 'impact-goal-miss';
      default: return 'impact-goal-muted';
    }
  }

  function renderGoalAssessment(assessment, report) {
    if (!assessment) return '';
    const badgeClass = assessmentBadgeClass(assessment.meets_goals);
    const llmStatus = renderLlmStatus(report, assessment);
    return `
      <div class="impact-report-section">
        <h3>Does this meet your goals?</h3>
        <div class="impact-assessment-card ${badgeClass}">
          <span class="impact-goal-badge">${escapeHtml(assessment.meets_goals_label || 'Review needed')}</span>
          <p class="impact-assessment-headline">${escapeHtml(assessment.headline || '')}</p>
          <p class="impact-assessment-copy">${escapeHtml(assessment.explanation || '')}</p>
          ${Array.isArray(assessment.supports) && assessment.supports.length ? `
            <div class="impact-assessment-supports">
              <strong>What your data does show:</strong>
              <ul>${assessment.supports.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
            </div>
          ` : ''}
          ${assessment.what_you_can_say ? `<p class="impact-assessment-quote"><strong>For funders:</strong> ${escapeHtml(assessment.what_you_can_say)}</p>` : ''}
          ${llmStatus}
        </div>
      </div>
    `;
  }

  function renderImpactReport(report) {
    const body = impactEl('impact-report-body');
    if (!body) return;

    const summary = report.summary || {};
    const hasSessions = Number(report.sessions_count || 0) > 0;

    if (!hasSessions) {
      body.innerHTML = '<p class="text-muted">This report has no session data.</p>';
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

    const avgLabel = report.detected && report.detected.headcount_column
      ? `Avg (${report.detected.headcount_column})`
      : 'Avg value';

    const generatedAt = report.report_id && report.report_history
      ? ''
      : '';

    body.innerHTML = `
      ${generatedAt}
      ${renderWarnings(report.data_warnings)}
      <div class="impact-report-summary">
        <p class="impact-summary-lead">${escapeHtml(summary.paragraph || '')}</p>
        <div class="metric-grid impact-report-metrics">
          <article class="dash-metric">
            <div class="dash-metric-top"><span class="dash-metric-icon" aria-hidden="true">${icon('calendar', 'icon')}</span><h2>Records</h2></div>
            <p class="dash-metric-value">${summary.session_count ?? report.sessions_count ?? 0}</p>
            ${report.unique_dates ? `<p class="dash-metric-hint">${report.unique_dates} unique dates</p>` : ''}
          </article>
          <article class="dash-metric">
            <div class="dash-metric-top"><span class="dash-metric-icon" aria-hidden="true">${icon('users', 'icon')}</span><h2>${escapeHtml(avgLabel)}</h2></div>
            <p class="dash-metric-value">${summary.avg_headcount ?? 'None'}</p>
          </article>
          <article class="dash-metric">
            <div class="dash-metric-top"><span class="dash-metric-icon" aria-hidden="true">${icon('chart', 'icon')}</span><h2>Total</h2></div>
            <p class="dash-metric-value">${summary.total_headcount ?? 'None'}</p>
          </article>
        </div>
      </div>
      ${goalsBlock}
      ${renderGoalAssessment(report.goal_assessment, report)}
      ${renderPieCharts(report.pie_charts)}
      <div class="impact-report-section">
        <h3>Attendance trend</h3>
        ${renderTrendChart(report.trend)}
      </div>
    `;
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

    ['impact-create-empty-btn', 'impact-create-list-btn'].forEach((id) => {
      const btn = impactEl(id);
      if (btn) btn.addEventListener('click', openCreatePanel);
    });

    const backList = impactEl('impact-back-to-list');
    if (backList) backList.addEventListener('click', () => loadImpactList(impactPage));

    const backDetail = impactEl('impact-back-from-detail');
    if (backDetail) backDetail.addEventListener('click', () => loadImpactList(impactPage));

    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const goals = impactEl('impact-goals').value.trim();
      const file = fileInput && fileInput.files[0];

      if (!goals) {
        showMessage(msgEl, 'Describe your impact goals before analysing.', true);
        return;
      }

      if (!file && !window.impactHasSessions) {
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
        window.impactHasSessions = true;
        impactPage = 1;
        if (report.report_id) {
          setImpactView('detail');
          renderImpactReport(report);
        }
        showMessage(msgEl, report.upload_message || 'Impact report saved.', false);
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
    await loadImpactList(1);
  };
})();
