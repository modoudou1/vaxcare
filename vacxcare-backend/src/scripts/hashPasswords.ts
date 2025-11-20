import mongoose from "mongoose";
import User from "../models/User";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

// Charger les variables d'environnement
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/vacxcare";

async function hashExistingPasswords() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connecté à MongoDB");

    // Récupérer tous les utilisateurs
    const users = await User.find({});
    console.log(`📊 ${users.length} utilisateurs trouvés`);

    for (const user of users) {
      if (user.password) {
        // Vérifier si le mot de passe est déjà hashé (bcrypt hash commence par $2b$)
        if (!user.password.startsWith("$2b$") && !user.password.startsWith("$2a$")) {
          console.log(`🔄 Hashage du mot de passe pour: ${user.email}`);
          const plainPassword = user.password;
          
          // Hasher le mot de passe
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(plainPassword, salt);
          
          // Sauvegarder (sans déclencher le hook pre-save qui re-hasherait)
          await User.updateOne({ _id: user._id }, { password: user.password });
          console.log(`✅ Mot de passe hashé pour: ${user.email}`);
        } else {
          console.log(`⏭️  Mot de passe déjà hashé pour: ${user.email}`);
        }
      }
    }

    console.log("✅ Migration terminée");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erreur:", error);
    process.exit(1);
  }
}

hashExistingPasswords();
