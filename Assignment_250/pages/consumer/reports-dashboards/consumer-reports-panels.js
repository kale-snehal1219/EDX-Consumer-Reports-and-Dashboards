
import { esc, dateText } from './consumer-reports-core.js';

export function sourceStrip(store) {
    const meta = store?.data?.meta || {};

    const scope = meta.scope || 'Authorized consumer scope';

    const updated =
        meta.data_updated_at || meta.reference_date;

    const mode =
        meta.data_mode || 'Governed reporting data';

    return `
        <section class="r-source-strip r-panel"
                 aria-label="Reporting source information">

            <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">

                <div>
                    <span class="r-kicker">Reporting source</span>

                    <strong>${esc(scope)}</strong>

                    <span class="r-small">${esc(mode)}</span>
                </div>

                <div class="r-small text-md-end">
                    <span>Data reference: ${esc(dateText(updated))}</span>

                    <span class="d-block">
                        Workspace: Read-only consumer view
                    </span>
                </div>

            </div>
        </section>
    `;
}

export function entitlementPanel(decision) {
    const allowed = Boolean(decision?.allowed);

    const conditional = Boolean(decision?.conditionalUse);

    const heading = allowed
        ? (conditional
            ? 'Available with limitations'
            : 'Current access available')
        : 'Access is restricted';

    const message = decision?.reason ||
        (allowed
            ? 'This published reporting item is available.'
            : 'This item cannot be opened with current permissions.');

    return `
        <section class="r-panel r-notice ${
            allowed
                ? (conditional ? 'warning' : 'good')
                : 'blocked'
        }" aria-live="polite">

            <h2>${esc(heading)}</h2>

            <p>${esc(message)}</p>

        </section>
    `;
}
