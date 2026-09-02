// ═══════════════════════════════════════════════════════
//  TMS — Lease Agreement Wizard (shared: landlord + tenant)
//  Tabs: All agreements | 1. Select property → 2. Landlord
//        fills & signs → 3. Tenant reads & signs → 4. Locked & ready
// ═══════════════════════════════════════════════════════

const LW = {
  role: null,      // 'landlord' | 'tenant'
  fetch: null,     // lFetch or tFetch
  properties: [],  // landlord: eligible properties
  leasesByProp: {},// landlord: propertyId -> lease
  lease: null,     // currently open lease (either role)
  step: 1,
  _sigCallback: null,
  _sigMode: 'draw',
  _drawing: false
};

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// ─── Entry point, called from sp() in each dashboard ───
async function initLeaseAgreements(role, fetchFn) {
  LW.role = role;
  LW.fetch = fetchFn;
  ensureSignatureModal();
  if (role === 'landlord') {
    LW.step = 1;
    renderTabs();
    await lwLoadPropertiesList();
  } else {
    await lwTenantLoad();
  }
}

function renderTabs() {
  const el = document.getElementById('lw-tabs');
  if (!el) return;
  const labels = ['All agreements', '1. Select property', '2. Landlord fills and signs', '3. Tenant reads and signs', '4. Locked and ready'];
  el.innerHTML = labels.map((l, i) => {
    const n = i; // 0 = All agreements (both roles), 1-4 = wizard steps (landlord jump only)
    const active = LW.step === n ? ' active' : '';
    const clickable = (n === 0 || LW.role === 'landlord') ? ` onclick="lwJumpTab(${n})"` : '';
    return `<button class="lw-tab${active}"${clickable}>${l}</button>`;
  }).join('');
}

function lwJumpTab(n) {
  if (n === 0) { lwShowAllAgreements(); return; }
  if (LW.role !== 'landlord') return;
  // Only allow navigating to steps that make sense given current lease state.
  if (n === 1) { LW.step = 1; renderTabs(); lwLoadPropertiesList(); return; }
  if (!LW.lease) return;
  if (n === 2 && LW.lease.status === 'draft') { LW.step = 2; renderTabs(); renderStep2(); return; }
  if (n === 3 && (LW.lease.status === 'sent' || LW.lease.status === 'signed')) { LW.step = 3; renderTabs(); renderStep3(); return; }
  if (n === 4 && LW.lease.status === 'signed') { LW.step = 4; renderTabs(); renderStep4(); return; }
}

// ═══════════════════════════════════════════════════════
//  "All agreements" — overview tab (landlord + tenant)
// ═══════════════════════════════════════════════════════
async function lwShowAllAgreements() {
  LW.step = 0;
  renderTabs();
  const body = document.getElementById('lw-body');
  if (body) body.innerHTML = '<div class="loading"><span class="spinner"></span>Loading agreements…</div>';
  try {
    if (LW.role === 'landlord') {
      const [propData, leaseData] = await Promise.all([
        LW.fetch('/properties/my'),
        LW.fetch('/lease-agreements/my')
      ]);
      const all = propData.properties || [];
      LW.properties = all;
      LW.leasesByProp = {};
      (leaseData.leases || []).forEach(l => { LW.leasesByProp[l.propertyId] = l; });
      const withLease = all.filter(p => LW.leasesByProp[p._id]);
      if (!body) return;
      body.innerHTML = `
        <div class="lw-section-lbl">ALL LEASE AGREEMENTS</div>
        ${withLease.length ? withLease.map(p => `
          <div class="lw-prop-row">
            <div>
              <div style="font-weight:600">${esc(p.title || p.address || 'Property')}</div>
              <div style="font-size:12px;color:var(--muted)">${esc(p.address || '')}</div>
            </div>
            ${lwStatusBadge(LW.leasesByProp[p._id])}
            ${lwRevisionBadge(LW.leasesByProp[p._id])}
            ${(LW.leasesByProp[p._id].agreementVersions || []).length ? `<button class="btn btn-ghost btn-sm" onclick="lwOpenAgreementHistory('${p._id}')">History</button>` : ''}
            <button class="btn btn-gold btn-sm" onclick="lwSelectProperty('${p._id}')">View</button>
          </div>`).join('') : '<div class="loading">No lease agreements yet.</div>'}
      `;
    } else {
      const user = JSON.parse(localStorage.getItem('tms_user') || '{}');
      const userId = (user._id || user.id || '').toString();
      const propData = await LW.fetch('/properties?status=rented');
      const myProp = (propData.properties || []).find(p => (p.tenantId || '').toString() === userId);
      if (!myProp) {
        if (body) body.innerHTML = `<div class="lw-section-lbl">ALL LEASE AGREEMENTS</div><div class="loading">You don't have any lease agreements yet.</div>`;
        return;
      }
      const leaseData = await LW.fetch(`/lease-agreements/property/${myProp._id}`);
      const lease = leaseData.lease;
      if (!lease) {
        if (body) body.innerHTML = `<div class="lw-section-lbl">ALL LEASE AGREEMENTS</div><div class="loading">Your landlord hasn't started the tenancy agreement yet.</div>`;
        return;
      }
      LW.lease = lease;
      const goStep = lease.status === 'signed' ? 4 : 3;
      body.innerHTML = `
        <div class="lw-section-lbl">ALL LEASE AGREEMENTS</div>
        <div class="lw-prop-row">
          <div>
            <div style="font-weight:600">${esc(myProp.title || myProp.address || 'Property')}</div>
            <div style="font-size:12px;color:var(--muted)">${esc(myProp.address || '')}</div>
          </div>
          ${lwStatusBadge(lease)}
          ${lwRevisionBadge(lease)}
          ${(lease.agreementVersions || []).length ? '<button class="btn btn-ghost btn-sm" onclick="LW.step=4;renderTabs();renderStep4()">History</button>' : ''}
          <button class="btn btn-gold btn-sm" onclick="LW.step=${goStep};renderTabs();${goStep === 4 ? 'renderStep4()' : 'renderStep3()'}">View</button>
        </div>
      `;
    }
  } catch (e) {
    if (body) body.innerHTML = `<div class="loading">⚠️ ${esc(e.message || 'Unable to load agreements.')}</div>`;
  }
}

