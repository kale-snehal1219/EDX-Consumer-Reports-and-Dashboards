
const DATA_URL = './reports-dashboards.json';
const API_URL = 'http://127.0.0.1:8000';

const FAVORITES_KEY = 'edx.consumer.reports.favorites.v1';
const OPENED_KEY = 'edx.consumer.reports.opened.v1';

// Temporary test consumer ID. Later, connect this to the logged-in user.
const CONSUMER_ID = 1;

export const qs = (selector, root = document) =>
    root.querySelector(
        selector.startsWith('#') ? selector : `#${selector}`
    );

export function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[ch]);
}

export function banner(message, kind = 'info') {
    const styles = {
        info: 'alert-info',
        success: 'alert-success',
        warning: 'alert-warning',
        error: 'alert-danger'
    };

    return `<div class="alert ${styles[kind] || styles.info}" role="status">${esc(message)}</div>`;
}

export function dateText(value) {
    if (!value) return 'Date unavailable';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return esc(value);

    return new Intl.DateTimeFormat('en', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

export function feedback(message, kind = 'success') {
    const target = qs('#reports-feedback');

    if (!target) return;

    target.innerHTML = banner(message, kind);
    target.classList.add('show');
}

export function linkParams(page, params = {}) {
    const url = new URL(page, window.location.href);

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            url.searchParams.set(key, value);
        }
    });

    return `${url.pathname.split('/').pop()}${url.search}${url.hash}`;
}

export function empty(message = 'No records found.') {
    return `
        <div class="r-empty">
            <i class="bi bi-inbox" aria-hidden="true"></i>
            <p>${esc(message)}</p>
        </div>
    `;
}

function readArray(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(value) ? value : [];
    } catch {
        return [];
    }
}

function writeArray(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

function makeStore(data, serverFavorites = []) {
    const favorites = serverFavorites.map(f => f.item_id);
    const favoriteRecords = [...serverFavorites];
    const opened = readArray(OPENED_KEY);

    const reports = Array.isArray(data.reports)
        ? data.reports : [];

    const dashboards = Array.isArray(data.dashboards)
        ? data.dashboards : [];

    const snapshots = Array.isArray(data.publication_snapshots)
        ? data.publication_snapshots : [];

    const reportFor = item => {
        if (item?.report_id) {
            return reports.find(report => report.id === item.report_id);
        }
        return item;
    };

    function decision(item) {
        const report = reportFor(item);

        if (!item || !report) {
            return {
                allowed: false,
                conditionalUse: false,
                reason: 'The linked report definition is unavailable.'
            };
        }

        const status = String(
            report.status || item.status || ''
        ).toLowerCase();

        if (status !== 'published') {
            return {
                allowed: false,
                conditionalUse: false,
                reason: 'This item is not published.'
            };
        }

        const scopes = Array.isArray(report.available_scopes)
            ? report.available_scopes : [];

        const principalScope =
            data.principal_scope || 'ORG-NVUSD-ROOT';

        if (scopes.length && !scopes.includes(principalScope)) {
            return {
                allowed: false,
                conditionalUse: false,
                reason: 'The item is outside the current organization scope.'
            };
        }

        const currentVersion =
            report.published_version || item.version;

        const snapshot = snapshots.find(s =>
            s.report_id === report.id &&
            String(s.version).trim() === String(currentVersion).trim() &&
            ['published', 'approved', 'current'].includes(
                String(s.status || '').toLowerCase()
            )
        );

        if (!snapshot) {
            return {
                allowed: false,
                conditionalUse: false,
                reason: 'No matching approved publication snapshot was found.'
            };
        }

        if (
            report.quality_evidence_id &&
            snapshot.quality_evidence_id &&
            report.quality_evidence_id !== snapshot.quality_evidence_id
        ) {
            return {
                allowed: false,
                conditionalUse: false,
                reason: 'Publication quality evidence does not match.'
            };
        }

        if (snapshot.historical_use_restricted) {
            return {
                allowed: false,
                conditionalUse: false,
                reason: snapshot.historical_use_reason ||
                    'Historical use is restricted.'
            };
        }

        return {
            allowed: true,
            conditionalUse:
                String(report.classification || '').toLowerCase() === 'restricted',
            reason: 'Current published snapshot is available within the illustrative consumer scope.'
        };
    }

    return {
        data,

        user: {
            id: data.principal_id || 'consumer',
            favorites,
            opened
        },

        decision,

        favorite(id) {
            return favorites.includes(id);
        },

        async toggleFavorite(id) {
            const existing = favoriteRecords.find(
                f => f.item_id === id
            );

            try {
                if (existing) {
                    // Remove favorite from MySQL.
                    const response = await fetch(
                        `${API_URL}/api/favorites/${existing.id}`,
                        { method: 'DELETE' }
                    );

                    if (!response.ok) {
                        throw new Error('Unable to remove favorite.');
                    }

                    favoriteRecords.splice(
                        favoriteRecords.indexOf(existing), 1
                    );

                    const index = favorites.indexOf(id);

                    if (index !== -1) {
                        favorites.splice(index, 1);
                    }

                } else {
                    // Add favorite to MySQL.
                    const params = new URLSearchParams({
                        consumer_id: String(CONSUMER_ID),
                        item_id: id,
                        item_type: dashboards.some(x => x.id === id)
                            ? 'Dashboard'
                            : 'Report'
                    });

                    const response = await fetch(
                        `${API_URL}/api/favorites?${params}`,
                        { method: 'POST' }
                    );

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(
                            errorData.detail || 'Unable to save favorite.'
                        );
                    }

                    const result = await response.json();

                    favoriteRecords.push({
                        id: result.id,
                        consumer_id: CONSUMER_ID,
                        item_id: id,
                        item_type: dashboards.some(x => x.id === id)
                            ? 'Dashboard'
                            : 'Report'
                    });

                    favorites.push(id);
                }

                this.user.favorites = favorites;

                return {
                    ok: true,
                    saved: favorites.includes(id)
                };

            } catch (error) {
                console.error('Favorite API error:', error);
                return { ok: false };
            }
        },

        dataset(id) {
            const collections = [
                data.datasets,
                data.data_catalog,
                data.catalog?.datasets,
                data.reference?.datasets
            ].filter(Array.isArray);

            for (const collection of collections) {
                const found = collection.find(x => x.id === id);
                if (found) return found;
            }

            return null;
        },

        purpose(id) {
            const collections = [
                data.purposes,
                data.reference?.purposes
            ].filter(Array.isArray);

            for (const collection of collections) {
                const found = collection.find(x => x.id === id);
                if (found) return found;
            }

            return null;
        },

        recordOpened(id) {
            const next = [
                { id, at: new Date().toISOString() },
                ...opened.filter(x => x.id !== id)
            ].slice(0, 10);

            if (writeArray(OPENED_KEY, next)) {
                opened.splice(0, opened.length, ...next);
                this.user.opened = opened;
            }
        }
    };
}

