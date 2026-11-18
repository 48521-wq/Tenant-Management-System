// seed-real-data.js
// ─────────────────────────────────────────────────────────────────────────────
// Replaces TEST data with a realistic, fully-linked demo data set.
//
//   KEEPS    : all Properties (only the tenant assignment fields are re-linked),
//              property-owner (landlord) accounts, 3D requests, any account you
//              list with --keep-email.
//   REMOVES  : other users, rental requests (+ uploaded documents), payments
//              (+ slips), maintenance, complaints, notifications, leases.
//   ADDS     : 12 fictional tenants, rental requests in EVERY status with
//              ID / police / birth documents, 4 months of rent payments with
//              payment slips, maintenance, complaints and notifications.
//
// USAGE (from the backend folder):
//   node seed-real-data.js                       # DRY RUN - shows what would happen
//   node seed-real-data.js --confirm             # backup, delete test data, insert new data
//   node seed-real-data.js --confirm --keep-email=a@x.com,b@y.com   # keep real accounts
//   node seed-real-data.js --selftest            # offline check, no database needed
//
// A JSON backup of everything that is deleted is written to backend/backups/.
// All generated people, numbers, slips and documents are FICTIONAL samples.
// ─────────────────────────────────────────────────────────────────────────────
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const User = require('./models/User');
const Property = require('./models/Property');
const RentalRequest = require('./models/RentalRequest');
const Payment = require('./models/Payment');
const Maintenance = require('./models/Maintenance');
const Complaint = require('./models/Complaint');
const Notification = require('./models/Notification');
const LeaseAgreement = require('./models/LeaseAgreement');
const img = require('./seed/images');
const { TENANTS, MAINTENANCE, COMPLAINTS } = require('./seed/people');

