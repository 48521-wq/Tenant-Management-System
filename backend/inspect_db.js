require('dotenv').config();
const mongoose = require('mongoose');
const uri = process.env.MONGODB_URI;
(async () => {
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const db = mongoose.connection.db;
    const names = ['payments','complaints','maintenances','leases'];
    for (const name of names) {
      const coll = db.collection(name);
      const count = await coll.countDocuments();
      console.log('COLL', name, 'count', count);
      const docs = await coll.find({}).limit(5).toArray();
      console.log('SAMPLE', name, JSON.stringify(docs, null, 2));
    }
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
