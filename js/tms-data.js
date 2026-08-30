// ═══════════════════════════════════════════════════════
//  TMS DATA LAYER — tms-data.js
//  Sab data LocalStorage mein save hota hai
//  Koi hardcoded fake data nahi
//  Jab MongoDB connect ho, sirf API calls badalni hain
// ═══════════════════════════════════════════════════════

const TMS = {

  // ── Keys ────────────────────────────────────────────
  KEYS: {
    tenants: 'tms_tenants',
    landlords: 'tms_landlords',
    properties: 'tms_properties',
    complaints: 'tms_complaints',
    maintenance: 'tms_maintenance',
    logs: 'tms_logs',
    notifications: 'tms_notifications',
    users: 'tms_users',
  },

  // ── Generic get/save ────────────────────────────────
  get(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch (e) { return []; }
  },
  save(key, arr) {
    localStorage.setItem(key, JSON.stringify(arr));
  },

  // ── ID generator ────────────────────────────────────
  newId(prefix) {
    return prefix + '-' + Date.now().toString(36).toUpperCase();
  },

  // ─────────────────── TENANTS ───────────────────────
  getTenants() { return this.get(this.KEYS.tenants); },
  saveTenants(d) { this.save(this.KEYS.tenants, d); },

  addTenant(data) {
    const list = this.getTenants();
    const t = { id: this.newId('T'), ...data, status: data.status || 'active', joinedAt: new Date().toLocaleDateString('en-PK', { month: 'short', year: 'numeric' }) };
    list.push(t);
    this.saveTenants(list);
    this.addLog('success', `New tenant registered: ${t.name}`, 'admin');
    return t;
  },

  deleteTenant(id) {
    const list = this.getTenants().filter(t => t.id !== id);
    this.saveTenants(list);
    this.addLog('warn', `Tenant deleted: ${id}`, 'admin');
  },

  updateTenant(id, data) {
    const list = this.getTenants().map(t => t.id === id ? { ...t, ...data } : t);
    this.saveTenants(list);
  },

  // ─────────────────── LANDLORDS ─────────────────────
  getLandlords() { return this.get(this.KEYS.landlords); },
  saveLandlords(d) { this.save(this.KEYS.landlords, d); },

  addLandlord(data) {
    const list = this.getLandlords();
    const l = { id: this.newId('L'), ...data, status: data.status || 'pending', joinedAt: new Date().toLocaleDateString('en-PK', { month: 'short', year: 'numeric' }) };
    list.push(l);
    this.saveLandlords(list);
    this.addLog('info', `New landlord registered: ${l.name}`, 'system');
    return l;
  },

  deleteLandlord(id) {
    const list = this.getLandlords().filter(l => l.id !== id);
    this.saveLandlords(list);
  },

  updateLandlord(id, data) {
    const list = this.getLandlords().map(l => l.id === id ? { ...l, ...data } : l);
    this.saveLandlords(list);
  },

  approveLandlord(id) {
    this.updateLandlord(id, { status: 'approved' });
    const l = this.getLandlords().find(l => l.id === id);
    this.addLog('success', `Landlord approved: ${l?.name || id}`, 'admin');
    this.addNotif('Landlord Approved', `${l?.name || 'A landlord'} has been approved and can now list properties.`, 'green');
  },

  rejectLandlord(id) {
    this.updateLandlord(id, { status: 'rejected' });
    this.addLog('warn', `Landlord rejected: ${id}`, 'admin');
  },

  // ─────────────────── PROPERTIES ────────────────────
  getProperties() { return this.get(this.KEYS.properties); },
  saveProperties(d) { this.save(this.KEYS.properties, d); },

  addProperty(data) {
    const list = this.getProperties();
    const p = { id: this.newId('P'), ...data, status: data.status || 'available', listedAt: new Date().toLocaleDateString('en-PK', { month: 'short', year: 'numeric' }) };
    list.push(p);
    this.saveProperties(list);
    this.addLog('success', `New property listed: ${p.title}`, 'landlord');
    return p;
  },

  deleteProperty(id) {
    const list = this.getProperties().filter(p => p.id !== id);
    this.saveProperties(list);
  },

  updateProperty(id, data) {
    const list = this.getProperties().map(p => p.id === id ? { ...p, ...data } : p);
    this.saveProperties(list);
  },

  suspendProperty(id) {
    this.updateProperty(id, { status: 'suspended' });
    this.addLog('warn', `Property suspended: ${id}`, 'admin');
  },

  restoreProperty(id) {
    this.updateProperty(id, { status: 'available' });
    this.addLog('info', `Property restored: ${id}`, 'admin');
  },

  // ─────────────────── COMPLAINTS ────────────────────
  getComplaints() { return this.get(this.KEYS.complaints); },
  saveComplaints(d) { this.save(this.KEYS.complaints, d); },

  addComplaint(data) {
    const list = this.getComplaints();
    const c = { id: this.newId('C'), ...data, status: data.status || 'open', filedAt: new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) };
    list.push(c);
    this.saveComplaints(list);
    this.addLog('warn', `New complaint filed: ${c.title}`, data.filedBy || 'user');
    this.addNotif('New Complaint Filed', `"${c.title}" — filed by ${data.filedBy || 'a user'}`, 'red');
    return c;
  },

  resolveComplaint(id) {
    this.updateComplaint(id, { status: 'resolved' });
    this.addLog('success', `Complaint resolved: ${id}`, 'admin');
  },

  updateComplaint(id, data) {
    const list = this.getComplaints().map(c => c.id === id ? { ...c, ...data } : c);
    this.saveComplaints(list);
  },

  // ─────────────────── MAINTENANCE ───────────────────
  getMaintenance() { return this.get(this.KEYS.maintenance); },
  saveMaintenance(d) { this.save(this.KEYS.maintenance, d); },

  addMaintenance(data) {
    const list = this.getMaintenance();
    const m = { id: this.newId('M'), ...data, status: data.status || 'pending', filedAt: new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short' }) };
    list.push(m);
    this.saveMaintenance(list);
    this.addLog('info', `Maintenance request: ${m.title}`, data.tenant || 'tenant');
    return m;
  },

  updateMaintenance(id, data) {
    const list = this.getMaintenance().map(m => m.id === id ? { ...m, ...data } : m);
    this.saveMaintenance(list);
  },

  // ─────────────────── LOGS ──────────────────────────
  getLogs() { return this.get(this.KEYS.logs); },

  addLog(type, msg, user) {
    const logs = this.getLogs();
    logs.unshift({ type, msg, user: user || 'system', time: new Date().toLocaleString('en-PK', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) });
    if (logs.length > 100) logs.pop();
    this.save(this.KEYS.logs, logs);
  },

  // ─────────────────── NOTIFICATIONS ─────────────────
  getNotifs() { return this.get(this.KEYS.notifications); },

  addNotif(title, msg, color, to = 'all', from = 'admin') {
    const notifs = this.getNotifs();
    const toList = Array.isArray(to) ? to : [to || 'all'];
    notifs.unshift({
      title,
      msg,
      color: color || 'blue',
      read: false,
      time: new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }),
      to: toList,
      from: from || 'admin',
    });
    if (notifs.length > 50) notifs.pop();
    this.save(this.KEYS.notifications, notifs);
    // ── Broadcast to other open tabs ──────────────────
    try {
      if (window._tmsBroadcast) {
        window._tmsBroadcast.postMessage({ type: 'tms_notif_update' });
      }
    } catch(e) {}
    this._refreshNotifBadge();
  },

  _refreshNotifBadge() {
    const notifs = this.getNotifs();
    const unread = notifs.filter(n => !n.read && this._isNotifForUser(n)).length;
    document.querySelectorAll('.tn-badge, #notif-nb, #nb, #nb2, #nb-notifs-admin').forEach(el => {
      if (!el) return;
      el.textContent = unread;
      el.style.display = unread > 0 ? 'flex' : 'none';
    });
    // Also refresh list if notifications page is currently visible
    const notifPageEl = document.getElementById('page-notifications');
    if (notifPageEl && notifPageEl.classList.contains('active') && !window.TMS_SKIP_LEGACY_NOTIFS) {
      if (typeof tmsRenderNotifs === 'function') tmsRenderNotifs();
    }
  },

  markAllNotifsRead() {
    const notifs = this.getNotifs().map(n => ({ ...n, read: true }));
    this.save(this.KEYS.notifications, notifs);
    document.querySelectorAll('.tn-badge, #notif-nb, #nb, #nb2, #nb-notifs-admin').forEach(el => {
      if (!el) return;
      el.textContent = '0';
      el.style.display = 'none';
    });
  },

  // ─────────────────── DASHBOARD STATS ───────────────
  _isNotifForUser(notification) {
    if (!notification) return false;
    const current = this.getCurrentUser();
    const recipients = Array.isArray(notification.to) ? notification.to : [notification.to || 'all'];
    if (recipients.includes('all')) return true;
    if (!current) return false;
    if (current.role && recipients.includes(current.role)) return true;
    if (current.email && recipients.includes(current.email)) return true;
    return false;
  },

  getStats() {
    const tenants = this.getTenants();
    const landlords = this.getLandlords();
    const properties = this.getProperties();
    const complaints = this.getComplaints();
    const maintenance = this.getMaintenance();
    const users = (() => { try { return Object.keys(JSON.parse(localStorage.getItem('tms_users') || '{}')); } catch (e) { return []; } })();

    const openIssues = complaints.filter(c => c.status === 'open').length + maintenance.filter(m => m.status === 'pending').length;
    const pendingLandlords = landlords.filter(l => l.status === 'pending').length;
    const openComplaints = complaints.filter(c => c.status === 'open').length;
    const unreadNotifs = this.getNotifs().filter(n => !n.read && this._isNotifForUser(n)).length;

    return {
      totalUsers: users.length,
      properties: properties.length,
      tenants: tenants.length,
      landlords: landlords.length,
      openIssues,
      openComplaints,
      pendingLandlords,
      pendingMaintenance: maintenance.filter(m => m.status === 'pending').length,
      reportedProps: properties.filter(p => p.status === 'reported').length,
      maintenance: maintenance.length,
      complaints: complaints.length,
      unreadNotifs,
    };
  },

  // ─────────────────── CURRENT USER ──────────────────
  getCurrentUser() {
    try {
      let email = localStorage.getItem('tms_current_user');
      if (!email) {
        const currentUser = JSON.parse(localStorage.getItem('tms_user') || 'null');
        email = currentUser?.email;
      }
      if (!email) return null;
      if (email === localStorage.getItem('tms_admin_email')) {
        return { name: 'Super Admin', role: 'admin', email, initial: 'A' };
      }
      const users = JSON.parse(localStorage.getItem('tms_users') || '{}');
      const u = users[email] || JSON.parse(localStorage.getItem('tms_user') || 'null');
      if (!u) return null;
      return { ...u, email, initial: (u.name || email)[0].toUpperCase() };
    } catch (e) { return null; }
  },
};

