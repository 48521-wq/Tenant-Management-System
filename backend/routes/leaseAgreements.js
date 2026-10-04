const express = require('express');
const mongoose = require('mongoose');
const LeaseAgreement = require('../models/LeaseAgreement');
const Property = require('../models/Property');
const User = require('../models/User');
const RentalRequest = require('../models/RentalRequest');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');
const router = express.Router();

function isValidId(id) {
  return !!id && mongoose.Types.ObjectId.isValid(String(id));
}

function isLandlordOf(lease, userId) {
  return lease.landlordId.toString() === userId.toString();
}
function isTenantOf(lease, userId) {
  return lease.tenantId.toString() === userId.toString();
}

function agreementSnapshot(lease) {
  return {
    property: lease.property?.toObject ? lease.property.toObject() : lease.property,
    landlord: lease.landlord?.toObject ? lease.landlord.toObject() : lease.landlord,
    tenant: lease.tenant?.toObject ? lease.tenant.toObject() : lease.tenant,
    terms: (lease.terms || []).map(term => term.toObject ? term.toObject() : { title: term.title, text: term.text }),
    specialConditions: lease.specialConditions || '',
    startDate: lease.startDate,
    endDate: lease.endDate,
    landlordSignature: lease.landlordSignature?.toObject ? lease.landlordSignature.toObject() : lease.landlordSignature,
    tenantSignature: lease.tenantSignature?.toObject ? lease.tenantSignature.toObject() : lease.tenantSignature,
    status: lease.status
  };
}

function agreementChanges(before, after) {
  const changes = [];
  const value = item => String(item || '').trim() || 'None';
  const beforeTerms = JSON.stringify(before.terms || []);
  const afterTerms = JSON.stringify(after.terms || []);
  if (beforeTerms !== afterTerms) {
    const beforeByTitle = new Map((before.terms || []).map(term => [term.title, term.text]));
    const afterByTitle = new Map((after.terms || []).map(term => [term.title, term.text]));
    (after.terms || []).forEach(term => {
      if (!beforeByTitle.has(term.title)) changes.push(`Clause added: ${term.title} -> ${value(term.text)}`);
      else if (beforeByTitle.get(term.title) !== term.text) changes.push(`Clause changed: ${term.title} | Previous: ${value(beforeByTitle.get(term.title))} | New: ${value(term.text)}`);
    });
    (before.terms || []).forEach(term => {
      if (!afterByTitle.has(term.title)) changes.push(`Clause removed: ${term.title} | Previous: ${value(term.text)}`);
    });
  }
  if ((before.specialConditions || '') !== (after.specialConditions || '')) changes.push(`Special conditions | Previous: ${value(before.specialConditions)} | New: ${value(after.specialConditions)}`);
  if (String(before.startDate || '') !== String(after.startDate || '')) changes.push(`Start date | Previous: ${value(before.startDate)} | New: ${value(after.startDate)}`);
  if (String(before.endDate || '') !== String(after.endDate || '')) changes.push(`End date | Previous: ${value(before.endDate)} | New: ${value(after.endDate)}`);
  if ((before.landlord?.cnic || '') !== (after.landlord?.cnic || '')) changes.push(`Landlord CNIC | Previous: ${value(before.landlord?.cnic)} | New: ${value(after.landlord?.cnic)}`);
  if ((before.tenant?.cnic || '') !== (after.tenant?.cnic || '')) changes.push(`Tenant CNIC | Previous: ${value(before.tenant?.cnic)} | New: ${value(after.tenant?.cnic)}`);
  return changes.length ? changes : ['Agreement reviewed by landlord'];
}

// ─── LANDLORD or TENANT: my agreements ───
router.get('/my', protect, async (req, res) => {
  try {
    const filter = req.user.role === 'landlord'
      ? { landlordId: req.user._id }
      : { tenantId: req.user._id };
    const leases = await LeaseAgreement.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, leases });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error: ' + (e && e.message ? e.message : 'unknown') });
  }
});

