// seed-agral.js
// Run: node seed-agral.js
// Ye script Agral property MongoDB mein add karti hai (landlord ke account mein)

require('dotenv').config();
const mongoose = require('mongoose');
const Property = require('./models/Property');
const User = require('./models/User');

async function seedAgral() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    // Pehla landlord find karo
    const landlord = await User.findOne({ role: 'landlord' });
    if (!landlord) {
      console.log('⚠️  No landlord found. Register a landlord before running this script.');
      process.exit(1);
    }
    console.log(`🏠 Landlord mila: ${landlord.name} (${landlord._id})`);

    // Check: Agral property pehle se exist karta hai?
    const existing = await Property.findOne({ title: /Agral/i });
    if (existing) {
      console.log('ℹ️  Agral property pehle se exist karti hai (ID:', existing._id, ')');
      process.exit(0);
    }

    const agral = await Property.create({
      title:       'Agral Heights — 2 Bed House',
      type:        'House',
      area:        'Agral, Attock',
      address:     'Street 4, Near Main Chowk, Agral, Attock, Punjab',
      city:        'Attock',
      rent:        18000,
      beds:        2,
      baths:       1,
      sqft:        950,
      description: 'Ek saaf suthari 2 kamron aur 1 washroom wali property. Near main chowk Agral. Bijli, pani, gas sab maujood. Family ya couple ke liye mufeed.',
      status:      'available',
      landlordId:  landlord._id,
      landlordName: landlord.name,
      // GLB model: agral-interior.glb use karega
      model3d: {
        houseType:  'standard',
        wallColor:  '#C9A96E',
        roofColor:  '#7A4F2A',
        floorColor: '#D2B48C',
        floors:     1,
        hasGarden:  false,
        hasPool:    false,
        hasGarage:  false,
        customGlb:  'agral-interior.glb'   // custom GLB flag
      }
    });

    console.log('✅ Agral property add ho gai! ID:', agral._id);
    console.log('   Title :', agral.title);
    console.log('   Area  :', agral.area);
    console.log('   Beds  :', agral.beds, '| Baths:', agral.baths);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

seedAgral();