// ── Render helpers ──────────────────────────────────────

function tmsUpdateStats() {
  const stats = TMS.getStats();
  document.querySelectorAll('[data-stat]').forEach(el => {
    const key = el.getAttribute('data-stat');
    if (stats[key] !== undefined) el.textContent = stats[key];
  });

  const max = Math.max(stats.tenants, stats.landlords, stats.properties, stats.complaints, stats.maintenance, 1);
  const bars = {
    'chart-tenants': stats.tenants,
    'chart-landlords': stats.landlords,
    'chart-properties': stats.properties,
    'chart-complaints': stats.complaints,
    'chart-maintenance': stats.maintenance,
  };
  Object.entries(bars).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) {
      el.style.width = Math.max((val / max) * 100, 0).toFixed(1) + '%';
      const span = el.querySelector('span');
      if (span) span.textContent = val;
    }
  });

  const badgeMap = {
    'nb-reported': stats.reportedProps,
    'nb-complaints': stats.openComplaints,
    'nb-maintenance': stats.pendingMaintenance,
    'nb-verification': stats.pendingLandlords,
    'nb-notifs': stats.unreadNotifs,
  };
  Object.entries(badgeMap).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) { el.textContent = val; el.style.display = val > 0 ? '' : 'none'; }
  });

  const actMap = {
    'act-pending-docs': stats.pendingLandlords,
    'act-new-reports': stats.reportedProps,
    'act-awaiting-appr': stats.pendingLandlords,
    'act-open-complaints': stats.openComplaints,
  };
  Object.entries(actMap).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  });

  const notifBadge = document.getElementById('notif-count');
  if (notifBadge) notifBadge.textContent = stats.unreadNotifs;
}

