/**
 * 📋 Lister tous les districts
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://admin:Vacxcare2025!@vacxcare-cluster.o3mdntc.mongodb.net/?retryWrites=true&w=majority&appName=vacxcare-cluster";

async function listDistricts() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté\n');

    const User = mongoose.model('User', new mongoose.Schema({}, {strict: false}));

    const districts = await User.find({ role: "district" });

    console.log(`🏘️  Total districts: ${districts.length}\n`);

    districts.forEach((d, i) => {
      console.log(`${i + 1}. ${d.email}`);
      console.log(`   HealthCenter: ${d.healthCenter}`);
      console.log(`   Region: ${d.region}`);
      console.log(`   ID: ${d._id}`);
      console.log('');
    });

    // Lister les centres qui N'ONT PAS de district
    const HealthCenter = mongoose.model('HealthCenter', new mongoose.Schema({}, {strict: false}));
    const allCenters = await HealthCenter.find({ region: 'Dakar', type: 'district' });
    const centersWithDistrict = districts.map(d => d.healthCenter);
    const centersWithoutDistrict = allCenters.filter(c => !centersWithDistrict.includes(c.name));

    console.log('✅ Centres SANS district à Dakar:');
    centersWithoutDistrict.forEach(c => console.log(`   - ${c.name}`));

    if (centersWithoutDistrict.length === 0) {
      console.log('   ⚠️  Tous les centres de type "district" ont déjà un district assigné');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

listDistricts();