// ─── Get lease agreement for a specific property (or null if none yet) ───
router.get('/property/:propertyId', protect, async (req, res) => {
  try {
    if (!isValidId(req.params.propertyId)) {
      return res.status(400).json({ success: false, message: 'Invalid property id.' });
    }
    const property = await Property.findById(req.params.propertyId);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found.' });

    const isLandlord = property.landlordId.toString() === req.user._id.toString();
    const isTenant = property.tenantId && property.tenantId.toString() === req.user._id.toString();
    const isAdmin = req.user.isAdmin || req.user.role === 'admin';
    if (!isLandlord && !isTenant && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    const lease = await LeaseAgreement.findOne({ propertyId: property._id }).sort({ createdAt: -1 });
    res.json({ success: true, lease: lease || null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error: ' + (e && e.message ? e.message : 'unknown') });
  }
});

// ─── Get single lease agreement by id ───
router.get('/:id', protect, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid agreement id.' });
    }
    const lease = await LeaseAgreement.findById(req.params.id);
    if (!lease) return res.status(404).json({ success: false, message: 'Agreement not found.' });
    const isAdmin = req.user.isAdmin || req.user.role === 'admin';
    if (!isLandlordOf(lease, req.user._id) && !isTenantOf(lease, req.user._id) && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    // Tenant may only ever see an agreement once the landlord has sent it.
    if (isTenantOf(lease, req.user._id) && lease.status === 'draft') {
      return res.status(403).json({ success: false, message: 'This agreement has not been sent to you yet.' });
    }
    res.json({ success: true, lease });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error: ' + (e && e.message ? e.message : 'unknown') });
  }
});

// ─── LANDLORD: start (or resume) a lease agreement for a property ───
// Auto-fills property, landlord (from profile) and tenant (from the accepted
// rental request / property.tenantId) details, and loads the default
// Pakistan tenancy terms (Punjab Rented Premises Act 2009).
router.post('/start', protect, async (req, res) => {
  try {
    if (req.user.role !== 'landlord') {
      return res.status(403).json({ success: false, message: 'Landlord access required.' });
    }
    const { propertyId } = req.body;
    if (!isValidId(propertyId)) {
      return res.status(400).json({ success: false, message: 'Missing or invalid property. Please reselect the property and try again.' });
    }
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found.' });
    if (property.landlordId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized for this property.' });
    }
    if (!property.tenantId) {
      return res.status(400).json({ success: false, message: 'This property has no accepted tenant yet. A tenant must be onboarded before a lease agreement can be created.' });
    }

    // Resume existing agreement for this property if one already exists.
    let lease = await LeaseAgreement.findOne({ propertyId: property._id }).sort({ createdAt: -1 });
    if (lease) {
      // Still a draft? Nothing has been sent/signed yet, so it's safe to
      // pull the latest CNIC/phone/email from both profiles — this is how
      // a CNIC added to the profile *after* starting the draft shows up
      // automatically, without the landlord having to retype anything.
      if (lease.status === 'draft') {
        const [freshLandlord, freshTenant] = await Promise.all([
          User.findById(lease.landlordId),
          User.findById(lease.tenantId)
        ]);
        if (freshLandlord) {
          lease.landlord = {
            name: freshLandlord.name,
            cnic: freshLandlord.cnic || '',
            phone: freshLandlord.phone || '',
            email: freshLandlord.email || ''
          };
        }
        if (freshTenant) {
          lease.tenant = {
            name: freshTenant.name,
            cnic: freshTenant.cnic || '',
            phone: freshTenant.phone || '',
            email: freshTenant.email || ''
          };
        }
        await lease.save();
      }
      return res.json({ success: true, lease, resumed: true });
    }

    const tenant = await User.findById(property.tenantId);
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found.' });

    if (!String(req.user.cnic || '').trim()) {
      return res.status(400).json({ success: false, message: 'Your CNIC is missing from your profile. Please add your CNIC in My Profile before creating a lease agreement.' });
    }
    if (!String(tenant.cnic || '').trim()) {
      return res.status(400).json({ success: false, message: `${tenant.name || 'The tenant'}'s CNIC is missing from their profile. Ask them to add their CNIC before a lease agreement can be created.` });
    }

    const acceptedRequest = await RentalRequest.findOne({
      propertyId: property._id,
      tenantId: property.tenantId,
      status: 'accepted'
    }).sort({ updatedAt: -1 });

    lease = await LeaseAgreement.create({
      propertyId: property._id,
      landlordId: req.user._id,
      tenantId: tenant._id,
      rentalRequestId: acceptedRequest ? acceptedRequest._id : null,
      property: {
        title: property.title,
        type: property.type,
        address: property.address,
        area: property.area,
        city: property.city,
        rent: property.rent
      },
      landlord: {
        name: req.user.name,
        cnic: req.user.cnic || '',
        phone: req.user.phone || '',
        email: req.user.email || ''
      },
      tenant: {
        name: tenant.name,
        cnic: tenant.cnic || '',
        phone: tenant.phone || '',
        email: tenant.email || ''
      },
      terms: LeaseAgreement.DEFAULT_PK_TERMS,
      status: 'draft'
    });

    res.status(201).json({ success: true, lease });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error: ' + (e && e.message ? e.message : 'unknown') });
  }
});

// ─── LANDLORD: edit terms & special conditions (draft only) ───
router.put('/:id', protect, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid agreement id.' });
    }
    const lease = await LeaseAgreement.findById(req.params.id);
    if (!lease) return res.status(404).json({ success: false, message: 'Agreement not found.' });
    if (!isLandlordOf(lease, req.user._id)) return res.status(403).json({ success: false, message: 'Not authorized.' });
    if (lease.status !== 'draft') return res.status(400).json({ success: false, message: 'Agreement is already sent and can no longer be edited.' });

    const before = agreementSnapshot(lease);
    const { terms, specialConditions, startDate, endDate, landlordCnic, tenantCnic } = req.body;
    if (Array.isArray(terms)) {
      lease.terms = terms.filter(term => term && String(term.title || '').trim() && String(term.text || '').trim());
    }
    if (typeof specialConditions === 'string') {
      lease.specialConditions = specialConditions;
    }
    if (startDate !== undefined) {
      lease.startDate = startDate ? new Date(startDate) : null;
    }
    if (endDate !== undefined) {
      lease.endDate = endDate ? new Date(endDate) : null;
    }
    if (typeof landlordCnic === 'string') {
      lease.landlord.cnic = landlordCnic.trim();
    }
    if (typeof tenantCnic === 'string') {
      lease.tenant.cnic = tenantCnic.trim();
    }
    if (lease.startDate && lease.endDate && lease.endDate <= lease.startDate) {
      return res.status(400).json({ success: false, message: 'Agreement end date must be after the start date.' });
    }
    const changes = agreementChanges(before, agreementSnapshot(lease));
    if (lease.agreementVersions?.length) {
      const currentVersion = lease.agreementVersions[lease.agreementVersions.length - 1];
      currentVersion.changes = changes;
      if (changes[0] !== 'Agreement reviewed by landlord') currentVersion.savedAt = new Date();
      const latestEdit = lease.editHistory?.[lease.editHistory.length - 1];
      if (latestEdit) latestEdit.note = changes.join('; ');
    }
    await lease.save();
    res.json({ success: true, lease });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error: ' + (e && e.message ? e.message : 'unknown') });
  }
});

