const express     = require('express');
const Maintenance = require('../models/Maintenance');
const { protect, adminOnly } = require('../middleware/auth');

// Router instance for maintenance endpoints
const maintenanceRouter = express.Router();

// GET maintenance requests
maintenanceRouter.get('/', protect, async (req, res) => {
  try {
    let queryFilter = {};
    if (req.user?.isAdmin) {
      if (req.query.status) queryFilter.status = req.query.status;
    } else if (req.user.role === 'tenant') {
      queryFilter.tenantId = req.user._id;
    } else if (req.user.role === 'landlord') {
      queryFilter.landlordId = req.user._id;
    }
    const allRequests = await Maintenance.find(queryFilter).sort({ createdAt: -1 });
    res.json({ success: true, count: allRequests.length, requests: allRequests });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// POST create request (tenant)
maintenanceRouter.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin) return res.status(403).json({ success: false, message: 'Admin cannot submit maintenance.' });
    const { type, priority, description, propertyTitle } = req.body;
    if (!description) return res.status(400).json({ success: false, message: 'Description is required.' });
    const newRequest = await Maintenance.create({
      tenantId:    req.user._id,
      tenantName:  req.user.name,
      type, priority, description, propertyTitle: propertyTitle || '',
    });
    res.status(201).json({ success: true, request: newRequest });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// PUT update status (admin only)
maintenanceRouter.put('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const updateFields = { status };
    if (adminNote) updateFields.adminNote = adminNote;
    if (status === 'resolved') updateFields.resolvedAt = new Date();
    const updatedRequest = await Maintenance.findByIdAndUpdate(req.params.id, updateFields, { new: true });
    if (!updatedRequest) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, request: updatedRequest });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// DELETE (admin)
maintenanceRouter.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Maintenance.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted.' });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = maintenanceRouter;
