import mongoose from "mongoose";
import User from "../models/User";

const updateAgentLevel = async () => {
  try {
    // Connexion à MongoDB
    const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://admin:Vacxcare2025!@vacxcare-cluster.o3mdntc.mongodb.net/?retryWrites=true&w=majority&appName=vacxcare-cluster";
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connecté à MongoDB");

    // Trouver l'agent spécifique
    const agentId = "691b2e93b059e11c9ea5c82a";
    const agent = await User.findById(agentId);

    if (!agent) {
      console.log("❌ Agent introuvable");
      process.exit(1);
    }

    console.log("\n📋 Agent actuel:");
    console.log("Email:", agent.email);
    console.log("Role:", agent.role);
    console.log("AgentLevel:", agent.agentLevel);
    console.log("HealthCenter:", agent.healthCenter);
    console.log("Region:", agent.region);

    // Mettre à jour tous les agents sans agentLevel défini
    // On considère qu'ils sont des facility_admin (anciens agents)
    const result = await User.updateMany(
      { 
        role: "agent", 
        agentLevel: { $exists: false }
      },
      { 
        $set: { agentLevel: "facility_admin" }
      }
    );

    console.log("\n✅ Mise à jour effectuée:");
    console.log("Agents mis à jour:", result.modifiedCount);

    // Vérifier l'agent après mise à jour
    const updatedAgent = await User.findById(agentId);
    console.log("\n📋 Agent après mise à jour:");
    console.log("Email:", updatedAgent?.email);
    console.log("Role:", updatedAgent?.role);
    console.log("AgentLevel:", updatedAgent?.agentLevel);

    await mongoose.disconnect();
    console.log("\n✅ Script terminé avec succès");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erreur:", error);
    process.exit(1);
  }
};

updateAgentLevel();
