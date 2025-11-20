const mongoose = require("mongoose");
const Child = require("./dist/models/Child").default;
const Vaccination = require("./dist/models/Vaccination").default;
const Vaccine = require("./dist/models/Vaccine").default;
const Campaign = require("./dist/models/Campaign").default;

async function seedTestData() {
  try {
    // Connexion à MongoDB
    await mongoose.connect("mongodb://localhost:27017/vacxcare");
    console.log("✅ Connecté à MongoDB");

    // Nettoyer les données existantes
    await Child.deleteMany({});
    await Vaccination.deleteMany({});
    await Vaccine.deleteMany({});
    await Campaign.deleteMany({});
    console.log("🧹 Données existantes supprimées");

    // 1. Créer des vaccins
    const vaccines = await Vaccine.insertMany([
      {
        name: "BCG",
        description: "Vaccin contre la tuberculose",
        dosesRequired: 1,
      },
      {
        name: "Polio",
        description: "Vaccin contre la poliomyélite",
        dosesRequired: 3,
      },
      {
        name: "DTP",
        description: "Diphtérie, Tétanos, Coqueluche",
        dosesRequired: 3,
      },
      {
        name: "Rougeole",
        description: "Vaccin contre la rougeole",
        dosesRequired: 2,
      },
      {
        name: "Hépatite B",
        description: "Vaccin contre l'hépatite B",
        dosesRequired: 3,
      },
    ]);
    console.log(`✅ ${vaccines.length} vaccins créés`);

    // 2. Créer des enfants dans différentes régions
    const regions = ["Nord", "Est", "Sud", "Ouest", "Centre"];
    const children = [];

    for (let i = 0; i < 200; i++) {
      const region = regions[Math.floor(Math.random() * regions.length)];
      const child = new Child({
        firstName: `Enfant${i + 1}`,
        lastName: `Famille${i + 1}`,
        dateOfBirth: new Date(
          2020 + Math.floor(Math.random() * 4),
          Math.floor(Math.random() * 12),
          Math.floor(Math.random() * 28) + 1
        ),
        region: region,
        parentName: `Parent${i + 1}`,
        parentPhone: `+221${Math.floor(Math.random() * 90000000) + 10000000}`,
      });
      children.push(child);
    }

    const savedChildren = await Child.insertMany(children);
    console.log(`✅ ${savedChildren.length} enfants créés`);

    // 3. Créer des vaccinations
    const vaccinations = [];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    for (let i = 0; i < 500; i++) {
      const child =
        savedChildren[Math.floor(Math.random() * savedChildren.length)];
      const vaccine = vaccines[Math.floor(Math.random() * vaccines.length)];
      const month = Math.floor(Math.random() * 12) + 1;
      const year = 2024;
      const day = Math.floor(Math.random() * 28) + 1;

      const vaccination = new Vaccination({
        child: child._id,
        vaccine: vaccine._id,
        date: new Date(year, month - 1, day),
        doseNumber: Math.floor(Math.random() * vaccine.dosesRequired) + 1,
      });
      vaccinations.push(vaccination);
    }

    const savedVaccinations = await Vaccination.insertMany(vaccinations);
    console.log(`✅ ${savedVaccinations.length} vaccinations créées`);

    // 4. Créer des campagnes
    const campaigns = await Campaign.insertMany([
      {
        title: "Campagne BCG 2024",
        description: "Campagne de vaccination BCG pour tous les enfants",
        startDate: new Date(2024, 0, 1), // 1er janvier 2024
        endDate: new Date(2025, 11, 31), // 31 décembre 2025 (active)
        region: "Toutes",
        createdBy: new mongoose.Types.ObjectId(), // ID fictif
      },
      {
        title: "Campagne Polio Nord",
        description: "Campagne de vaccination Polio dans la région Nord",
        startDate: new Date(2024, 2, 1), // 1er mars 2024
        endDate: new Date(2024, 4, 31), // 31 mai 2024 (expirée)
        region: "Nord",
        createdBy: new mongoose.Types.ObjectId(), // ID fictif
      },
      {
        title: "Campagne DTP Nationale",
        description: "Campagne nationale de vaccination DTP",
        startDate: new Date(2024, 6, 1), // 1er juillet 2024
        endDate: new Date(2025, 5, 30), // 30 juin 2025 (active)
        region: "Toutes",
        createdBy: new mongoose.Types.ObjectId(), // ID fictif
      },
    ]);
    console.log(`✅ ${campaigns.length} campagnes créées`);

    console.log("\n🎉 Données de test créées avec succès !");
    console.log("\n📊 Résumé:");
    console.log(`- ${vaccines.length} vaccins`);
    console.log(`- ${savedChildren.length} enfants`);
    console.log(`- ${savedVaccinations.length} vaccinations`);
    console.log(`- ${campaigns.length} campagnes`);
  } catch (error) {
    console.error("❌ Erreur:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Déconnecté de MongoDB");
  }
}

seedTestData();
