/**
 * 🔧 Réinitialiser le mot de passe du compte district
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/vacxcare';

console.log('🔌 Connexion à MongoDB...');

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connecté à MongoDB\n');
    resetPassword();
  })
  .catch(err => {
    console.error('❌ Erreur de connexion:', err);
    process.exit(1);
  });

const UserSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });
const User = mongoose.model('User', UserSchema);

async function resetPassword() {
  console.log('='.repeat(80));
  console.log('🔧 RÉINITIALISATION MOT DE PASSE COMPTE DISTRICT');
  console.log('='.repeat(80));
  
  const DISTRICT_EMAIL = 'mm4669036@gmail.com';
  const NEW_PASSWORD = 'password123';
  
  // Chercher le compte
  const user = await User.findOne({ email: DISTRICT_EMAIL });
  
  if (!user) {
    console.log(`\n❌ Compte ${DISTRICT_EMAIL} non trouvé`);
    await mongoose.disconnect();
    process.exit(1);
  }
  
  console.log('\n✅ Compte trouvé:');
  console.log('   - Email:', user.email);
  console.log('   - Nom:', user.firstName, user.lastName);
  console.log('   - healthCenter:', user.healthCenter);
  
  // Hasher le nouveau mot de passe
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);
  
  // Mettre à jour
  await User.updateOne(
    { email: DISTRICT_EMAIL },
    { $set: { password: hashedPassword } }
  );
  
  console.log('\n✅ Mot de passe réinitialisé avec succès !');
  console.log(`   - Nouveau mot de passe: ${NEW_PASSWORD}`);
  console.log('\n💡 Utilise maintenant pour te connecter:');
  console.log(`   - Email: ${DISTRICT_EMAIL}`);
  console.log(`   - Mot de passe: ${NEW_PASSWORD}`);
  
  console.log('\n' + '='.repeat(80));
  
  // Faire pareil pour le compte case de santé
  console.log('\n🔧 RÉINITIALISATION MOT DE PASSE COMPTE CASE DE SANTÉ');
  console.log('='.repeat(80));
  
  const CASE_EMAIL = 'aminagueyesene@gmail.com';
  
  const caseUser = await User.findOne({ email: CASE_EMAIL });
  
  if (caseUser) {
    console.log('\n✅ Compte trouvé:');
    console.log('   - Email:', caseUser.email);
    console.log('   - Nom:', caseUser.firstName, caseUser.lastName);
    console.log('   - healthCenter:', caseUser.healthCenter);
    
    await User.updateOne(
      { email: CASE_EMAIL },
      { $set: { password: hashedPassword } }
    );
    
    console.log('\n✅ Mot de passe réinitialisé avec succès !');
    console.log(`   - Nouveau mot de passe: ${NEW_PASSWORD}`);
  }
  
  console.log('\n' + '='.repeat(80));
  
  await mongoose.disconnect();
  console.log('\n✅ Déconnecté de MongoDB');
  console.log('\n🚀 Tu peux maintenant relancer les tests avec: ./test-simple.sh');
  process.exit(0);
}