const args = process.argv.slice(2);
const CONFIRM = args.includes('--confirm');
const SELFTEST = args.includes('--selftest');
const KEEP_EMAILS = ((args.find(a => a.startsWith('--keep-email=')) || '').split('=')[1] || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const PASSWORD = process.env.SEED_PASSWORD || 'Tms@2026';

const OID = () => new mongoose.Types.ObjectId();
const pad = (n, l = 2) => String(n).padStart(l, '0');
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const now = new Date();
const daysAgo = (n, h = 11) => { const d = new Date(now); d.setDate(d.getDate() - n); d.setHours(h, 20, 0, 0); return d; };
const round500 = (n) => Math.round(n / 500) * 500;
const monthLabel = (d) => `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const monthDay = (offset, day) => { const d = new Date(now.getFullYear(), now.getMonth() - offset, day, 12 + (day % 5), 10 + day); return d > now ? new Date(now.getTime() - 3600e3) : d; };
const rnd = (seed, n) => String(((seed * 7919 + 104729) * 31337) % (10 ** n)).padStart(n, '0');

async function build(properties, owners) {
  const fallbackOwner = owners[0] || { _id: OID(), name: 'Landlord', email: '' };
  const ownerOf = (p) => owners.find(o => String(o._id) === String(p.landlordId)) || fallbackOwner;

  // ── tenants ──
  const tenants = TENANTS.map((t, i) => {
    const [first, ...rest] = t.name.toLowerCase().split(' ');
    return {
      ...t, _id: OID(), email: `${first}.${rest.join('')}@example.com`,
      phone: `0300-55500${pad(i + 1)}`, cnic: `35202-${1000001 + i * 37}-${(i % 9) + 1}`,
      address: `House ${10 + i * 3}, Street ${i + 2}, ${t.city}`,
    };
  });
  const docCache = {};
  const docsFor = async (i, which = ['id', 'police', 'birth']) => {
    const t = tenants[i];
    const person = { name: t.name, father: t.father, gender: t.gender, dob: t.dob, cnic: t.cnic, city: t.city, address: t.address,
      issued: img.fmtD(daysAgo(120 + i * 9)), expiry: '12-05-2031', ref: `2026-${pad(i + 41, 4)}` };
    docCache[i] = docCache[i] || {};
    if (which.includes('id') && !docCache[i].id) docCache[i].id = await img.idDocument(person);
    if (which.includes('police') && !docCache[i].police) docCache[i].police = await img.policeCertificate(person);
    if (which.includes('birth') && !docCache[i].birth) docCache[i].birth = await img.birthCertificate(person);
    return docCache[i];
  };

  const rented = properties.filter(p => p.status === 'rented');
  const avail = properties.filter(p => p.status === 'available');
  const requests = [], payments = [], maint = [], complaints = [], notes = [], propUpdates = [];
  const rentedPairs = rented.map((p, k) => ({ p, ti: k % tenants.length, k }));

  const tenantRef = (t) => ({ tenantId: t._id, tenantName: t.name, tenantEmail: t.email, tenantPhone: t.phone });
  const propRef = (p, o) => ({ propertyId: p._id, propertyTitle: p.title, propertyAddress: p.address, propertyRent: p.rent,
    landlordId: o._id, landlordName: o.name, landlordEmail: o.email || '' });
  const msg = (t, o, role, text, rent, d) => ({ senderId: role === 'tenant' ? t._id : o._id, senderName: role === 'tenant' ? t.name : o.name, senderRole: role, text, proposedRent: rent, sentAt: d });

  // ── rented properties: accepted request + payment history + support tickets ──
  for (const { p, ti, k } of rentedPairs) {
    const t = tenants[ti], o = ownerOf(p), d = await docsFor(ti);
    const offer = round500(p.rent * 0.92), agreed = round500(p.rent * 0.96);
    const start = daysAgo(118 - k * 4);
    requests.push({
      ...tenantRef(t), ...propRef(p, o), status: 'accepted',
      message: `Salam, I am a ${t.job.toLowerCase()} looking for a long-term rental. I can move in within two weeks and provide all documents.`,
      proposedRent: offer, agreedRent: agreed,
      negotiationMessages: [
        msg(t, o, 'tenant', `I would like to rent this property at Rs. ${offer.toLocaleString('en-US')} per month.`, offer, start),
        msg(t, o, 'landlord', `Thank you. I can do Rs. ${agreed.toLocaleString('en-US')} with the lease starting next week.`, agreed, new Date(+start + 5 * 3600e3)),
        msg(t, o, 'tenant', 'Agreed, thank you. I will upload my documents today.', null, new Date(+start + 20 * 3600e3)),
      ],
      requestedAt: start, respondedAt: new Date(+start + 26 * 3600e3), docsDeadline: new Date(+start + 74 * 3600e3),
      documents: { idCard: d.id, policeCert: d.police, birthCert: d.birth, submittedAt: new Date(+start + 40 * 3600e3) },
      createdAt: start, updatedAt: new Date(+start + 3 * 86400e3),
    });
    propUpdates.push({ _id: p._id, $set: { tenantId: t._id, tenantName: t.name } });

    // payments: 3 past months + current month
    const methods = ['Bank Transfer', 'JazzCash', 'EasyPaisa', 'Bank Transfer', 'Cash'];
    const pattern = k % 4; // 0 all paid, 1 current awaiting approval, 2 one rejected slip, 3 current overdue
    for (let off = 3; off >= 0; off--) {
      const due = monthDay(off, 3 + ((k + off) % 5));
      const label = monthLabel(due);
      const method = methods[(k + off) % methods.length];
      const base = { tenantId: t._id, tenantName: t.name, landlordId: o._id, landlordName: o.name, propertyId: p._id, propertyTitle: p.title, amount: agreed, month: label, method };
      const slip = (m, when, ref) => m === 'Cash' ? Promise.resolve('') : img.paymentSlip({ method: m, amount: agreed, from: t.name, to: o.name, month: label, property: p.title, paidAt: when, ref });
      const ref = () => (method === 'Bank Transfer' ? 'FT' : 'TXN') + rnd(k * 10 + off + 3, 11);
      const push = (status, extra) => payments.push({ ...base, status, createdAt: extra.at, updatedAt: extra.at, ...extra.fields });
      if (off === 0 && pattern === 3) {
        push('overdue', { at: due, fields: { note: 'Rent not received after the due date. Reminder sent to tenant.', screenshot: '', paidAt: null } });
      } else if (off === 0 && pattern === 1) {
        push('pending', { at: due, fields: { note: 'Paid today, please confirm.', screenshot: await slip(method, due, ref()), paidAt: due } });
      } else if (off === 1 && pattern === 2) {
        const bad = new Date(+due - 2 * 86400e3);
        payments.push({ ...base, method: 'Bank Transfer', amount: agreed - 5000, status: 'rejected', note: 'Rejected: transferred amount was Rs. 5,000 short.', paidAt: bad, createdAt: bad, updatedAt: due,
          screenshot: await img.paymentSlip({ method: 'Bank Transfer', amount: agreed - 5000, from: t.name, to: o.name, month: label, property: p.title, paidAt: bad, ref: 'FT' + rnd(k + 99, 11) }) });
        push('paid', { at: due, fields: { note: 'Full amount re-sent.', screenshot: await slip(method, due, ref()), paidAt: due } });
      } else {
        push('paid', { at: due, fields: { note: method === 'Cash' ? 'Paid in cash, receipt handed over.' : '', screenshot: await slip(method, due, ref()), paidAt: due } });
      }
    }

    // maintenance + complaints for this tenant
    const mStat = ['pending', 'in_progress', 'pending_confirmation', 'resolved', 'resolved', 'pending', 'in_progress', 'resolved'];
    const cStat = ['open', 'in_progress', 'resolved', 'closed', 'open', 'resolved'];
    for (let j = 0; j < 2; j++) {
      const idx = (k * 2 + j) % MAINTENANCE.length, m = MAINTENANCE[idx], st = mStat[idx % mStat.length], at = daysAgo(34 - idx * 3 - j);
      maint.push({ tenantId: t._id, tenantName: t.name, landlordId: o._id, landlordName: o.name, propertyId: p._id, propertyTitle: p.title,
        type: m.type, priority: m.priority, description: m.text, status: st,
        adminNote: st === 'in_progress' ? 'Technician has been scheduled; tenant informed.' : '',
        resolvedAt: st === 'resolved' ? new Date(+at + 3 * 86400e3) : null, createdAt: at, updatedAt: new Date(+at + 86400e3) });
    }
    const ci = k % COMPLAINTS.length, c = COMPLAINTS[ci], cs = cStat[ci % cStat.length], cat = daysAgo(26 - ci * 3);
    complaints.push({ tenantId: t._id, tenantName: t.name, landlordId: o._id, landlordName: o.name, propertyId: p._id,
      subject: c.subject, description: c.text, category: c.category, priority: c.priority, status: cs,
      adminNote: cs === 'resolved' ? 'Issue discussed with the concerned party and resolved.' : '',
      resolvedAt: cs === 'resolved' || cs === 'closed' ? new Date(+cat + 4 * 86400e3) : null, createdAt: cat, updatedAt: new Date(+cat + 86400e3) });
  }

  // ── available properties: requests in every status ──
  const reqTenantIdx = tenants.map((_, i) => i).filter(i => i >= rentedPairs.length);
  const pool = reqTenantIdx.length ? reqTenantIdx : tenants.map((_, i) => i);
  const flow = ['pending', 'negotiating', 'docs_pending', 'docs_submitted', 'pending', 'docs_rejected', 'rejected', 'cancelled', 'negotiating', 'pending', 'docs_expired', 'pending'];
  const intro = [
    'Salam, I am interested in this property for my family of four. Please let me know if it is still available.',
    'I am relocating for work and would like to rent this place for at least one year.',
    'The location suits me well. I can pay one month advance and the security deposit.',
    'Is the rent negotiable? I am ready to sign a long-term agreement if the terms are fair.',
  ];
  if (avail.length) for (let j = 0; j < pool.length; j++) {
    const ti = pool[j], t = tenants[ti], p = avail[j % avail.length], o = ownerOf(p), st = flow[j % flow.length];
    const at = daysAgo(2 + j * 2), offer = round500(p.rent * (0.88 + (j % 4) * 0.02)), counter = round500(p.rent * 0.95);
    const base = { ...tenantRef(t), ...propRef(p, o), status: st, message: intro[j % intro.length], proposedRent: offer, requestedAt: at, createdAt: at, updatedAt: at, negotiationMessages: [] };
    if (st === 'negotiating') {
      base.negotiationMessages = [msg(t, o, 'tenant', `My offer is Rs. ${offer.toLocaleString('en-US')} per month.`, offer, at),
        msg(t, o, 'landlord', `I can come down to Rs. ${counter.toLocaleString('en-US')}, not lower.`, counter, new Date(+at + 6 * 3600e3))];
      base.respondedAt = new Date(+at + 6 * 3600e3);
    }
    if (['docs_pending', 'docs_submitted', 'docs_rejected', 'docs_expired'].includes(st)) {
      base.agreedRent = counter; base.respondedAt = new Date(+at + 5 * 3600e3);
      base.docsDeadline = st === 'docs_expired' ? new Date(+at + 53 * 3600e3) : new Date(now.getTime() + (st === 'docs_pending' ? 30 : 36) * 3600e3);
      base.negotiationMessages = [msg(t, o, 'tenant', `My offer is Rs. ${offer.toLocaleString('en-US')} per month.`, offer, at), msg(t, o, 'landlord', `Accepted at Rs. ${counter.toLocaleString('en-US')}. Please upload your documents.`, counter, new Date(+at + 5 * 3600e3))];
    }
    if (st === 'docs_submitted') { const d = await docsFor(ti); base.documents = { idCard: d.id, policeCert: d.police, birthCert: d.birth, submittedAt: new Date(+at + 20 * 3600e3) }; }
    if (st === 'docs_rejected') { const d = await docsFor(ti, ['id', 'police']); base.documents = { idCard: d.id, policeCert: d.police, birthCert: '', submittedAt: new Date(+at + 18 * 3600e3) };
      base.docsRejectReason = 'The police certificate is older than six months. Please upload a recent one.'; }
    if (st === 'rejected' || st === 'cancelled') base.respondedAt = new Date(+at + 9 * 3600e3);
    requests.push(base);
  }

  // ── notifications ──
  const o0 = fallbackOwner, rt = rentedPairs.map(r => tenants[r.ti]);
  notes.push(
    { title: 'Welcome to the Tenant Management System', message: 'Browse verified properties, request a rental, upload your documents and pay rent online - all in one place.', color: 'blue', fromName: 'Admin', fromRole: 'admin', to: ['all'], toLabel: 'Everyone', readBy: [tenants[0].email], createdAt: daysAgo(40), updatedAt: daysAgo(40) },
    { title: 'Rent payment reminder', message: 'Monthly rent is due by the 10th. Please upload a clear payment slip after paying so your landlord can confirm it quickly.', color: 'amber', fromName: 'Admin', fromRole: 'admin', to: ['tenant'], toLabel: 'All tenants', readBy: rt.slice(0, 2).map(t => t.email), createdAt: daysAgo(6), updatedAt: daysAgo(6) },
    { title: 'Verify tenant documents within 48 hours', message: 'Pending rental requests are waiting on document verification. Please review uploaded ID and police certificates promptly.', color: 'red', fromName: 'Admin', fromRole: 'admin', to: ['landlord'], toLabel: 'All landlords', readBy: [], createdAt: daysAgo(3), updatedAt: daysAgo(3) },
    { title: 'Scheduled platform maintenance', message: 'The platform will be briefly unavailable on Sunday between 2 AM and 3 AM for routine maintenance.', color: 'green', fromName: 'Admin', fromRole: 'admin', to: ['all'], toLabel: 'Everyone', readBy: [], createdAt: daysAgo(1), updatedAt: daysAgo(1) },
  );
  if (rt.length) {
    notes.push({ title: 'Water tank cleaning on Saturday', message: 'The overhead water tank will be cleaned this Saturday from 10 AM to 1 PM. Water supply may be interrupted for a few hours.', color: 'blue', fromName: o0.name, fromEmail: o0.email || '', fromRole: 'landlord', to: rt.map(t => t.email), toLabel: `${rt.length} tenant(s)`, readBy: [rt[0].email], createdAt: daysAgo(4), updatedAt: daysAgo(4) });
    notes.push({ title: 'Request for repainting', message: 'Could we please schedule the repainting of the drawing room walls after the monsoon? Happy to coordinate a convenient day.', color: 'blue', fromName: rt[0].name, fromEmail: rt[0].email, fromRole: 'tenant', to: [o0.email || 'landlord'], toLabel: o0.name, readBy: [], createdAt: daysAgo(2), updatedAt: daysAgo(2) });
  }

  const users = tenants.map(t => ({ _id: t._id, name: t.name, email: t.email, password: PASSWORD, role: 'tenant', authProvider: 'email', status: 'active', verified: true, phone: t.phone, cnic: t.cnic, city: t.city, address: t.address }));
  return { users, requests, payments, maint, complaints, notes, propUpdates, tenants };
}

const summarize = (plan) => ({
  users: plan.users.length, requests: plan.requests.length, payments: plan.payments.length,
  slips: plan.payments.filter(p => p.screenshot).length,
  documents: plan.requests.reduce((n, r) => n + ['idCard', 'policeCert', 'birthCert'].filter(k => r.documents && r.documents[k]).length, 0),
  maintenance: plan.maint.length, complaints: plan.complaints.length, notifications: plan.notes.length,
  requestStatuses: plan.requests.reduce((a, r) => (a[r.status] = (a[r.status] || 0) + 1, a), {}),
  paymentStatuses: plan.payments.reduce((a, r) => (a[r.status] = (a[r.status] || 0) + 1, a), {}),
});

async function selftest() {
  const lid = OID();
  const owners = [{ _id: lid, name: 'Adnan Agral', email: 'landlord@example.com' }];
  const mk = (i, st, rent) => ({ _id: OID(), title: `Sample Property ${i}`, address: `Block ${i}, Lahore`, rent, status: st, landlordId: lid });
  const props = [mk(1, 'rented', 65000), mk(2, 'rented', 80000), mk(3, 'rented', 72000), mk(4, 'rented', 90000), mk(5, 'available', 55000), mk(6, 'available', 48000), mk(7, 'available', 120000)];
  const plan = await build(props, owners);
  const models = [['users', User], ['requests', RentalRequest], ['payments', Payment], ['maint', Maintenance], ['complaints', Complaint], ['notes', Notification]];
  let bad = 0;
  for (const [key, M] of models) for (const doc of plan[key]) { const err = new M(doc).validateSync(); if (err) { bad++; console.log('INVALID', key, Object.keys(err.errors).join(','), err.message.slice(0, 120)); } }
  console.log('Self-test:', bad ? `${bad} invalid documents` : 'all documents pass schema validation');
  console.log(JSON.stringify(summarize(plan), null, 1));
  const kb = Buffer.byteLength(JSON.stringify(plan)) / 1024;
  console.log(`Payload size: ${Math.round(kb)} KB`);
  process.exit(bad ? 1 : 0);
}

async function main() {
  if (SELFTEST) return selftest();
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) { console.error('MONGODB_URI is not set in backend/.env'); process.exit(1); }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000, family: 4 });
  console.log(`Connected to database "${mongoose.connection.name}" on ${mongoose.connection.host}`);
  console.log(CONFIRM ? 'MODE: LIVE (--confirm)\n' : 'MODE: DRY RUN (nothing will be changed; add --confirm to apply)\n');

  const properties = await Property.find().lean();
  if (!properties.length) { console.error('No properties found - aborting (properties are the base of this data set).'); process.exit(1); }
  const allUsers = await User.find().lean();
  const ownerIds = new Set(properties.map(p => String(p.landlordId)));
  const keepUsers = allUsers.filter(u => ownerIds.has(String(u._id)) || KEEP_EMAILS.includes((u.email || '').toLowerCase()));
  const keepIds = keepUsers.map(u => u._id);
  const keepTenantIds = keepUsers.filter(u => u.role === 'tenant').map(u => u._id);
  const dropUsers = allUsers.filter(u => !keepIds.some(id => String(id) === String(u._id)));
  const owners = keepUsers.filter(u => ownerIds.has(String(u._id)));

  const purge = { RentalRequest, Payment, Maintenance, Complaint, LeaseAgreement };
  const counts = {};
  for (const [n, M] of Object.entries(purge)) counts[n] = await M.countDocuments({ tenantId: { $nin: keepTenantIds } });
  counts.Notification = await Notification.countDocuments();

  console.log(`Properties kept       : ${properties.length}  (${properties.filter(p => p.status === 'rented').length} rented, ${properties.filter(p => p.status === 'available').length} available)`);
  console.log(`Accounts kept         : ${keepUsers.map(u => `${u.name} <${u.email}> [${u.role}]`).join('; ') || 'none'}`);
  console.log(`Accounts to delete    : ${dropUsers.length}`);
  dropUsers.forEach(u => console.log(`   - ${u.name} <${u.email}> [${u.role}]`));
  Object.entries(counts).forEach(([n, c]) => console.log(`${(n + ' to delete').padEnd(22)}: ${c}`));
  console.log('3D requests           : kept (untouched)');

  const plan = await build(properties, owners);
  console.log('\nNew data to insert:', JSON.stringify(summarize(plan), null, 1));
  console.log(`Demo login for every new tenant account: password "${PASSWORD}" (e.g. ${plan.tenants[0].email})`);

  if (!CONFIRM) { console.log('\nDry run finished. Review the lists above, then re-run with --confirm.'); return mongoose.disconnect(); }

  // 1) backup
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(__dirname, 'backups', stamp);
  fs.mkdirSync(dir, { recursive: true });
  const dump = { users: allUsers, rentalrequests: await RentalRequest.find().lean(), payments: await Payment.find().lean(), maintenance: await Maintenance.find().lean(),
    complaints: await Complaint.find().lean(), notifications: await Notification.find().lean(), leaseagreements: await LeaseAgreement.find().lean(), properties };
  for (const [k, v] of Object.entries(dump)) fs.writeFileSync(path.join(dir, `${k}.json`), JSON.stringify(v));
  console.log(`\nBackup written to ${dir}`);

  // 2) delete test data
  for (const M of Object.values(purge)) await M.deleteMany({ tenantId: { $nin: keepTenantIds } });
  await Notification.deleteMany({});
  await User.deleteMany({ _id: { $nin: keepIds } });

  // 3) clear stale tenant links on properties, then insert fresh data
  await Property.updateMany({ status: { $ne: 'rented' } }, { $set: { tenantId: null, tenantName: '' } });
  for (const u of plan.users) await User.create(u);           // runs password hashing
  await RentalRequest.insertMany(plan.requests);
  await Payment.insertMany(plan.payments);
  await Maintenance.insertMany(plan.maint);
  await Complaint.insertMany(plan.complaints);
  await Notification.insertMany(plan.notes);
  for (const u of plan.propUpdates) await Property.updateOne({ _id: u._id }, { $set: u.$set });

  console.log('\nDone. Test data replaced with the realistic demo data set.');
  await mongoose.disconnect();
}

if (require.main === module) main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
module.exports = { build };
