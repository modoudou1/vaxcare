import dotenv from "dotenv";
import mongoose from "mongoose";
import Child from "./models/Child";
import User from "./models/User";
import Vaccination from "./models/Vaccination";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI as string;

const seedVaccinations = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connecté à MongoDB");

    // 🔎 Récupérer un enfant existant (ex: Fatou Ndiaye)
    const child = await Child.findOne({ name: "Fatou Ndiaye" });
    if (!child) {
      console.log("❌ Aucun enfant trouvé, ajoute d’abord un enfant !");
      return;
    }

    // 🔎 Récupérer un agent existant
    const agent = await User.findOne({ role: "agent" });
    if (!agent) {
      console.log("❌ Aucun agent trouvé !");
      return;
    }

    // 🌱 Vaccinations fictives
    const vaccinations = [
      {
        child: child._id,
        vaccine: "BCG",
        date: new Date("2023-06-10"),
        givenBy: agent._id,
      },
      {
        child: child._id,
        vaccine: "Polio",
        date: new Date("2023-07-15"),
        givenBy: agent._id,
      },
      {
        child: child._id,
        vaccine: "Rougeole",
        date: new Date("2024-01-20"),
        givenBy: agent._id,
      },
    ];

    await Vaccination.insertMany(vaccinations);
    console.log("🌱 Vaccinations ajoutées avec succès !");
    process.exit();
  } catch (err) {
    console.error("❌ Erreur seed :", err);
    process.exit(1);
  }
};

seedVaccinations();
