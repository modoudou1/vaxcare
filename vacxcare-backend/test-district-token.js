/**
 * 🔍 Tester le rôle du district dans le JWT
 */

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'vacxcare-secret-2025';

// Remplace par le token du district (depuis localStorage ou cookie)
const TOKEN = process.argv[2];

if (!TOKEN) {
  console.log('❌ Usage: node test-district-token.js <TOKEN>');
  console.log('\nPour obtenir le token :');
  console.log('1. Ouvre la console du navigateur (F12)');
  console.log('2. Tape : localStorage.getItem("token")');
  console.log('3. Copie le token et lance : node test-district-token.js "TON_TOKEN"');
  process.exit(1);
}

try {
  const decoded = jwt.verify(TOKEN, JWT_SECRET);
  console.log('\n📊 Contenu du Token JWT:\n');
  console.log(JSON.stringify(decoded, null, 2));
  
  console.log('\n✅ Rôle dans le token:', decoded.role);
  
  if (decoded.role !== 'district') {
    console.log('\n⚠️ PROBLÈME DÉTECTÉ !');
    console.log(`   Le token contient role="${decoded.role}" au lieu de "district"`);
    console.log('\n💡 Solution:');
    console.log('   1. Déconnecte-toi du frontend');
    console.log('   2. Supprime localStorage : localStorage.clear()');
    console.log('   3. Reconnecte-toi avec mm4669036@gmail.com');
    console.log('   4. Le backend va générer un nouveau token avec role="district"');
  } else {
    console.log('\n✅ Le token est correct !');
    console.log('   Le problème vient d\'ailleurs.');
  }
  
} catch (error) {
  console.error('❌ Erreur de décodage:', error.message);
}
