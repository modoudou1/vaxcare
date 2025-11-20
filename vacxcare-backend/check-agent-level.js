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
  agentLevel: String,
});

const User = mongoose.model('User', userSchema);

async function checkAgentLevel() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connecté à MongoDB');

    const agent = await User.findOne({ email: 'aminagueyesene@gmail.com' }).lean();
    
    if (!agent) {
      console.log('❌ Agent non trouvé');
      return;
    }

    console.log('\n👤 Agent:');
    console.log('Email:', agent.email);
    console.log('Role:', agent.role);
    console.log('HealthCenter:', agent.healthCenter);
    console.log('AgentLevel:', agent.agentLevel || '❌ NON DÉFINI');

    if (!agent.agentLevel || agent.agentLevel !== 'facility_admin') {
      console.log('\n⚠️  PROBLÈME: Cet agent n\'est PAS un facility_admin');
      console.log('💡 Solution: Mettre à jour agentLevel = "facility_admin"');
    } else {
      console.log('\n✅ Cet agent est bien un facility_admin');
    }

    await mongoose.disconnect();
    console.log('\n✅ Déconnecté de MongoDB');
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

checkAgentLevel();