// ── Render Tenants Table ────────────────────────────────
function tmsRenderTenants(filter) {
  const tbody = document.getElementById('tenants-tbody');
  if (!tbody) return;
  let list = TMS.getTenants();
  if (filter) list = list.filter(t =>
    t.name?.toLowerCase().includes(filter.toLowerCase()) ||
    t.email?.toLowerCase().includes(filter.toLowerCase())
  );
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--muted)">No tenants yet. Add one from the form below.</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map((t, i) => `
    <tr>
      <td style="color:var(--muted)">${String(i + 1).padStart(2, '0')}</td>
      <td><div style="font-weight:600">${t.name}</div><div style="font-size:11px;color:var(--muted)">CNIC: ${t.cnic || 'Not provided'}</div></td>
      <td>${t.email || '—'}</td>
      <td style="color:var(--text2)">${t.phone || '—'}</td>
      <td><span style="color:var(--blue)">${t.property || 'None'}</span></td>
      <td><span class="badge ${t.status === 'active' ? 'b-green' : t.status === 'blocked' ? 'b-red' : 'b-warn'}">${t.status || 'active'}</span></td>
      <td style="color:var(--muted)">${t.joinedAt || '—'}</td>
      <td><div class="td-actions">
        <button class="btn btn-warn btn-sm" onclick="tmsBlockTenant('${t.id}')">${t.status === 'blocked' ? 'Unblock' : 'Block'}</button>
        <button class="btn btn-danger btn-sm" onclick="tmsDeleteTenant('${t.id}')">Delete</button>
      </div></td>
    </tr>`).join('');
}

function tmsBlockTenant(id) {
  const t = TMS.getTenants().find(t => t.id === id);
  TMS.updateTenant(id, { status: t?.status === 'blocked' ? 'active' : 'blocked' });
  tmsRenderTenants(); tmsUpdateStats();
}
function tmsDeleteTenant(id) {
  if (!confirm('Delete this tenant?')) return;
  TMS.deleteTenant(id); tmsRenderTenants(); tmsUpdateStats();
}

// ── Render Landlords Table ──────────────────────────────
function tmsRenderLandlords(filter) {
  const tbody = document.getElementById('landlords-tbody');
  if (!tbody) return;
  let list = TMS.getLandlords();
  if (filter) list = list.filter(l =>
    l.name?.toLowerCase().includes(filter.toLowerCase()) ||
    l.email?.toLowerCase().includes(filter.toLowerCase())
  );
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--muted)">No landlords registered yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map((l, i) => `
    <tr>
      <td style="color:var(--muted)">${String(i + 1).padStart(2, '0')}</td>
      <td><div style="font-weight:600">${l.name}</div><div style="font-size:11px;color:var(--muted)">CNIC: ${l.cnic || 'Not provided'}</div></td>
      <td>${l.email || '—'}</td>
      <td style="color:var(--gold);font-weight:600">${TMS.getProperties().filter(p => p.landlordId === l.id).length}</td>
      <td style="color:var(--green);font-weight:600">${TMS.getTenants().filter(t => t.landlordId === l.id).length}</td>
      <td><span class="badge ${l.status === 'approved' ? 'b-green' : l.status === 'rejected' ? 'b-red' : 'b-warn'}">${l.status || 'pending'}</span></td>
      <td><div class="td-actions">
        ${l.status === 'pending' ? `<button class="btn btn-green btn-sm" onclick="tmsApproveLandlord('${l.id}')">Approve</button><button class="btn btn-danger btn-sm" onclick="tmsRejectLandlord('${l.id}')">Reject</button>` : `<button class="btn btn-warn btn-sm" onclick="tmsBlockLandlord('${l.id}')">${l.status === 'blocked' ? 'Unblock' : 'Block'}</button>`}
        <button class="btn btn-danger btn-sm" onclick="tmsDeleteLandlord('${l.id}')">Delete</button>
      </div></td>
    </tr>`).join('');
}

function tmsApproveLandlord(id) {
  TMS.approveLandlord(id); tmsRenderLandlords(); tmsUpdateStats();
}
function tmsRejectLandlord(id) {
  TMS.rejectLandlord(id); tmsRenderLandlords(); tmsUpdateStats();
}
function tmsBlockLandlord(id) {
  const l = TMS.getLandlords().find(l => l.id === id);
  TMS.updateLandlord(id, { status: l?.status === 'blocked' ? 'approved' : 'blocked' });
  tmsRenderLandlords(); tmsUpdateStats();
}
function tmsDeleteLandlord(id) {
  if (!confirm('Delete this landlord?')) return;
  TMS.deleteLandlord(id); tmsRenderLandlords(); tmsUpdateStats();
}

// ── Render Properties Table ─────────────────────────────
function tmsRenderProperties(filter) {
  const tbody = document.getElementById('properties-tbody');
  if (!tbody) return;
  let list = TMS.getProperties();
  if (filter) list = list.filter(p =>
    p.title?.toLowerCase().includes(filter.toLowerCase()) ||
    p.city?.toLowerCase().includes(filter.toLowerCase())
  );
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--muted)">No properties listed yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map((p, i) => `
    <tr>
      <td style="color:var(--muted)">${p.id}</td>
      <td><div style="font-weight:600">${p.title}</div><div style="font-size:11px;color:var(--muted)">${p.beds || '?'} Bed · ${p.baths || '?'} Bath</div></td>
      <td>${p.landlord || '—'}</td>
      <td><span class="badge b-blue">${p.type || 'Apartment'}</span></td>
      <td style="color:var(--gold);font-weight:600">Rs. ${Number(p.rent || 0).toLocaleString()}</td>
      <td>${p.city || '—'}</td>
      <td><span class="badge ${p.status === 'available' ? 'b-green' : p.status === 'rented' ? 'b-muted' : 'b-red'}">${p.status || 'available'}</span></td>
      <td><div class="td-actions">
        <button class="btn btn-warn btn-sm" onclick="tmsSuspendProperty('${p.id}')">${p.status === 'suspended' ? 'Restore' : 'Suspend'}</button>
        <button class="btn btn-danger btn-sm" onclick="tmsDeleteProperty('${p.id}')">Delete</button>
      </div></td>
    </tr>`).join('');
}

function tmsSuspendProperty(id) {
  const p = TMS.getProperties().find(p => p.id === id);
  if (p?.status === 'suspended') TMS.restoreProperty(id);
  else TMS.suspendProperty(id);
  tmsRenderProperties(); tmsUpdateStats();
}
function tmsDeleteProperty(id) {
  if (!confirm('Delete this property?')) return;
  TMS.deleteProperty(id); tmsRenderProperties(); tmsUpdateStats();
}

// ── Render Complaints List ──────────────────────────────
function tmsRenderComplaints() {
  const container = document.getElementById('complaints-list');
  if (!container) return;
  const list = TMS.getComplaints();
  if (!list.length) {
    container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted)">No complaints filed yet.</div>`;
    return;
  }
  container.innerHTML = list.map(c => `
    <div class="list-item">
      <div class="li-icon ci-red">📣</div>
      <div class="li-body">
        <div class="li-title">${c.title}</div>
        <div class="li-sub">${c.description || ''} ${c.filedBy ? '· Filed by: ' + c.filedBy : ''} · ${c.filedAt || ''}</div>
        <div style="margin-top:6px;display:flex;gap:6px">
          <span class="badge ${c.status === 'open' ? 'b-red' : c.status === 'resolved' ? 'b-green' : 'b-warn'}">${c.status || 'open'}</span>
          ${c.category ? `<span class="badge b-muted">${c.category}</span>` : ''}
        </div>
      </div>
      <div class="li-actions">
        ${c.status !== 'resolved' ? `<button class="btn btn-green btn-sm" onclick="tmsResolveComplaint('${c.id}')">Resolve</button>` : ''}
        <button class="btn btn-danger btn-sm" onclick="tmsDeleteComplaint('${c.id}')">Delete</button>
      </div>
    </div>`).join('');
}