// ═══════════════════════════════════════════════════════
//  LANDLORD — Step 1: select property
// ═══════════════════════════════════════════════════════
async function lwLoadPropertiesList() {
  const body = document.getElementById('lw-body');
  if (body) body.innerHTML = '<div class="loading"><span class="spinner"></span>Loading properties…</div>';
  try {
    const [propData, leaseData] = await Promise.all([
      LW.fetch('/properties/my'),
      LW.fetch('/lease-agreements/my')
    ]);
    const all = propData.properties || [];
    LW.properties = all;
    LW.leasesByProp = {};
    (leaseData.leases || []).forEach(l => { LW.leasesByProp[l.propertyId] = l; });
    renderStep1();
  } catch (e) {
    if (body) body.innerHTML = `<div class="loading">⚠️ ${esc(e.message || 'Unable to load properties.')}</div>`;
  }
}

function lwStatusBadge(lease) {
  if (!lease) return '<span class="badge b-muted">No agreement</span>';
  if (lease.status === 'draft') return '<span class="badge b-warn">Draft</span>';
  if (lease.status === 'sent') return '<span class="badge b-blue">Sent — awaiting tenant</span>';
  if (lease.status === 'signed') return '<span class="badge b-green">Signed & locked</span>';
  return '';
}

function lwRevisionBadge(lease) {
  const count = (lease?.agreementVersions || []).length;
  return count ? `<span class="badge b-warn">Revised ${count} time${count === 1 ? '' : 's'}</span>` : '';
}

function lwOpenAgreementHistory(propertyId) {
  const lease = LW.leasesByProp?.[propertyId];
  if (!lease) return;
  LW.lease = lease;
  LW.step = 4;
  renderTabs();
  renderStep4();
}

