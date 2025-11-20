/**
 * 🔄 MIGRATION FORCÉE : Convertir mm4669036@gmail.com en role:"district"
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://admin:Vacxcare2025!@vacxcare-cluster.o3mdntc.mongodb.net/?retryWrites=true&w=majority&appName=vacxcare-cluster";

async function forceMigrate() {
  try {
    console.log('🔗 Connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté\n');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

    // Chercher le compte
    const account = await User.findOne({ email: "mm4669036@gmail.com" });

    if (!account) {
      console.log('❌ Compte non trouvé');
      return;
    }

    console.log('📊 AVANT:');
    console.log(`   Role: ${account.role}`);
    console.log(`   AgentLevel: ${account.agentLevel || 'undefined'}`);
    console.log(`   HealthCenter: ${account.healthCenter}`);
    console.log(`   Region: ${account.region}\n`);

    // Migration forcée
    console.log('🔄 Migration en cours...');
    account.role = "district";
    account.agentLevel = undefined;
    await account.save();

    console.log('✅ Migration effectuée !\n');

    // Vérification
    const updated = await User.findOne({ email: "mm4669036@gmail.com" });
    console.log('📊 APRÈS:');
    console.log(`   Role: ${updated.role}`);
    console.log(`   AgentLevel: ${updated.agentLevel || 'undefined'}`);
    console.log(`   HealthCenter: ${updated.healthCenter}`);
    console.log(`   Region: ${updated.region}\n`);

    // Compter les districts
    const districtCount = await User.countDocuments({ role: "district" });
    console.log(`✅ Total districts: ${districtCount}\n`);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Déconnecté');
  }
}

forceMigrate();
