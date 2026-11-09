import {sourceStrip,entitlementPanel} from './consumer-reports-panels.js';
import {loadReporting,esc,qs,banner,dateText,feedback,linkParams,empty} from './consumer-reports-core.js';
let store,mode='dashboard',text='',filter='all';
const viewLink=item=>linkParams(item.group&&item.measures?'dashboard-view.html':'report-detail.html',{id:item.id});
const icon=x=>x==='dashboard'?'bi-speedometer2':'bi-file-earmark-bar-graph';
function card(item,type){const dec=store.decision(item);const isFav=store.favorite(item.id);
return `<article class="r-card"><div class="d-flex justify-content-between align-items-start gap-2"><span class="r-badge">${type==='dashboard'?'Dashboard':'Report'} · ${esc(item.group==='attendance'?'Attendance':item.group==='outcomes'?'Outcomes':item.group==='enrollment'?'Enrollment':item.group)}</span><span class="r-badge ${dec.allowed?dec.conditionalUse?'warn':'good':'bad'}">${dec.allowed?dec.conditionalUse?'Limited use':'Available':'Restricted'}</span></div><h3>${esc(item.title)}</h3><p>${esc(item.summary)}</p><div class="r-meta">${esc(store.dataset(item.dataset_id)?.display_name||'Dataset')} · ${esc(store.purpose(item.purpose_id)?.name||'Purpose')}</div><footer><a class="btn btn-sm ${dec.allowed?'btn-primary':'btn-outline-primary'}" href="${esc(viewLink(item))}">${dec.allowed?'Open '+(type==='dashboard'?'dashboard':'report'):'View access details'}</a><button class="btn btn-sm btn-outline-secondary" data-favorite="${esc(item.id)}" aria-pressed="${isFav}" aria-label="${isFav?'Remove favorite':'Add favorite'}: ${esc(item.title)}"><i class="bi ${isFav?'bi-star-fill':'bi-star'}" aria-hidden="true"></i> ${isFav?'Saved':'Favorite'}</button></footer></article>`}
function recentItems(){
 const all=[...store.data.reports,...store.data.dashboards];
 const rows=(store.user.opened||[]).slice(0,4).map(x=>({x,item:all.find(v=>v.id===x.id)})).filter(y=>y.item);
 return rows.length?`<section class="r-panel"><h2>Recently viewed reporting</h2><div class="r-cards">${rows.map(({x,item})=>`<div class="r-card"><h3>${esc(item.title)}</h3><p class="r-small">${dateText(x.at)} · ${store.decision(item).allowed?'Current access available':'Current access restricted'}</p><footer><a class="btn btn-outline-primary btn-sm" href="${esc(viewLink(item))}">Open reporting details</a></footer></div>`).join('')}</div></section>`:'';
}
function render(){const reportCount=store.data.reports.filter(x=>store.decision(x).allowed).length;const dashCount=store.data.dashboards.filter(x=>store.decision(x).allowed).length;let list=mode==='dashboard'?store.data.dashboards:store.data.reports;
if(filter==='available')list=list.filter(x=>store.decision(x).allowed);if(filter==='restricted')list=list.filter(x=>!store.decision(x).allowed);if(filter==='favorites')list=list.filter(x=>store.favorite(x.id));
if(text)list=list.filter(x=>[x.title,x.summary,store.dataset(x.dataset_id)?.display_name].join(' ').toLowerCase().includes(text.toLowerCase()));
qs('reports-content').innerHTML=`${sourceStrip(store)}<div class="r-head"><div><div class="r-kicker">Data Consumer · Governed reporting</div><h1>Reports & Dashboards</h1><p class="r-subtitle">Explore governed reporting, review current publication authority and open permitted measures. Unpublished, restricted and historical results remain distinct.</p></div><div class="r-actions"><a class="btn btn-outline-primary" href="catalog-browse.html">Discover datasets</a><a class="btn btn-outline-primary" href="subscriptions.html">My subscriptions</a></div></div>
<div class="r-stat-row"><div class="r-stat"><div class="r-value">${dashCount}</div><div class="r-label">Dashboards available</div></div><div class="r-stat"><div class="r-value">${reportCount}</div><div class="r-label">Reports available</div></div><div class="r-stat"><div class="r-value">${store.user.favorites.length}</div><div class="r-label">Saved favorites</div></div><div class="r-stat"><div class="r-value">${store.data.dashboards.length+store.data.reports.length}</div><div class="r-label">Catalog definitions (all states)</div></div></div>
${recentItems()}
<section class="r-panel"><div class="r-panel-heading"><div><h2>Reporting permissions and publication status</h2><p>Eligible: current, scoped and published. Attention: returned definitions, expired quality evidence, unpublished metrics or unavailable source contracts.</p></div><span class="r-badge">Read-only consumer workspace</span></div><div class="r-lifecycle-grid"><div><strong>Discover</strong><span>Review report and metric definitions</span></div><div><strong>Verify current access</strong><span>Purpose, grant, institutions, quality</span></div><div><strong>Explore protected results</strong><span>Current publication & small-cell rules</span></div><div><strong>Request separate fulfillment</strong><span>Subscriptions or governed exports</span></div></div></section>
<div class="r-panel"><div class="r-tabs" role="tablist" aria-label="Reporting content"><button class="r-tab ${mode==='dashboard'?'active':''}" role="tab" aria-selected="${mode==='dashboard'}" data-mode="dashboard">Dashboards</button><button class="r-tab ${mode==='report'?'active':''}" role="tab" aria-selected="${mode==='report'}" data-mode="report">Reports</button></div><div class="r-controls"><div class="r-control"><label for="r-search">Search ${mode==='dashboard'?'dashboards':'reports'}</label><input id="r-search" class="form-control" placeholder="Title, subject or dataset" value="${esc(text)}"></div><div class="r-control"><label for="r-filter">Availability</label><select id="r-filter" class="form-select"><option value="all">All published items</option><option value="available">Available to me</option><option value="restricted">Access restricted</option><option value="favorites">My favorites</option></select></div></div><div class="r-cards">${list.length?list.map(x=>card(x,mode)).join(''):empty('No matching governed definitions. Try a different keyword, category or availability filter.')}</div></div>
<div class="r-panel"><h2>Other governed Consumer services</h2><p class="r-muted">State applications and external BI connections have separate workspaces. They do not change your report or dataset permissions.</p><div class="r-actions"><a href="state-applications-reports.html" class="btn btn-outline-secondary">State Applications</a><a href="bi-connections.html" class="btn btn-outline-secondary">Governed BI Connections</a><a href="request-access.html" class="btn btn-outline-secondary">Request access</a></div></div>`;
qs('r-filter').value=filter;
qs('r-search').oninput=e=>{text=e.target.value;const sel=e.target.selectionStart;render();const newEl=qs('r-search');newEl.focus();newEl.setSelectionRange(sel,sel)};
qs('r-filter').onchange=e=>{filter=e.target.value;render()};
qs('reports-content').querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;filter='all';text='';render()});
qs('reports-content').querySelectorAll('[data-favorite]').forEach(b=>b.onclick = async () => {
    const result = await store.toggleFavorite(b.dataset.favorite);
    render();

    if (!result.ok) {
        feedback('Favorite could not be saved.', 'error');
    }
});}

