/**
 * 🏥 Créer un nouveau centre de type district pour les tests
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://admin:Vacxcare2025!@vacxcare-cluster.o3mdntc.mongodb.net/?retryWrites=true&w=majority&appName=vacxcare-cluster";

async function createDistrictCenter() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté\n');

    const HealthCenter = mongoose.model('HealthCenter', new mongoose.Schema({}, {strict: false}));

    const newCenter = await HealthCenter.create({
      name: "District Hopital Principal Dakar",
      region: "Dakar",
      type: "district",
      address: "Avenue Blaise Diagne, Dakar",
      commune: "Plateau",
      phone: "+221 33 823 45 67"
    });

    console.log('✅ Nouveau centre district créé:');
    console.log(`   Nom: ${newCenter.name}`);
    console.log(`   Type: ${newCenter.type}`);
    console.log(`   Région: ${newCenter.region}\n`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

createDistrictCenter();