function renderStep1() {
  LW.step = 1;
  renderTabs();
  const body = document.getElementById('lw-body');
  if (!body) return;
  body.innerHTML = `
    <div class="lw-section-lbl">LANDLORD DASHBOARD → LEASE AGREEMENTS</div>
    ${LW.properties.length ? LW.properties.map(p => {
      const lease = LW.leasesByProp[p._id];
      const hasTenant = !!p.tenantId;
      const btn = !hasTenant
        ? `<button class="btn btn-ghost btn-sm" disabled title="This property needs an accepted tenant first" style="opacity:0.55;cursor:not-allowed">No tenant yet</button>`
        : `<button class="btn btn-gold btn-sm" onclick="lwSelectProperty('${p._id}')">${lease ? (lease.status === 'draft' ? 'Continue' : 'View agreement') : 'Choose this property'}</button>`;
      return `
      <div class="lw-prop-row">
        <div class="lw-prop-icon">🏠</div>
        <div class="lw-prop-info">
          <div class="lw-prop-title">${esc(p.title || 'Property')}</div>
          <div class="lw-prop-sub">${esc(p.address || p.area || '')}</div>
        </div>
        ${hasTenant ? lwStatusBadge(lease) : '<span class="badge b-muted">No tenant yet</span>'}
        ${btn}
      </div>`;
    }).join('') : `<div class="loading">You don't have any properties yet. Add a property first from "Add Property".</div>`}
    <div class="lw-hint">Landlord clicks a property to start (or resume) its tenancy agreement. Its address, type and rent flow into the wizard automatically, along with the accepted tenant's details. A property needs an accepted, onboarded tenant before an agreement can be created for it.</div>
  `;
}

async function lwSelectProperty(propertyId) {
  LW.selectedPropertyId = propertyId;
  const body = document.getElementById('lw-body');
  if (body) body.innerHTML = '<div class="loading"><span class="spinner"></span>Preparing agreement…</div>';
  try {
    const res = await LW.fetch('/lease-agreements/start', 'POST', { propertyId });
    LW.lease = res.lease;
    if (LW.lease.status === 'draft') { LW.step = 2; renderStep2(); }
    else if (LW.lease.status === 'sent') { LW.step = 3; renderStep3(); }
    else { LW.step = 4; renderStep4(); }
    renderTabs();
  } catch (e) {
    alert(e.message || 'Could not start agreement.');
    renderStep1();
  }
}

// ═══════════════════════════════════════════════════════
//  LANDLORD — Step 2: fill terms & sign
// ═══════════════════════════════════════════════════════
function toDateInputValue(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return dt.toISOString().slice(0, 10);
}

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function renderStep2() {
  const l = LW.lease;
  const body = document.getElementById('lw-body');
  if (!l || !body) return;
  const sig = l.landlordSignature;
  const hasSig = sig && sig.data;
  const cnicMissing = !String(l.landlord.cnic || '').trim() || !String(l.tenant.cnic || '').trim();
  const datesMissing = !l.startDate || !l.endDate;

  body.innerHTML = `
    <div class="lw-section-lbl">LEASE WIZARD — AUTO-FILLED</div>
    ${lwEditHistoryBanner(l)}
    ${cnicMissing ? `<div class="lw-warn">⚠️ Landlord and tenant CNIC are required before this agreement can be sent. Add the missing CNIC in profile settings, then <a href="#" onclick="lwRefreshFromProfile();return false;" style="color:#8FB4FF;text-decoration:underline">click here to refresh</a> — no need to retype it here.</div>` : ''}
    <div class="lw-grid2">
      <div>
        <div class="lw-blk-lbl">Property</div>
        <div class="lw-kv"><span>Title</span><b>${esc(l.property.title)}</b></div>
        <div class="lw-kv"><span>Type</span><b>${esc(l.property.type)}</b></div>
        <div class="lw-kv"><span>Rent</span><b>Rs. ${Number(l.property.rent || 0).toLocaleString()}</b></div>
      </div>
      <div>
        <div class="lw-blk-lbl">Landlord (from profile)</div>
        <div class="lw-kv"><span>Name</span><b>${esc(l.landlord.name)}</b></div>
        <div class="lw-kv"><span>CNIC</span><b style="${!l.landlord.cnic ? 'color:#FF6B6B' : ''}">${esc(l.landlord.cnic || 'Missing — required')}</b></div>
        <div class="lw-kv"><span>Phone</span><b>${esc(l.landlord.phone || '—')}</b></div>
      </div>
    </div>
    <div class="lw-blk-lbl" style="margin-top:14px">Tenant (from accepted request)</div>
    <div class="lw-grid2">
      <div class="lw-kv"><span>Name</span><b>${esc(l.tenant.name)}</b></div>
      <div class="lw-kv"><span>CNIC</span><b style="${!l.tenant.cnic ? 'color:#FF6B6B' : ''}">${esc(l.tenant.cnic || 'Missing — required')}</b></div>
    </div>

    <div class="lw-blk-lbl" style="margin-top:16px">Agreement duration</div>
    <div class="lw-hint" style="margin:2px 0 8px">How long this tenancy runs — from which date to which date.</div>
    <div class="lw-grid2">
      <div>
        <label class="lw-date-lbl" for="lw-start-date">Start date</label>
        <input type="date" id="lw-start-date" class="lw-date-input" value="${toDateInputValue(l.startDate)}">
      </div>
      <div>
        <label class="lw-date-lbl" for="lw-end-date">End date</label>
        <input type="date" id="lw-end-date" class="lw-date-input" value="${toDateInputValue(l.endDate)}">
      </div>
    </div>

    <div class="lw-blk-lbl" style="margin-top:16px">Terms and conditions</div>
    <div class="lw-hint" style="margin:2px 0 8px">Standard Pakistan tenancy clauses (Punjab Rented Premises Act 2009). Wording can be adjusted, but clauses cannot be removed or new ones added — use "Special conditions" below for anything extra.</div>
    <div class="lw-terms-box" id="lw-terms-box">
      ${l.terms.map((t, i) => `
        <div class="lw-term" data-i="${i}">
          <input class="lw-term-title" value="${esc(t.title)}" placeholder="Clause title" readonly>
          <textarea class="lw-term-text" rows="2" placeholder="Clause text">${esc(t.text)}</textarea>
        </div>`).join('')}
    </div>

    <div class="lw-blk-lbl" style="margin-top:16px">Special conditions</div>
    <div class="lw-hint" style="margin:2px 0 8px">Extra clauses this landlord adds for this tenant only.</div>
    <textarea class="lw-special" id="lw-special" rows="3" placeholder="e.g. No pets, no subletting">${esc(l.specialConditions || '')}</textarea>

    <div class="lw-blk-lbl" style="margin-top:16px">Landlord signature</div>
    <div class="lw-sig-area">
      ${hasSig
        ? (sig.type === 'draw'
            ? `<img src="${sig.data}" class="lw-sig-img" alt="signature">`
            : `<div class="lw-sig-typed">${esc(sig.data)}</div>`)
        : `<div class="lw-sig-empty">Not signed yet</div>`}
    </div>
    <button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="lwOpenSignLandlord()">${hasSig ? 'Change signature' : 'Draw or type signature'}</button>

    <div class="lw-actions">
      <button class="btn btn-ghost" onclick="renderStep1()">Back</button>
      ${hasSig
        ? `<button class="btn btn-gold" onclick="lwSendToTenant()">Send to tenant</button>`
        : `<button class="btn btn-gold" onclick="lwOpenSignLandlord()">Sign to continue</button>`}
    </div>
  `;
}

function lwCollectTermsFromDom() {
  const rows = document.querySelectorAll('#lw-terms-box .lw-term');
  const terms = [];
  rows.forEach(r => {
    const title = r.querySelector('.lw-term-title')?.value.trim() || '';
    const text = r.querySelector('.lw-term-text')?.value.trim() || '';
    if (title || text) terms.push({ title, text });
  });
  return terms;
}

function lwAddTerm() {
  LW.lease.terms = lwCollectTermsFromDom();
  LW.lease.specialConditions = document.getElementById('lw-special')?.value || '';
  LW.lease.terms.push({ title: 'New clause', text: '' });
  renderStep2();
}
function lwRemoveTerm(i) {
  LW.lease.terms = lwCollectTermsFromDom();
  LW.lease.specialConditions = document.getElementById('lw-special')?.value || '';
  LW.lease.terms.splice(i, 1);
  renderStep2();
}

async function lwRefreshFromProfile() {
  try {
    await lwSaveTerms(); // preserve whatever the landlord has typed so far
    const res = await LW.fetch('/lease-agreements/start', 'POST', { propertyId: LW.selectedPropertyId });
    LW.lease = res.lease;
    renderStep2();
  } catch (e) { alert(e.message || 'Could not refresh from profile.'); }
}

async function lwSaveTerms() {
  const terms = lwCollectTermsFromDom();
  const specialConditions = document.getElementById('lw-special')?.value || '';
  const startDate = document.getElementById('lw-start-date')?.value || '';
  const endDate = document.getElementById('lw-end-date')?.value || '';
  const res = await LW.fetch(`/lease-agreements/${LW.lease._id}`, 'PUT', { terms, specialConditions, startDate, endDate });
  LW.lease = res.lease;
}

function lwOpenSignLandlord() {
  openSignatureModal(LW.lease.landlord.name, async (sig) => {
    try {
      await lwSaveTerms();
      const res = await LW.fetch(`/lease-agreements/${LW.lease._id}/landlord-sign`, 'PUT', sig);
      LW.lease = res.lease;
      renderStep2();
    } catch (e) { alert(e.message || 'Could not save signature.'); }
  });
}

async function lwSendToTenant() {
  const startDate = document.getElementById('lw-start-date')?.value || '';
  const endDate = document.getElementById('lw-end-date')?.value || '';
  if (!startDate || !endDate) {
    alert('Please set the agreement start and end dates before sending it to the tenant.');
    return;
  }
  if (!String(LW.lease.landlord.cnic || '').trim() || !String(LW.lease.tenant.cnic || '').trim()) {
    alert('Landlord and tenant CNIC are required before sending this agreement. Please update the missing profile first.');
    return;
  }
  try {
    await lwSaveTerms();
    const res = await LW.fetch(`/lease-agreements/${LW.lease._id}/send`, 'PUT');
    LW.lease = res.lease;
    LW.step = 3;
    renderTabs();
    renderStep3();
  } catch (e) { alert(e.message || 'Could not send agreement.'); }
}

// ═══════════════════════════════════════════════════════
//  Step 3: read-only agreement preview + sign area
// ═══════════════════════════════════════════════════════
function lwAgreementReadOnlyHtml(l) {
  const lSig = l.landlordSignature, tSig = l.tenantSignature;
  const sigBlock = (sig, fallback) => {
    if (sig && sig.data) {
      return sig.type === 'draw'
        ? `<img src="${sig.data}" class="lw-sig-img" alt="signature">`
        : `<div class="lw-sig-typed">${esc(sig.data)}</div>`;
    }
    return `<div class="lw-sig-empty">${fallback}</div>`;
  };
  return `
    <div class="lw-paper">
      <div class="lw-paper-title">Tenancy agreement</div>
      <div class="lw-paper-sub">Islamic Republic of Pakistan</div>
      <div class="lw-kv"><span>Property</span><b>${esc(l.property.title)}</b></div>
      <div class="lw-kv"><span>Rent</span><b>Rs. ${Number(l.property.rent || 0).toLocaleString()} / month</b></div>
      <div class="lw-kv"><span>Duration</span><b>${fmtDate(l.startDate)} – ${fmtDate(l.endDate)}</b></div>
      <div class="lw-kv"><span>Landlord</span><b>${esc(l.landlord.name)} (CNIC: ${esc(l.landlord.cnic || '—')})</b></div>
      <div class="lw-kv"><span>Tenant</span><b>${esc(l.tenant.name)} (CNIC: ${esc(l.tenant.cnic || '—')})</b></div>

      <div class="lw-blk-lbl" style="margin-top:14px">Terms and conditions</div>
      <div class="lw-terms-readonly">
        ${l.terms.map((t, i) => `<div class="lw-term-ro"><b>${i + 1}. ${esc(t.title)}</b><p>${esc(t.text)}</p></div>`).join('')}
      </div>

      <div class="lw-blk-lbl" style="margin-top:10px">Special conditions</div>
      <div class="lw-special-ro">${esc(l.specialConditions || 'None specified.')}</div>
      <div class="lw-hint" style="margin-top:6px">Nothing on this screen is editable — not even special conditions.</div>

      <div class="lw-sig-cols">
        <div>
          <div class="lw-blk-lbl">Landlord signature</div>
          ${sigBlock(lSig, 'Not signed yet')}
        </div>
        <div>
          <div class="lw-blk-lbl">Tenant signature</div>
          ${sigBlock(tSig, 'Not signed yet')}
        </div>
      </div>
    </div>
  `;
}

function renderStep3() {
  const l = LW.lease;
  const body = document.getElementById('lw-body');
  if (!l || !body) return;

  const heading = LW.role === 'landlord'
    ? 'LANDLORD DASHBOARD → LEASE AGREEMENT (SENT)'
    : 'TENANT DASHBOARD → LEASE AGREEMENT (READ-ONLY)';

  let footer = '';
  if (LW.role === 'landlord') {
    footer = `
      <div class="lw-hint" style="margin-top:14px">⏳ Waiting for tenant to sign. This agreement can no longer be edited.</div>
      <div class="lw-actions">
        <button class="btn btn-ghost" onclick="lwLoadPropertiesList()">Back</button>
        <button class="btn btn-ghost" onclick="lwRefreshCurrent()">Refresh status</button>
      </div>`;
  } else {
    const tSig = l.tenantSignature;
    if (tSig && tSig.data) {
      footer = `
        <div class="lw-actions">
          <button class="btn btn-ghost" onclick="lwTenantLoad()">Back</button>
          <button class="btn btn-gold" onclick="LW.step=4;renderTabs();renderStep4()">View locked agreement</button>
        </div>`;
    } else {
      footer = `
        <div class="lw-hint" style="margin-top:14px">Tenant can scroll and read every clause above, but nothing on this screen is editable.</div>
        <div class="lw-actions">
          <button class="btn btn-ghost" onclick="lwTenantLoad()">Back</button>
          <button class="btn btn-gold" onclick="lwOpenSignTenant()">Sign this agreement</button>
        </div>`;
    }
  }

  body.innerHTML = `<div class="lw-section-lbl">${heading}</div>${lwEditHistoryBanner(l)}${lwAgreementReadOnlyHtml(l)}${footer}`;
}

async function lwRefreshCurrent() {
  try {
    const res = await LW.fetch(`/lease-agreements/${LW.lease._id}`);
    LW.lease = res.lease;
    if (LW.lease.status === 'signed') { LW.step = 4; renderTabs(); renderStep4(); }
    else renderStep3();
  } catch (e) { /* ignore */ }
}

function lwOpenSignTenant() {
  openSignatureModal(LW.lease.tenant.name, async (sig) => {
    try {
      const res = await LW.fetch(`/lease-agreements/${LW.lease._id}/tenant-sign`, 'PUT', sig);
      LW.lease = res.lease;
      renderStep3();
    } catch (e) { alert(e.message || 'Could not save signature.'); }
  });
}

// ═══════════════════════════════════════════════════════
//  Step 4: locked & ready
// ═══════════════════════════════════════════════════════
function lwEditHistoryBanner(l) {
  if (!l.editHistory || !l.editHistory.length) return '';
  const last = l.editHistory[l.editHistory.length - 1];
  return `<div class="lw-warn" style="background:rgba(79,123,254,0.1);border-color:rgba(79,123,254,0.4);color:#8FB4FF">✏️ This agreement was revised by the landlord on ${fmtDate(last.at)}${l.editHistory.length > 1 ? ` (revised ${l.editHistory.length} times in total)` : ''}. ${last.note ? esc(last.note) : ''} Please review the updated terms carefully.</div>`;
}

function lwAgreementVersionHistoryHtml(l) {
  const versions = l.agreementVersions || [];
  if (!versions.length) return '';
  return `
    <div style="text-align:left;margin:22px auto 0;max-width:760px">
      <div class="lw-blk-lbl">Agreement version history</div>
      <div class="lw-hint" style="margin:4px 0 10px">Older signed copies remain saved separately from the current agreement.</div>
      ${versions.map((version, i) => `
        <div class="lw-prop-row" style="margin-top:8px">
          <div>
            <div style="font-weight:600">Previous agreement v${version.version || i + 1}</div>
            <div style="font-size:12px;color:var(--muted)">${fmtDate(version.savedAt)} · ${esc((version.changes || []).join('; ') || 'Original signed version')}</div>
          </div>
          <div class="lw-actions" style="margin:0;gap:6px">
            <button class="btn btn-ghost btn-sm" onclick="lwViewAgreementVersion(${i})">View</button>
            <button class="btn btn-gold btn-sm" onclick="lwCompareAgreementVersion(${i})">Compare</button>
          </div>
        </div>`).join('')}
    </div>
  `;
}

function renderStep4() {
  const l = LW.lease;
  const body = document.getElementById('lw-body');
  if (!l || !body) return;
  const backFn = LW.role === 'landlord' ? 'lwLoadPropertiesList' : 'lwTenantLoad';
  body.innerHTML = `
    <div class="lw-locked">
      <div class="lw-lock-icon">🔒</div>
      <div class="lw-lock-title">Agreement signed and locked</div>
      <div class="lw-hint">Neither side can edit the terms now — only view, print or download.</div>
      ${l.editHistory && l.editHistory.length ? `<div style="text-align:left;margin-top:14px">${lwEditHistoryBanner(l)}</div>` : ''}
      <div class="lw-sig-cols" style="margin-top:20px">
        <div>
          <div class="lw-blk-lbl">Landlord</div>
          <div class="lw-sig-typed lw-sig-final">${esc(l.landlord.name)}</div>
        </div>
        <div>
          <div class="lw-blk-lbl">Tenant</div>
          <div class="lw-sig-typed lw-sig-final">${esc(l.tenant.name)}</div>
        </div>
      </div>
      <div class="lw-actions" style="justify-content:center;margin-top:22px">
        <button class="btn btn-gold" onclick="lwViewAgreement()">👁 View</button>
        <button class="btn btn-teal" onclick="lwDownloadAgreement()">⬇ Download</button>
        <button class="btn btn-ghost" onclick="lwPrintAgreement()">🖨 Print</button>
      </div>
      ${lwAgreementVersionHistoryHtml(l)}
      ${LW.role === 'landlord' ? `<button class="btn btn-ghost btn-sm" style="margin-top:12px" onclick="lwUnlockAgreement()">🔓 Unlock &amp; edit this agreement</button>` : ''}
      <button class="btn btn-ghost btn-sm" style="margin-top:16px" onclick="${backFn}()">Back</button>
    </div>
  `;
}

async function lwUnlockAgreement() {
  const ok = confirm('Unlocking will clear both signatures and both sides will need to sign again after your changes. The tenant will see a notice that this agreement was revised. Continue?');
  if (!ok) return;
  try {
    const res = await LW.fetch(`/lease-agreements/${LW.lease._id}/unlock`, 'PUT');
    LW.lease = res.lease;
    LW.step = 2;
    renderTabs();
    renderStep2();
  } catch (e) { alert(e.message || 'Could not unlock agreement.'); }
}

// ═══════════════════════════════════════════════════════
//  TENANT — locate their agreement automatically
// ═══════════════════════════════════════════════════════
async function lwTenantLoad() {
  const body = document.getElementById('lw-body');
  if (body) body.innerHTML = '<div class="loading"><span class="spinner"></span>Loading your agreement…</div>';
  try {
    const user = JSON.parse(localStorage.getItem('tms_user') || '{}');
    const userId = (user._id || user.id || '').toString();
    const propData = await LW.fetch('/properties?status=rented');
    const myProp = (propData.properties || []).find(p => (p.tenantId || '').toString() === userId);

    if (!myProp) {
      LW.step = 2; renderTabs();
      if (body) body.innerHTML = `<div class="lw-section-lbl">TENANT DASHBOARD → LEASE AGREEMENT</div><div class="loading">You don't have a rented property yet. Once a landlord accepts your rental request, your tenancy agreement will appear here.</div>`;
      return;
    }

    const leaseData = await LW.fetch(`/lease-agreements/property/${myProp._id}`);
    LW.lease = leaseData.lease;

    if (!LW.lease) {
      LW.step = 2; renderTabs();
      if (body) body.innerHTML = `<div class="lw-section-lbl">TENANT DASHBOARD → LEASE AGREEMENT</div><div class="loading">Your landlord hasn't started the tenancy agreement yet. Check back soon.</div>`;
      return;
    }
    if (LW.lease.status === 'sent') { LW.step = 3; renderTabs(); renderStep3(); }
    else if (LW.lease.status === 'signed') { LW.step = 4; renderTabs(); renderStep4(); }
    else { LW.step = 2; renderTabs(); if (body) body.innerHTML = `<div class="loading">Your landlord is preparing the agreement. Check back soon.</div>`; }
  } catch (e) {
    if (body) body.innerHTML = `<div class="loading">⚠️ ${esc(e.message || 'Unable to load your agreement.')}</div>`;
  }
}

