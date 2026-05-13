// ─── model3dRequests Routes ─────────────────────────────────────────────────────────────
const express        = require('express');
const Model3DRequest = require('../models/Model3DRequest');
const Property       = require('../models/Property');
const { protect, adminOnly } = require('../middleware/auth');
const router = express.Router();

// ──────────────────────────────────────────────────────────────
//  LANDLORD: Submit new 3D model request for a property
//  POST /api/3d-requests
// ──────────────────────────────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin)       return res.status(403).json({ success:false, message:'Admin cannot make 3D requests.' });
    if (req.user.role!=='landlord') return res.status(403).json({ success:false, message:'Only landlords can request 3D models.' });

    const { propertyId, requirements } = req.body;
    if (!propertyId) return res.status(400).json({ success:false, message:'propertyId is required.' });

    // Verify property belongs to this landlord
    const prop = await Property.findById(propertyId);
    if (!prop) return res.status(404).json({ success:false, message:'Property not found.' });
    if (prop.landlordId.toString() !== req.user._id.toString())
      return res.status(403).json({ success:false, message:'This property does not belong to you.' });

    // Prevent duplicate pending requests for same property
    const existing = await Model3DRequest.findOne({ propertyId, status:{ $in:['pending','admin_reviewed','negotiating','agreed'] } });
    if (existing) return res.status(400).json({ success:false, message:'An active 3D request already exists for this property.' });

    const request = await Model3DRequest.create({
      propertyId,
      propertyTitle: prop.title,
      landlordId:    req.user._id,
      landlordName:  req.user.name,
      requirements:  requirements || {},
    });

    res.status(201).json({ success:true, request });
  } catch(e) { console.error(e); res.status(500).json({ success:false, message:'Server error.' }); }
});

// ──────────────────────────────────────────────────────────────
//  LANDLORD: Get my 3D requests
//  GET /api/3d-requests/my
// ──────────────────────────────────────────────────────────────
router.get('/my', protect, async (req, res) => {
  try {
    const requests = await Model3DRequest.find({ landlordId: req.user._id }).sort({ createdAt:-1 });
    res.json({ success:true, requests });
  } catch(e) { res.status(500).json({ success:false, message:'Server error.' }); }
});

// ──────────────────────────────────────────────────────────────
//  ADMIN: Get all 3D requests
//  GET /api/3d-requests
// ──────────────────────────────────────────────────────────────
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const requests = await Model3DRequest.find(filter).sort({ createdAt:-1 });
    res.json({ success:true, requests });
  } catch(e) { res.status(500).json({ success:false, message:'Server error.' }); }
});

// ──────────────────────────────────────────────────────────────
//  GET single request (admin or owning landlord)
//  GET /api/3d-requests/:id
// ──────────────────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const request = await Model3DRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success:false, message:'Request not found.' });
    if (!req.user?.isAdmin && request.landlordId.toString() !== req.user._id.toString())
      return res.status(403).json({ success:false, message:'Not authorized.' });
    res.json({ success:true, request });
  } catch(e) { res.status(500).json({ success:false, message:'Server error.' }); }
});

// ──────────────────────────────────────────────────────────────
//  ADMIN: Review request + propose amount
//  PUT /api/3d-requests/:id/review
//  body: { proposedAmount, message }
// ──────────────────────────────────────────────────────────────
router.put('/:id/review', protect, adminOnly, async (req, res) => {
  try {
    const { proposedAmount, message } = req.body;
    if (!proposedAmount) return res.status(400).json({ success:false, message:'proposedAmount is required.' });

    const request = await Model3DRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success:false, message:'Request not found.' });
    if (!['pending','negotiating'].includes(request.status))
      return res.status(400).json({ success:false, message:'Request is not in a reviewable state.' });

    request.proposedAmount = proposedAmount;
    request.status = 'negotiating';
    request.messages.push({
      from: 'admin',
      text: message || `Admin has reviewed your request and proposes Rs. ${proposedAmount} for the 3D model.`,
      amount: proposedAmount,
    });
    await request.save();
    res.json({ success:true, request });
  } catch(e) { console.error(e); res.status(500).json({ success:false, message:'Server error.' }); }
});

// ──────────────────────────────────────────────────────────────
//  LANDLORD: Send message / counter-offer
//  PUT /api/3d-requests/:id/message
//  body: { text, counterAmount (optional) }
// ──────────────────────────────────────────────────────────────
router.put('/:id/message', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin) return res.status(403).json({ success:false, message:'Use /admin-message for admin.' });
    const { text, counterAmount } = req.body;
    if (!text) return res.status(400).json({ success:false, message:'text is required.' });

    const request = await Model3DRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success:false, message:'Request not found.' });
    if (request.landlordId.toString() !== req.user._id.toString())
      return res.status(403).json({ success:false, message:'Not authorized.' });

    if (counterAmount) request.landlordCounter = counterAmount;
    request.messages.push({
      from: 'landlord',
      text,
      amount: counterAmount || null,
    });
    await request.save();
    res.json({ success:true, request });
  } catch(e) { res.status(500).json({ success:false, message:'Server error.' }); }
});

