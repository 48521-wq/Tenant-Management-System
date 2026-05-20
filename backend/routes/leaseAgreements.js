const express = require('express');
const router = express.Router();
const LeaseAgreement = require('../models/LeaseAgreement');
const Property = require('../models/Property');
const User = require('../models/User');

// Create draft agreement (landlord starts)
router.post('/create', async (req, res) => {
  try {
    const agreement = new LeaseAgreement(req.body);
    await agreement.save();
    res.status(201).json(agreement);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Send agreement to tenant (status: sent)
router.post('/:id/send', async (req, res) => {
  try {
    const agreement = await LeaseAgreement.findByIdAndUpdate(
      req.params.id,
      { status: 'sent' },
      { new: true }
    );
    res.json(agreement);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Tenant signs agreement (status: signed, add signature)
router.post('/:id/sign', async (req, res) => {
  try {
    const { tenantSignature } = req.body;
    const agreement = await LeaseAgreement.findById(req.params.id);
    if (!agreement || agreement.status !== 'sent') {
      return res.status(400).json({ error: 'Agreement not available for signing.' });
    }
    agreement.signatures.tenant = tenantSignature;
    agreement.status = 'signed';
    await agreement.save();
    res.json(agreement);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get agreement by property (for landlord/tenant view)
router.get('/property/:propertyId', async (req, res) => {
  try {
    const agreement = await LeaseAgreement.findOne({ property: req.params.propertyId });
    res.json(agreement);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get agreement by id
router.get('/:id', async (req, res) => {
  try {
    const agreement = await LeaseAgreement.findById(req.params.id);
    res.json(agreement);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
