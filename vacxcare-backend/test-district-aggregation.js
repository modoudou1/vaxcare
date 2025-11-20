/**
 * 🧪 Script de test complet pour diagnostiquer les problèmes d'agrégation district
 * 
 * Ce script va :
 * 1. Vérifier la configuration des centres de santé
 * 2. Vérifier les enfants et leurs associations
 * 3. Tester les requêtes d'agrégation
 * 4. Identifier les problèmes
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connexion MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/vacxcare';

console.log('🔌 Connexion à MongoDB:', MONGO_URI);

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connecté à MongoDB\n');
    runTests();
  })
  .catch(err => {
    console.error('❌ Erreur de connexion:', err);
    process.exit(1);
  });

// Schémas simplifiés pour les tests
const HealthCenterSchema = new mongoose.Schema({}, { strict: false, collection: 'healthcenters' });
const ChildSchema = new mongoose.Schema({}, { strict: false, collection: 'children' });
const VaccinationSchema = new mongoose.Schema({}, { strict: false, collection: 'vaccinations' });
const AppointmentSchema = new mongoose.Schema({}, { strict: false, collection: 'appointments' });
const UserSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });

const HealthCenter = mongoose.model('HealthCenter', HealthCenterSchema);
const Child = mongoose.model('Child', ChildSchema);
const Vaccination = mongoose.model('Vaccination', VaccinationSchema);
const Appointment = mongoose.model('Appointment', AppointmentSchema);
const User = mongoose.model('User', UserSchema);

async function runTests() {
  console.log('='.repeat(80));
  console.log('🔍 TEST 1 : Vérification des centres de santé');
  console.log('='.repeat(80));
  
  // Chercher "Hopital Fann" (le district)
  const hopitalFann = await HealthCenter.findOne({ 
    name: { $regex: /fann/i } 
  }).lean();
  
  console.log('\n📍 Hopital Fann (District):');
  if (hopitalFann) {
    console.log('  - Nom:', hopitalFann.name);
    console.log('  - Type:', hopitalFann.type);
    console.log('  - Région:', hopitalFann.region);
    console.log('  - districtName:', hopitalFann.districtName);
  } else {
    console.log('  ❌ NON TROUVÉ !');
  }
  
  // Chercher "Case de sante medina" (l'acteur de santé)
  const caseMedina = await HealthCenter.findOne({ 
    name: { $regex: /medina/i } 
  }).lean();
  
  console.log('\n📍 Case de santé Medina (Acteur):');
  if (caseMedina) {
    console.log('  - Nom:', caseMedina.name);
    console.log('  - Type:', caseMedina.type);
    console.log('  - Région:', caseMedina.region);
    console.log('  - districtName:', caseMedina.districtName);
    console.log('  - isDistrict:', caseMedina.isDistrict);
    
    if (!caseMedina.districtName) {
      console.log('  ⚠️  PROBLÈME: districtName est vide ou manquant !');
      console.log('  💡 La case de santé devrait avoir districtName = "Hopital Fann"');
    } else if (hopitalFann && caseMedina.districtName !== hopitalFann.name) {
      console.log(`  ⚠️  PROBLÈME: districtName = "${caseMedina.districtName}" ne correspond pas à "${hopitalFann.name}"`);
    } else {
      console.log('  ✅ districtName configuré correctement');
    }
  } else {
    console.log('  ❌ NON TROUVÉ !');
  }
  
  // Chercher tous les centres liés au district
  if (hopitalFann) {
    const linkedCenters = await HealthCenter.find({
      $or: [
        { name: hopitalFann.name, type: 'district' },
        { districtName: hopitalFann.name }
      ]
    }).select('name type districtName').lean();
    
    console.log(`\n📋 Centres liés au district "${hopitalFann.name}":`);
    console.log('  Total:', linkedCenters.length);
    linkedCenters.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.name} (type: ${c.type || 'N/A'}, districtName: ${c.districtName || 'N/A'})`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('🔍 TEST 2 : Vérification des enfants');
  console.log('='.repeat(80));
  
  // Chercher les enfants de la case de santé medina
  if (caseMedina) {
    const childrenCaseMedina = await Child.find({ 
      healthCenter: { $regex: new RegExp(`^${caseMedina.name}$`, 'i') }
    }).select('name healthCenter region district createdAt').lean();
    
    console.log(`\n👶 Enfants créés dans "${caseMedina.name}":`);
    console.log('  Total:', childrenCaseMedina.length);
    
    if (childrenCaseMedina.length === 0) {
      console.log('  ⚠️  Aucun enfant trouvé pour cette case de santé');
    } else {
      childrenCaseMedina.forEach((child, i) => {
        console.log(`\n  ${i + 1}. ${child.name}:`);
        console.log(`     - healthCenter: ${child.healthCenter}`);
        console.log(`     - region: ${child.region}`);
        console.log(`     - district: ${child.district || '❌ MANQUANT'}`);
        console.log(`     - créé le: ${new Date(child.createdAt).toLocaleString('fr-FR')}`);
        
        if (!child.district) {
          console.log('     ⚠️  PROBLÈME: Le champ district est vide !');
          console.log(`     💡 Devrait être: "${hopitalFann?.name}"`);
        }
      });
    }
  }
  
  // Chercher les enfants du district
  if (hopitalFann) {
    const districtName = hopitalFann.name;
    const linkedCenterNames = await HealthCenter.find({
      $or: [
        { name: districtName, type: 'district' },
        { districtName }
      ]
    }).select('name').lean();
    
    const centerNames = linkedCenterNames.map(c => c.name);
    
    console.log(`\n👶 Enfants qui DEVRAIENT être visibles pour le district "${districtName}":`);
    
    const childFilter = {
      $or: [
        { district: districtName },
        { healthCenter: { $in: centerNames } }
      ]
    };
    
    const childrenInDistrict = await Child.find(childFilter)
      .select('name healthCenter region district createdAt')
      .lean();
    
    console.log('  Total:', childrenInDistrict.length);
    
    if (childrenInDistrict.length === 0) {
      console.log('  ❌ PROBLÈME: Aucun enfant trouvé avec ce filtre !');
      console.log('  📊 Requête MongoDB utilisée:');
      console.log(JSON.stringify(childFilter, null, 2));
    } else {
      childrenInDistrict.forEach((child, i) => {
        console.log(`\n  ${i + 1}. ${child.name}:`);
        console.log(`     - healthCenter: ${child.healthCenter}`);
        console.log(`     - district: ${child.district || 'N/A'}`);
        console.log(`     - region: ${child.region}`);
      });
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('🔍 TEST 3 : Vérification des vaccinations');
  console.log('='.repeat(80));
  
  if (caseMedina) {
    const vaccinationsCaseMedina = await Vaccination.find({ 
      healthCenter: { $regex: new RegExp(`^${caseMedina.name}$`, 'i') }
    }).select('healthCenter region district status createdAt').lean();
    
    console.log(`\n💉 Vaccinations créées dans "${caseMedina.name}":`);
    console.log('  Total:', vaccinationsCaseMedina.length);
    
    if (vaccinationsCaseMedina.length > 0) {
      vaccinationsCaseMedina.forEach((v, i) => {
        console.log(`\n  ${i + 1}. Vaccination:`);
        console.log(`     - healthCenter: ${v.healthCenter}`);
        console.log(`     - region: ${v.region}`);
        console.log(`     - district: ${v.district || '❌ MANQUANT'}`);
        console.log(`     - status: ${v.status}`);
        
        if (!v.district) {
          console.log('     ⚠️  PROBLÈME: Le champ district est vide !');
        }
      });
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('🔍 TEST 4 : Vérification des comptes utilisateurs');
  console.log('='.repeat(80));
  
  // Compte du district
  if (hopitalFann) {
    const districtUser = await User.findOne({ 
      healthCenter: hopitalFann.name 
    }).select('email firstName lastName role agentLevel healthCenter region').lean();
    
    console.log(`\n👤 Compte agent district "${hopitalFann.name}":`);
    if (districtUser) {
      console.log('  - Email:', districtUser.email);
      console.log('  - Nom:', districtUser.firstName, districtUser.lastName);
      console.log('  - Role:', districtUser.role);
      console.log('  - agentLevel:', districtUser.agentLevel);
      console.log('  - healthCenter:', districtUser.healthCenter);
      console.log('  - region:', districtUser.region);
    } else {
      console.log('  ❌ NON TROUVÉ !');
    }
  }
  
  // Compte de la case de santé
  if (caseMedina) {
    const caseUser = await User.findOne({ 
      healthCenter: caseMedina.name 
    }).select('email firstName lastName role agentLevel healthCenter region').lean();
    
    console.log(`\n👤 Compte agent case de santé "${caseMedina.name}":`);
    if (caseUser) {
      console.log('  - Email:', caseUser.email);
      console.log('  - Nom:', caseUser.firstName, caseUser.lastName);
      console.log('  - Role:', caseUser.role);
      console.log('  - agentLevel:', caseUser.agentLevel);
      console.log('  - healthCenter:', caseUser.healthCenter);
      console.log('  - region:', caseUser.region);
    } else {
      console.log('  ❌ NON TROUVÉ !');
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 RÉSUMÉ DES PROBLÈMES DÉTECTÉS');
  console.log('='.repeat(80));
  
  const problems = [];
  
  if (!hopitalFann) {
    problems.push('❌ District "Hopital Fann" non trouvé en base');
  }
  
  if (!caseMedina) {
    problems.push('❌ Case de santé "Medina" non trouvée en base');
  }
  
  if (caseMedina && !caseMedina.districtName) {
    problems.push('❌ La case de santé Medina n\'a pas de districtName configuré');
  }
  
  if (caseMedina && hopitalFann) {
    const childrenCaseMedina = await Child.find({ 
      healthCenter: { $regex: new RegExp(`^${caseMedina.name}$`, 'i') }
    }).lean();
    
    const childrenWithoutDistrict = childrenCaseMedina.filter(c => !c.district);
    if (childrenWithoutDistrict.length > 0) {
      problems.push(`❌ ${childrenWithoutDistrict.length} enfant(s) créé(s) dans la case de santé sans champ district`);
    }
  }
  
  if (problems.length === 0) {
    console.log('\n✅ Aucun problème majeur détecté');
    console.log('💡 Les données semblent correctement configurées');
  } else {
    console.log('\n⚠️  Problèmes détectés:\n');
    problems.forEach((p, i) => {
      console.log(`${i + 1}. ${p}`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('💡 RECOMMANDATIONS');
  console.log('='.repeat(80));
  
  console.log(`
1. Vérifier que la case de santé a bien son districtName configuré
2. Si des enfants existent sans champ district, les mettre à jour
3. S'assurer que tous les nouveaux enfants auront le champ district rempli automatiquement
4. Tester la connexion avec le compte district pour vérifier l'agrégation
  `);
  
  console.log('='.repeat(80));
  console.log('🏁 Tests terminés');
  console.log('='.repeat(80));
  
  await mongoose.disconnect();
  console.log('\n✅ Déconnecté de MongoDB');
  process.exit(0);
}
