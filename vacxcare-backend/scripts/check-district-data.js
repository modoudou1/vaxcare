/**
 * Script de vérification rapide des données district
 * 
 * Utilisation :
 * node scripts/check-district-data.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vacxcare';

async function checkData() {
  try {
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB\n');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const Vaccination = mongoose.model('Vaccination', new mongoose.Schema({}, { strict: false }));
    const HealthCenter = mongoose.model('HealthCenter', new mongoose.Schema({}, { strict: false }));

    console.log('=' .repeat(60));
    console.log('1️⃣  UTILISATEURS DISTRICT');
    console.log('='.repeat(60));
    
    const districtUsers = await User.find({ role: 'district' }).select('email healthCenter region').lean();
    if (districtUsers.length === 0) {
      console.log('⚠️  Aucun utilisateur district trouvé');
    } else {
      districtUsers.forEach((u, i) => {
        console.log(`${i + 1}. Email: ${u.email}`);
        console.log(`   HealthCenter: ${u.healthCenter || 'NON DÉFINI'}`);
        console.log(`   Region: ${u.region || 'NON DÉFINI'}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('2️⃣  CENTRES DE SANTÉ (DISTRICTS)');
    console.log('='.repeat(60));
    
    const districts = await HealthCenter.find({ type: 'district' }).select('name region').lean();
    if (districts.length === 0) {
      console.log('⚠️  Aucun district trouvé');
    } else {
      districts.forEach((d, i) => {
        console.log(`${i + 1}. ${d.name} (${d.region || 'N/A'})`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('3️⃣  STRUCTURES AVEC DISTRICT');
    console.log('='.repeat(60));
    
    const structures = await HealthCenter.find({ districtName: { $exists: true } })
      .select('name districtName type').lean();
    
    if (structures.length === 0) {
      console.log('⚠️  Aucune structure avec districtName trouvée');
    } else {
      const byDistrict = {};
      structures.forEach(s => {
        if (!byDistrict[s.districtName]) {
          byDistrict[s.districtName] = [];
        }
        byDistrict[s.districtName].push(s);
      });
      
      Object.entries(byDistrict).forEach(([district, structs]) => {
        console.log(`\n📍 ${district} (${structs.length} structures):`);
        structs.forEach((s, i) => {
          console.log(`   ${i + 1}. ${s.name} (${s.type})`);
        });
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('4️⃣  VACCINATIONS');
    console.log('='.repeat(60));
    
    const totalVaccinations = await Vaccination.countDocuments();
    const withDistrict = await Vaccination.countDocuments({ district: { $exists: true } });
    const withoutDistrict = await Vaccination.countDocuments({ district: { $exists: false } });
    
    console.log(`Total vaccinations: ${totalVaccinations}`);
    console.log(`Avec district: ${withDistrict} ✅`);
    console.log(`Sans district: ${withoutDistrict} ${withoutDistrict > 0 ? '⚠️' : '✅'}`);

    if (withDistrict > 0) {
      console.log('\n📊 Répartition par district:');
      const byDistrict = await Vaccination.aggregate([
        { $match: { district: { $exists: true } } },
        { $group: { _id: '$district', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      
      byDistrict.forEach(item => {
        console.log(`   - ${item._id || 'Non défini'}: ${item.count} vaccinations`);
      });
      
      console.log('\n📋 Exemples de vaccinations avec district:');
      const samples = await Vaccination.find({ district: { $exists: true } })
        .select('healthCenter district status scheduledDate')
        .limit(5)
        .lean();
      
      samples.forEach((v, i) => {
        const date = v.scheduledDate ? new Date(v.scheduledDate).toLocaleDateString('fr-FR') : 'N/A';
        console.log(`   ${i + 1}. ${v.healthCenter} → ${v.district} (${v.status}) - ${date}`);
      });
    }

    if (withoutDistrict > 0) {
      console.log('\n⚠️  Exemples de vaccinations SANS district:');
      const samples = await Vaccination.find({ district: { $exists: false } })
        .select('healthCenter status scheduledDate')
        .limit(5)
        .lean();
      
      samples.forEach((v, i) => {
        const date = v.scheduledDate ? new Date(v.scheduledDate).toLocaleDateString('fr-FR') : 'N/A';
        console.log(`   ${i + 1}. ${v.healthCenter || 'NON DÉFINI'} (${v.status}) - ${date}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('5️⃣  RECOMMANDATIONS');
    console.log('='.repeat(60));

    const issues = [];
    
    if (districtUsers.length === 0) {
      issues.push('❌ Aucun utilisateur district - Créer un compte avec role: "district"');
    }
    
    if (districts.length === 0) {
      issues.push('❌ Aucun district - Créer un centre avec type: "district"');
    }
    
    if (structures.length === 0) {
      issues.push('⚠️  Aucune structure avec districtName - Les structures ne seront pas incluses');
    }
    
    if (withoutDistrict > 0) {
      issues.push(`❌ ${withoutDistrict} vaccinations sans district - Exécuter fix-district-vaccinations.js`);
    }

    if (issues.length === 0) {
      console.log('✅ Toutes les données sont correctement configurées !');
      console.log('\n📝 Prochaines étapes:');
      console.log('   1. Redémarrer le backend: npm run dev');
      console.log('   2. Se connecter avec un compte district');
      console.log('   3. Aller dans /agent/rendez-vous');
      console.log('   4. Les rendez-vous devraient s\'afficher');
    } else {
      console.log('⚠️  Problèmes détectés:\n');
      issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
      
      console.log('\n📝 Actions recommandées:');
      if (withoutDistrict > 0) {
        console.log('   → Exécuter: node scripts/fix-district-vaccinations.js');
      }
      if (structures.length === 0) {
        console.log('   → Ajouter districtName aux structures dans MongoDB');
      }
    }

    console.log('\n' + '='.repeat(60));
    await mongoose.disconnect();
    console.log('✅ Vérification terminée\n');
  } catch (error) {
    console.error('❌ Erreur:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkData();