function tmsResolveComplaint(id) {
  TMS.resolveComplaint(id); tmsRenderComplaints(); tmsUpdateStats();
}
function tmsDeleteComplaint(id) {
  const list = TMS.getComplaints().filter(c => c.id !== id);
  TMS.saveComplaints(list); tmsRenderComplaints(); tmsUpdateStats();
}

// ── Render Maintenance Table ────────────────────────────
function tmsRenderMaintenance() {
  const tbody = document.getElementById('maintenance-tbody');
  if (!tbody) return;
  const list = TMS.getMaintenance();
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--muted)">No maintenance requests yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(m => `
    <tr>
      <td style="color:var(--muted)">${m.id}</td>
      <td style="font-weight:600">${m.title}</td>
      <td>${m.tenant || '—'}</td>
      <td style="color:var(--text2)">${m.property || '—'}</td>
      <td>${m.landlord || '—'}</td>
      <td><span class="badge ${m.priority === 'urgent' ? 'b-red' : m.priority === 'high' ? 'b-gold' : 'b-muted'}">${m.priority || 'normal'}</span></td>
      <td><span class="badge ${m.status === 'resolved' ? 'b-green' : m.status === 'in-progress' ? 'b-blue' : 'b-warn'}">${m.status || 'pending'}</span></td>
      <td style="color:var(--muted)">${m.filedAt || '—'}</td>
    </tr>`).join('');
}

// ── Render Logs ─────────────────────────────────────────
function tmsRenderLogs() {
  const container = document.getElementById('logs-container');
  if (!container) return;
  const list = TMS.getLogs();
  if (!list.length) {
    container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted)">No activity recorded yet.</div>`;
    return;
  }
  const typeStyle = { info: 'info', warn: 'warn', error: 'error', success: 'success' };
  container.innerHTML = list.map(l => `
    <div class="log-item">
      <span class="log-type ${typeStyle[l.type] || 'info'}">${l.type?.toUpperCase() || 'INFO'}</span>
      <span class="log-msg">${l.msg}</span>
      <span class="log-user">${l.user}</span>
      <span class="log-time">${l.time}</span>
    </div>`).join('');
}