// ──────────────────────────────────────────────────────────────
//  ADMIN: Send message in negotiation
//  PUT /api/3d-requests/:id/admin-message
//  body: { text, proposedAmount (optional) }
// ──────────────────────────────────────────────────────────────
router.put('/:id/admin-message', protect, adminOnly, async (req, res) => {
  try {
    const { text, proposedAmount } = req.body;
    if (!text) return res.status(400).json({ success:false, message:'text is required.' });

    const request = await Model3DRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success:false, message:'Request not found.' });

    if (proposedAmount) request.proposedAmount = proposedAmount;
    request.messages.push({
      from: 'admin',
      text,
      amount: proposedAmount || null,
    });
    await request.save();
    res.json({ success:true, request });
  } catch(e) { res.status(500).json({ success:false, message:'Server error.' }); }
});

// ──────────────────────────────────────────────────────────────
//  LANDLORD: Accept proposed amount → status: agreed
//  PUT /api/3d-requests/:id/accept
//  body: { amount }  (the amount landlord is accepting)
// ──────────────────────────────────────────────────────────────
router.put('/:id/accept', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin) return res.status(403).json({ success:false, message:'Use /finalize for admin.' });
    const request = await Model3DRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success:false, message:'Request not found.' });
    if (request.landlordId.toString() !== req.user._id.toString())
      return res.status(403).json({ success:false, message:'Not authorized.' });
    if (request.status !== 'negotiating')
      return res.status(400).json({ success:false, message:'No active negotiation to accept.' });

    const agreedAmount = req.body.amount || request.proposedAmount;
    request.agreedAmount = agreedAmount;
    request.status = 'agreed';
    request.messages.push({
      from: 'landlord',
      text: `✅ Landlord has accepted the amount of Rs. ${agreedAmount}. Please proceed with the 3D model.`,
      amount: agreedAmount,
    });
    await request.save();
    res.json({ success:true, request });
  } catch(e) { res.status(500).json({ success:false, message:'Server error.' }); }
});

// ──────────────────────────────────────────────────────────────
//  ADMIN: Finalize (agree) amount from admin side
//  PUT /api/3d-requests/:id/finalize
//  body: { agreedAmount }
// ──────────────────────────────────────────────────────────────
router.put('/:id/finalize', protect, adminOnly, async (req, res) => {
  try {
    const { agreedAmount } = req.body;
    if (!agreedAmount) return res.status(400).json({ success:false, message:'agreedAmount is required.' });

    const request = await Model3DRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success:false, message:'Request not found.' });
    if (request.status !== 'negotiating')
      return res.status(400).json({ success:false, message:'Not in negotiating state.' });

    request.agreedAmount = agreedAmount;
    request.status = 'agreed';
    request.messages.push({
      from: 'admin',
      text: `✅ Admin has confirmed the final amount of Rs. ${agreedAmount}. 3D model will be prepared shortly.`,
      amount: agreedAmount,
    });
    await request.save();
    res.json({ success:true, request });
  } catch(e) { res.status(500).json({ success:false, message:'Server error.' }); }
});

// ──────────────────────────────────────────────────────────────
//  ADMIN: Reject request
//  PUT /api/3d-requests/:id/reject
//  body: { reason }
// ──────────────────────────────────────────────────────────────
router.put('/:id/reject', protect, adminOnly, async (req, res) => {
  try {
    const request = await Model3DRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success:false, message:'Request not found.' });

    request.status = 'rejected';
    request.rejectionReason = req.body.reason || 'Request rejected by admin.';
    request.messages.push({
      from: 'admin',
      text: `❌ Request rejected: ${request.rejectionReason}`,
    });
    await request.save();
    res.json({ success:true, request });
  } catch(e) { res.status(500).json({ success:false, message:'Server error.' }); }
});

// ──────────────────────────────────────────────────────────────
//  ADMIN: Complete — attach final 3D model to property
//  PUT /api/3d-requests/:id/complete
//  body: { model3d: { houseType, wallColor, roofColor, floorColor, floors, hasGarden, hasPool, hasGarage } }
// ──────────────────────────────────────────────────────────────
router.put('/:id/complete', protect, adminOnly, async (req, res) => {
  try {
    const { model3d } = req.body;
    if (!model3d) return res.status(400).json({ success:false, message:'model3d config is required.' });

    const request = await Model3DRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success:false, message:'Request not found.' });
    if (request.status !== 'agreed')
      return res.status(400).json({ success:false, message:'Amount must be agreed before completing.' });

    // Save final model config on the request
    request.finalModel3d = model3d;
    request.status = 'completed';
    request.messages.push({
      from: 'admin',
      text: `🎉 3D model has been created and attached to your property! You can now view it in your dashboard.`,
    });
    await request.save();

    // Push the model config to the actual Property document
    const prop = await Property.findById(request.propertyId);
    if (prop) {
      prop.model3d = model3d;
      prop.markModified('model3d');
      await prop.save();
    }

    res.json({ success:true, request });
  } catch(e) { console.error(e); res.status(500).json({ success:false, message:'Server error.' }); }
});

module.exports = router;
