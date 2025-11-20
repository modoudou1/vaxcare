const mongoose = require('mongoose');
require('dotenv').config();

const userSchema = new mongoose.Schema({
  email: String,
  role: String,
  region: String,
  healthCenter: String,
  active: Boolean,
  firstName: String,
  lastName: String,
});

const User = mongoose.model('User', userSchema);

async function checkTeam() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connecté à MongoDB');

    const agentEmail = 'aminagueyesene@gmail.com';
    const agent = await User.findOne({ email: agentEmail }).lean();
    
    if (!agent) {
      console.log('❌ Agent non trouvé');
      return;
    }

    console.log('\n👤 Agent connecté:');
    console.log('Email:', agent.email);
    console.log('HealthCenter:', agent.healthCenter);
    console.log('Region:', agent.region);

    // Chercher les autres membres de l'équipe
    const teamMembers = await User.find({
      role: 'agent',
      healthCenter: agent.healthCenter,
      _id: { $ne: agent._id }
    }).lean();

    console.log(`\n👥 Membres de l'équipe (même centre): ${teamMembers.length}`);
    
    if (teamMembers.length === 0) {
      console.log('⚠️  AUCUN autre agent dans ce centre !');
      console.log('💡 Solution: Créer un autre agent avec healthCenter = "Centre de sante medina"');
    } else {
      teamMembers.forEach((member, index) => {
        console.log(`\n--- Membre ${index + 1} ---`);
        console.log('Email:', member.email);
        console.log('Nom:', member.firstName, member.lastName);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Déconnecté de MongoDB');
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

checkTeam();