// ── Render Notifications ────────────────────────────────
function tmsRenderNotifs() {
  const container = document.getElementById('notifs-list');
  if (!container) return;
  const current = TMS.getCurrentUser();
  const list = TMS.getNotifs().filter(n => TMS._isNotifForUser(n));
  if (!list.length) {
    container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted)">No notifications yet.</div>`;
    return;
  }
  container.innerHTML = list.map(n => {
    const recipients = Array.isArray(n.to) ? n.to.join(', ') : n.to || 'all';
    const sender = n.from || 'admin';
    const colorStyle = n.color && n.color.startsWith('#') ? n.color : `var(--${n.color || 'blue'})`;
    return `
      <div class="notif-item ${n.read ? '' : 'unread'}">
        <div class="notif-dot" style="background:${colorStyle}"></div>
        <div>
          <div class="notif-text" style="font-weight:700">${n.title}</div>
          <div class="notif-text" style="margin-top:4px">${n.msg}</div>
          <div class="notif-time" style="margin-top:8px">From: ${sender} · To: ${recipients}</div>
        </div>
        <span class="notif-time">${n.time}</span>
      </div>`;
  }).join('');
}

// ── Pending Actions on Dashboard ────────────────────────
function tmsRenderPendingActions() {
  const container = document.getElementById('pending-actions-list');
  if (!container) return;
  const stats = TMS.getStats();
  const actions = [
    { label: 'User Verifications', sub: 'pending documents', count: stats.pendingLandlords, badge: 'b-warn', page: 'verification' },
    { label: 'Reported Properties', sub: 'reports filed', count: stats.reportedProps, badge: 'b-red', page: 'reported' },
    { label: 'Landlord Approvals', sub: 'awaiting approval', count: stats.pendingLandlords, badge: 'b-gold', page: 'landlords' },
    { label: 'Open Complaints', sub: 'need resolution', count: stats.openComplaints, badge: 'b-red', page: 'complaints' },
  ];
  container.innerHTML = actions.map(a => `
    <div class="list-item" style="padding:10px 12px;cursor:pointer" onclick="gp('${a.page}',document.querySelector('[onclick*=${a.page}]'))">
      <div class="li-body">
        <div class="li-title" style="font-size:12.5px">${a.label}</div>
        <div class="li-sub">${a.count} ${a.sub}</div>
      </div>
      <span class="badge ${a.badge}">${a.count} ${a.count === 1 ? 'item' : 'items'}</span>
    </div>`).join('');
}

