// seed-4properties.js
// Run: node seed-4properties.js
// Ye script 4 nayi properties MongoDB mein add karti hai, har ek ka alag Kuula 360 tour hai

require('dotenv').config();
const mongoose = require('mongoose');
const Property = require('./models/Property');
const User     = require('./models/User');

const PANORAMA_URLS = {
  villa:      'https://kuula.co/share/5GssB?logo=1&info=1&fs=1&vr=0&sd=1&thumbs=1',
  apartment:  'https://kuula.co/share/54YJg/collection/7FbtP?logo=1&info=1&fs=1&vr=0&sd=1&thumbs=1',
  flat:       'https://kuula.co/share/5GssB?logo=0&info=1&fs=1&vr=1&sd=1&thumbs=1&zoom=1',
  house:      'https://kuula.co/share/h6VGH?logo=1&info=1&fs=1&vr=0&sd=1&thumbs=1',
};

const PROPERTIES = [
  {
    title:       'Zaman Park Luxury Villa',
    type:        'Villa',
    area:        'Zaman Park',
    address:     'House 12, Zaman Park, Lahore',
    city:        'Lahore',
    rent:        180000,
    beds:        5,
    baths:       4,
    sqft:        4200,
    status:      'available',
    description: 'Ek khoobsurat 5 kamron wali luxury villa. Marble floors, modern kitchen, aur landscaped garden ke saath. Lahore ke behtareen ilaqe Zaman Park mein. Gated community, 24/7 security.',
    model3d: { viewerMode: 'panorama360', panoramaUrl: PANORAMA_URLS.villa },
    images: ['https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1200']
  },
  {
    title:       'DHA Phase 6 Modern Apartment',
    type:        'Apartment',
    area:        'DHA Phase 6',
    address:     'Block L, Street 5, DHA Phase 6, Lahore',
    city:        'Lahore',
    rent:        95000,
    beds:        3,
    baths:       2,
    sqft:        1800,
    status:      'available',
    description: 'Fully furnished 3 bed apartment DHA Phase 6 mein. 24/7 security, backup generator, gym aur covered parking. Stylish modern interior ke saath ready to move in.',
    model3d: { viewerMode: 'panorama360', panoramaUrl: PANORAMA_URLS.apartment },
    images: ['https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=1200']
  },
  {
    title:       'Gulberg III Executive Flat',
    type:        'Flat',
    area:        'Gulberg III',
    address:     'Main Boulevard, Block R3, Gulberg III, Lahore',
    city:        'Lahore',
    rent:        65000,
    beds:        2,
    baths:       2,
    sqft:        1200,
    status:      'available',
    description: 'Khubsoorat 2 bed flat Gulberg ke qalb mein. Restaurants, markets aur hospitals qareeb. Stylish interior, wooden flooring, modern bathrooms.',
    model3d: { viewerMode: 'panorama360', panoramaUrl: PANORAMA_URLS.flat },
    images: ['https://images.pexels.com/photos/2082090/pexels-photo-2082090.jpeg?auto=compress&cs=tinysrgb&w=1200']
  },
  {
    title:       'Bahria Town Family House',
    type:        'House',
    area:        'Bahria Town',
    address:     'Sector C, Street 12, Bahria Town, Lahore',
    city:        'Lahore',
    rent:        55000,
    beds:        3,
    baths:       2,
    sqft:        1400,
    status:      'available',
    description: 'Saaf suthra 5 marla ghar Bahria Town Sector C mein. Gated community, parks, schools aur mosques qareeb. Gas, bijli, pani sab available. Family ke liye ideal.',
    model3d: { viewerMode: 'panorama360', panoramaUrl: PANORAMA_URLS.house },
    images: ['https://images.pexels.com/photos/279746/pexels-photo-279746.jpeg?auto=compress&cs=tinysrgb&w=1200']
  }
];

async function seedProperties() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');

    const landlord = await User.findOne({ role: 'landlord' });
    if (!landlord) {
      console.log('⚠️  Koi landlord nahi mila. Pehle ek landlord register karo phir ye script chalao.');
      process.exit(1);
    }
    console.log(`🏠 Landlord mila: ${landlord.name} (${landlord._id})\n`);

    let added = 0;
    for (const prop of PROPERTIES) {
      const exists = await Property.findOne({ title: prop.title });
      if (exists) {
        const updateData = {};
        if ((!Array.isArray(exists.images) || exists.images.length === 0) && Array.isArray(prop.images) && prop.images.length) {
          updateData.images = prop.images;
        }
        if (Object.keys(updateData).length) {
          await Property.updateOne({ _id: exists._id }, { $set: updateData });
          console.log(`✅ Updated existing property: "${prop.title}"`);
        } else {
          console.log(`ℹ️  Already exists: "${prop.title}" — skip kiya`);
        }
        continue;
      }
      const created = await Property.create({
        ...prop,
        landlordId:   landlord._id,
        landlordName: landlord.name,
      });
      console.log(`✅ Added: "${created.title}"`);
      console.log(`   Type: ${created.type} | Rent: Rs. ${Number(created.rent).toLocaleString()} | Beds: ${created.beds}`);
      console.log(`   360 Tour: ${created.model3d.panoramaUrl}\n`);
      added++;
    }

    console.log(`\n🎉 Complete! ${added} nayi properties add hui.`);
    if (added < PROPERTIES.length) {
      console.log(`ℹ️  ${PROPERTIES.length - added} pehle se exist karti thin — skip ki gayin.`);
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

seedProperties();
