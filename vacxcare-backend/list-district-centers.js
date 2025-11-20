const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://admin:Vacxcare2025!@vacxcare-cluster.o3mdntc.mongodb.net/?retryWrites=true&w=majority&appName=vacxcare-cluster";

async function listCenters() {
  try {
    await mongoose.connect(MONGODB_URI);
    const HC = mongoose.model('HealthCenter', new mongoose.Schema({}, {strict: false}));
    
    console.log('\n🏥 HealthCenters de type "district" à Dakar:');
    const districts = await HC.find({ region: 'Dakar', type: 'district' });
    districts.forEach(c => console.log(`  - ${c.name}`));
    
    console.log('\n🏥 Tous les HealthCenters à Dakar:');
    const all = await HC.find({ region: 'Dakar' });
    all.forEach(c => console.log(`  - ${c.name} (type: ${c.type || 'N/A'})`));
    
    await mongoose.disconnect();
  } catch (e) {
    console.error('Erreur:', e.message);
  }
}

listCenters();
