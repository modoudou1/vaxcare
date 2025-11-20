/**
 * 🔐 Réinitialiser le mot de passe du régional Dakar
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://admin:Vacxcare2025!@vacxcare-cluster.o3mdntc.mongodb.net/?retryWrites=true&w=majority&appName=vacxcare-cluster";

async function resetPassword() {
  try {
    console.log('🔗 Connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté\n');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

    // Trouver le régional
    const regional = await User.findOne({ 
      role: "regional",
      region: "Dakar"
    });

    if (!regional) {
      console.log('❌ Régional Dakar non trouvé');
      return;
    }

    console.log('👤 Compte trouvé:', regional.email);
    console.log('🔄 Réinitialisation du mot de passe...\n');

    // Hash du nouveau mot de passe
    const newPassword = 'password123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mise à jour
    await User.updateOne(
      { _id: regional._id },
      { $set: { password: hashedPassword } }
    );

    console.log('✅ Mot de passe réinitialisé !');
    console.log(`   Email: ${regional.email}`);
    console.log(`   Mot de passe: ${newPassword}\n`);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Déconnecté');
  }
}

resetPassword();