/* Sidebar Navigation Functionality */

document.querySelectorAll('[data-sidebar-action]').forEach(link => {

    link.addEventListener('click', function(e) {

        e.preventDefault();

        const action = this.dataset.sidebarAction;

        // Remove previous active state
        document.querySelectorAll('[data-sidebar-action]')
            .forEach(item => item.classList.remove('active'));

        // Set current active state
        this.classList.add('active');

        if (action === 'overview' || action === 'all') {
            mode = 'dashboard';
            filter = 'all';
            text = '';
            render();

            if (action === 'overview') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }

        } else if (action === 'dashboard') {
            mode = 'dashboard';
            filter = 'all';
            text = '';
            render();

        } else if (action === 'report') {
            mode = 'report';
            filter = 'all';
            text = '';
            render();
        }

        if (action === 'dashboard' || action === 'report') {
            document.getElementById('reports-content')
                .scrollIntoView({ behavior: 'smooth' });
        }

    });

});

try{store=await loadReporting();render();window.addEventListener('focus',async()=>{try{store=await loadReporting();render()}catch(e){feedback('Reporting eligibility could not be refreshed. Please reopen the workspace.','error')}});}catch(e){
    console.error('PAGE RENDER ERROR:', e);
    qs('reports-content').innerHTML =
        `<div class="r-panel r-notice blocked" role="alert">
            ${esc(e.message)}
            <a href="catalog-browse.html">Discover Data</a>
        </div>`;
}

