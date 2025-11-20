import bcrypt from "bcryptjs";
import User from "../models/User";

export const seedNationalAdmin = async () => {
  try {
    const existing = await User.findOne({ role: "national" });

    if (!existing) {
      const hashedPassword = await bcrypt.hash("123456", 10);

      const admin = new User({
        username: "admin",
        email: "admin@vacxcare.com",
        password: hashedPassword,
        role: "national",
      });

      await admin.save();
      console.log("✅ Compte national seedé :", admin.email);
    } else {
      console.log("ℹ️ Un utilisateur national existe déjà :", existing.email);
    }
  } catch (err) {
    console.error("❌ Erreur lors du seed du compte national :", err);
  }
};
