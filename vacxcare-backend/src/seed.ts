import bcrypt from "bcrypt";
import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "./models/User";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "";

const users = [
  { email: "agent@test.com", password: "123456", role: "agent" },
  { email: "regional@test.com", password: "123456", role: "regional" },
  { email: "national@test.com", password: "123456", role: "national" },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connecté à MongoDB");

    for (const u of users) {
      const existing = await User.findOne({ email: u.email });
      if (existing) {
        console.log(`⚠️ Utilisateur ${u.email} existe déjà`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(u.password, 10);
      const newUser = new User({
        email: u.email,
        password: hashedPassword,
        role: u.role,
      });

      await newUser.save();
      console.log(`✅ Utilisateur créé : ${u.email} (${u.role})`);
    }

    mongoose.disconnect();
    console.log("🌱 Seed terminé !");
  } catch (err) {
    console.error("❌ Erreur seed :", err);
  }
}

seed();