export async function loadReporting() {
    // Load complete original reporting JSON.
    const response = await fetch(DATA_URL, {
        cache: 'no-store'
    });

    if (!response.ok) {
        throw new Error(
            `Unable to load reporting data (${response.status}). Check reports-dashboards.json.`
        );
    }

    let data;

    try {
        data = await response.json();
    } catch {
        throw new Error('The reporting JSON file is not valid JSON.');
    }

    if (
        !data ||
        !Array.isArray(data.reports) ||
        !Array.isArray(data.dashboards)
    ) {
        throw new Error(
            'Reporting data is incomplete. Reports or dashboards are missing.'
        );
    }

    // Check backend reports API.
    const apiResponse = await fetch(`${API_URL}/api/reports`);

    if (!apiResponse.ok) {
        throw new Error('Backend reports API is not responding.');
    }

    const apiReports = await apiResponse.json();

    console.log('Backend reports loaded:', apiReports);

    // Load favorites from MySQL.
    const favoriteResponse = await fetch(
        `${API_URL}/api/favorites/${CONSUMER_ID}`
    );

    if (!favoriteResponse.ok) {
        throw new Error('Unable to load favorites from database.');
    }

    const serverFavorites = await favoriteResponse.json();

    console.log('Database favorites loaded:', serverFavorites);
    const metricsResponse = await fetch(`${API_URL}/api/metrics`);
    const metrics = await metricsResponse.json();

    console.log('Database metrics loaded:', metrics);
   // Fetch publication snapshots from MySQL
    const publicationsResponse = await fetch(
        `${API_URL}/api/publications`
    );

    if (!publicationsResponse.ok) {
        throw new Error('Unable to load publication snapshots.');
    }

    const publications = await publicationsResponse.json();

    console.log('Database publications loaded:', publications); // Preserve original JSON access rules.
   // Fetch consumers from MySQL
const consumersResponse = await fetch(
    `${API_URL}/api/consumers`
);

if (!consumersResponse.ok) {
    throw new Error('Unable to load consumers.');
}

const consumers = await consumersResponse.json();

console.log('Database consumers loaded:', consumers);
    
return makeStore(data, serverFavorites);
}
