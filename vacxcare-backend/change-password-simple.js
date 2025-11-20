const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

async function changePassword() {
  try {
    // Connexion directe à MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/vacxcare"
    );
    console.log("✅ Connecté à MongoDB");

    const email = "national@test.com";
    const newPassword = "Modoudou";

    // Utiliser directement la collection users
    const db = mongoose.connection.db;
    const usersCollection = db.collection("users");

    // Vérifier si l'utilisateur existe
    const user = await usersCollection.findOne({ email });

    if (!user) {
      console.log(`❌ Utilisateur ${email} non trouvé`);
      return;
    }

    console.log(`📧 Utilisateur trouvé: ${email}`);
    console.log(`🔑 Rôle: ${user.role}`);

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe
    await usersCollection.updateOne(
      { email },
      { $set: { password: hashedPassword } }
    );

    console.log(`✅ Mot de passe mis à jour pour ${email}`);
    console.log(`🔐 Nouveau mot de passe: ${newPassword}`);
  } catch (error) {
    console.error("❌ Erreur lors du changement de mot de passe:", error);
  } finally {
    await mongoose.disconnect();
    console.log("✅ Déconnecté de MongoDB");
  }
}

changePassword();
















