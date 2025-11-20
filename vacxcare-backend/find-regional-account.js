/**
 * 🔍 Script pour trouver un compte régional de Dakar
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://admin:Vacxcare2025!@vacxcare-cluster.o3mdntc.mongodb.net/?retryWrites=true&w=majority&appName=vacxcare-cluster";

async function findRegionalAccount() {
  try {
    console.log('🔗 Connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté\n');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

    // Chercher un compte régional de Dakar
    console.log('🔍 Recherche d\'un compte régional de Dakar...');
    const regional = await User.findOne({
      role: "regional",
      region: "Dakar"
    });

    if (regional) {
      console.log('✅ Compte régional trouvé:');
      console.log(`   Email: ${regional.email}`);
      console.log(`   Rôle: ${regional.role}`);
      console.log(`   Région: ${regional.region}`);
      console.log(`   ID: ${regional._id}\n`);
    } else {
      console.log('❌ Aucun compte régional trouvé pour Dakar\n');
      
      // Lister tous les régionaux
      console.log('📋 Liste de tous les comptes régionaux:');
      const allRegionals = await User.find({ role: "regional" });
      
      if (allRegionals.length === 0) {
        console.log('   Aucun compte régional dans la base\n');
      } else {
        allRegionals.forEach((r, i) => {
          console.log(`   ${i + 1}. ${r.email} - Région: ${r.region || 'N/A'}`);
        });
      }
    }

    // Chercher tous les districts
    console.log('\n🏘️ Districts existants:');
    const districts = await User.find({ role: "district" });
    console.log(`   Total: ${districts.length}`);
    districts.forEach((d, i) => {
      console.log(`   ${i + 1}. ${d.email} - ${d.healthCenter || 'N/A'} (${d.region})`);
    });

    // Chercher tous les agents
    console.log('\n👥 Agents existants:');
    const agents = await User.find({ role: "agent" });
    console.log(`   Total: ${agents.length}`);
    agents.forEach((a, i) => {
      console.log(`   ${i + 1}. ${a.email} - ${a.healthCenter || 'N/A'} (${a.region})`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Déconnecté');
  }
}

findRegionalAccount();
