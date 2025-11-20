/**
 * 🧪 Test complet des APIs pour vérifier l'agrégation district
 * 
 * Ce script va tester :
 * 1. L'API dashboard agent district
 * 2. L'API children avec filtre district
 * 3. L'API vaccinations avec filtre district
 * 4. Comparer les résultats attendus vs réels
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000';

// Remplace ces valeurs par les vraies credentials de ton compte district
const DISTRICT_EMAIL = 'hopitalfaan@example.com'; // Email du compte district Hopital faan
const DISTRICT_PASSWORD = 'password123'; // Mot de passe

console.log('🧪 TEST COMPLET DES APIs');
console.log('='.repeat(80));
console.log(`API Base: ${API_BASE}`);
console.log('='.repeat(80));

async function runAPITests() {
  let token = null;
  
  // Test 1: Connexion
  console.log('\n📝 TEST 1: Connexion au compte district...');
  try {
    const loginRes = await axios.post(`${API_BASE}/api/auth/login`, {
      email: DISTRICT_EMAIL,
      password: DISTRICT_PASSWORD
    });
    
    if (loginRes.data.token) {
      token = loginRes.data.token;
      console.log('✅ Connexion réussie');
      console.log('   - Token:', token.substring(0, 20) + '...');
      console.log('   - User:', loginRes.data.user?.email);
      console.log('   - Role:', loginRes.data.user?.role);
      console.log('   - agentLevel:', loginRes.data.user?.agentLevel);
      console.log('   - healthCenter:', loginRes.data.user?.healthCenter);
      console.log('   - region:', loginRes.data.user?.region);
    } else {
      console.log('❌ Pas de token reçu');
      console.log('   Réponse:', JSON.stringify(loginRes.data, null, 2));
      return;
    }
  } catch (err) {
    console.error('❌ Erreur lors de la connexion:');
    if (err.response) {
      console.error('   Status:', err.response.status);
      console.error('   Message:', err.response.data?.message || err.response.data);
    } else {
      console.error('   ', err.message);
    }
    console.log('\n💡 Vérifie que:');
    console.log('   1. Le serveur backend tourne sur le port 5000');
    console.log('   2. L\'email et le mot de passe sont corrects');
    console.log('   3. Le compte district existe bien en base');
    return;
  }
  
  // Test 2: Dashboard agent district
  console.log('\n📊 TEST 2: Dashboard agent district...');
  try {
    const dashboardRes = await axios.get(`${API_BASE}/api/dashboard/agent`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Dashboard récupéré:');
    console.log('   - Total enfants:', dashboardRes.data.totalChildren || 0);
    console.log('   - Rendez-vous aujourd\'hui:', dashboardRes.data.appointmentsToday || 0);
    console.log('   - Vaccinations saisies:', dashboardRes.data.totalVaccinations || 0);
    
    if (dashboardRes.data.totalChildren === 0) {
      console.log('   ⚠️  PROBLÈME: Le dashboard montre 0 enfant');
    } else {
      console.log('   ✅ Le dashboard montre des enfants !');
    }
  } catch (err) {
    console.error('❌ Erreur dashboard:');
    if (err.response) {
      console.error('   Status:', err.response.status);
      console.error('   Message:', err.response.data?.message || err.response.data);
    } else {
      console.error('   ', err.message);
    }
  }
  
  // Test 3: Liste des enfants
  console.log('\n👶 TEST 3: Liste des enfants...');
  try {
    const childrenRes = await axios.get(`${API_BASE}/api/children`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const children = Array.isArray(childrenRes.data) 
      ? childrenRes.data 
      : (childrenRes.data.children || []);
    
    console.log('✅ Enfants récupérés:', children.length);
    
    if (children.length === 0) {
      console.log('   ⚠️  PROBLÈME: Aucun enfant retourné par l\'API');
    } else {
      console.log('   ✅ Enfants trouvés:');
      children.forEach((child, i) => {
        console.log(`   ${i + 1}. ${child.name || child.firstName + ' ' + child.lastName}`);
        console.log(`      - healthCenter: ${child.healthCenter}`);
        console.log(`      - region: ${child.region}`);
        console.log(`      - district: ${child.district || 'N/A'}`);
      });
    }
  } catch (err) {
    console.error('❌ Erreur liste enfants:');
    if (err.response) {
      console.error('   Status:', err.response.status);
      console.error('   Message:', err.response.data?.message || err.response.data);
    } else {
      console.error('   ', err.message);
    }
  }
  
  // Test 4: Liste des vaccinations
  console.log('\n💉 TEST 4: Liste des vaccinations...');
  try {
    const vaccinationsRes = await axios.get(`${API_BASE}/api/vaccinations`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const vaccinations = vaccinationsRes.data || [];
    
    console.log('✅ Vaccinations récupérées:', vaccinations.length);
    
    if (vaccinations.length === 0) {
      console.log('   ⚠️  Aucune vaccination trouvée');
    } else {
      console.log('   ✅ Vaccinations:');
      vaccinations.slice(0, 5).forEach((v, i) => {
        console.log(`   ${i + 1}. ${v.vaccine?.name || 'N/A'}`);
        console.log(`      - healthCenter: ${v.healthCenter}`);
        console.log(`      - region: ${v.region}`);
        console.log(`      - district: ${v.district || 'N/A'}`);
        console.log(`      - status: ${v.status}`);
      });
      if (vaccinations.length > 5) {
        console.log(`   ... et ${vaccinations.length - 5} autres`);
      }
    }
  } catch (err) {
    console.error('❌ Erreur liste vaccinations:');
    if (err.response) {
      console.error('   Status:', err.response.status);
      console.error('   Message:', err.response.data?.message || err.response.data);
    } else {
      console.error('   ', err.message);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 RÉSUMÉ DES TESTS');
  console.log('='.repeat(80));
  console.log(`
✅ Si tous les tests passent, le district devrait voir toutes les données
⚠️  Si certains tests montrent 0, il y a encore un problème d'agrégation
💡 Vérifie les logs du serveur backend pour plus de détails
  `);
}

// Vérifier si le serveur est accessible
async function checkServer() {
  try {
    await axios.get(`${API_BASE}/api/health`);
    console.log('✅ Serveur backend accessible\n');
    return true;
  } catch (err) {
    console.error('❌ Serveur backend inaccessible sur', API_BASE);
    console.log('💡 Lance le serveur avec: cd /Users/macretina/Vacxcare/vacxcare-backend && npm run dev\n');
    return false;
  }
}

(async () => {
  const serverOk = await checkServer();
  if (serverOk) {
    await runAPITests();
  }
})();