// ── Recent Activity on Dashboard ────────────────────────
function tmsRenderRecentActivity() {
  const container = document.getElementById('activity-list');
  if (!container) return;
  const logs = TMS.getLogs().slice(0, 6);
  if (!logs.length) {
    container.innerHTML = `<div class="activity-item"><div class="act-dot blue"></div><div class="act-text" style="color:var(--muted)">No activity recorded yet. Start by adding tenants, landlords, or properties.</div><div class="act-time">now</div></div>`;
    return;
  }
  const dotColor = { success: 'green', warn: 'warn', error: 'red', info: 'blue' };
  container.innerHTML = logs.map(l => `
    <div class="activity-item">
      <div class="act-dot ${dotColor[l.type] || 'blue'}"></div>
      <div class="act-text">${l.msg}</div>
      <div class="act-time">${l.time}</div>
    </div>`).join('');
}

// ── Add Tenant Form Handler ──────────────────────────────
function tmsSubmitAddTenant() {
  const name = document.getElementById('add-t-name')?.value.trim();
  const email = document.getElementById('add-t-email')?.value.trim();
  const phone = document.getElementById('add-t-phone')?.value.trim();
  const cnic = document.getElementById('add-t-cnic')?.value.trim();
  const property = document.getElementById('add-t-property')?.value.trim();

  if (!name || !email) { tmsShowFormMsg('add-tenant-msg', 'Name and email are required.', false); return; }

  TMS.addTenant({ name, email, phone, cnic, property, status: 'active' });
  document.getElementById('add-tenant-form')?.reset();
  tmsShowFormMsg('add-tenant-msg', '✅ Tenant added successfully!', true);
  tmsRenderTenants(); tmsUpdateStats();
}

// ── Add Landlord Form Handler ────────────────────────────
function tmsSubmitAddLandlord() {
  const name = document.getElementById('add-l-name')?.value.trim();
  const email = document.getElementById('add-l-email')?.value.trim();
  const phone = document.getElementById('add-l-phone')?.value.trim();
  const cnic = document.getElementById('add-l-cnic')?.value.trim();

  if (!name || !email) { tmsShowFormMsg('add-landlord-msg', 'Name and email are required.', false); return; }

  TMS.addLandlord({ name, email, phone, cnic, status: 'pending' });
  document.getElementById('add-landlord-form')?.reset();
  tmsShowFormMsg('add-landlord-msg', '✅ Landlord added! Status: Pending approval.', true);
  tmsRenderLandlords(); tmsUpdateStats();
}

