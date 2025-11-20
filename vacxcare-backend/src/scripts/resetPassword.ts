import mongoose from "mongoose";
import User from "../models/User";
import dotenv from "dotenv";

// Charger les variables d'environnement
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/vacxcare";

async function resetPassword() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connecté à MongoDB");

    const email = "modoum469@gmail.com";
    const newPassword = "password123"; // Mot de passe temporaire

    const user = await User.findOne({ email });
    if (!user) {
      console.log(`❌ Utilisateur ${email} introuvable`);
      process.exit(1);
    }

    console.log(`🔄 Réinitialisation du mot de passe pour: ${email}`);
    user.password = newPassword;
    await user.save(); // Le hook pre-save va hasher automatiquement

    console.log(`✅ Mot de passe réinitialisé à: ${newPassword}`);
    console.log(`⚠️  Changez-le immédiatement après connexion !`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Erreur:", error);
    process.exit(1);
  }
}

resetPassword();
