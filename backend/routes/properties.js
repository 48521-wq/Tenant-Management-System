
const express  = require('express');
const Property = require('../models/Property');
const RentalRequest = require('../models/RentalRequest');
const { isProfileComplete, profileIncompleteResponse } = require('../utils/profileCompletion');
const { protect, adminOnly } = require('../middleware/auth');
const { parsePropertyNumericFilters } = require('../utils/propertyFilters');
const router = express.Router();

// House View photos: max 4, must be image data URLs (or http/https links)
const MAX_HOUSE_VIEW = 4;
function cleanHouseView(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter(u => typeof u === 'string' && /^(data:image\/(jpeg|jpg|png|webp);base64,|https?:\/\/)/i.test(u) && u.length < 6 * 1024 * 1024)
    .slice(0, MAX_HOUSE_VIEW);
}

// Room-wise House View: [{ label, images[] }] - max 4 photos per room/section
const MAX_PER_ROOM = 4, MAX_ROOMS = 30;
function cleanHouseRooms(list) {
  if (!Array.isArray(list)) return [];
  return list.slice(0, MAX_ROOMS).map(r => ({
    label: String((r && r.label) || '').trim().slice(0, 40),
    images: cleanHouseView(r && r.images).slice(0, MAX_PER_ROOM)
  })).filter(r => r.label && r.images.length);
}
// Applies body.houseViewRooms (if sent) to a plain body/doc: keeps flat houseView + count in sync
function applyHouseRooms(target, rooms) {
  const clean = cleanHouseRooms(rooms);
  target.houseViewRooms = clean;
  target.houseView = clean.reduce((a, r) => a.concat(r.images), []);
  target.houseViewCount = target.houseView.length;
}

