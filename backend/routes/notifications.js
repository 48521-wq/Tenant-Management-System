const express      = require('express');
const Notification = require('../models/Notification');
const Property      = require('../models/Property');
const User         = require('../models/User');
const { protect }  = require('../middleware/auth');
const router = express.Router();

// Resolve a stable identifier + role for whoever is making the request
// (req.user is either { isAdmin:true, email } or a full Mongoose User doc)
function identity(req) {
  if (req.user?.isAdmin) return { role: 'admin', email: req.user.email || 'admin', name: 'Admin' };
  return { role: req.user.role, email: req.user.email, name: req.user.name || req.user.email };
}

function isForUser(notif, id) {
  const to = (notif.to && notif.to.length) ? notif.to : ['all'];
  if (id.email && notif.fromEmail === id.email) return true;
  if (to.includes('all')) return true;
  if (id.role && to.includes(id.role)) return true;
  if (id.email && to.includes(id.email)) return true;
  return false;
}

// GET /api/notifications — only notifications addressed to the caller
router.get('/', protect, async (req, res) => {
  try {
    const id = identity(req);
    // Pull broadly (all / role / their own email / sent by this user) then filter+shape in JS,
    // since `to` mixes emails and role keywords in the same array.
    const all = await Notification.find({
      $or: [
        { to: 'all' },
        { to: id.role },
        ...(id.email ? [{ to: id.email }, { fromEmail: id.email }] : []),
      ],
    }).sort({ createdAt: -1 }).limit(200);

    const notifications = all
      .filter(n => isForUser(n, id))
      .map(n => ({
        id: n._id,
        title: n.title,
        msg: n.message,
        color: n.color,
        from: n.fromName,
        fromRole: n.fromRole,
        to: n.to,
        toLabel: n.toLabel || (n.to.includes('all') ? 'Everyone' : n.to.join(', ')),
        read: n.readBy.includes(id.email),
        time: n.createdAt,
      }));

    res.json({ success: true, count: notifications.length, notifications });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/notifications/unread-count — cheap badge polling
router.get('/unread-count', protect, async (req, res) => {
  try {
    const id = identity(req);
    const all = await Notification.find({
      $or: [
        { to: 'all' },
        { to: id.role },
        ...(id.email ? [{ to: id.email }, { fromEmail: id.email }] : []),
      ],
    }).select('to readBy fromEmail');
    const unread = all.filter(n => isForUser(n, id) && !n.readBy.includes(id.email)).length;
    res.json({ success: true, unread });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/notifications — send a notification
// - admin: to 'all' / 'tenant' / 'landlord' / 'admin', OR a specific person's email
// - landlord: to 'admin', or a resolved list of tenant emails / 'all'
// - tenant: ONLY to the landlord of a property they are actually renting
//           (server verifies this via the Property record — never trusts a raw email from the client)
router.post('/', protect, async (req, res) => {
  try {
    const id = identity(req);
    const { title, message, color } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required.' });
    }

    let toList = [];
    let toLabel = '';

    if (id.role === 'admin') {
      const { to, specificEmail } = req.body;
      if (to === 'specific') {
        if (!specificEmail) return res.status(400).json({ success: false, message: 'Select a recipient.' });
        const u = await User.findOne({ email: specificEmail });
        toList = [specificEmail];
        toLabel = u ? `${u.name} (${u.role})` : specificEmail;
      } else {
        const labels = { all: 'Everyone', tenant: 'All Tenants', landlord: 'All Landlords', admin: 'Admin' };
        toList = [to || 'all'];
        toLabel = labels[to] || 'Everyone';
      }
    } else if (id.role === 'landlord') {
      const { to, recipients, recipientLabel } = req.body;
      if (to === 'admin') {
        toList = ['admin'];
        toLabel = 'Admin';
      } else {
        if (!Array.isArray(recipients) || !recipients.length) {
          return res.status(400).json({ success: false, message: 'Choose at least one recipient.' });
        }
        toList = recipients;
        toLabel = recipientLabel || (toList.includes('all') ? 'Everyone' : `${toList.length} tenant(s)`);
      }
    } else if (id.role === 'tenant') {
      const { propertyId } = req.body;
      if (!propertyId) {
        return res.status(400).json({ success: false, message: 'Please select a property first.' });
      }
      const property = await Property.findOne({
        _id: propertyId,
        tenantId: req.user._id,
      }).populate('landlordId', 'name email');
      if (!property) {
        return res.status(403).json({ success: false, message: 'You are not renting that property.' });
      }
      const landlord = property.landlordId;
      if (!landlord || !landlord.email) {
        return res.status(400).json({ success: false, message: 'No landlord contact found for that property.' });
      }
      toList = [landlord.email];
      toLabel = `${landlord.name || property.landlordName || 'Landlord'} (Landlord)`;
    }

    const notif = await Notification.create({
      title,
      message,
      color: color || (id.role === 'admin' ? 'red' : id.role === 'landlord' ? 'gold' : 'blue'),
      fromName: id.name,
      fromEmail: id.email,
      fromRole: id.role,
      to: toList,
      toLabel,
    });
    res.status(201).json({ success: true, notification: notif });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PUT /api/notifications/mark-all-read — mark every notif visible to caller as read
router.put('/mark-all-read', protect, async (req, res) => {
  try {
    const id = identity(req);
    if (!id.email) return res.json({ success: true });
    await Notification.updateMany(
      { $or: [{ to: 'all' }, { to: id.role }, { to: id.email }, { fromEmail: id.email }], readBy: { $ne: id.email } },
      { $addToSet: { readBy: id.email } }
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// DELETE /api/notifications/:id — admin cleanup
router.delete('/:id', protect, async (req, res) => {
  try {
    const id = identity(req);
    if (id.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only.' });
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