// ─── LANDLORD: add / update landlord signature (draft only) ───
// ─── LANDLORD: pull latest CNIC/phone/email from profiles (draft only) ───
// Called automatically whenever the wizard is opened, so that if the CNIC
// was missing when the agreement was started but has since been added to
// either profile, it appears here without the landlord retyping anything.
// Never overwrites a value that was already filled in on the agreement.
router.put('/:id/sync-profile', protect, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid agreement id.' });
    }
    const lease = await LeaseAgreement.findById(req.params.id);
    if (!lease) return res.status(404).json({ success: false, message: 'Agreement not found.' });
    if (!isLandlordOf(lease, req.user._id)) return res.status(403).json({ success: false, message: 'Not authorized.' });
    if (lease.status !== 'draft') {
      return res.json({ success: true, lease }); // nothing to sync once sent/locked
    }

    const [landlordUser, tenantUser] = await Promise.all([
      User.findById(lease.landlordId),
      User.findById(lease.tenantId)
    ]);

    let changed = false;
    if (landlordUser) {
      if (!lease.landlord.cnic && landlordUser.cnic) { lease.landlord.cnic = landlordUser.cnic; changed = true; }
      if (!lease.landlord.phone && landlordUser.phone) { lease.landlord.phone = landlordUser.phone; changed = true; }
      if (!lease.landlord.email && landlordUser.email) { lease.landlord.email = landlordUser.email; changed = true; }
    }
    if (tenantUser) {
      if (!lease.tenant.cnic && tenantUser.cnic) { lease.tenant.cnic = tenantUser.cnic; changed = true; }
      if (!lease.tenant.phone && tenantUser.phone) { lease.tenant.phone = tenantUser.phone; changed = true; }
      if (!lease.tenant.email && tenantUser.email) { lease.tenant.email = tenantUser.email; changed = true; }
    }

    if (changed) await lease.save();
    res.json({ success: true, lease, changed });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error: ' + (e && e.message ? e.message : 'unknown') });
  }
});

