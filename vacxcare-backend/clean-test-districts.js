/**
 * 🧹 Nettoyer les districts de test
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://admin:Vacxcare2025!@vacxcare-cluster.o3mdntc.mongodb.net/?retryWrites=true&w=majority&appName=vacxcare-cluster";

async function cleanTestDistricts() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté\n');

    const User = mongoose.model('User', new mongoose.Schema({}, {strict: false}));

    // Supprimer tous les districts curl de test
    const result = await User.deleteMany({ 
      role: "district",
      email: { $regex: /^district_curl_.*@test\.com$/ }
    });

    console.log(`🗑️  Districts de test supprimés: ${result.deletedCount}`);
    
    // Supprimer aussi les agents de test
    const result2 = await User.deleteMany({ 
      role: "agent",
      email: { $regex: /^agent_curl_.*@test\.com$/ }
    });

    console.log(`🗑️  Agents de test supprimés: ${result2.deletedCount}`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

cleanTestDistricts();