// ═══════════════════════════════════════════════════════
//  Signature modal (draw or type) — shared
// ═══════════════════════════════════════════════════════
function ensureSignatureModal() {
  if (document.getElementById('lw-sig-modal')) return;
  const div = document.createElement('div');
  div.id = 'lw-sig-modal';
  div.className = 'lw-modal-overlay';
  div.innerHTML = `
    <div class="lw-modal">
      <div class="lw-modal-head">
        <span>Add your signature</span>
        <button class="lw-modal-x" onclick="closeSignatureModal()">✕</button>
      </div>
      <div class="lw-sig-tabs">
        <button class="lw-sig-tab active" id="lw-sig-tab-draw" onclick="lwSetSigMode('draw')">✍️ Draw</button>
        <button class="lw-sig-tab" id="lw-sig-tab-type" onclick="lwSetSigMode('type')">⌨️ Type</button>
      </div>
      <div id="lw-sig-draw-wrap">
        <canvas id="lw-sig-canvas" width="460" height="160"></canvas>
        <button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="lwClearCanvas()">Clear</button>
      </div>
      <div id="lw-sig-type-wrap" style="display:none">
        <input type="text" id="lw-sig-type-input" class="lw-sig-type-input" placeholder="Type your full name">
        <div class="lw-sig-type-preview" id="lw-sig-type-preview"></div>
      </div>
      <div class="lw-actions">
        <button class="btn btn-ghost" onclick="closeSignatureModal()">Cancel</button>
        <button class="btn btn-gold" onclick="lwSaveSignature()">Save signature</button>
      </div>
    </div>
  `;
  document.body.appendChild(div);

  const canvas = document.getElementById('lw-sig-canvas');
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = '#4F7BFE'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    return { x: cx * canvas.width / r.width, y: cy * canvas.height / r.height };
  };
  const start = (e) => { LW._drawing = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); e.preventDefault(); };
  const move = (e) => { if (!LW._drawing) return; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); e.preventDefault(); };
  const end = () => { LW._drawing = false; };
  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  window.addEventListener('mouseup', end);
  canvas.addEventListener('touchstart', start, { passive: false });
  canvas.addEventListener('touchmove', move, { passive: false });
  canvas.addEventListener('touchend', end);

  document.getElementById('lw-sig-type-input').addEventListener('input', (e) => {
    document.getElementById('lw-sig-type-preview').textContent = e.target.value;
  });
}

