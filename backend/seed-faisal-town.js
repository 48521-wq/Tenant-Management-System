// seed-faisal-town.js
// ─────────────────────────────────────────────────────────────────────────────
// Adds ONE property to an existing landlord:
//     "Faisal Town A Block House No 16"
// with 4 House View photos (backend/seed/faisal-town/*.jpg) and the normal
// "Request 360" option, so the landlord can later ask for a 360/3D model too.
// Nothing is deleted or changed. Running it twice does not create a duplicate.
//
//   node seed-faisal-town.js                                  # DRY RUN - shows what would be added
//   node seed-faisal-town.js --confirm                        # add it
//   node seed-faisal-town.js --confirm --landlord-email=a@b.com
//   optional values: --rent=85000 --beds=3 --baths=3 --sqft=2250
//   node seed-faisal-town.js --clear-cover --confirm          # property already added earlier: reset its cover image
//   node seed-faisal-town.js --selftest                       # offline schema check
// ─────────────────────────────────────────────────────────────────────────────
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const User = require('./models/User');
const Property = require('./models/Property');

const args = process.argv.slice(2);
const flag = (n) => args.includes('--' + n);
const val = (n) => { const a = args.find(x => x.startsWith('--' + n + '=')); return a ? a.split('=').slice(1).join('=').trim() : ''; };

const TITLE = 'Faisal Town A Block House No 16';
const DIR = path.join(__dirname, 'seed', 'faisal-town');

function photos() {
  return fs.readdirSync(DIR).filter(f => /\.(jpe?g|png|webp)$/i.test(f)).sort().slice(0, 4)
    .map(f => 'data:image/' + (/png$/i.test(f) ? 'png' : /webp$/i.test(f) ? 'webp' : 'jpeg') + ';base64,' + fs.readFileSync(path.join(DIR, f)).toString('base64'));
}
const COVER = path.join(__dirname, 'seed', 'faisal-town-cover', 'cover.jpg');
function cover() { return fs.existsSync(COVER) ? 'data:image/jpeg;base64,' + fs.readFileSync(COVER).toString('base64') : ''; }
function buildDoc(landlord) {
  const imgs = photos();
  return {
    title: TITLE, type: 'House', area: 'Faisal Town', city: 'Lahore',
    address: 'House No 16, A Block, Faisal Town, Lahore',
    rent: Number(val('rent')) || 85000, beds: Number(val('beds')) || 3, baths: Number(val('baths')) || 3, sqft: Number(val('sqft')) || 2250,
    description: 'Furnished, well-lit house in A Block, Faisal Town with a tiled lounge, wall-mounted TV, false ceiling with LED lighting, ceiling fans and AC. See the House View photos.',
    status: 'available', landlordId: landlord._id, landlordName: landlord.name,
    frontImage: cover(),   // outside-of-the-house cover (illustration) - replace it with a real photo any time via "Change Cover"; the 4 interior photos are the House View
    houseView: imgs, houseViewCount: imgs.length,
  };
}

async function main() {
  if (flag('selftest')) {
    const err = new Property(buildDoc({ _id: new mongoose.Types.ObjectId(), name: 'Test Landlord' })).validateSync();
    const d = buildDoc({ _id: new mongoose.Types.ObjectId(), name: 'x' });
    console.log(err ? 'INVALID: ' + err.message : 'Self-test OK - document is valid', '| photos:', d.houseViewCount, '| size:', Math.round(JSON.stringify(d).length / 1024) + ' KB');
    return;
  }
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) { console.error('MONGODB_URI is not set in backend/.env'); process.exit(1); }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000, family: 4 });
  console.log(`Connected to "${mongoose.connection.name}" on ${mongoose.connection.host}`);
  console.log(flag('confirm') ? 'MODE: LIVE (--confirm)\n' : 'MODE: DRY RUN (add --confirm to apply)\n');

  let landlord;
  const email = val('landlord-email').toLowerCase();
  if (email) landlord = await User.findOne({ email, role: 'landlord' });
  else {
    const owners = await Property.aggregate([{ $group: { _id: '$landlordId', n: { $sum: 1 } } }, { $sort: { n: -1 } }]);
    for (const o of owners) { landlord = await User.findOne({ _id: o._id, role: 'landlord' }); if (landlord) break; }
    const all = await User.find({ role: 'landlord' }).select('name email');
    console.log('Landlords in the system:', all.map(l => `${l.name} <${l.email}>`).join('; ') || 'none');
  }
  if (!landlord) { console.error('No landlord found. Use --landlord-email=<email>'); process.exit(1); }
  console.log(`Landlord that will own the property: ${landlord.name} <${landlord.email}>`);

  const exists = await Property.findOne({ title: TITLE, landlordId: landlord._id }).select('_id');
  if (exists) {
    if (flag('clear-cover') && flag('confirm')) { await Property.updateOne({ _id: exists._id }, { $set: { frontImage: cover() } }); console.log('\nCover image reset to the outside-of-house picture. You can replace it with a real photo from the landlord dashboard (Change Cover).'); }
    else console.log('\nThis property already exists for that landlord - nothing to do. (Use --clear-cover --confirm to reset its cover image.)');
    return mongoose.disconnect();
  }

  const doc = buildDoc(landlord);
  console.log(`\nWill add: "${doc.title}" | ${doc.type} | Rs. ${doc.rent.toLocaleString('en-US')}/mo | ${doc.beds} bed, ${doc.baths} bath, ${doc.sqft} sqft | ${doc.houseViewCount} house-view photos`);
  console.log('(rent, beds, baths and sqft are placeholders - change them with --rent= --beds= --baths= --sqft=)');
  if (!flag('confirm')) { console.log('\nDry run finished. Re-run with --confirm to add it.'); return mongoose.disconnect(); }
  const p = await Property.create(doc);
  console.log('\nDone. Property added with id', String(p._id));
  await mongoose.disconnect();
}
main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
