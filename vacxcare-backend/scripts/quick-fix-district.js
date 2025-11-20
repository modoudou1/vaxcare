/**
 * Script rapide pour corriger le district d'une vaccination spécifique
 * et vérifier/créer le centre de santé
 * 
 * Utilisation :
 * node scripts/quick-fix-district.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vacxcare';

async function quickFix() {
  try {
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté\n');

    const Vaccination = mongoose.model('Vaccination', new mongoose.Schema({}, { strict: false }));
    const HealthCenter = mongoose.model('HealthCenter', new mongoose.Schema({}, { strict: false }));

    // 1. Vérifier la vaccination problématique
    console.log('='.repeat(60));
    console.log('1️⃣  VÉRIFICATION VACCINATION');
    console.log('='.repeat(60));
    
    const vaccinationId = '691b0c9dc138c9fe57e4245a';
    const vaccination = await Vaccination.findById(vaccinationId);
    
    if (!vaccination) {
      console.log('❌ Vaccination non trouvée');
      await mongoose.disconnect();
      return;
    }
    
    console.log('✅ Vaccination trouvée:');
    console.log('   ID:', vaccination._id);
    console.log('   HealthCenter:', vaccination.healthCenter);
    console.log('   Region:', vaccination.region);
    console.log('   District:', vaccination.district || '⚠️  NON DÉFINI');
    console.log('   Status:', vaccination.status);

    // 2. Vérifier le centre de santé
    console.log('\n' + '='.repeat(60));
    console.log('2️⃣  VÉRIFICATION CENTRE DE SANTÉ');
    console.log('='.repeat(60));
    
    const centerName = vaccination.healthCenter || 'District hopital Medina';
    let center = await HealthCenter.findOne({ name: centerName });
    
    if (!center) {
      console.log(`⚠️  Centre "${centerName}" NON trouvé`);
      console.log('📝 Création du centre...');
      
      center = await HealthCenter.create({
        name: centerName,
        type: 'district',
        region: vaccination.region || 'Dakar',
        address: 'Medina, Dakar',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('✅ Centre créé:', center.name);
    } else {
      console.log('✅ Centre trouvé:', center.name);
      console.log('   Type:', center.type || '⚠️  NON DÉFINI');
      console.log('   Region:', center.region);
      console.log('   DistrictName:', center.districtName || 'N/A');
      
      // Mettre à jour le type si nécessaire
      if (center.type !== 'district') {
        console.log('📝 Mise à jour du type en "district"...');
        center.type = 'district';
        await center.save();
        console.log('✅ Type mis à jour');
      }
    }

    // 3. Déterminer le district
    console.log('\n' + '='.repeat(60));
    console.log('3️⃣  RÉSOLUTION DU DISTRICT');
    console.log('='.repeat(60));
    
    let district;
    if (center.type === 'district') {
      district = center.name;
      console.log('✅ District résolu depuis type=district:', district);
    } else if (center.districtName) {
      district = center.districtName;
      console.log('✅ District résolu depuis districtName:', district);
    } else {
      // Fallback : utiliser le healthCenter
      district = centerName;
      console.log('⚠️  District par défaut:', district);
    }

    // 4. Mettre à jour la vaccination
    console.log('\n' + '='.repeat(60));
    console.log('4️⃣  MISE À JOUR VACCINATION');
    console.log('='.repeat(60));
    
    if (vaccination.district === district) {
      console.log('✅ District déjà correct:', vaccination.district);
    } else {
      console.log(`📝 Mise à jour: ${vaccination.district || 'undefined'} → ${district}`);
      vaccination.district = district;
      await vaccination.save();
      console.log('✅ Vaccination mise à jour');
    }

    // 5. Mettre à jour toutes les vaccinations de ce centre
    console.log('\n' + '='.repeat(60));
    console.log('5️⃣  MISE À JOUR AUTRES VACCINATIONS DU CENTRE');
    console.log('='.repeat(60));
    
    const result = await Vaccination.updateMany(
      { 
        healthCenter: centerName,
        district: { $exists: false }
      },
      { $set: { district } }
    );
    
    console.log(`✅ ${result.modifiedCount} vaccinations mises à jour`);

    // 6. Vérification finale
    console.log('\n' + '='.repeat(60));
    console.log('6️⃣  VÉRIFICATION FINALE');
    console.log('='.repeat(60));
    
    const updatedVaccination = await Vaccination.findById(vaccinationId);
    console.log('Vaccination après mise à jour:');
    console.log('   HealthCenter:', updatedVaccination.healthCenter);
    console.log('   District:', updatedVaccination.district);
    console.log('   Region:', updatedVaccination.region);
    console.log('   Status:', updatedVaccination.status);

    const totalWithDistrict = await Vaccination.countDocuments({ 
      healthCenter: centerName,
      district: { $exists: true }
    });
    console.log(`\n📊 Total vaccinations de "${centerName}" avec district: ${totalWithDistrict}`);

    // 7. Instructions suivantes
    console.log('\n' + '='.repeat(60));
    console.log('✅ CORRECTION TERMINÉE');
    console.log('='.repeat(60));
    console.log('\n📝 PROCHAINES ÉTAPES:');
    console.log('   1. Redémarrer le backend: npm run dev');
    console.log('   2. Se connecter avec le compte district');
    console.log('   3. Aller dans /agent/rendez-vous');
    console.log('   4. Les rendez-vous devraient maintenant s\'afficher');
    console.log('\n💡 Pour les nouvelles vaccinations, le champ district');
    console.log('   sera automatiquement ajouté grâce aux modifications du code.\n');

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Erreur:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

quickFix();
