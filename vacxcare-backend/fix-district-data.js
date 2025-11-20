/**
 * 🔧 Script de correction pour remplir rétroactivement les champs district
 * 
 * Ce script va :
 * 1. Trouver tous les enfants sans district
 * 2. Résoudre leur district à partir de leur healthCenter
 * 3. Mettre à jour les enfants, vaccinations et rendez-vous
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/vacxcare';

console.log('🔌 Connexion à MongoDB:', MONGO_URI);

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connecté à MongoDB\n');
    fixDistrictData();
  })
  .catch(err => {
    console.error('❌ Erreur de connexion:', err);
    process.exit(1);
  });

const HealthCenterSchema = new mongoose.Schema({}, { strict: false, collection: 'healthcenters' });
const ChildSchema = new mongoose.Schema({}, { strict: false, collection: 'children' });
const VaccinationSchema = new mongoose.Schema({}, { strict: false, collection: 'vaccinations' });
const AppointmentSchema = new mongoose.Schema({}, { strict: false, collection: 'appointments' });

const HealthCenter = mongoose.model('HealthCenter', HealthCenterSchema);
const Child = mongoose.model('Child', ChildSchema);
const Vaccination = mongoose.model('Vaccination', VaccinationSchema);
const Appointment = mongoose.model('Appointment', AppointmentSchema);

async function resolveDistrict(healthCenterName, region) {
  if (!healthCenterName || !region) return null;
  
  try {
    const hc = await HealthCenter.findOne({
      name: healthCenterName,
      region: region
    }).lean();
    
    if (!hc) return null;
    
    if (hc.type === 'district') {
      return hc.name;
    } else if (hc.districtName) {
      return hc.districtName;
    }
    
    return null;
  } catch (e) {
    console.error(`❌ Erreur résolution district pour ${healthCenterName}:`, e.message);
    return null;
  }
}

async function fixDistrictData() {
  console.log('='.repeat(80));
  console.log('🔧 CORRECTION DES DONNÉES DISTRICT');
  console.log('='.repeat(80));
  
  // 1. Corriger les enfants
  console.log('\n👶 Correction des enfants sans district...');
  const childrenWithoutDistrict = await Child.find({
    $or: [
      { district: { $exists: false } },
      { district: null },
      { district: '' }
    ]
  }).select('_id name healthCenter region district').lean();
  
  console.log(`  Trouvé ${childrenWithoutDistrict.length} enfant(s) sans district`);
  
  let childrenUpdated = 0;
  for (const child of childrenWithoutDistrict) {
    const district = await resolveDistrict(child.healthCenter, child.region);
    
    if (district) {
      await Child.updateOne(
        { _id: child._id },
        { $set: { district } }
      );
      console.log(`  ✅ ${child.name}: district = "${district}"`);
      childrenUpdated++;
    } else {
      console.log(`  ⚠️  ${child.name}: impossible de résoudre le district (healthCenter: ${child.healthCenter})`);
    }
  }
  
  console.log(`  ✅ ${childrenUpdated} enfant(s) mis à jour`);
  
  // 2. Corriger les vaccinations
  console.log('\n💉 Correction des vaccinations sans district...');
  const vaccinationsWithoutDistrict = await Vaccination.find({
    $or: [
      { district: { $exists: false } },
      { district: null },
      { district: '' }
    ]
  }).select('_id healthCenter region district').lean();
  
  console.log(`  Trouvé ${vaccinationsWithoutDistrict.length} vaccination(s) sans district`);
  
  let vaccinationsUpdated = 0;
  for (const vaccination of vaccinationsWithoutDistrict) {
    const district = await resolveDistrict(vaccination.healthCenter, vaccination.region);
    
    if (district) {
      await Vaccination.updateOne(
        { _id: vaccination._id },
        { $set: { district } }
      );
      vaccinationsUpdated++;
    }
  }
  
  console.log(`  ✅ ${vaccinationsUpdated} vaccination(s) mise(s) à jour`);
  
  // 3. Corriger les rendez-vous
  console.log('\n📅 Correction des rendez-vous sans district...');
  const appointmentsWithoutDistrict = await Appointment.find({
    $or: [
      { district: { $exists: false } },
      { district: null },
      { district: '' }
    ]
  }).select('_id healthCenter region district').lean();
  
  console.log(`  Trouvé ${appointmentsWithoutDistrict.length} rendez-vous sans district`);
  
  let appointmentsUpdated = 0;
  for (const appointment of appointmentsWithoutDistrict) {
    const district = await resolveDistrict(appointment.healthCenter, appointment.region);
    
    if (district) {
      await Appointment.updateOne(
        { _id: appointment._id },
        { $set: { district } }
      );
      appointmentsUpdated++;
    }
  }
  
  console.log(`  ✅ ${appointmentsUpdated} rendez-vous mis à jour`);
  
  // 4. Vérification après correction
  console.log('\n' + '='.repeat(80));
  console.log('🔍 VÉRIFICATION APRÈS CORRECTION');
  console.log('='.repeat(80));
  
  // Chercher le district "Hopital faan"
  const hopitalFaan = await HealthCenter.findOne({
    name: { $regex: /faan/i }
  }).lean();
  
  if (hopitalFaan) {
    console.log(`\n📍 District trouvé: "${hopitalFaan.name}"`);
    
    // Centres liés
    const linkedCenters = await HealthCenter.find({
      $or: [
        { name: hopitalFaan.name, type: 'district' },
        { districtName: hopitalFaan.name }
      ]
    }).select('name type').lean();
    
    const centerNames = linkedCenters.map(c => c.name);
    console.log(`  Centres liés: ${centerNames.join(', ')}`);
    
    // Enfants qui devraient être visibles
    const childFilter = {
      $or: [
        { district: hopitalFaan.name },
        { healthCenter: { $in: centerNames } }
      ]
    };
    
    const childrenCount = await Child.countDocuments(childFilter);
    console.log(`  👶 Enfants visibles par le district: ${childrenCount}`);
    
    // Vaccinations qui devraient être visibles
    const vaccinationFilter = {
      $or: [
        { district: hopitalFaan.name },
        { healthCenter: { $in: centerNames } }
      ]
    };
    
    const vaccinationsCount = await Vaccination.countDocuments(vaccinationFilter);
    console.log(`  💉 Vaccinations visibles par le district: ${vaccinationsCount}`);
    
    // Rendez-vous qui devraient être visibles
    const appointmentFilter = {
      $or: [
        { district: hopitalFaan.name },
        { healthCenter: { $in: centerNames } }
      ]
    };
    
    const appointmentsCount = await Appointment.countDocuments(appointmentFilter);
    console.log(`  📅 Rendez-vous visibles par le district: ${appointmentsCount}`);
    
    if (childrenCount === 0) {
      console.log('\n  ⚠️  Toujours 0 enfant visible ! Vérifier la configuration des centres.');
    } else {
      console.log('\n  ✅ Le district devrait maintenant voir les données !');
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ CORRECTION TERMINÉE');
  console.log('='.repeat(80));
  console.log(`
📊 Résumé:
  - ${childrenUpdated} enfant(s) mis à jour
  - ${vaccinationsUpdated} vaccination(s) mise(s) à jour
  - ${appointmentsUpdated} rendez-vous mis à jour
  
💡 Prochaine étape:
  - Redémarrer le serveur backend
  - Se connecter avec le compte district "Hopital faan"
  - Vérifier le dashboard
  `);
  
  await mongoose.disconnect();
  console.log('✅ Déconnecté de MongoDB\n');
  process.exit(0);
}
