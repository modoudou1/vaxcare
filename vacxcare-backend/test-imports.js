// Test simple pour vérifier les imports
console.log("🧪 Test des imports...");

try {
  console.log("1️⃣ Test import dashboardController...");
  const dashboardController = require("./dist/controllers/dashboardController");
  console.log(
    "✅ dashboardController importé:",
    typeof dashboardController.getNationalDashboard
  );

  console.log("2️⃣ Test import regionalDashboardController...");
  const regionalController = require("./dist/controllers/regionalDashboardController");
  console.log(
    "✅ regionalDashboardController importé:",
    typeof regionalController.getRegionalDashboard
  );

  console.log("3️⃣ Test import agentDashboardController...");
  const agentController = require("./dist/controllers/agentDashboardController");
  console.log(
    "✅ agentDashboardController importé:",
    typeof agentController.getAgentDashboard
  );

  console.log("4️⃣ Test import routes/dashboard...");
  const dashboardRoutes = require("./dist/routes/dashboard");
  console.log("✅ dashboard routes importé:", typeof dashboardRoutes.default);

  console.log("\n🎉 Tous les imports fonctionnent !");
} catch (error) {
  console.error("❌ Erreur d'import:", error.message);
  console.error("Stack:", error.stack);
}

