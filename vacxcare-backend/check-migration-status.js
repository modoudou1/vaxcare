/**
 * 🔍 Vérifier le statut du compte mm4669036@gmail.com
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://admin:Vacxcare2025!@vacxcare-cluster.o3mdntc.mongodb.net/?retryWrites=true&w=majority&appName=vacxcare-cluster";

async function checkMigrationStatus() {
  try {
    console.log('🔗 Connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté\n');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

    // Chercher le compte mm4669036@gmail.com
    const account = await User.findOne({ email: "mm4669036@gmail.com" });

    if (account) {
      console.log('📊 Compte mm4669036@gmail.com:');
      console.log(`   Email: ${account.email}`);
      console.log(`   Role: ${account.role}`);
      console.log(`   AgentLevel: ${account.agentLevel || 'undefined'}`);
      console.log(`   HealthCenter: ${account.healthCenter || 'N/A'}`);
      console.log(`   Region: ${account.region || 'N/A'}`);
      console.log(`   Active: ${account.active}`);
      
      if (account.role === 'district') {
        console.log('\n✅ Migration réussie ! Le compte est bien un district.\n');
      } else if (account.role === 'agent' && account.agentLevel === 'district') {
        console.log('\n⚠️ Migration non effectuée ! Le compte est encore agent avec agentLevel:district.\n');
        console.log('💡 Solution: Se connecter avec ce compte pour déclencher la migration auto.\n');
      } else {
        console.log('\n⚠️ Statut inattendu du compte.\n');
      }
    } else {
      console.log('❌ Compte non trouvé\n');
    }

    // Lister tous les comptes par rôle
    console.log('📋 Résumé de tous les comptes:');
    const roleStats = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    roleStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count}`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Déconnecté');
  }
}

checkMigrationStatus();