function lwClearCanvas() {
  const canvas = document.getElementById('lw-sig-canvas');
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

function lwSetSigMode(mode) {
  LW._sigMode = mode;
  document.getElementById('lw-sig-tab-draw').classList.toggle('active', mode === 'draw');
  document.getElementById('lw-sig-tab-type').classList.toggle('active', mode === 'type');
  document.getElementById('lw-sig-draw-wrap').style.display = mode === 'draw' ? '' : 'none';
  document.getElementById('lw-sig-type-wrap').style.display = mode === 'type' ? '' : 'none';
}

function openSignatureModal(defaultName, onSave) {
  ensureSignatureModal();
  lwClearCanvas();
  lwSetSigMode('draw');
  document.getElementById('lw-sig-type-input').value = defaultName || '';
  document.getElementById('lw-sig-type-preview').textContent = defaultName || '';
  LW._sigCallback = onSave;
  document.getElementById('lw-sig-modal').classList.add('open');
}
function closeSignatureModal() {
  document.getElementById('lw-sig-modal')?.classList.remove('open');
  LW._sigCallback = null;
}
function lwSaveSignature() {
  if (LW._sigMode === 'draw') {
    const canvas = document.getElementById('lw-sig-canvas');
    const blank = document.createElement('canvas');
    blank.width = canvas.width; blank.height = canvas.height;
    if (canvas.toDataURL() === blank.toDataURL()) { alert('Please draw your signature first.'); return; }
    const data = canvas.toDataURL('image/png');
    const cb = LW._sigCallback;
    closeSignatureModal();
    cb && cb({ type: 'draw', data });
  } else {
    const name = document.getElementById('lw-sig-type-input').value.trim();
    if (!name) { alert('Please type your name.'); return; }
    const cb = LW._sigCallback;
    closeSignatureModal();
    cb && cb({ type: 'type', data: name });
  }
}

// ═══════════════════════════════════════════════════════
//  Download (PDF) & Print
// ═══════════════════════════════════════════════════════
function lwBuildAgreementPlainHtml(l) {
  const sigHtml = (sig, fallback) => {
    if (sig && sig.data) {
      return sig.type === 'draw' ? `<img src="${sig.data}" style="height:60px">` : `<div style="font-family:cursive;font-size:22px;color:#2563EB">${esc(sig.data)}</div>`;
    }
    return `<div>${fallback}</div>`;
  };
  return `
    <div style="font-family:Georgia,serif;color:#111;max-width:700px;margin:0 auto;padding:24px">
      <h1 style="text-align:center;font-size:22px;margin-bottom:2px">Tenancy Agreement</h1>
      <p style="text-align:center;color:#555;margin-top:0">Islamic Republic of Pakistan</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px">
        <tr><td style="padding:4px 0;color:#555">Property</td><td style="padding:4px 0;font-weight:bold">${esc(l.property.title)} — ${esc(l.property.address)}</td></tr>
        <tr><td style="padding:4px 0;color:#555">Rent</td><td style="padding:4px 0;font-weight:bold">Rs. ${Number(l.property.rent || 0).toLocaleString()} / month</td></tr>
        <tr><td style="padding:4px 0;color:#555">Duration</td><td style="padding:4px 0;font-weight:bold">${fmtDate(l.startDate)} to ${fmtDate(l.endDate)}</td></tr>
        <tr><td style="padding:4px 0;color:#555">Landlord</td><td style="padding:4px 0;font-weight:bold">${esc(l.landlord.name)} (CNIC: ${esc(l.landlord.cnic || '—')})</td></tr>
        <tr><td style="padding:4px 0;color:#555">Tenant</td><td style="padding:4px 0;font-weight:bold">${esc(l.tenant.name)} (CNIC: ${esc(l.tenant.cnic || '—')})</td></tr>
      </table>
      <h3 style="font-size:15px;border-bottom:1px solid #ccc;padding-bottom:4px">Terms and Conditions</h3>
      ${l.terms.map((t, i) => `<p style="font-size:12.5px;margin:8px 0"><b>${i + 1}. ${esc(t.title)}</b><br>${esc(t.text)}</p>`).join('')}
      <h3 style="font-size:15px;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:18px">Special Conditions</h3>
      <p style="font-size:12.5px">${esc(l.specialConditions || 'None specified.')}</p>
      <div style="display:flex;justify-content:space-between;margin-top:40px">
        <div style="text-align:center">${sigHtml(l.landlordSignature, 'Not signed')}<div style="border-top:1px solid #333;margin-top:6px;padding-top:4px;font-size:12px">Landlord — ${esc(l.landlord.name)}</div></div>
        <div style="text-align:center">${sigHtml(l.tenantSignature, 'Not signed')}<div style="border-top:1px solid #333;margin-top:6px;padding-top:4px;font-size:12px">Tenant — ${esc(l.tenant.name)}</div></div>
      </div>
    </div>
  `;
}

function lwPrintAgreement() {
  const win = window.open('', '_blank');
  win.document.write(`<html><head><title>Tenancy Agreement</title></head><body>${lwBuildAgreementPlainHtml(LW.lease)}</body></html>`);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 300);
}

