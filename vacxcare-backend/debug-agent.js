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

async function checkAgent() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connecté à MongoDB');

    // Trouver tous les agents
    const agents = await User.find({ role: 'agent' }).lean();
    
    console.log(`\n📊 Total agents trouvés: ${agents.length}\n`);
    
    agents.forEach((agent, index) => {
      console.log(`\n--- Agent ${index + 1} ---`);
      console.log('ID:', agent._id);
      console.log('Email:', agent.email);
      console.log('Nom:', agent.firstName, agent.lastName);
      console.log('Role:', agent.role);
      console.log('Region:', agent.region || '❌ NON DÉFINI');
      console.log('HealthCenter:', agent.healthCenter || '❌ NON DÉFINI');
      console.log('Active:', agent.active !== false ? '✅ Oui' : '❌ Non');
    });

    await mongoose.disconnect();
    console.log('\n✅ Déconnecté de MongoDB');
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

checkAgent();
