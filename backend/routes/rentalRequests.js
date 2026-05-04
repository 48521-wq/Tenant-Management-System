// ─── rentalRequests Routes ─────────────────────────────────────────────────────────────
const express  = require('express');
const RentalRequest = require('../models/RentalRequest');
const Property = require('../models/Property');
const Lease = require('../models/Lease');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const router = express.Router();

// ─── TENANT: Get all requests by this tenant ───
router.get('/my-requests', protect, async (req, res) => {
  try {
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
    const { propertyId, message } = req.body;

    // Validate property exists and is available
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }
    if (property.status !== 'available') {
      return res.status(400).json({ success: false, message: 'This property is not available.' });
    }

    // Check if tenant already has pending request for this property
    const existing = await RentalRequest.findOne({
      tenantId: req.user._id,
      propertyId,
      status: 'pending'
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You already have a pending request for this property.' });
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

    // Update this request to accepted
    rentalRequest.status = 'accepted';
    rentalRequest.respondedAt = new Date();
    await rentalRequest.save();

    // Update property - assign tenant and change status to 'rented'
    await Property.findByIdAndUpdate(rentalRequest.propertyId, {
      tenantId: rentalRequest.tenantId,
      tenantName: rentalRequest.tenantName,
      status: 'rented'
    });

    // Automatically create a lease agreement
    // First, remove all old leases for this tenant
    await Lease.deleteMany({
      tenantId: rentalRequest.tenantId,
      status: { $in: ['pending', 'active'] }
    });

    await Lease.create({
      tenantId: rentalRequest.tenantId,
      tenantName: rentalRequest.tenantName,
      tenantEmail: rentalRequest.tenantEmail,
      landlordId: property.landlordId,
      landlordName: property.landlordName || req.user.name,
      propertyId: rentalRequest.propertyId,
      propertyTitle: rentalRequest.propertyTitle,
      propertyAddress: rentalRequest.propertyAddress,
      rent: rentalRequest.propertyRent || property.rent || 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(new Date().getFullYear() + 1, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0],
      duration: '12 months',
      terms: 'Standard rental agreement',
      status: 'active',
      acceptedAt: new Date(),
      signedAt: new Date()
    });

    res.json({ success: true, message: 'Request accepted! Property assigned to tenant. Lease created automatically.', request: rentalRequest });
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

// ─── ADMIN: Get all requests (optional) ───
router.get('/', async (req, res) => {
  try {
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

module.exports = router;