router.put('/:id/landlord-sign', protect, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid agreement id.' });
    }
    const lease = await LeaseAgreement.findById(req.params.id);
    if (!lease) return res.status(404).json({ success: false, message: 'Agreement not found.' });
    if (!isLandlordOf(lease, req.user._id)) return res.status(403).json({ success: false, message: 'Not authorized.' });
    if (lease.status !== 'draft') return res.status(400).json({ success: false, message: 'Agreement is already sent and can no longer be edited.' });

    const { type, data } = req.body;
    if (!type || !['draw', 'type'].includes(type) || !data) {
      return res.status(400).json({ success: false, message: 'Signature type and data are required.' });
    }
    lease.landlordSignature = { type, data, signedAt: new Date() };
    await lease.save();
    res.json({ success: true, lease });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error: ' + (e && e.message ? e.message : 'unknown') });
  }
});

// ─── LANDLORD: send signed agreement to tenant ───
router.put('/:id/send', protect, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid agreement id.' });
    }
    const lease = await LeaseAgreement.findById(req.params.id);
    if (!lease) return res.status(404).json({ success: false, message: 'Agreement not found.' });
    if (!isLandlordOf(lease, req.user._id)) return res.status(403).json({ success: false, message: 'Not authorized.' });
    if (lease.status !== 'draft') return res.status(400).json({ success: false, message: 'Agreement was already sent.' });
    if (!lease.landlordSignature || !lease.landlordSignature.data) {
      return res.status(400).json({ success: false, message: 'Please sign the agreement before sending it to the tenant.' });
    }
    if (!String(lease.landlord.cnic || '').trim() || !String(lease.tenant.cnic || '').trim()) {
      return res.status(400).json({ success: false, message: 'Landlord and tenant CNIC are required before sending this agreement.' });
    }
    if (!lease.startDate || !lease.endDate) {
      return res.status(400).json({ success: false, message: 'Please set the agreement start and end dates before sending it to the tenant.' });
    }
    const wasAmended = lease.editHistory && lease.editHistory.length > 0;
    lease.status = 'sent';
    lease.sentAt = new Date();
    await lease.save();

    try {
      await Notification.create({
        title: wasAmended ? 'Tenancy agreement updated' : 'Tenancy agreement ready to sign',
        message: wasAmended
          ? `Your landlord (${lease.landlord.name}) has updated your tenancy agreement for ${lease.property.title}. Please review the changes and sign again.`
          : `Your landlord (${lease.landlord.name}) has sent you the tenancy agreement for ${lease.property.title}. Please review and sign it.`,
        color: wasAmended ? 'gold' : 'blue',
        fromName: lease.landlord.name,
        fromEmail: lease.landlord.email,
        fromRole: 'landlord',
        to: [lease.tenant.email].filter(Boolean),
        toLabel: `${lease.tenant.name} (Tenant)`
      });
    } catch (notifErr) {
      console.error('Lease notification failed:', notifErr.message);
    }

    res.json({ success: true, message: 'Agreement sent to tenant.', lease });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error: ' + (e && e.message ? e.message : 'unknown') });
  }
});

