
const express  = require('express');
const Property = require('../models/Property');
const { protect, adminOnly } = require('../middleware/auth');
const router = express.Router();

// House View photos: max 4, must be image data URLs (or http/https links)
const MAX_HOUSE_VIEW = 4;
function cleanHouseView(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter(u => typeof u === 'string' && /^(data:image\/(jpeg|jpg|png|webp);base64,|https?:\/\/)/i.test(u) && u.length < 6 * 1024 * 1024)
    .slice(0, MAX_HOUSE_VIEW);
}

// GET all rented properties for this landlord (with tenant info)
router.get('/my/rented', protect, async (req, res) => {
  try {
    // Find all properties for this landlord that are rented and have a tenantId
    const props = await Property.find({ landlordId: req.user._id, status: 'rented', tenantId: { $ne: null } })
      .select('-houseView')
      .populate('tenantId', 'name email');
    res.json({ success: true, count: props.length, properties: props });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET landlord's OWN properties (uses JWT — no ID needed in URL)
router.get('/my', protect, async (req, res) => {
  try {
    const props = await Property.find({ landlordId: req.user._id }).select('-houseView')
      .sort({ createdAt: -1 })
      .populate('tenantId', 'name email phone cnic address');
    res.json({ success: true, count: props.length, properties: props });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// GET properties from the landlord(s) renting to this tenant.
router.get('/tenant-portfolio', protect, async (req, res) => {
  try {
    if (req.user.role !== 'tenant')
      return res.status(403).json({ success: false, message: 'Tenant access required.' });

    const rentals = await Property.find({
      tenantId: req.user._id,
      status: { $in: ['rented', 'suspended'] }
    }).select('landlordId').lean();
    const landlordIds = [...new Set(rentals.map(property => String(property.landlordId)))];
    const filter = landlordIds.length ? { landlordId: { $in: landlordIds } } : {};
    const properties = await Property.find(filter)
      .select('_id title type area address city rent beds baths sqft description status landlordName tenantId tenantName model3d tenantFurnitureLayout frontImage houseViewCount')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: properties.length,
      scope: landlordIds.length ? 'landlords' : 'all',
      landlordCount: landlordIds.length,
      properties
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET all properties (public / admin)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status)     filter.status = req.query.status;
    if (req.query.area)       filter.area   = req.query.area;
    if (req.query.type)       filter.type   = req.query.type;
    if (req.query.beds)       filter.beds   = { $gte: Number(req.query.beds) };
    if (req.query.maxRent)    filter.rent   = { $lte: Number(req.query.maxRent) };
    if (req.query.landlordId) {
      const mongoose = require('mongoose');
      try {
        filter.landlordId = new mongoose.Types.ObjectId(req.query.landlordId);
      } catch {
        filter.landlordId = req.query.landlordId;
      }
    }

    let query = Property.find(filter).sort({ createdAt: -1 });
    if (req.query.full === 'true' || req.query.fields === 'all') {
      // Return full document when explicitly requested (photo set is fetched separately via /:id/house-view)
      query = query.select('-houseView');
    } else {
      const defaultFields = [
        '_id', 'title', 'type', 'area', 'address', 'city', 'rent', 'beds', 'baths', 'sqft',
        'description', 'status', 'landlordName', 'tenantId', 'tenantName',
        'model3d', 'tenantFurnitureLayout', 'frontImage', 'houseViewCount', 'createdAt'
      ].join(' ');
      if (req.query.fields) {
        const allowed = req.query.fields.split(',').map(f => f.trim()).filter(Boolean);
        const safe = Array.from(new Set(allowed.concat(['_id']))).join(' ');
        query = query.select(safe);
      } else {
        query = query.select(defaultFields);
      }
    }

    const props = await query;
    res.json({ success: true, count: props.length, properties: props });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error.' }); }
});

// GET single property
router.get('/:id', async (req, res) => {
  try {
    const prop = await Property.findById(req.params.id);
    if (!prop) return res.status(404).json({ success: false, message: 'Property not found.' });
    res.json({ success: true, property: prop });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// POST create property (landlord)
router.post('/', protect, async (req, res) => {
  try {
    if (req.user?.isAdmin) return res.status(403).json({ success: false, message: 'Admin cannot add properties.' });
    if (req.user.role !== 'landlord') return res.status(403).json({ success: false, message: 'Only landlords can add properties.' });

    const body = { ...req.body };
    if (body.houseView !== undefined) { body.houseView = cleanHouseView(body.houseView); body.houseViewCount = body.houseView.length; }
    const prop = await Property.create({
      ...body,
      landlordId:   req.user._id,
      landlordName: req.user.name,
    });
    res.status(201).json({ success: true, property: prop });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error.' }); }
});

// PUT update property
router.put('/:id', protect, async (req, res) => {
  try {
    const prop = await Property.findById(req.params.id);
    if (!prop) return res.status(404).json({ success: false, message: 'Not found.' });
    if (!req.user?.isAdmin && prop.landlordId.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    const body = { ...req.body };
    if (body.houseView !== undefined) { body.houseView = cleanHouseView(body.houseView); body.houseViewCount = body.houseView.length; }
    const updated = await Property.findByIdAndUpdate(req.params.id, body, { new: true });
    res.json({ success: true, property: updated });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// GET house view photos of one property (public - only the photos, not the whole document)
router.get('/:id/house-view', async (req, res) => {
  try {
    const prop = await Property.findById(req.params.id).select('title houseView houseViewCount');
    if (!prop) return res.status(404).json({ success: false, message: 'Property not found.' });
    res.json({ success: true, title: prop.title, images: prop.houseView || [] });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// PUT save house view photos (landlord/admin) - replaces the whole set, max 4 photos
router.put('/:id/house-view', protect, async (req, res) => {
  try {
    const prop = await Property.findById(req.params.id);
    if (!prop) return res.status(404).json({ success: false, message: 'Not found.' });
    if (!req.user?.isAdmin && prop.landlordId.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    const images = cleanHouseView(req.body && req.body.images);
    if (Array.isArray(req.body && req.body.images) && req.body.images.length > MAX_HOUSE_VIEW)
      return res.status(400).json({ success: false, message: `You can add at most ${MAX_HOUSE_VIEW} photos.` });
    prop.houseView = images;
    prop.houseViewCount = images.length;
    await prop.save();
    res.json({ success: true, message: images.length ? 'House view saved.' : 'House view removed.', count: images.length });
  } catch (e) { console.error(e); res.status(500).json({ success: false, message: 'Server error.' }); }
});

// PUT upload front image (base64 data URL)
router.put('/:id/front-image', protect, async (req, res) => {
  try {
    const prop = await Property.findById(req.params.id);
    if (!prop) return res.status(404).json({ success: false, message: 'Not found.' });
    if (prop.landlordId.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    const { frontImage } = req.body;
    if (!frontImage) return res.status(400).json({ success: false, message: 'No image provided.' });
    prop.frontImage = frontImage;
    await prop.save();
    res.json({ success: true, message: 'Front image saved.', property: prop });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// PUT save 3D model config
router.put('/:id/model3d', protect, async (req, res) => {
  try {
    const prop = await Property.findById(req.params.id);
    if (!prop) return res.status(404).json({ success: false, message: 'Not found.' });
    prop.model3d = req.body;
    prop.markModified('model3d');
    await prop.save();
    res.json({ success: true, property: prop });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// PUT save landlord furniture layout
router.put('/:id/furniture/landlord', protect, async (req, res) => {
  try {
    const prop = await Property.findById(req.params.id);
    if (!prop) return res.status(404).json({ success: false, message: 'Not found.' });
    prop.landlordFurnitureLayout = req.body;
    prop.markModified('landlordFurnitureLayout');
    await prop.save();
    res.json({ success: true, property: prop });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// PUT save tenant furniture layout
router.put('/:id/furniture/tenant', protect, async (req, res) => {
  try {
    const prop = await Property.findById(req.params.id);
    if (!prop) return res.status(404).json({ success: false, message: 'Not found.' });
    prop.tenantFurnitureLayout = req.body;
    prop.markModified('tenantFurnitureLayout');
    await prop.save();
    res.json({ success: true, property: prop });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// PUT save furniture layout (legacy)
router.put('/:id/furniture', protect, async (req, res) => {
  try {
    const prop = await Property.findById(req.params.id);
    if (!prop) return res.status(404).json({ success: false, message: 'Not found.' });
    prop.furnitureLayout = req.body;
    prop.markModified('furnitureLayout');
    await prop.save();
    res.json({ success: true, property: prop });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// DELETE property
router.delete('/:id', protect, async (req, res) => {
  try {
    const prop = await Property.findById(req.params.id);
    if (!prop) return res.status(404).json({ success: false, message: 'Not found.' });
    if (!req.user?.isAdmin && prop.landlordId.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    await Property.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Property deleted.' });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = router;
