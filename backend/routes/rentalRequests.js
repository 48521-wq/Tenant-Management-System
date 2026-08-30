const express  = require('express');
const RentalRequest = require('../models/RentalRequest');
const Property = require('../models/Property');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { canCreateFollowUpRequest } = require('../utils/rentalRequestPolicy');
const router = express.Router();

// ─── TENANT: Get all requests by this tenant ───
router.get('/my-requests', protect, async (req, res) => {
  try {
    if (req.user.role !== 'tenant')
      return res.status(403).json({ success: false, message: 'Tenant access required.' });

    const requests = await RentalRequest.find({ tenantId: req.user._id })
      .populate('propertyId')
      .populate('landlordId')
      .sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── TENANT: Submit rental request for a property ───
router.post('/request', protect, async (req, res) => {
  try {
    const { propertyId, message, proposedRent } = req.body;

    // Validate property exists and is available
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }
    if (property.status !== 'available') {
      return res.status(400).json({ success: false, message: 'This property is not available.' });
    }

    const existing = await RentalRequest.findOne({
      tenantId: req.user._id,
      propertyId,
      status: { $in: ['pending', 'negotiating', 'rejected', 'cancelled'] }
    }).sort({ createdAt: -1 });

    console.log('[RentalRequest] submit', {
      userId: req.user._id.toString(),
      propertyId,
      proposedRent,
      existingStatus: existing?.status,
      existingProposedRent: existing?.proposedRent,
      existingId: existing?._id
    });

    if (existing && !canCreateFollowUpRequest(existing, proposedRent)) {
      return res.status(400).json({ success: false, message: 'A higher offer is required to submit another request for this property.' });
    }

    // Get landlord info
    const landlord = await User.findById(property.landlordId);

    // Create rental request
    const rentalRequest = await RentalRequest.create({
      tenantId: req.user._id,
      tenantName: req.user.name,
      tenantEmail: req.user.email,
      tenantPhone: req.user.phone || '',
      propertyId,
      propertyTitle: property.title,
      propertyAddress: property.address,
      propertyRent: property.rent,
      landlordId: property.landlordId,
      landlordName: landlord?.name || 'Unknown',
      landlordEmail: landlord?.email || '',
      message: message || '',
      proposedRent: proposedRent ? Number(proposedRent) : null,
      status: 'pending'
    });

    res.status(201).json({ success: true, message: 'Request sent successfully!', request: rentalRequest });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── LANDLORD: Get all requests for their properties ───
router.get('/received', protect, async (req, res) => {
  try {
    // Get all landlord's properties
    const properties = await Property.find({ landlordId: req.user._id });
    const propertyIds = properties.map(p => p._id);

    // Get all requests for those properties
    const requests = await RentalRequest.find({ propertyId: { $in: propertyIds } })
      .populate('tenantId')
      .populate('propertyId')
      .sort({ createdAt: -1 });

    res.json({ success: true, requests });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── Get a rental request by ID (tenant, landlord, or admin) ───
router.get('/:id', protect, async (req, res) => {
  try {
    const rentalRequest = await RentalRequest.findById(req.params.id)
      .populate('tenantId')
      .populate('landlordId')
      .populate('propertyId');
    if (!rentalRequest) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const landlordOwnerId = rentalRequest.landlordId && rentalRequest.landlordId._id
      ? rentalRequest.landlordId._id.toString()
      : String(rentalRequest.landlordId);
    const tenantOwnerId = rentalRequest.tenantId && rentalRequest.tenantId._id
      ? rentalRequest.tenantId._id.toString()
      : String(rentalRequest.tenantId);
    const propertyOwnerId = rentalRequest.propertyId && rentalRequest.propertyId.landlordId
      ? String(rentalRequest.propertyId.landlordId)
      : null;
    const isOwner = landlordOwnerId === String(req.user._id);
    const isPropertyOwner = propertyOwnerId === String(req.user._id);
    const isTenant = tenantOwnerId === String(req.user._id);
    const isAdmin = req.user.isAdmin || req.user.role === 'admin';
    if (!isOwner && !isPropertyOwner && !isTenant && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    res.json({ success: true, request: rentalRequest });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── LANDLORD: Accept rental request ───
router.put('/:id/accept', protect, async (req, res) => {
  try {
    const rentalRequest = await RentalRequest.findById(req.params.id);
    if (!rentalRequest) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    // Verify landlord owns this property
    const property = await Property.findById(rentalRequest.propertyId);
    if (property.landlordId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    // Reject all other pending requests for this property
    await RentalRequest.updateMany(
      { propertyId: rentalRequest.propertyId, status: 'pending', _id: { $ne: req.params.id } },
      { status: 'rejected', respondedAt: new Date() }
    );

    // Set docs_pending — 48h deadline, property NOT assigned until docs verified
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + 48);
    rentalRequest.status       = 'docs_pending';
    rentalRequest.respondedAt  = new Date();
    rentalRequest.docsDeadline = deadline;
    await rentalRequest.save();
    res.json({ success: true, message: 'Accepted! Tenant must submit documents within 48 hours.', request: rentalRequest, docsDeadline: deadline });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── LANDLORD: Reject rental request ───
router.put('/:id/reject', protect, async (req, res) => {
  try {
    const rentalRequest = await RentalRequest.findById(req.params.id);
    if (!rentalRequest) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    // Verify landlord owns this property
    const property = await Property.findById(rentalRequest.propertyId);
    if (property.landlordId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    rentalRequest.status = 'rejected';
    rentalRequest.respondedAt = new Date();
    await rentalRequest.save();

    res.json({ success: true, message: 'Request rejected.', request: rentalRequest });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── TENANT: Cancel their own request ───
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const rentalRequest = await RentalRequest.findById(req.params.id);
    if (!rentalRequest) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    if (rentalRequest.tenantId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    rentalRequest.status = 'cancelled';
    await rentalRequest.save();

    res.json({ success: true, message: 'Request cancelled.', request: rentalRequest });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── ADMIN: Get all requests (admin only) ───
router.get('/', protect, async (req, res) => {
  try {
    if (!req.user.isAdmin && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    const requests = await RentalRequest.find()
      .populate('tenantId')
      .populate('landlordId')
      .populate('propertyId')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: requests.length, requests });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});


// ── TENANT: Submit documents ──
router.put('/:id/submit-docs', protect, async (req, res) => {
  try {
    const r = await RentalRequest.findById(req.params.id);
    if (!r) return res.status(404).json({ success:false, message:'Not found.' });
    if (r.tenantId.toString() !== req.user._id.toString())
      return res.status(403).json({ success:false, message:'Not authorized.' });
    const allowedStatuses = ['pending','negotiating','docs_pending','docs_rejected'];
    if (!allowedStatuses.includes(r.status))
      return res.status(400).json({ success:false, message:'Documents cannot be uploaded at this stage.' });
    if (r.docsDeadline && new Date() > new Date(r.docsDeadline)) {
      r.status = 'docs_expired';
      await r.save();
      return res.status(400).json({ success:false, message:'48-hour deadline passed. Property is no longer reserved.' });
    }
    const { idCard, policeCert } = req.body;
    if (!idCard || !policeCert)
      return res.status(400).json({ success:false, message:'Tamam 2 documents required: ID Card, Police Certificate.' });
    r.documents = { idCard, policeCert, submittedAt: new Date() };
    r.status = 'docs_submitted';
    r.docsRejectReason = '';
    await r.save();
    res.json({ success:true, message:'Documents submitted! Landlord/Admin will verify.', request: r });
  } catch(e) { console.error(e); res.status(500).json({ success:false, message:'Server error.' }); }
});

// ── LANDLORD or ADMIN: Verify docs ──
router.put('/:id/verify-docs', protect, async (req, res) => {
  try {
    const r = await RentalRequest.findById(req.params.id);
    if (!r) return res.status(404).json({ success:false, message:'Not found.' });
    const property = await Property.findById(r.propertyId);
    const isLandlord = property && property.landlordId.toString() === req.user._id.toString();
    const isAdmin = req.user.isAdmin || req.user.role === 'admin';
    if (!isLandlord && !isAdmin)
      return res.status(403).json({ success:false, message:'Not authorized.' });
    if (r.status !== 'docs_submitted')
      return res.status(400).json({ success:false, message:'No submitted documents.' });

    const { action, rejectReason } = req.body;

    if (action === 'reject') {
      r.status = 'docs_rejected';
      r.docsRejectReason = rejectReason || 'Documents rejected.';
      await r.save();
      return res.json({ success:true, message:'Documents rejected.', request: r });
    }

    // APPROVE — finalize rental
    r.status = 'accepted';
    r.docsRejectReason = '';
    await r.save();
    await Property.findByIdAndUpdate(r.propertyId, {
      tenantId: r.tenantId, tenantName: r.tenantName, status: 'rented'
    });
    res.json({ success:true, message:'Documents approved! Tenant onboarded.', request: r });
  } catch(e) { console.error(e); res.status(500).json({ success:false, message:'Server error.' }); }
});

// ── ADMIN: Get all pending doc submissions ──
router.get('/admin/docs-review', protect, async (req, res) => {
  try {
    if (!req.user.isAdmin && req.user.role !== 'admin')
      return res.status(403).json({ success:false, message:'Admin only.' });
    const requests = await RentalRequest.find({
      status: { $in: ['docs_submitted','docs_pending','docs_rejected','docs_expired'] }
    }).sort({ updatedAt: -1 });
    res.json({ success:true, requests });
  } catch(e) { res.status(500).json({ success:false, message:'Server error.' }); }
});

module.exports = router;

// ─── TENANT: Start negotiation (propose a rent) ───
router.put('/:id/negotiate', protect, async (req, res) => {
  try {
    const rentalRequest = await RentalRequest.findById(req.params.id);
    if (!rentalRequest) return res.status(404).json({ success: false, message: 'Request not found.' });
    if (rentalRequest.tenantId.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    if (!['pending', 'negotiating'].includes(rentalRequest.status))
      return res.status(400).json({ success: false, message: 'Cannot negotiate at this stage.' });

    const { proposedRent, text } = req.body;
    rentalRequest.status = 'negotiating';
    rentalRequest.proposedRent = proposedRent || rentalRequest.proposedRent;
    rentalRequest.negotiationMessages.push({
      senderId:   req.user._id,
      senderName: req.user.name,
      senderRole: 'tenant',
      text: text || '',
      proposedRent: proposedRent || null,
      sentAt: new Date()
    });
    await rentalRequest.save();
    res.json({ success: true, message: 'Negotiation message sent.', request: rentalRequest });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── LANDLORD: Respond to negotiation ───
router.put('/:id/negotiate-reply', protect, async (req, res) => {
  try {
    const rentalRequest = await RentalRequest.findById(req.params.id);
    if (!rentalRequest) return res.status(404).json({ success: false, message: 'Request not found.' });

    // Verify landlord owns this property
    const property = await Property.findById(rentalRequest.propertyId);
    if (!property || property.landlordId.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized.' });

    const { text, counterRent, action } = req.body;

    if (action === 'accept') {
      // Accept the proposed rent, but require tenant documents before final approval
      rentalRequest.status = 'docs_pending';
      rentalRequest.agreedRent = rentalRequest.proposedRent;
      rentalRequest.respondedAt = new Date();
      const deadline = new Date();
      deadline.setHours(deadline.getHours() + 48);
      rentalRequest.docsDeadline = deadline;
      await RentalRequest.updateMany(
        { propertyId: rentalRequest.propertyId, status: 'pending', _id: { $ne: rentalRequest._id } },
        { status: 'rejected', respondedAt: new Date() }
      );
      rentalRequest.negotiationMessages.push({
        senderId:   req.user._id,
        senderName: req.user.name,
        senderRole: 'landlord',
        text: text || 'Offer accepted! Tenant must submit documents within 48 hours.',
        sentAt: new Date()
      });
    } else if (action === 'reject') {
      rentalRequest.status = 'rejected';
      rentalRequest.respondedAt = new Date();
      rentalRequest.negotiationMessages.push({
        senderId:   req.user._id,
        senderName: req.user.name,
        senderRole: 'landlord',
        text: text || 'Sorry, we cannot proceed.',
        sentAt: new Date()
      });
    } else {
      // Counter offer
      rentalRequest.status = 'negotiating';
      if (counterRent) rentalRequest.proposedRent = counterRent;
      rentalRequest.negotiationMessages.push({
        senderId:   req.user._id,
        senderName: req.user.name,
        senderRole: 'landlord',
        text: text || '',
        proposedRent: counterRent || null,
        sentAt: new Date()
      });
    }

    await rentalRequest.save();
    res.json({ success: true, message: 'Reply sent.', request: rentalRequest });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error.' }); }
});

// ─── GET negotiation messages for a request ───
router.get('/:id/negotiation', protect, async (req, res) => {
  try {
    const rentalRequest = await RentalRequest.findById(req.params.id);
    if (!rentalRequest) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, request: rentalRequest });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});
