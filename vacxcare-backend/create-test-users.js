const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// Import du modèle User (version compilée)
const User = require("./dist/models/User").default;

async function createTestUsers() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/vacxcare"
    );
    console.log("✅ Connecté à MongoDB");

    const usersToCreate = [
      {
        firstName: "Admin",
        lastName: "Régional",
        email: "regional@test.com",
        password: "123456",
        role: "regional",
        region: "Dakar",
      },
      {
        firstName: "Agent",
        lastName: "Santé",
        email: "agent@test.com",
        password: "123456",
        role: "agent",
        region: "Dakar",
      },
    ];

    for (const userData of usersToCreate) {
      // Vérifier si l'utilisateur existe déjà
      let user = await User.findOne({ email: userData.email });

      if (user) {
        console.log(
          `⚠️ Utilisateur ${userData.email} existe déjà. Mise à jour...`
        );
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        await User.updateOne(
          { email: userData.email },
          {
            $set: {
              password: hashedPassword,
              role: userData.role,
              region: userData.region,
              firstName: userData.firstName,
              lastName: userData.lastName,
            },
          }
        );
        console.log(`✅ Utilisateur ${userData.email} mis à jour.`);
      } else {
        // Créer un nouvel utilisateur
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        user = new User({
          ...userData,
          password: hashedPassword,
        });
        await user.save();
        console.log(`✅ Utilisateur ${userData.email} créé.`);
      }
    }

    console.log("\n🎉 Utilisateurs de test créés/mis à jour avec succès !");
    console.log("\n📋 Comptes de test :");
    console.log("   Régional: regional@test.com / 123456");
    console.log("   Agent: agent@test.com / 123456");
  } catch (error) {
    console.error("❌ Erreur lors de la création des utilisateurs:", error);
  } finally {
    await mongoose.disconnect();
    console.log("✅ Déconnecté de MongoDB");
  }
}

createTestUsers();
