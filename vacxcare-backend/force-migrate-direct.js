/**
 * 🔄 MIGRATION DIRECTE avec updateOne
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://admin:Vacxcare2025!@vacxcare-cluster.o3mdntc.mongodb.net/?retryWrites=true&w=majority&appName=vacxcare-cluster";

async function forceMigrateDirect() {
  try {
    console.log('🔗 Connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté\n');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

    // AVANT
    const before = await User.findOne({ email: "mm4669036@gmail.com" });
    console.log('📊 AVANT:');
    console.log(`   Role: ${before.role}`);
    console.log(`   AgentLevel: ${before.agentLevel || 'undefined'}\n`);

    // UPDATE DIRECT
    console.log('🔄 Migration directe avec updateOne...');
    const result = await User.updateOne(
      { email: "mm4669036@gmail.com" },
      { 
        $set: { role: "district" },
        $unset: { agentLevel: "" }
      }
    );

    console.log(`✅ Modifié: ${result.modifiedCount} document(s)\n`);

    // APRÈS
    const after = await User.findOne({ email: "mm4669036@gmail.com" });
    console.log('📊 APRÈS:');
    console.log(`   Role: ${after.role}`);
    console.log(`   AgentLevel: ${after.agentLevel || 'undefined'}`);
    console.log(`   HealthCenter: ${after.healthCenter}`);
    console.log(`   Region: ${after.region}\n`);

    // Compter
    const districtCount = await User.countDocuments({ role: "district" });
    console.log(`🏘️ Total districts: ${districtCount}\n`);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Déconnecté');
  }
}

forceMigrateDirect();
