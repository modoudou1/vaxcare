import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "./src/models/User";

// Charger les variables d'environnement
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/vacxcare";

async function createNational() {
  try {
    await mongoose.connect(MONGO_URI);

    const hashedPassword = await bcrypt.hash("Admin123!", 10);

    const national = new User({
      email: "admin@vacxcare.com",
      password: hashedPassword,
      role: "national",
    });

    await national.save();
    console.log("✅ Admin national créé :", national.email);
    process.exit(0);
  } catch (err) {
    console.error("❌ Erreur création admin :", err);
    process.exit(1);
  }
}

createNational();