function lwViewAgreementVersion(index) {
  const version = LW.lease?.agreementVersions?.[index];
  if (!version || !version.snapshot) return;
  const win = window.open('', '_blank');
  if (!win) { alert('Please allow pop-ups to view the agreement.'); return; }
  win.document.write(`<html><head><meta charset="UTF-8"><title>Tenancy Agreement v${version.version}</title></head><body>${lwBuildAgreementPlainHtml(version.snapshot)}</body></html>`);
  win.document.close();
}

function lwCompareAgreementVersion(index) {
  const version = LW.lease?.agreementVersions?.[index];
  if (!version || !version.snapshot) return;
  const oldLease = version.snapshot;
  const currentLease = LW.lease;
  const same = (a, b) => String(a ?? '') === String(b ?? '');
  const cell = (label, oldValue, newValue) => {
    const changed = !same(oldValue, newValue);
    return `<div style="padding:10px 12px;border-bottom:1px solid #e5e7eb;${changed ? 'background:#fff3bf;border-left:4px solid #e0a400' : ''}"><b>${esc(label)}</b><div style="margin-top:4px">${esc(oldValue || '—')}</div><div style="margin-top:3px;color:#15803d">${changed ? `New: ${esc(newValue || '—')}` : 'Unchanged'}</div></div>`;
  };
  const currentCell = (label, oldValue, newValue) => {
    const changed = !same(oldValue, newValue);
    return `<div style="padding:10px 12px;border-bottom:1px solid #e5e7eb;${changed ? 'background:#dcfce7;border-left:4px solid #16a34a' : ''}"><b>${esc(label)}</b><div style="margin-top:4px">${esc(newValue || '—')}</div><div style="margin-top:3px;color:#526078">${changed ? `Previous: ${esc(oldValue || '—')}` : 'Unchanged'}</div></div>`;
  };
  const termRows = (oldLease.terms || []).map((oldTerm, i) => {
    const newTerm = currentLease.terms?.[i];
    const changed = !newTerm || oldTerm.title !== newTerm.title || oldTerm.text !== newTerm.text;
    return `<div style="padding:10px 12px;border-bottom:1px solid #e5e7eb;${changed ? 'background:#fff3bf;border-left:4px solid #e0a400' : ''}"><b>${i + 1}. ${esc(oldTerm.title)}</b><p style="margin:4px 0">${esc(oldTerm.text)}</p>${changed ? `<div style="color:#15803d"><b>New:</b> ${esc(newTerm ? `${newTerm.title}: ${newTerm.text}` : 'Clause removed')}</div>` : '<div style="color:#15803d">Unchanged</div>'}</div>`;
  }).join('');
  const currentTermRows = (currentLease.terms || []).map((newTerm, i) => {
    const oldTerm = oldLease.terms?.[i];
    const changed = !oldTerm || oldTerm.title !== newTerm.title || oldTerm.text !== newTerm.text;
    return `<div style="padding:10px 12px;border-bottom:1px solid #e5e7eb;${changed ? 'background:#dcfce7;border-left:4px solid #16a34a' : ''}"><b>${i + 1}. ${esc(newTerm.title)}</b><p style="margin:4px 0">${esc(newTerm.text)}</p>${changed ? `<div style="color:#526078"><b>Previous:</b> ${esc(oldTerm ? `${oldTerm.title}: ${oldTerm.text}` : 'Clause added')}</div>` : '<div style="color:#15803d">Unchanged</div>'}</div>`;
  }).join('');
  const newTerms = (currentLease.terms || []).slice((oldLease.terms || []).length).map(term => `<div style="padding:10px 12px;background:#dcfce7;border-left:4px solid #16a34a;border-bottom:1px solid #e5e7eb"><b>Added: ${esc(term.title)}</b><p style="margin:4px 0">${esc(term.text)}</p></div>`).join('');
  const win = window.open('', '_blank');
  if (!win) { alert('Please allow pop-ups to compare agreements.'); return; }
  win.document.write(`<html><head><meta charset="UTF-8"><title>Agreement comparison</title><style>body{font-family:Arial,sans-serif;color:#172033;background:#f5f7fb;margin:0}.wrap{max-width:1100px;margin:24px auto;background:#fff;padding:24px;border-radius:12px}h1{margin:0 0 6px;font-size:22px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.panel{border:1px solid #d9dee8;border-radius:8px;overflow:hidden}.head{padding:12px;background:#eef2f7;font-weight:bold}.label{font-size:12px;color:#526078;margin-top:16px;text-transform:uppercase;font-weight:bold}@media(max-width:700px){.grid{grid-template-columns:1fr}}</style></head><body><div class="wrap"><h1>Agreement comparison</h1><p>Previous signed version v${version.version} compared with the current agreement.</p><div class="grid"><div class="panel"><div class="head">Previous · ${fmtDate(version.savedAt)}</div>${cell('Duration', fmtDate(oldLease.startDate) + ' to ' + fmtDate(oldLease.endDate), fmtDate(currentLease.startDate) + ' to ' + fmtDate(currentLease.endDate))}${cell('Special conditions', oldLease.specialConditions || 'None specified.', currentLease.specialConditions || 'None specified.')}<div class="label">Terms and conditions</div>${termRows}</div><div class="panel"><div class="head">Current agreement</div>${currentCell('Duration', fmtDate(oldLease.startDate) + ' to ' + fmtDate(oldLease.endDate), fmtDate(currentLease.startDate) + ' to ' + fmtDate(currentLease.endDate))}${currentCell('Special conditions', oldLease.specialConditions || 'None specified.', currentLease.specialConditions || 'None specified.')}<div class="label">Terms and conditions</div>${currentTermRows}${newTerms}</div></div></div></body></html>`);
  win.document.close();
}

function lwViewAgreement() {
  const win = window.open('', '_blank');
  if (!win) { alert('Please allow pop-ups to view the agreement.'); return; }
  win.document.write(`<html><head><meta charset="UTF-8"><title>Tenancy Agreement</title></head><body>${lwBuildAgreementPlainHtml(LW.lease)}</body></html>`);
  win.document.close();
}

function lwDownloadAgreement() {
  const l = LW.lease;
  const html = lwBuildAgreementPlainHtml(l);
  const full = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Tenancy Agreement — ${esc(l.property.title)}</title></head><body>${html}</body></html>`;
  const blob = new Blob([full], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Tenancy-Agreement-${(l.property.title || 'property').replace(/\s+/g, '_')}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
