const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  role: String,
  region: String,
  healthCenter: String,
  active: Boolean,
  firstName: String,
  lastName: String,
  phone: String,
});

const User = mongoose.model('User', userSchema);

async function createSecondAgent() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connecté à MongoDB');

    // Vérifier si l'agent existe déjà
    const existing = await User.findOne({ email: 'fatou.sall@vacxcare.sn' });
    if (existing) {
      console.log('⚠️  Agent déjà existant');
      await mongoose.disconnect();
      return;
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash('Password123!', 12);

    // Créer le deuxième agent
    const newAgent = await User.create({
      email: 'fatou.sall@vacxcare.sn',
      password: hashedPassword,
      role: 'agent',
      region: 'Dakar',
      healthCenter: 'Centre de sante medina', // Même centre que l'autre agent
      active: true,
      firstName: 'Fatou',
      lastName: 'Sall',
      phone: '+221771234567',
    });

    console.log('\n✅ Deuxième agent créé avec succès !');
    console.log('Email:', newAgent.email);
    console.log('Mot de passe: Password123!');
    console.log('HealthCenter:', newAgent.healthCenter);
    console.log('\n💡 Maintenant, l\'agent aminagueyesene@gmail.com peut transférer des stocks à Fatou Sall');

    await mongoose.disconnect();
    console.log('\n✅ Déconnecté de MongoDB');
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

createSecondAgent();
