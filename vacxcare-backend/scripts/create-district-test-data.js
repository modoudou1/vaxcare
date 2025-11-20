/**
 * Script de création de données de test pour le rôle District
 * 
 * Utilisation dans MongoDB Shell :
 * mongosh
 * use vacxcare
 * load('scripts/create-district-test-data.js')
 */

// Connexion à la base de données
const db = connect("mongodb://localhost:27017/vacxcare");

console.log("🚀 Création des données de test pour District...\n");

// ============================================================================
// 1. CRÉATION D'UN UTILISATEUR DISTRICT
// ============================================================================

console.log("1️⃣  Création de l'utilisateur district...");

// Note : Le mot de passe 'district123' hashé avec bcrypt
// Pour créer votre propre hash : bcrypt.hash('votreMotDePasse', 10)
const districtUser = {
  email: "district.thies@vacxcare.sn",
  password: "$2b$10$YmI4MzFhZjhjNTY0NjEwOeQBPG/xY9qGjK3JX5mVE5B8Y.WqKvLxW", // district123
  role: "district",
  region: "Thiès",
  healthCenter: "District Thiès",
  firstName: "Moussa",
  lastName: "Ndiaye",
  phone: "+221770000000",
  active: true,
  permissions: {
    dashboard: true,
    enfants: true,
    rendezvous: true,
    campagnes: true,
    vaccins: true,
    rapports: true,
    agents: false,
    stocks: true,
    parametres: false
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

try {
  const existingUser = db.users.findOne({ email: districtUser.email });
  if (existingUser) {
    console.log("   ⚠️  L'utilisateur district existe déjà");
  } else {
    db.users.insertOne(districtUser);
    console.log("   ✅ Utilisateur district créé : district.thies@vacxcare.sn");
    console.log("   🔑 Mot de passe : district123");
  }
} catch (error) {
  console.log("   ❌ Erreur lors de la création de l'utilisateur :", error.message);
}

console.log("");

// ============================================================================
// 2. CRÉATION DES STRUCTURES DE SANTÉ (ACTEURS)
// ============================================================================

console.log("2️⃣  Création des structures de santé...");

const structures = [
  {
    name: "Case de Santé Mbour",
    type: "health_post",
    districtName: "District Thiès",
    region: "Thiès",
    address: "Mbour, Thiès",
    phone: "+221771111111",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Poste de Santé Joal",
    type: "health_post",
    districtName: "District Thiès",
    region: "Thiès",
    address: "Joal, Thiès",
    phone: "+221772222222",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Clinique Saly",
    type: "clinic",
    districtName: "District Thiès",
    region: "Thiès",
    address: "Saly, Thiès",
    phone: "+221773333333",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Centre de Santé Pout",
    type: "health_center",
    districtName: "District Thiès",
    region: "Thiès",
    address: "Pout, Thiès",
    phone: "+221774444444",
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

structures.forEach((structure) => {
  try {
    const existing = db.healthcenters.findOne({ name: structure.name });
    if (existing) {
      console.log(`   ⚠️  ${structure.name} existe déjà`);
    } else {
      db.healthcenters.insertOne(structure);
      console.log(`   ✅ ${structure.name} créé`);
    }
  } catch (error) {
    console.log(`   ❌ Erreur pour ${structure.name} :`, error.message);
  }
});

console.log("");

// ============================================================================
// 3. CRÉATION D'ENFANTS DU DISTRICT DIRECT
// ============================================================================

console.log("3️⃣  Création d'enfants du district direct...");

const directChildren = [
  {
    firstName: "Fatou",
    lastName: "Diop",
    gender: "F",
    birthDate: new Date("2022-06-15"),
    healthCenter: "District Thiès",
    region: "Thiès",
    parentInfo: {
      parentName: "Aissatou Diop",
      parentPhone: "+221775001111"
    },
    status: "À jour",
    parentAccessCode: Math.floor(100000 + Math.random() * 900000).toString(),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    firstName: "Moustapha",
    lastName: "Fall",
    gender: "M",
    birthDate: new Date("2023-01-10"),
    healthCenter: "District Thiès",
    region: "Thiès",
    parentInfo: {
      parentName: "Khady Fall",
      parentPhone: "+221775002222"
    },
    status: "À jour",
    parentAccessCode: Math.floor(100000 + Math.random() * 900000).toString(),
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

directChildren.forEach((child) => {
  try {
    const existing = db.children.findOne({ 
      firstName: child.firstName, 
      lastName: child.lastName 
    });
    if (existing) {
      console.log(`   ⚠️  ${child.firstName} ${child.lastName} existe déjà`);
    } else {
      db.children.insertOne(child);
      console.log(`   ✅ ${child.firstName} ${child.lastName} créé (Code: ${child.parentAccessCode})`);
    }
  } catch (error) {
    console.log(`   ❌ Erreur pour ${child.firstName} :`, error.message);
  }
});

console.log("");

// ============================================================================
// 4. CRÉATION D'ENFANTS DES ACTEURS DE SANTÉ
// ============================================================================

console.log("4️⃣  Création d'enfants des acteurs de santé...");

const actorChildren = [
  {
    firstName: "Amadou",
    lastName: "Ba",
    gender: "M",
    birthDate: new Date("2023-03-20"),
    healthCenter: "Case de Santé Mbour",
    region: "Thiès",
    parentInfo: {
      parentName: "Mariama Ba",
      parentPhone: "+221775003333"
    },
    status: "En retard",
    parentAccessCode: Math.floor(100000 + Math.random() * 900000).toString(),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    firstName: "Khadija",
    lastName: "Sow",
    gender: "F",
    birthDate: new Date("2021-11-10"),
    healthCenter: "Poste de Santé Joal",
    region: "Thiès",
    parentInfo: {
      parentName: "Awa Sow",
      parentPhone: "+221775004444"
    },
    status: "À jour",
    parentAccessCode: Math.floor(100000 + Math.random() * 900000).toString(),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    firstName: "Ousmane",
    lastName: "Ndiaye",
    gender: "M",
    birthDate: new Date("2022-08-05"),
    healthCenter: "Clinique Saly",
    region: "Thiès",
    parentInfo: {
      parentName: "Coumba Ndiaye",
      parentPhone: "+221775005555"
    },
    status: "Pas à jour",
    parentAccessCode: Math.floor(100000 + Math.random() * 900000).toString(),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    firstName: "Bineta",
    lastName: "Sarr",
    gender: "F",
    birthDate: new Date("2023-05-18"),
    healthCenter: "Centre de Santé Pout",
    region: "Thiès",
    parentInfo: {
      parentName: "Oumou Sarr",
      parentPhone: "+221775006666"
    },
    status: "À jour",
    parentAccessCode: Math.floor(100000 + Math.random() * 900000).toString(),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    firstName: "Cheikh",
    lastName: "Sy",
    gender: "M",
    birthDate: new Date("2022-12-01"),
    healthCenter: "Case de Santé Mbour",
    region: "Thiès",
    parentInfo: {
      parentName: "Fatou Sy",
      parentPhone: "+221775007777"
    },
    status: "En retard",
    parentAccessCode: Math.floor(100000 + Math.random() * 900000).toString(),
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

actorChildren.forEach((child) => {
  try {
    const existing = db.children.findOne({ 
      firstName: child.firstName, 
      lastName: child.lastName 
    });
    if (existing) {
      console.log(`   ⚠️  ${child.firstName} ${child.lastName} existe déjà`);
    } else {
      db.children.insertOne(child);
      console.log(`   ✅ ${child.firstName} ${child.lastName} créé (Code: ${child.parentAccessCode})`);
    }
  } catch (error) {
    console.log(`   ❌ Erreur pour ${child.firstName} :`, error.message);
  }
});

console.log("");

// ============================================================================
// 5. RÉSUMÉ
// ============================================================================

console.log("📊 RÉSUMÉ DES DONNÉES CRÉÉES");
console.log("═".repeat(60));

const totalUsers = db.users.countDocuments({ role: "district", healthCenter: "District Thiès" });
const totalStructures = db.healthcenters.countDocuments({ districtName: "District Thiès" });
const totalDirectChildren = db.children.countDocuments({ healthCenter: "District Thiès" });
const totalActorChildren = db.children.countDocuments({ 
  healthCenter: { $in: structures.map(s => s.name) }
});

console.log(`Utilisateurs district : ${totalUsers}`);
console.log(`Structures de santé : ${totalStructures}`);
console.log(`Enfants district direct : ${totalDirectChildren}`);
console.log(`Enfants acteurs de santé : ${totalActorChildren}`);
console.log(`TOTAL enfants : ${totalDirectChildren + totalActorChildren}`);
console.log("═".repeat(60));

console.log("\n✅ Script terminé !\n");

console.log("🔐 INFORMATIONS DE CONNEXION");
console.log("Email    : district.thies@vacxcare.sn");
console.log("Password : district123");
console.log("URL      : http://localhost:3000/login\n");

console.log("📝 PROCHAINES ÉTAPES");
console.log("1. Se connecter avec le compte district");
console.log("2. Accéder au menu 'Enfants'");
console.log("3. Tester les filtres (Tous / District / Acteurs)");
console.log("4. Cliquer sur un enfant pour voir le modal approprié\n");