// ── Add Property Form Handler ────────────────────────────
function tmsSubmitAddProperty() {
  const title = document.getElementById('add-p-title')?.value.trim();
  const address = document.getElementById('add-p-address')?.value.trim();
  const city = document.getElementById('add-p-city')?.value.trim();
  const type = document.getElementById('add-p-type')?.value;
  const rent = document.getElementById('add-p-rent')?.value.trim();
  const beds = document.getElementById('add-p-beds')?.value.trim();
  const baths = document.getElementById('add-p-baths')?.value.trim();
  const landlord = document.getElementById('add-p-landlord')?.value.trim();

  if (!title || !city) { tmsShowFormMsg('add-property-msg', 'Title and city are required.', false); return; }

  TMS.addProperty({ title, address, city, type, rent: Number(rent), beds, baths, landlord, status: 'available' });
  document.getElementById('add-property-form')?.reset();
  tmsShowFormMsg('add-property-msg', '✅ Property added successfully!', true);
  tmsRenderProperties(); tmsUpdateStats();
}

// ── Add Complaint Form Handler ───────────────────────────
function tmsSubmitAddComplaint() {
  const title = document.getElementById('add-c-title')?.value.trim();
  const description = document.getElementById('add-c-desc')?.value.trim();
  const category = document.getElementById('add-c-category')?.value;
  const filedBy = document.getElementById('add-c-filedby')?.value.trim();

  if (!title) { tmsShowFormMsg('add-complaint-msg', 'Title is required.', false); return; }

  TMS.addComplaint({ title, description, category, filedBy, status: 'open' });
  document.getElementById('add-complaint-form')?.reset();
  tmsShowFormMsg('add-complaint-msg', '✅ Complaint filed successfully!', true);
  tmsRenderComplaints(); tmsUpdateStats();
}

// ── Add Maintenance Form Handler ─────────────────────────
function tmsSubmitAddMaintenance() {
  const title = document.getElementById('add-m-title')?.value.trim();
  const desc = document.getElementById('add-m-desc')?.value.trim();
  const tenant = document.getElementById('add-m-tenant')?.value.trim();
  const property = document.getElementById('add-m-property')?.value.trim();
  const priority = document.getElementById('add-m-priority')?.value;

  if (!title) { tmsShowFormMsg('add-maint-msg', 'Title is required.', false); return; }

  TMS.addMaintenance({ title, description: desc, tenant, property, priority, status: 'pending' });
  document.getElementById('add-maintenance-form')?.reset();
  tmsShowFormMsg('add-maint-msg', '✅ Maintenance request added!', true);
  tmsRenderMaintenance(); tmsUpdateStats();
}

// ── Form message helper ──────────────────────────────────
function tmsShowFormMsg(elId, msg, success) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = msg;
  el.className = success ? 'ok-banner show' : 'err-banner show';
  el.style.display = 'flex';
  setTimeout(() => { el.style.display = 'none'; }, 3000);
}

// ── Send Notification Handler ────────────────────────────
function tmsOnNotifToChange() {
  const toVal = document.getElementById('notif-to')?.value || 'all';
  const specificWrap = document.getElementById('notif-specific-wrap');
  const specificSel = document.getElementById('notif-specific');
  if (!specificWrap || !specificSel) return;
  if (toVal === 'tenant') {
    const tenants = TMS.getTenants();
    specificSel.innerHTML = '<option value="">\u2014 Sab Tenants \u2014</option>' +
      tenants.map(t => '<option value="' + (t.email || t.id) + '">' + t.name + (t.email ? ' (' + t.email + ')' : '') + '</option>').join('');
    specificWrap.style.display = 'block';
  } else if (toVal === 'landlord') {
    const landlords = TMS.getLandlords();
    specificSel.innerHTML = '<option value="">\u2014 Sab Landlords \u2014</option>' +
      landlords.map(l => '<option value="' + (l.email || l.id) + '">' + l.name + (l.email ? ' (' + l.email + ')' : '') + '</option>').join('');
    specificWrap.style.display = 'block';
  } else {
    specificSel.innerHTML = '';
    specificWrap.style.display = 'none';
  }
}

