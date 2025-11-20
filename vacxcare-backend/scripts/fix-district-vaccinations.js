/**
 * Script pour corriger les vaccinations existantes sans champ district
 * 
 * Utilisation :
 * node scripts/fix-district-vaccinations.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vacxcare';

async function fixVaccinations() {
  try {
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB\n');

    const Vaccination = mongoose.model('Vaccination', new mongoose.Schema({}, { strict: false }));
    const HealthCenter = mongoose.model('HealthCenter', new mongoose.Schema({}, { strict: false }));

    // 1. Compter les vaccinations sans district
    const withoutDistrict = await Vaccination.countDocuments({ district: { $exists: false } });
    console.log(`📊 Vaccinations sans champ district : ${withoutDistrict}`);

    if (withoutDistrict === 0) {
      console.log('✅ Toutes les vaccinations ont déjà un champ district\n');
      
      // Afficher quelques exemples
      const samples = await Vaccination.find({ district: { $exists: true } })
        .limit(5)
        .select('healthCenter district status scheduledDate');
      
      console.log('📋 Exemples de vaccinations avec district :');
      samples.forEach((v, i) => {
        console.log(`  ${i + 1}. healthCenter: "${v.healthCenter}" → district: "${v.district}" (${v.status})`);
      });
      
      await mongoose.disconnect();
      return;
    }

    // 2. Récupérer tous les centres de santé
    const centers = await HealthCenter.find({}).lean();
    console.log(`📍 Centres de santé trouvés : ${centers.length}\n`);

    // Créer un mapping healthCenter → district
    const centerToDistrict = new Map();
    
    centers.forEach(center => {
      if (center.type === 'district') {
        // Si c'est un district, le district est lui-même
        centerToDistrict.set(center.name, center.name);
        console.log(`  ✓ District : "${center.name}"`);
      } else if (center.districtName) {
        // Si c'est une structure avec un district parent
        centerToDistrict.set(center.name, center.districtName);
        console.log(`  ✓ Structure : "${center.name}" → District : "${center.districtName}"`);
      }
    });

    console.log(`\n🗺️  Mapping créé : ${centerToDistrict.size} centres mappés\n`);

    // 3. Mettre à jour les vaccinations
    let updated = 0;
    let skipped = 0;

    const vaccinations = await Vaccination.find({ district: { $exists: false } });
    
    console.log(`🔄 Mise à jour de ${vaccinations.length} vaccinations...\n`);

    for (const vaccination of vaccinations) {
      const healthCenter = vaccination.healthCenter;
      
      if (!healthCenter) {
        skipped++;
        console.log(`  ⚠️  Vaccination sans healthCenter (ID: ${vaccination._id})`);
        continue;
      }

      const district = centerToDistrict.get(healthCenter);
      
      if (district) {
        await Vaccination.updateOne(
          { _id: vaccination._id },
          { $set: { district } }
        );
        updated++;
        console.log(`  ✅ "${healthCenter}" → "${district}"`);
      } else {
        skipped++;
        console.log(`  ⚠️  Pas de mapping pour "${healthCenter}"`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RÉSUMÉ');
    console.log('='.repeat(60));
    console.log(`✅ Vaccinations mises à jour : ${updated}`);
    console.log(`⚠️  Vaccinations ignorées : ${skipped}`);
    console.log(`📌 Total : ${vaccinations.length}`);
    console.log('='.repeat(60));

    // 4. Vérifier le résultat
    const stillWithoutDistrict = await Vaccination.countDocuments({ district: { $exists: false } });
    console.log(`\n📊 Vaccinations sans district après correction : ${stillWithoutDistrict}`);

    // 5. Afficher quelques exemples par district
    console.log('\n📋 Résultat par district :');
    const byDistrict = await Vaccination.aggregate([
      { $match: { district: { $exists: true } } },
      { $group: { _id: '$district', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    byDistrict.forEach(item => {
      console.log(`  - ${item._id || 'Non défini'} : ${item.count} vaccinations`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Script terminé\n');
  } catch (error) {
    console.error('❌ Erreur:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

fixVaccinations();