// GET all rented properties for this landlord (with tenant info)
router.get('/my/rented', protect, async (req, res) => {
  try {
    // Find all properties for this landlord that are rented and have a tenantId
    const props = await Property.find({ landlordId: req.user._id, status: 'rented', tenantId: { $ne: null } })
      .select('-houseView -houseViewRooms')
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
    const props = await Property.find({ landlordId: req.user._id }).select('-houseView -houseViewRooms')
      .sort({ createdAt: -1 })
      .populate('tenantId', 'name email phone cnic address');
    res.json({ success: true, count: props.length, properties: props });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// GET the authenticated tenant's active rentals
router.get('/my-rentals', protect, async (req, res) => {
  try {
    if (req.user?.role !== 'tenant')
      return res.status(403).json({ success: false, message: 'Tenant access required.' });

    const activeStatus = { $in: ['rented', 'suspended'] };
    const fields = '_id title type area address city rent beds baths sqft status landlordId landlordName tenantId tenantName model3d tenantFurnitureLayout frontImage houseViewCount createdAt';
    const tenantId = String(req.user._id);
    const assignedProperties = await Property.find({
      tenantId: req.user._id,
      status: activeStatus
    })
      .select(fields)
      .sort({ createdAt: -1 });

    const approvedRequests = await RentalRequest.find({
      tenantId: req.user._id,
      status: 'accepted'
    }).select('propertyId').lean();
    const candidatePropertyIds = [...new Set(approvedRequests
      .map(request => String(request.propertyId || ''))
      .filter(id => id && !assignedProperties.some(property => String(property._id) === id)))];

    const propertiesById = new Map(assignedProperties.map(property => [String(property._id), property]));
    if (candidatePropertyIds.length) {
      const latestApprovals = await RentalRequest.find({
        propertyId: { $in: candidatePropertyIds },
        status: 'accepted'
      })
        .select('propertyId tenantId tenantName updatedAt')
        .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
        .lean();
      const latestApprovalByProperty = new Map();
      latestApprovals.forEach(request => {
        const propertyId = String(request.propertyId || '');
        if (propertyId && !latestApprovalByProperty.has(propertyId))
          latestApprovalByProperty.set(propertyId, request);
      });

      const confirmedPropertyIds = [...latestApprovalByProperty]
        .filter(([, request]) => String(request.tenantId) === tenantId)
        .map(([propertyId]) => propertyId);
      if (confirmedPropertyIds.length) {
        const confirmedProperties = await Property.find({
          _id: { $in: confirmedPropertyIds },
          status: activeStatus
        }).select(fields);

        for (const property of confirmedProperties) {
          const propertyId = String(property._id);
          const approval = latestApprovalByProperty.get(propertyId);
          if (!approval || String(approval.tenantId) !== tenantId) continue;

          let currentProperty = property;
          if (String(property.tenantId || '') !== tenantId) {
            const existingTenantName = String(property.tenantName || '').trim().toLowerCase();
            const approvedTenantNames = [approval.tenantName, req.user.name]
              .map(name => String(name || '').trim().toLowerCase())
              .filter(Boolean);
            if (existingTenantName && approvedTenantNames.length &&
                !approvedTenantNames.includes(existingTenantName)) continue;

            currentProperty = await Property.findOneAndUpdate(
              { _id: property._id, tenantId: property.tenantId || null, status: activeStatus },
              {
                tenantId: req.user._id,
                tenantName: approval.tenantName || req.user.name || ''
              },
              { new: true }
            ).select(fields);
            if (!currentProperty) continue;
          }
          propertiesById.set(propertyId, currentProperty);
        }
      }
    }

    const properties = [...propertiesById.values()]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    res.json({ success: true, count: properties.length, properties });
  } catch (e) {
    console.error('GET /properties/my-rentals error', e);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET the property marketplace for tenants.
router.get('/tenant-portfolio', protect, async (req, res) => {
  try {
    if (req.user.role !== 'tenant')
      return res.status(403).json({ success: false, message: 'Tenant access required.' });

    // Tenants browse listings from every landlord, including landlords they have
    // never rented from. Scoping this response to existing rentals hides new
    // properties and makes newly registered landlords invisible.
    const properties = await Property.find({})
      .select('_id title type area address city rent beds baths sqft description status landlordId landlordName tenantId tenantName model3d tenantFurnitureLayout frontImage houseViewCount')
      .sort({ createdAt: -1 });
    const landlordCount = new Set(properties
      .map(property => String(property.landlordId || ''))
      .filter(Boolean)).size;

    res.json({
      success: true,
      count: properties.length,
      scope: 'all',
      landlordCount,
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
    const numericFilters = parsePropertyNumericFilters(req.query);
    if (!numericFilters.valid)
      return res.status(400).json({ success: false, message: `Invalid ${numericFilters.field} filter.` });

    const filter = {};
    if (req.query.status)     filter.status = req.query.status;
    if (req.query.area)       filter.area   = req.query.area;
    if (req.query.type)       filter.type   = req.query.type;
    if (numericFilters.beds !== null) filter.beds = { $gte: numericFilters.beds };
    if (numericFilters.maxRent !== null) filter.rent = { $lte: numericFilters.maxRent };
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
      query = query.select('-houseView -houseViewRooms');
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
    if (!isProfileComplete(req.user)) return profileIncompleteResponse(res, req.user);

    const body = { ...req.body };
    if (body.houseViewRooms !== undefined) applyHouseRooms(body, body.houseViewRooms);
    else if (body.houseView !== undefined) { body.houseView = cleanHouseView(body.houseView); body.houseViewCount = body.houseView.length; }
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
    if (body.houseViewRooms !== undefined) applyHouseRooms(body, body.houseViewRooms);
    else if (body.houseView !== undefined) { body.houseView = cleanHouseView(body.houseView); body.houseViewCount = body.houseView.length; }
    const updated = await Property.findByIdAndUpdate(req.params.id, body, { new: true });
    res.json({ success: true, property: updated });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// GET house view photos of one property (public - only the photos, not the whole document)
router.get('/:id/house-view', async (req, res) => {
  try {
    const prop = await Property.findById(req.params.id).select('title houseView houseViewCount houseViewRooms beds baths dining kitchens lounges guestRooms');
    if (!prop) return res.status(404).json({ success: false, message: 'Property not found.' });
    res.json({ success: true, title: prop.title, spec: { beds: prop.beds, baths: prop.baths, dining: prop.dining, kitchens: prop.kitchens, lounges: prop.lounges, guestRooms: prop.guestRooms }, images: prop.houseView || [], rooms: prop.houseViewRooms || [] });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error.' }); }
});

// PUT save house view photos (landlord/admin) - replaces the whole set.
// Send { rooms: [{label, images[]}] } (max 4 photos per room) - or legacy { images: [] } (max 4 total)
router.put('/:id/house-view', protect, async (req, res) => {
  try {
    const prop = await Property.findById(req.params.id);
    if (!prop) return res.status(404).json({ success: false, message: 'Not found.' });
    if (!req.user?.isAdmin && prop.landlordId.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    if (Array.isArray(req.body && req.body.rooms)) {
      if (req.body.rooms.some(r => Array.isArray(r && r.images) && r.images.length > MAX_PER_ROOM))
        return res.status(400).json({ success: false, message: `You can add at most ${MAX_PER_ROOM} photos per room.` });
      applyHouseRooms(prop, req.body.rooms);
      await prop.save();
      return res.json({ success: true, message: prop.houseViewCount ? 'House view saved.' : 'House view removed.', count: prop.houseViewCount });
    }
    const images = cleanHouseView(req.body && req.body.images);
    if (Array.isArray(req.body && req.body.images) && req.body.images.length > MAX_HOUSE_VIEW)
      return res.status(400).json({ success: false, message: `You can add at most ${MAX_HOUSE_VIEW} photos.` });
    prop.houseView = images;
    prop.houseViewRooms = [];
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