// ─── TENANT: sign the agreement -> locks it forever ───
router.put('/:id/tenant-sign', protect, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid agreement id.' });
    }
    const lease = await LeaseAgreement.findById(req.params.id);
    if (!lease) return res.status(404).json({ success: false, message: 'Agreement not found.' });
    if (!isTenantOf(lease, req.user._id)) return res.status(403).json({ success: false, message: 'Not authorized.' });
    if (lease.status !== 'sent') {
      return res.status(400).json({ success: false, message: 'This agreement is not ready to be signed yet.' });
    }
    const { type, data } = req.body;
    if (!type || !['draw', 'type'].includes(type) || !data) {
      return res.status(400).json({ success: false, message: 'Signature type and data are required.' });
    }
    lease.tenantSignature = { type, data, signedAt: new Date() };
    lease.status = 'signed';
    lease.signedAt = new Date();
    await lease.save();
    res.json({ success: true, message: 'Agreement signed and locked.', lease });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error: ' + (e && e.message ? e.message : 'unknown') });
  }
});

// ─── LANDLORD: unlock a signed agreement to revise it ───
// Refreshes landlord/tenant CNIC, phone, email from their current profiles
// (useful when the agreement was created before a CNIC was added), clears
// both signatures, and reverts status to 'draft' so it can be edited again.
// The revision is logged in editHistory so the tenant always sees it was changed.
router.put('/:id/unlock', protect, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid agreement id.' });
    }
    const lease = await LeaseAgreement.findById(req.params.id);
    if (!lease) return res.status(404).json({ success: false, message: 'Agreement not found.' });
    if (!isLandlordOf(lease, req.user._id)) return res.status(403).json({ success: false, message: 'Not authorized.' });
    if (lease.status !== 'signed') {
      return res.status(400).json({ success: false, message: 'Only a fully signed and locked agreement can be unlocked for editing.' });
    }

    // Capture the exact signed copy before refreshing profile details or
    // clearing signatures. This also works for agreements created earlier,
    // before agreementVersions existed in the schema.
    const signedSnapshot = agreementSnapshot(lease);
    if (!Array.isArray(lease.editHistory)) lease.editHistory = [];
    if (!Array.isArray(lease.agreementVersions)) lease.agreementVersions = [];

    const landlordUser = await User.findById(lease.landlordId);
    const tenantUser = await User.findById(lease.tenantId);
    if (landlordUser) {
      lease.landlord = {
        name: landlordUser.name,
        cnic: landlordUser.cnic || '',
        phone: landlordUser.phone || '',
        email: landlordUser.email || ''
      };
    }
    if (tenantUser) {
      lease.tenant = {
        name: tenantUser.name,
        cnic: tenantUser.cnic || '',
        phone: tenantUser.phone || '',
        email: tenantUser.email || ''
      };
    }

    const note = String(req.body?.note || '').trim() || 'Agreement unlocked and revised by landlord.';
    lease.editHistory.push({ at: new Date(), note });
    lease.agreementVersions.push({
      version: (lease.agreementVersions?.length || 0) + 1,
      savedAt: new Date(),
      changedBy: 'landlord',
      changes: [],
      snapshot: signedSnapshot
    });

    lease.landlordSignature = { data: '', signedAt: null };
    lease.tenantSignature = { data: '', signedAt: null };
    lease.status = 'draft';
    lease.sentAt = null;
    lease.signedAt = null;

    await lease.save();
    res.json({ success: true, message: 'Agreement unlocked. Both parties will need to sign again after your changes.', lease });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error: ' + (e && e.message ? e.message : 'unknown') });
  }
});

module.exports = router;