function tmsSendNotification() {
  const title = document.getElementById('notif-title')?.value.trim();
  const msg = document.getElementById('notif-msg')?.value.trim();
  const toRole = document.getElementById('notif-to')?.value || 'all';
  const specific = document.getElementById('notif-specific')?.value || '';
  if (!title || !msg) { alert('Title aur message zaroori hain.'); return; }
  // Agar specific person select kiya toh uska email/id use karo, warna role
  const to = (specific && (toRole === 'tenant' || toRole === 'landlord')) ? specific : toRole;
  const current = TMS.getCurrentUser();
  const sender = current?.role || 'admin';
  TMS.addNotif(title, msg, 'blue', to, sender);
  let toLabel = to;
  if (specific) {
    const sel = document.getElementById('notif-specific');
    const opt = sel?.options[sel.selectedIndex];
    toLabel = opt ? opt.text : to;
  }
  TMS.addLog('info', `${sender} sent notification to ${toLabel}: "${title}"`, sender || 'system');
  document.getElementById('notif-title').value = '';
  document.getElementById('notif-msg').value = '';
  if (document.getElementById('notif-to')) document.getElementById('notif-to').value = 'all';
  const sw = document.getElementById('notif-specific-wrap');
  if (sw) sw.style.display = 'none';
  tmsRenderNotifs(); tmsUpdateStats();
  const ok = document.getElementById('notif-ok');
  if (ok) { ok.classList.add('show'); setTimeout(() => ok.classList.remove('show'), 3000); }
}

// ── Verify Page: Render Pending Landlords ────────────────
function tmsRenderVerification() {
  const container = document.getElementById('verification-pending');
  if (!container) return;
  const pending = TMS.getLandlords().filter(l => l.status === 'pending');
  if (!pending.length) {
    container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted)">✅ No pending verifications right now.</div>`;
    return;
  }
  container.innerHTML = pending.map(l => `
    <div class="verify-card">
      <div class="vc-av" style="background:linear-gradient(135deg,#4A9EFF,#7BBFFF)">${l.name[0].toUpperCase()}</div>
      <div class="vc-info">
        <div class="vc-name">${l.name}</div>
        <div class="vc-role">🏢 Landlord · Registered ${l.joinedAt || '—'}</div>
        <div class="vc-docs">
          <span class="doc-tag">📷 CNIC</span>
          ${l.cnic ? `<span class="doc-tag">🪪 ${l.cnic}</span>` : ''}
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-green btn-sm" onclick="tmsApproveLandlord('${l.id}');tmsRenderVerification();tmsUpdateStats()">✓ Approve</button>
          <button class="btn btn-danger btn-sm" onclick="tmsRejectLandlord('${l.id}');tmsRenderVerification();tmsUpdateStats()">✕ Reject</button>
        </div>
      </div>
    </div>`).join('');
}

// ── Page render dispatcher ───────────────────────────────
function tmsOnPageChange(pageId) {
  switch (pageId) {
    case 'dashboard':
      tmsUpdateStats();
      tmsRenderPendingActions();
      tmsRenderRecentActivity();
      break;
    case 'tenants': tmsRenderTenants(); break;
    case 'landlords': tmsRenderLandlords(); break;
    case 'properties': tmsRenderProperties(); break;
    case 'complaints': tmsRenderComplaints(); break;
    case 'maintenance': tmsRenderMaintenance(); break;
    case 'logs': tmsRenderLogs(); break;
    case 'notifications': tmsRenderNotifs(); break;
    case 'verification': tmsRenderVerification(); break;
  }
}

// Auto-init on page load
document.addEventListener('DOMContentLoaded', () => {
  tmsUpdateStats();
  tmsRenderPendingActions();
  tmsRenderRecentActivity();
});

// ── Cross-tab notification sync ───────────────────────────
// Method 1: BroadcastChannel (same browser, multiple tabs)
try {
  window._tmsBroadcast = new BroadcastChannel('tms_notifications_channel');
  window._tmsBroadcast.onmessage = (e) => {
    if (e.data && e.data.type === 'tms_notif_update') {
      if (window.TMS_SKIP_LEGACY_NOTIFS) return;
      if (typeof TMS !== 'undefined') {
        TMS._refreshNotifBadge();
        if (typeof tmsUpdateStats === 'function') tmsUpdateStats();
        if (typeof tmsRenderNotifs === 'function') {
          const notifPage = document.getElementById('notifs-list');
          if (notifPage) tmsRenderNotifs();
        }
      }
    }
  };
} catch(e) {}

// Method 2: storage event (cross-tab fallback)
window.addEventListener('storage', (e) => {
  if (e.key === 'tms_notifications') {
    if (window.TMS_SKIP_LEGACY_NOTIFS) return;
    const notifPage = document.getElementById('notifs-list');
    if (notifPage) tmsRenderNotifs();
  }
});

// Method 3: Polling every 3 seconds as safety net
setInterval(() => {
  if (typeof TMS !== 'undefined' && typeof TMS._refreshNotifBadge === 'function') {
    if (!window.TMS_SKIP_LEGACY_NOTIFS) {
      TMS._refreshNotifBadge();
    }
  }
}, 3000);
