
import { loadReporting, esc, dateText } from './consumer-reports-core.js';

const content = document.querySelector('#detail-content');
const type = document.body.dataset.view;
const id = new URLSearchParams(window.location.search).get('id');

function showError(message) {
    content.innerHTML = `
        <div class="r-panel r-notice blocked">
            <h2>Unable to open reporting details</h2>
            <p>${esc(message)}</p>
            <a href="reports-dashboards.html"
               class="btn btn-primary">Back to Reports</a>
        </div>
    `;
}

function renderTable(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
        return '<p class="r-muted">No aggregate rows are available for this view.</p>';
    }

    const columns = Object.keys(rows[0]);

    return `
        <div class="table-responsive">
            <table class="table table-bordered table-hover">
                <thead>
                    <tr>
                        ${columns.map(key =>
                            `<th>${esc(key.replaceAll('_', ' '))}</th>`
                        ).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${rows.slice(0, 20).map(row => `
                        <tr>
                            ${columns.map(key =>
                                `<td>${esc(row[key] ?? '—')}</td>`
                            ).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <p class="r-small r-muted">
            Showing up to 20 illustrative aggregate rows.
        </p>
    `;
}

function renderDashboard(item, store) {
    const report = store.data.reports.find(
        x => x.id === item.report_id
    );

    const group = report?.group || item.group;

    const rows = store.data.aggregates?.[group] || [];

    const measures = Array.isArray(item.measures)
        ? item.measures
        : [];

    content.innerHTML = `
        <section class="r-panel">
            <div class="r-kicker">Data Consumer · Dashboard</div>

            <h1>${esc(item.title)}</h1>

            <p>${esc(item.summary || 'No description available.')}</p>

            <div class="r-meta">
                Version: ${esc(item.version || '—')}
                · Published: ${esc(dateText(item.published_at))}
                · Status: ${esc(item.status || 'Unknown')}
            </div>
        </section>

        <section class="r-panel">
            <h2>Dashboard measures</h2>

            <div class="r-kpi-grid">
                ${measures.length
                    ? measures.map(measure => `
                        <div class="r-stat">
                            <div class="r-label">
                                ${esc(typeof measure === 'string'
                                    ? measure
                                    : measure.label || measure.name || measure.key || 'Measure')}
                            </div>
                            <div class="r-value">
                                ${esc(typeof measure === 'object'
                                    ? measure.value ?? '—'
                                    : '—')}
                            </div>
                        </div>
                    `).join('')
                    : '<p>No measure definitions available.</p>'
                }
            </div>
        </section>

        <section class="r-panel">
            <h2>Reporting data</h2>
            <p class="r-muted">
                Aggregate category: ${esc(group || 'Not specified')}
            </p>
            ${renderTable(rows)}
        </section>

        <section class="r-panel">
            <h2>Publication information</h2>
            <p>Linked report: ${esc(report?.title || 'Not available')}</p>
            <p>Owner: ${esc(item.owner || report?.owner || 'Not specified')}</p>
            <p>Publication date: ${esc(dateText(item.published_at))}</p>
        </section>
    `;
}

function renderReport(item, store) {
    const group = item.group;
    const rows = store.data.aggregates?.[group] || [];
    const versions = Array.isArray(item.versions)
        ? item.versions
        : [];

    content.innerHTML = `
        <section class="r-panel">
            <div class="r-kicker">Data Consumer · Report details</div>

            <h1>${esc(item.title)}</h1>

            <p>${esc(item.summary || 'No description available.')}</p>

            <div class="r-meta">
                Report type: ${esc(item.kind || 'Report')}
                · Status: ${esc(item.status || 'Unknown')}
            </div>
        </section>

        <section class="r-panel">
            <h2>Report information</h2>

            <div class="r-list">
                <p><strong>Report ID:</strong> ${esc(item.id)}</p>
                <p><strong>Dataset ID:</strong> ${esc(item.dataset_id)}</p>
                <p><strong>Purpose ID:</strong> ${esc(item.purpose_id)}</p>
                <p><strong>Category:</strong> ${esc(group)}</p>
                <p><strong>Owner:</strong> ${esc(item.owner || 'Not specified')}</p>
                <p><strong>Published version:</strong> ${esc(item.published_version || '—')}</p>
                <p><strong>Published date:</strong> ${esc(dateText(item.published_at))}</p>
                <p><strong>Reporting period:</strong> ${esc(item.period || 'Not specified')}</p>
                <p><strong>Classification:</strong> ${esc(item.classification || 'Not specified')}</p>
            </div>
        </section>

        <section class="r-panel">
            <h2>Publication versions</h2>

            ${versions.length
                ? versions.map(version => `
                    <div class="r-line">
                        <strong>Version ${esc(version.version || version.id || '—')}</strong>
                        <span>${esc(version.status || 'Status unavailable')}</span>
                    </div>
                `).join('')
                : '<p>No version history available.</p>'
            }
        </section>

        <section class="r-panel">
            <h2>Aggregate reporting data</h2>
            ${renderTable(rows)}
        </section>

        <section class="r-panel">
            <h2>Quality and publication evidence</h2>
            <p>
                Quality evidence ID:
                ${esc(item.quality_evidence_id || 'Not specified')}
            </p>
            <p>
                This page displays illustrative reporting information.
                It does not approve, publish or modify reports.
            </p>
        </section>
    `;
}

async function init() {
    try {
        if (!id) {
            throw new Error('Report or dashboard ID is missing from the URL.');
        }

        const store = await loadReporting();

        const collection = type === 'dashboard'
            ? store.data.dashboards
            : store.data.reports;

        const item = collection.find(x => x.id === id);

        if (!item) {
            throw new Error('The requested reporting item was not found in the JSON file.');
        }

        const decision = store.decision(item);

        if (!decision.allowed) {
            content.innerHTML = `
                <section class="r-panel r-notice blocked">
                    <h1>${esc(item.title)}</h1>
                    <h2>Access restricted</h2>
                    <p>${esc(decision.reason || 'Current reporting access is restricted.')}</p>
                    <p>This reporting item is not currently available for viewing.</p>
                    <a href="reports-dashboards.html"
                        class="btn btn-primary">
                        Back to Reports & Dashboards
                    </a>
                </section>
            `;
            return;
        }

        if (typeof store.recordOpened === 'function') {
            store.recordOpened(item.id);
        }

        if (type === 'dashboard') {
            renderDashboard(item, store);
        } else {
            renderReport(item, store);
        }

    } catch (error) {
        showError(error.message || 'An unexpected error occurred.');
        console.error(error);
    }
}

init();
