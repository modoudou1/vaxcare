// Test simple des dashboards avec le serveur minimal
const axios = require("axios");

async function testDashboards() {
  try {
    console.log("🧪 Test des dashboards avec le serveur minimal...");

    // Test dashboard national
    console.log("\n1️⃣ Test dashboard national...");
    const nationalResponse = await axios.get(
      "http://localhost:5000/api/dashboard/national"
    );
    console.log("✅ Dashboard national:", nationalResponse.data);

    // Test dashboard régional
    console.log("\n2️⃣ Test dashboard régional...");
    const regionalResponse = await axios.get(
      "http://localhost:5000/api/dashboard/regional"
    );
    console.log("✅ Dashboard régional:", regionalResponse.data);

    // Test dashboard agent
    console.log("\n3️⃣ Test dashboard agent...");
    const agentResponse = await axios.get(
      "http://localhost:5000/api/dashboard/agent"
    );
    console.log("✅ Dashboard agent:", agentResponse.data);

    console.log(
      "\n🎉 Tous les dashboards fonctionnent avec le serveur minimal !"
    );
    console.log("\n📋 Prochaines étapes :");
    console.log("   1. Installer MongoDB");
    console.log("   2. Créer les utilisateurs de test");
    console.log("   3. Corriger les erreurs TypeScript");
    console.log("   4. Tester avec le serveur principal");
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      console.error(
        "❌ Le serveur minimal n'est pas démarré. Lancez-le avec :"
      );
      console.error("   npx ts-node src/server-minimal.ts");
    } else {
      console.error("❌ Erreur lors des tests:", error.message);
    }
  }
}

testDashboards();

