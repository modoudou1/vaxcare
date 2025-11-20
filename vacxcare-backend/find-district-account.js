/**
 * 🔍 Trouver le compte du district "Hopital faan"
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/vacxcare';

console.log('🔌 Connexion à MongoDB...');

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connecté à MongoDB\n');
    findDistrictAccount();
  })
  .catch(err => {
    console.error('❌ Erreur de connexion:', err);
    process.exit(1);
  });

const UserSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });
const User = mongoose.model('User', UserSchema);

async function findDistrictAccount() {
  console.log('='.repeat(80));
  console.log('🔍 RECHERCHE DU COMPTE DISTRICT "Hopital faan"');
  console.log('='.repeat(80));
  
  // Chercher le compte avec healthCenter = "Hopital faan"
  const districtUser = await User.findOne({
    healthCenter: { $regex: /faan/i }
  }).lean();
  
  if (districtUser) {
    console.log('\n✅ Compte district trouvé:');
    console.log('   - Email:', districtUser.email);
    console.log('   - Nom:', districtUser.firstName, districtUser.lastName);
    console.log('   - Role:', districtUser.role);
    console.log('   - agentLevel:', districtUser.agentLevel);
    console.log('   - healthCenter:', districtUser.healthCenter);
    console.log('   - region:', districtUser.region);
    console.log('\n💡 Utilise cet email pour les tests curl:');
    console.log(`   EMAIL="${districtUser.email}"`);
  } else {
    console.log('\n❌ Aucun compte trouvé avec healthCenter contenant "faan"');
    console.log('\n🔍 Recherche de tous les comptes "agent"...');
    
    const allAgents = await User.find({ role: 'agent' })
      .select('email firstName lastName healthCenter region agentLevel')
      .lean();
    
    console.log(`\n📋 ${allAgents.length} comptes agents trouvés:\n`);
    allAgents.forEach((agent, i) => {
      console.log(`${i + 1}. ${agent.email}`);
      console.log(`   - Nom: ${agent.firstName} ${agent.lastName}`);
      console.log(`   - Centre: ${agent.healthCenter}`);
      console.log(`   - Région: ${agent.region}`);
      console.log(`   - agentLevel: ${agent.agentLevel || 'N/A'}`);
      console.log('');
    });
  }
  
  console.log('='.repeat(80));
  
  await mongoose.disconnect();
  console.log('✅ Déconnecté de MongoDB\n');
  process.exit(0);
}
