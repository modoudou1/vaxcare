// Serveur de test minimal pour diagnostiquer le problème
const express = require("express");
const cors = require("cors");

console.log("🧪 Test serveur minimal...");

const app = express();

// Middlewares de base
app.use(cors());
app.use(express.json());

// Route de test
app.get("/test", (req, res) => {
  res.json({ message: "Serveur de test fonctionne !" });
});

// Test des routes dashboard
app.get("/api/dashboard/national", (req, res) => {
  res.json({ message: "Dashboard national - test" });
});

app.get("/api/dashboard/regional", (req, res) => {
  res.json({ message: "Dashboard régional - test" });
});

app.get("/api/dashboard/agent", (req, res) => {
  res.json({ message: "Dashboard agent - test" });
});

const PORT = 5001; // Port différent pour éviter les conflits
app.listen(PORT, () => {
  console.log(`✅ Serveur de test lancé sur le port ${PORT}`);
  console.log(`🔗 Test: http://localhost:${PORT}/test`);
  console.log(`🔗 Dashboard: http://localhost:${PORT}/api/dashboard/national`);
});

// Test après 2 secondes
setTimeout(() => {
  console.log("\n🎉 Serveur de test fonctionne correctement !");
  console.log("Le problème vient probablement des imports TypeScript.");
  process.exit(0);
}, 2000);

