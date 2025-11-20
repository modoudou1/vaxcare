/**
 * 🔄 SCRIPT DE MIGRATION : agentLevel:"district" → role:"district"
 * 
 * Ce script convertit les anciens comptes avec agentLevel="district"
 * vers le nouveau système où district est un rôle à part entière.
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://admin:Vacxcare2025!@vacxcare-cluster.o3mdntc.mongodb.net/?retryWrites=true&w=majority&appName=vacxcare-cluster";

async function migrateDistrictRole() {
  try {
    console.log('🔗 Connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB\n');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

    // 🔍 Étape 1 : Trouver tous les comptes avec agentLevel="district"
    console.log('🔍 Recherche des comptes avec agentLevel="district"...');
    const districtAccounts = await User.find({
      agentLevel: "district",
      role: { $ne: "district" } // Pas déjà migré
    });

    console.log(`📊 Trouvé ${districtAccounts.length} compte(s) à migrer\n`);

    if (districtAccounts.length === 0) {
      console.log('✅ Aucune migration nécessaire !');
      return;
    }

    // 📋 Afficher les comptes à migrer
    console.log('📋 Comptes à migrer:');
    districtAccounts.forEach((account, index) => {
      console.log(`  ${index + 1}. ${account.email}`);
      console.log(`     - Rôle actuel: ${account.role}`);
      console.log(`     - AgentLevel: ${account.agentLevel}`);
      console.log(`     - Région: ${account.region || 'N/A'}`);
      console.log(`     - HealthCenter: ${account.healthCenter || 'N/A'}`);
      console.log('');
    });

    // 🔄 Étape 2 : Migration
    console.log('🔄 Démarrage de la migration...\n');
    
    let successCount = 0;
    let errorCount = 0;

    for (const account of districtAccounts) {
      try {
        const oldData = {
          email: account.email,
          role: account.role,
          agentLevel: account.agentLevel
        };

        // Mise à jour : role → "district", agentLevel → undefined
        account.role = "district";
        account.agentLevel = undefined;

        await account.save();

        console.log(`✅ Migré: ${account.email}`);
        console.log(`   Ancien: role="${oldData.role}", agentLevel="${oldData.agentLevel}"`);
        console.log(`   Nouveau: role="district", agentLevel=undefined\n`);

        successCount++;
      } catch (err) {
        console.error(`❌ Erreur migration ${account.email}:`, err.message);
        errorCount++;
      }
    }

    // 📊 Résumé
    console.log('\n' + '='.repeat(50));
    console.log('📊 RÉSUMÉ DE LA MIGRATION');
    console.log('='.repeat(50));
    console.log(`✅ Réussis: ${successCount}`);
    console.log(`❌ Échecs: ${errorCount}`);
    console.log(`📋 Total: ${districtAccounts.length}`);
    console.log('='.repeat(50) + '\n');

    // 🔍 Étape 3 : Vérification
    console.log('🔍 Vérification post-migration...');
    const districtRoleAccounts = await User.find({ role: "district" });
    console.log(`✅ ${districtRoleAccounts.length} compte(s) avec role="district"`);
    
    districtRoleAccounts.forEach((account, index) => {
      console.log(`  ${index + 1}. ${account.email} (région: ${account.region || 'N/A'})`);
    });

    console.log('\n✅ Migration terminée avec succès !');

  } catch (error) {
    console.error('\n❌ Erreur durant la migration:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Déconnecté de MongoDB');
  }
}

// Exécution
migrateDistrictRole()
  .then(() => {
    console.log('\n🎉 Script terminé !');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n💥 Script échoué:', err);
    process.exit(1);
  });
